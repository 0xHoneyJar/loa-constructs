# Strict-Tier Deployment Runbook

**Sprint 4, S4-T8** (closes Flatline CRITICAL #3).
Covers minimum host hardening, CI runner isolation, and capability scope for
`isolation_tier: strict` compositions.

**TL;DR**: Strict tier requires Linux + `bwrap` + `CAP_NET_ADMIN`. It is explicitly
NOT recommended on shared multi-tenant hosts. Use dedicated CI runners or
non-shared developer machines.

---

## What Strict Tier Provides

Strict tier adds kernel-boundary enforcement on top of the advisory tier's
cooperative controls:

| Control | Advisory | Strict |
|---|---|---|
| Filesystem read allowlist | in-process check (cooperative) | `bwrap --ro-bind` (kernel) |
| Filesystem write allowlist | in-process check (cooperative) | `bwrap --bind` (kernel) |
| Network egress | HTTP_PROXY env (HTTP-aware code only) | network namespace + CONNECT proxy (kernel) |
| Process isolation | subprocess only | `bwrap --unshare-pid` |
| Session isolation | fresh session ID | fresh session ID + verified memory disable |
| Foreign binary escape | NOT mitigated | blocked by filesystem namespace |
| Direct syscall escape | NOT mitigated | blocked by `bwrap` PID namespace |

See SDD §6.5b for the full honest threat model.

---

## Prerequisites

### Required Packages

```bash
# Debian / Ubuntu
apt-get install -y bubblewrap libcap2-bin

# Fedora / RHEL
dnf install -y bubblewrap libcap

# Arch
pacman -S bubblewrap libcap
```

Verify:
```bash
bwrap --version        # should print 0.6.x or later
getcap $(which bwrap)  # should include cap_net_admin
```

### Required Capability

`bwrap` needs `CAP_NET_ADMIN` to create network namespaces (`--unshare-net`).

**Option A — Setuid binary** (simpler, less secure):
```bash
chmod u+s $(which bwrap)
```

**Option B — File capability** (recommended):
```bash
setcap cap_net_admin+ep $(which bwrap)
```

**Option C — Run as root** (CI runners where Docker/root is available):
```bash
# The prerequisite check accepts effective UID 0 in lieu of CAP_NET_ADMIN
```

### Verify Prerequisites

The substrate runs this automatically at composition validation time, but you
can run it manually:

```bash
.claude/scripts/lib/strict-tier-prereq.sh
# Exit 0 = all prerequisites met
# Exit 78 = [STRICT-TIER-PREREQ-MISSING] with specific failure reason
```

---

## CI Runner Configuration

### Dedicated Self-Hosted Runner (Recommended)

Strict-tier CI (`composition-strict-linux`) must run on a **dedicated** runner —
not a GitHub-hosted runner (which lacks `CAP_NET_ADMIN`) and not a shared
multi-tenant host.

**Why dedicated?**
- `bwrap` with `CAP_NET_ADMIN` on a shared host is a privilege escalation risk.
- GitHub Actions does not provide `CAP_NET_ADMIN` on hosted runners.
- The adversarial test suite (S4-T5) executes untrusted construct-like payloads.

**Minimal runner VM spec**:
- OS: Ubuntu 22.04 LTS (or later)
- RAM: 4 GB minimum (adversarial tests run concurrent bwrap subprocesses)
- Disk: 20 GB
- Network: outbound-only (inbound blocked at host firewall)
- Packages: `bubblewrap`, `libcap2-bin`, `python3`

**GitHub Actions configuration**:
```yaml
# .github/workflows/composition-strict-linux.yml
jobs:
  strict-tier-tests:
    runs-on: [self-hosted, linux, strict-tier]
    # Gated to repo-maintainer PRs only
    if: github.event.pull_request.author_association == 'OWNER'
       || github.event.pull_request.author_association == 'MEMBER'
       || github.event.pull_request.author_association == 'COLLABORATOR'
    steps:
      - uses: actions/checkout@v4
      - name: Verify strict-tier prerequisites
        run: .claude/scripts/lib/strict-tier-prereq.sh
      - name: Run adversarial suite
        run: bats tests/composition/adversarial/
```

Community PRs (non-maintainer): the `composition-strict-linux` job shows as
skipped/pending. Maintainer approval triggers the job by adding the label
`safe-to-test-strict-tier`.

---

## Host Hardening Checklist

For the strict-tier runner host (self-hosted VM or developer machine):

### Minimum Hardening
- [ ] Single-tenant host (no other users or workloads)
- [ ] `bwrap` capability scoped to the runner user only (`setcap` per-binary)
- [ ] Outbound network filtered to known allowlisted hosts (CI APIs, package mirrors)
- [ ] No inbound SSH from public internet
- [ ] Disk encryption at rest (VM or host level)
- [ ] Log shipping to centralized SIEM (audit trail for capability use)

### Recommended Hardening
- [ ] Ephemeral runner VM (new VM per CI job, destroyed after)
- [ ] Minimal OS install (no desktop environment, no unnecessary services)
- [ ] `AppArmor` or `SELinux` enforcing mode
- [ ] `auditd` with capability-use rules (monitors `CAP_NET_ADMIN` invocations)
- [ ] OOM killer tuned (`vm.overcommit_memory=2`) to prevent memory pressure from killing the stage executor before it can clean up

---

## Developer Machine Setup

If you're running strict-tier compositions locally (Linux only):

```bash
# 1. Install prerequisites
sudo apt-get install -y bubblewrap libcap2-bin

# 2. Grant capability to your user's bwrap binary
sudo setcap cap_net_admin+ep $(which bwrap)

# 3. Verify
.claude/scripts/lib/strict-tier-prereq.sh && echo "Ready for strict tier"

# 4. Run a strict-tier composition
compose-run.sh compositions/audit-feel.yaml
# (uses isolation_tier from each stage's context_policy)
```

**macOS**: strict tier is NOT supported on macOS. Use `isolation_tier: advisory`.
The prerequisite check will exit 78 with a specific macOS-not-supported message.

**Windows**: not supported in this cycle. Advisory only.

---

## Capability Scope Justification

`CAP_NET_ADMIN` is required to create network namespaces (`--unshare-net`).
This is a significant capability — it allows (among other things) modifying
routing tables and creating virtual network interfaces. The scope is limited to:

1. `bwrap` subprocesses only (scoped via file capability, not process-wide)
2. Each subprocess's namespace is destroyed when `bwrap` exits
3. No persistent network configuration changes are made

If `CAP_NET_ADMIN` is not acceptable in your environment, use `isolation_tier: advisory`
and document the advisory-tier limitations in your security review.

An alternative without `CAP_NET_ADMIN` that achieves network isolation at a
coarser level is `seccomp` filtering (block `socket()` for non-HTTP traffic).
This is a NEEDS_DECISION for a future cycle — it covers more network protocols
than HTTP_PROXY but less than a full network namespace.

---

## Troubleshooting

### `[STRICT-TIER-PREREQ-MISSING]` exit 78

```
ERROR: composition declares isolation_tier: strict but prerequisites missing:
  - bwrap: NOT FOUND (install: apt-get install bubblewrap)
  - CAP_NET_ADMIN: NOT AVAILABLE (run: setcap cap_net_admin+ep $(which bwrap))
See: grimoires/loa/runbooks/strict-tier-deployment.md
```

Fix per the checklist above. If bwrap is installed but `getcap` shows no
capabilities, re-run the `setcap` command.

### `bwrap: creating new user namespace not allowed`

Some Linux kernels disable unprivileged user namespaces (`kernel.unprivileged_userns_clone=0`).
Check:
```bash
sysctl kernel.unprivileged_userns_clone
```
If `0`, either enable it (`sudo sysctl -w kernel.unprivileged_userns_clone=1`)
or use a setuid `bwrap` binary instead.

### `bwrap: bind: Operation not permitted`

Bind-mounting a path that is itself on a read-only filesystem.
Ensure `allowed_read_paths` and `allowed_write_paths` in the composition resolve
to writable filesystem mounts on the host.

### Stage process exits immediately under bwrap

Check that the construct skill binary has execute permission and is in one of
the `--ro-bind` paths. The bwrap sandbox starts with an empty filesystem; only
explicitly bound paths are visible.

---

## See Also

- `grimoires/loa/runbooks/context-policy-guide.md` — isolation_tier field reference
- `lib/egress-filter.py` — egress proxy (required for network egress in strict tier)
- SDD §6.5b — honest threat model, tier definitions
- SDD §4.3 — stage executor implementation (bwrap argv array construction)
