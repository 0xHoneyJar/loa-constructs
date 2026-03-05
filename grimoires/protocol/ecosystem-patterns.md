# Protocol Construct — Ecosystem Patterns

> Knowledge captured from the Protocol v2.0 PR #1 review (2026-03-04).
> This file IS the compound learning artifact for Protocol's freeform work.
> Update it when Protocol discovers new ecosystem patterns.

## Wallet Infrastructure

### Connector Stack
- **All 4 primary dApps use Dynamic Labs** (connect-and-sign mode), NOT RainbowKit/Web3Modal
- `ZeroDevSmartWalletConnectors` imported in 3-4 dApps but **NEVER actually used** — migration scar from Dynamic setup. mibera correctly omits it.
- Dynamic Labs version split: forgetti landing `^4.20.0`, forgetti web/cubquests/mibera `^4.41.1`, apdao `^4.45.0`
- mibera is only repo with `useMemo`/`useCallback` on Dynamic settings (prevents WeakMap re-render crash). Other repos vulnerable.

### Transaction Architecture Families
| Family | Pattern | Where |
|--------|---------|-------|
| A | Codegen + useOnSuccess callback | set-and-forgetti (canonical) |
| B | Codegen + useSimulateContract | cubquests |
| C | writeContractAsync step-machine | set-and-forgetti migration flows |
| D | Raw walletClient.writeContract | apdao (some paths) |
| E | Third-party SDK wrapping | (none currently) |

### Shared Utility Lineage

| Utility | Origin | Date | Status |
|---------|--------|------|--------|
| `useOnSuccess` | set-and-forgetti | Sep 2024 | Canonical. cubquests has stale-closure bug (missing `refetch` in dep array). mibera evolved fork with `onSuccess(receipt)` + `onError`. apdao absent. |
| `ensureCorrectNetwork` | set-and-forgetti | Sep 2024 | Copy-pasted across repos. Bypass rate varies 15%-50%. |
| `useChainGuard` | set-and-forgetti | Jan 2026 | Intended replacement for ensureCorrectNetwork. Zero consumers — migration stalled. |
| `formatTransactionError` | set-and-forgetti | Jan 2026 | Error taxonomy (UserRejected, InsufficientFunds, ContractRevert, NetworkError, Unknown). Not adopted elsewhere. |
| `estimateDoubledGas` | set-and-forgetti | Jan 2026 | `GAS_MULTIPLIER = 2n`. Used in ALL recipe flows. Skipped in V1 vault withdraw. |
| `formatToken` | mibera | Dec 2023 | Origin is mibera, not forgetti. |

## Known Bugs Discovered

### Critical
- **mibera approve-then-act race condition** (`trade-accept-dialog.tsx:60-71`): `approveContract` returns hash, no receipt wait. `acceptTrade` fires immediately. Reverts if approve not yet mined.
- **forgetti concurrency bugs** (`use-migration-flow.ts`): `initialStakedAmountsRef` (line 119) guards against stale refetch; `processedStepsRef` (line 123) prevents duplicate receipt handling. Without these, the migration flow double-processes.

### High
- **forgetti ERC-4626 semantic bug** (`use-recipe-withdraw-flow.ts:253`): Uses `redeem` when `withdraw` was intended. `redeem` takes shares, `withdraw` takes assets — different rounding.
- **apdao gas estimation inconsistency** (`confirm-loan-button.tsx` vs `add-to-queue-button.tsx`): Queue step gets 1.5x gasPrice bump but approval step does not.

### Medium
- **apdao timeout typo** (`active-loans.tsx:178,195,213`): `timeout: 3000000` (50 minutes). Sibling file `resolve-expired-loan-button.tsx` has `300000` (5 min) with correct comment.
- **cubquests useOnSuccess stale closure**: Missing `refetch` in dep array. Copied from forgetti but dropped the dependency.
- **Network guard bypass rates**: ensureCorrectNetwork return value IGNORED in mibera trade dialogs (50% bypass). Forgetti guards 85% of write paths.

## Repo Characterization

| Repo | Profile | Key Insight |
|------|---------|-------------|
| set-and-forgetti | Gold standard — step-machine, error taxonomy, gas buffer | Origin of most shared utilities. Best error handling. |
| apdao | Origin repo, legacy scars | `// T2`/`// T5` comments = legacy chain references. 4 different chain-switching patterns. |
| mibera | Most pattern-rich (16 contracts, 5 tx families) | Most evolved useOnSuccess fork. Only repo with Dynamic WeakMap fix. |
| cubquests | Minimal tx surface, sophisticated offchain verification | Signature verification + whitelist proofs. Minimal wallet boundary concerns. |

## Key Insight

**Bugs cluster at feature boundaries, not transaction level.** The individual wagmi `useWriteContract` calls work fine. The bugs appear when features compose multiple contract calls (approve-then-trade, unstake-then-migrate) or when shared utilities diverge across repos (useOnSuccess dep-array bug in cubquests, network guard bypass in mibera).

Protocol's dapp-lint scans should target **feature composition patterns**, not individual transactions.

---

*Source: construct-protocol PR #1 review, 4-repo archaeology (set-and-forgetti, cubquests-interface, apdao-auction-house, mibera-interface). See PR comments for full findings.*
