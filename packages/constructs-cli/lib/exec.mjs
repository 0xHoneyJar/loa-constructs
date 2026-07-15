// Subprocess contract (T1.1b · FL-SPRINT HIGH).
//
// Every shell-out in this CLI goes through here. The rules, all enforced below:
//   - execFile with an ARGUMENT ARRAY — never a command string, never `sh -c`.
//     A metacharacter in an argument reaches the child as a literal argument.
//   - Absolute binary resolution — the binary is found once, from an explicit
//     search path, so PATH ordering can't swap it underneath us.
//   - Environment allowlist — the child sees only what it needs. Ambient secrets
//     (API keys, tokens) never leak into git or the audit lib.
//   - Explicit timeout — a hung child is killed and reported, never waited on.
//   - Non-zero exit is surfaced, never swallowed.

import { execFile } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import path from 'node:path';

export class ExecError extends Error {
  constructor(message, { code, exitCode, stderr, stdout } = {}) {
    super(message);
    this.name = 'ExecError';
    this.code = code;
    this.exitCode = exitCode;
    this.stderr = stderr;
    this.stdout = stdout;
  }
}

// Directories we will resolve binaries from. Deliberately not `process.env.PATH`:
// an attacker-controlled PATH is exactly the swap we're defending against.
const BIN_SEARCH_PATH = ['/usr/bin', '/bin', '/usr/local/bin', '/opt/homebrew/bin'];

// bash alone inverts the order: the Loa audit substrate requires bash ≥4, and on
// macOS /bin/bash is pinned at 3.2 (its ERE engine can't even compile the trust
// lib's bounded quantifiers). The homebrew/usr-local rungs are the same-user
// toolchain, not a privilege boundary — still a fixed list, never $PATH.
const SEARCH_OVERRIDES = {
  bash: ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'],
};

// Variables a child may see. Everything else is dropped — including every
// *_API_KEY, *_TOKEN, and the rest of the ambient environment.
const ENV_ALLOWLIST = ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TZ', 'TMPDIR', 'SOURCE_DATE_EPOCH'];

const resolvedBinaries = new Map();

/** Resolve a bare binary name to an absolute path, once, from BIN_SEARCH_PATH. */
export async function resolveBinary(name) {
  if (path.isAbsolute(name)) return name;
  if (resolvedBinaries.has(name)) return resolvedBinaries.get(name);

  for (const dir of SEARCH_OVERRIDES[name] ?? BIN_SEARCH_PATH) {
    const candidate = path.join(dir, name);
    try {
      await access(candidate, constants.X_OK);
      resolvedBinaries.set(name, candidate);
      return candidate;
    } catch {
      // not here; keep looking
    }
  }
  throw new ExecError(`binary not found: ${name} (searched ${BIN_SEARCH_PATH.join(', ')})`, {
    code: 'BINARY_NOT_FOUND',
  });
}

/** Build the child environment: allowlisted keys only, plus explicit extras. */
export function buildEnv(extra = {}) {
  const env = {};
  for (const key of ENV_ALLOWLIST) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return { ...env, ...extra };
}

/**
 * Run a binary with an argument array.
 *
 * @param {string} bin  binary name or absolute path
 * @param {string[]} args  arguments — passed verbatim to the child, never parsed by a shell
 * @param {{cwd?: string, timeoutMs?: number, env?: object, maxBuffer?: number, allowNonZero?: boolean, encoding?: string|'buffer'}} opts
 * @returns {Promise<{stdout: string|Buffer, stderr: string|Buffer, exitCode: number}>}
 */
export async function run(bin, args = [], opts = {}) {
  if (!Array.isArray(args)) {
    throw new ExecError('args must be an array — a command string would invite shell parsing', {
      code: 'INVALID_ARGS',
    });
  }
  const {
    cwd = process.cwd(),
    timeoutMs = 30_000,
    env = {},
    maxBuffer = 16 * 1024 * 1024,
    allowNonZero = false,
    encoding = 'utf8',
  } = opts;

  const preserveOutput = (value) => {
    if (encoding === 'buffer') return Buffer.isBuffer(value) ? value : Buffer.from(value ?? '');
    return String(value ?? '');
  };

  const absolute = await resolveBinary(bin);

  return new Promise((resolve, reject) => {
    execFile(
      absolute,
      args,
      {
        cwd,
        timeout: timeoutMs,
        killSignal: 'SIGKILL',
        env: buildEnv(env),
        maxBuffer,
        // Byte-sensitive callers (for example Git path inspection) opt out of
        // text decoding so validation observes the exact bytes the child emitted.
        encoding: encoding === 'buffer' ? null : encoding,
        // shell: false is execFile's default and is the whole point — stated
        // explicitly so a future edit can't quietly flip it.
        shell: false,
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        if (err) {
          if (err.killed || err.signal === 'SIGKILL') {
            return reject(
              new ExecError(`${bin} timed out after ${timeoutMs}ms`, {
                code: 'TIMEOUT',
                stderr: String(stderr ?? ''),
                stdout: String(stdout ?? ''),
              })
            );
          }
          const exitCode = typeof err.code === 'number' ? err.code : 1;
          if (allowNonZero) {
            return resolve({ stdout: preserveOutput(stdout), stderr: preserveOutput(stderr), exitCode });
          }
          return reject(
            new ExecError(`${bin} exited ${exitCode}: ${String(stderr ?? '').trim().slice(0, 300)}`, {
              code: 'NONZERO_EXIT',
              exitCode,
              stderr: String(stderr ?? ''),
              stdout: String(stdout ?? ''),
            })
          );
        }
        resolve({ stdout: preserveOutput(stdout), stderr: preserveOutput(stderr), exitCode: 0 });
      }
    );
  });
}

/** git, with the contract applied. Returns trimmed stdout. */
export async function git(args, opts = {}) {
  const { stdout } = await run('git', args, { timeoutMs: 15_000, ...opts });
  return stdout.trim();
}
