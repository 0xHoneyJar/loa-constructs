// RFC 8785 (JCS) canonicalization — the audit substrate's exactly.
//
// The reference implementation is the substrate's lib/jcs.sh; this module exists
// so the zero-dep runtime never shells out to canonicalize. Equivalence is PINNED
// by a golden test (test/jcs.test.mjs) that feeds the same documents to both and
// byte-compares — the substrate stays the authority, this stays the mirror.
//
// Node's JSON.stringify already implements the ECMAScript number serialization
// RFC 8785 §3.2.2.3 requires, and its string escaping matches §3.2.2.2; JS
// default string sort is UTF-16 code-unit order, which is exactly §3.2.3.

export class JcsError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JcsError';
    this.code = 'JCS_INVALID';
  }
}

export function jcsCanonicalize(value) {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    throw new JcsError('jcs: undefined/function/symbol has no canonical form');
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new JcsError('jcs: non-finite number has no canonical form');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => jcsCanonicalize(v === undefined ? null : v)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${jcsCanonicalize(value[k])}`).join(',')}}`;
  }
  throw new JcsError(`jcs: unsupported type ${typeof value}`);
}

export default { jcsCanonicalize, JcsError };
