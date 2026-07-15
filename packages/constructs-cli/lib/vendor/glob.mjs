// Glob — the normative scope semantics, and nothing else (T1.2 · PRD FR-8 r2).
//
// Rules (these ARE the contract; the SDD names them normative):
//   - POSIX-style globs: `**` (recursive), `*` (one segment, no `/`), `?` (one char), literals.
//   - Repo-root-relative. Case-sensitive. `/` is the only separator.
//   - No brace expansion, no extglob, no character classes — out of scope by design.
//   - No symlink traversal: matching is purely lexical over paths; callers must not
//     resolve symlinks before matching (containment is enforced separately, on realpath).

export class GlobError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GlobError';
    this.code = 'GLOB_INVALID';
  }
}

const UNSUPPORTED = [
  { re: /[{}]/, what: 'brace expansion {a,b}' },
  { re: /[[\]]/, what: 'character classes [a-z]' },
  { re: /[!+@]\(/, what: 'extglob !(...) +(...) @(...)' },
];

function assertSupported(pattern) {
  if (typeof pattern !== 'string' || pattern === '') {
    throw new GlobError('pattern must be a non-empty string');
  }
  if (pattern.startsWith('/')) {
    throw new GlobError(`pattern must be repo-root-relative, not absolute: ${pattern}`);
  }
  if (pattern.split('/').includes('..')) {
    throw new GlobError(`pattern may not traverse upward ("..") : ${pattern}`);
  }
  for (const { re, what } of UNSUPPORTED) {
    if (re.test(pattern)) {
      throw new GlobError(`unsupported glob syntax: ${what} in ${JSON.stringify(pattern)} — this engine implements **, *, ?, and literals only`);
    }
  }
}

function escapeLiteral(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Compile a glob to an anchored, case-sensitive RegExp. */
export function compile(pattern) {
  assertSupported(pattern);

  const segments = pattern.split('/');
  const parts = [];

  segments.forEach((seg, i) => {
    const last = i === segments.length - 1;
    if (seg === '**') {
      // `**` matches zero or more path segments.
      parts.push(last ? '(?:.*)?' : '(?:[^/]+/)*');
      return;
    }
    if (seg.includes('**')) {
      throw new GlobError(`"**" must occupy a whole path segment (got ${JSON.stringify(seg)})`);
    }
    let out = '';
    for (const ch of seg) {
      if (ch === '*') out += '[^/]*';
      else if (ch === '?') out += '[^/]';
      else out += escapeLiteral(ch);
    }
    parts.push(out + (last ? '' : '/'));
  });

  return new RegExp(`^${parts.join('')}$`);
}

/** Does `filePath` (repo-root-relative, `/`-separated) match `pattern`? */
export function match(pattern, filePath) {
  if (typeof filePath !== 'string') throw new GlobError('path must be a string');
  const normalized = filePath.replace(/^\.\//, '');
  return compile(pattern).test(normalized);
}

/** Does any pattern match? */
export function matchAny(patterns, filePath) {
  return patterns.some((p) => match(p, filePath));
}

/**
 * Do two patterns overlap — i.e. could any path match both?
 * Used for intra-region overlap (validator error) and cross-region CONFLICT detection.
 * Conservative: a `**` on either side that subsumes the other's prefix counts as overlap.
 */
export function overlaps(a, b) {
  assertSupported(a);
  assertSupported(b);
  if (a === b) return true;

  // A pattern with a trailing `/**` (or a bare prefix) subsumes anything beneath its prefix.
  const prefixOf = (p) => {
    const idx = p.indexOf('**');
    if (idx === -1) return null;
    return p.slice(0, idx).replace(/\/$/, '');
  };
  const pa = prefixOf(a);
  const pb = prefixOf(b);

  if (pa !== null && !/[*?]/.test(pa)) {
    // b is under a's prefix?
    const bLiteralHead = b.split(/[*?]/)[0].replace(/\/$/, '');
    if (pa === '' || bLiteralHead.startsWith(pa)) return true;
  }
  if (pb !== null && !/[*?]/.test(pb)) {
    const aLiteralHead = a.split(/[*?]/)[0].replace(/\/$/, '');
    if (pb === '' || aLiteralHead.startsWith(pb)) return true;
  }

  // Segment-wise comparison for same-depth patterns without `**`.
  if (pa === null && pb === null) {
    const sa = a.split('/');
    const sb = b.split('/');
    if (sa.length !== sb.length) return false;
    return sa.every((seg, i) => {
      const other = sb[i];
      if (seg === other) return true;
      if (!/[*?]/.test(seg) && !/[*?]/.test(other)) return false;
      // one side is a wildcard segment: it can cover the other
      return true;
    });
  }

  return false;
}

/** Specificity for nearest-scope-wins: more literal segments = more specific. */
export function specificity(pattern) {
  assertSupported(pattern);
  const segs = pattern.split('/');
  const literal = segs.filter((s) => !s.includes('*') && !s.includes('?')).length;
  const wild = segs.filter((s) => s === '**').length;
  return literal * 10 - wild;
}

export default { compile, match, matchAny, overlaps, specificity, GlobError };
