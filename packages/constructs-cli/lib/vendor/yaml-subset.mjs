// YAML — a deliberately small, audited subset (T1.2).
//
// Supported: block maps, block sequences, scalars (plain/single/double-quoted),
// block scalars (`|` literal and `>` folded, with strip/keep chomping), comments,
// nested indentation, and the `- key: value` inline-map-in-sequence form.
//
// NOT supported, by design: anchors/aliases (&a/*a), tags (!!str), multi-document
// (---/...), flow collections beyond simple inline [] / {} literals, merge keys (<<).
//
// Block scalars earned their place the honest way: two real construct manifests in this
// estate (kranz, vocabulary-bank) use them for descriptions. They are a pure multi-line
// string form — deterministic, no indirection, no injection surface — so supporting them
// costs nothing that the subset exists to protect.
//
// The rule that makes this safe (PRD T1.2): out-of-subset input MUST error loudly.
// A best-effort parse that silently drops an anchor would hand the caller a manifest
// that isn't the one on disk — the exact class of bug a "flexible" parser creates.

export class YamlSubsetError extends Error {
  constructor(message, line) {
    super(line != null ? `${message} (line ${line + 1})` : message);
    this.name = 'YamlSubsetError';
    this.line = line;
    this.code = 'YAML_OUT_OF_SUBSET';
  }
}

const OUT_OF_SUBSET = [
  { re: /(^|\s)[&*][A-Za-z0-9_-]+/, what: 'anchors/aliases (&a, *a)' },
  { re: /(^|\s)!!?[A-Za-z]/, what: 'tags (!!str, !Custom)' },
  { re: /^\.\.\.\s*$/, what: 'document end marker (...)' },
  { re: /^\s*<<\s*:/, what: 'merge keys (<<:)' },
];

/** `key: |`, `key: >`, with optional chomping/indent indicators. */
const BLOCK_SCALAR_RE = /^([|>])([-+]?)(\d*)\s*$/;

function stripComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === '#' && !inSingle && !inDouble) {
      // a '#' only starts a comment at start-of-line or after whitespace
      if (i === 0 || /\s/.test(line[i - 1])) return line.slice(0, i);
    }
  }
  return line;
}

function parseScalar(raw) {
  const s = raw.trim();
  if (s === '') return '';
  if (s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return Number.parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return Number.parseFloat(s);
  if (s.length >= 2 && s[0] === '"' && s.endsWith('"')) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  }
  if (s.length >= 2 && s[0] === "'" && s.endsWith("'")) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  // simple inline flow collections: [] and [a, b] and {} — anything richer is out of subset
  if (s === '[]') return [];
  if (s === '{}') return {};
  if (s[0] === '[' && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (inner === '') return [];
    if (inner.includes('[') || inner.includes('{')) {
      throw new YamlSubsetError('nested flow collections are out of subset — use block style');
    }
    return inner.split(',').map((part) => parseScalar(part));
  }
  if (s[0] === '{') {
    throw new YamlSubsetError('inline flow maps are out of subset — use block style');
  }
  return s;
}

function splitKey(content, lineNo) {
  // find the first ':' that is followed by whitespace or EOL and is not inside quotes
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === ':' && !inSingle && !inDouble) {
      const next = content[i + 1];
      if (next === undefined || next === ' ' || next === '\t') {
        const key = content.slice(0, i).trim();
        const value = content.slice(i + 1).trim();
        if (key === '') throw new YamlSubsetError('empty key', lineNo);
        return [key.replace(/^["']|["']$/g, ''), value];
      }
    }
  }
  return null;
}

/**
 * Parse a YAML subset document.
 * @param {string} text
 * @returns {any}
 * @throws {YamlSubsetError} on any construct outside the declared subset
 */
export function parse(text) {
  if (typeof text !== 'string') throw new YamlSubsetError('input must be a string');

  const rawLines = text.split(/\r?\n/);

  // Reject out-of-subset constructs before parsing — loudly, with the line.
  rawLines.forEach((line, i) => {
    const code = stripComment(line);
    if (code.trim() === '') return;
    for (const { re, what } of OUT_OF_SUBSET) {
      if (re.test(code)) {
        throw new YamlSubsetError(`unsupported YAML construct: ${what}. This parser implements a documented subset; rewrite the document in block style without it`, i);
      }
    }
  });

  // Tolerate a single leading '---' (front-matter-style start), reject any second one.
  // Block scalars are folded here: their body is RAW (comments and blank lines inside a
  // block scalar are content, not syntax), so it must be captured before comment-stripping
  // touches it.
  const lines = [];
  let docStarts = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const code = stripComment(raw);

    if (/^---\s*$/.test(code)) {
      docStarts += 1;
      if (docStarts > 1) throw new YamlSubsetError('multi-document YAML is out of subset (second ---)', i);
      continue;
    }
    if (code.trim() === '') continue;
    if (/^\t/.test(code)) throw new YamlSubsetError('tab indentation is not valid YAML — use spaces', i);

    const indent = code.length - code.trimStart().length;
    const content = code.trim();

    // `key: |` / `key: >` — consume the indented body verbatim.
    const kv = splitKey(content, i);
    const blockHeader = kv ? BLOCK_SCALAR_RE.exec(kv[1]) : null;
    if (blockHeader) {
      const [, style, chomp] = blockHeader;
      const body = [];
      let j = i + 1;
      let bodyIndent = null;

      for (; j < rawLines.length; j++) {
        const bodyRaw = rawLines[j];
        if (bodyRaw.trim() === '') {
          body.push('');
          continue;
        }
        const bodyIndentHere = bodyRaw.length - bodyRaw.trimStart().length;
        if (bodyIndentHere <= indent) break;
        if (bodyIndent === null) bodyIndent = bodyIndentHere;
        body.push(bodyRaw.slice(Math.min(bodyIndent, bodyIndentHere)));
      }

      // trailing blank lines belong to chomping, not content
      while (body.length && body[body.length - 1] === '') body.pop();

      let value;
      if (style === '|') {
        value = body.join('\n');
      } else {
        // folded: blank line = paragraph break, otherwise join with a space
        value = body
          .reduce((acc, line) => {
            if (line === '') {
              acc.push('');
            } else if (acc.length === 0 || acc[acc.length - 1] === '') {
              acc.push(line);
            } else {
              acc[acc.length - 1] += ` ${line}`;
            }
            return acc;
          }, [])
          .join('\n');
      }
      if (chomp !== '-') value += '\n'; // clip (default) and keep both end with a newline
      if (chomp === '-') value = value.replace(/\n+$/, '');

      lines.push({ indent, content: kv[0], lineNo: i, blockValue: value });
      i = j - 1;
      continue;
    }

    lines.push({ indent, content, lineNo: i });
  }

  if (lines.length === 0) return {};

  let pos = 0;

  function parseBlock(indent) {
    // sequence?
    if (lines[pos].content.startsWith('- ') || lines[pos].content === '-') {
      const seq = [];
      while (pos < lines.length && lines[pos].indent === indent && (lines[pos].content.startsWith('- ') || lines[pos].content === '-')) {
        const { content, lineNo } = lines[pos];
        const item = content === '-' ? '' : content.slice(2).trim();
        pos += 1;

        if (item === '') {
          // nested block under the dash
          if (pos < lines.length && lines[pos].indent > indent) {
            seq.push(parseBlock(lines[pos].indent));
          } else {
            seq.push(null);
          }
          continue;
        }

        const kv = splitKey(item, lineNo);
        if (kv) {
          // inline map opening a sequence item: "- key: value"
          const [key, value] = kv;
          const obj = {};
          if (value === '') {
            if (pos < lines.length && lines[pos].indent > indent) {
              obj[key] = parseBlock(lines[pos].indent);
            } else {
              obj[key] = null;
            }
          } else {
            obj[key] = parseScalar(value);
          }
          // continuation keys of the same item are indented past the dash
          const itemIndent = indent + 2;
          while (pos < lines.length && lines[pos].indent >= itemIndent && !lines[pos].content.startsWith('- ')) {
            const sub = lines[pos];
            if (sub.blockValue !== undefined) {
              obj[sub.content] = sub.blockValue;
              pos += 1;
              continue;
            }
            const subKv = splitKey(sub.content, sub.lineNo);
            if (!subKv) throw new YamlSubsetError(`expected "key: value" in sequence item`, sub.lineNo);
            pos += 1;
            const [k2, v2] = subKv;
            if (v2 === '') {
              if (pos < lines.length && lines[pos].indent > sub.indent) {
                obj[k2] = parseBlock(lines[pos].indent);
              } else {
                obj[k2] = null;
              }
            } else {
              obj[k2] = parseScalar(v2);
            }
          }
          seq.push(obj);
        } else {
          seq.push(parseScalar(item));
        }
      }
      return seq;
    }

    // map
    const map = {};
    while (pos < lines.length && lines[pos].indent === indent) {
      const { content, lineNo, blockValue } = lines[pos];
      if (content.startsWith('- ')) break;

      // A folded block scalar: `content` already holds the bare key.
      if (blockValue !== undefined) {
        map[content] = blockValue;
        pos += 1;
        continue;
      }

      const kv = splitKey(content, lineNo);
      if (!kv) {
        throw new YamlSubsetError(`expected "key: value" — got ${JSON.stringify(content.slice(0, 40))}`, lineNo);
      }
      pos += 1;
      const [key, value] = kv;
      if (value === '') {
        if (pos < lines.length && lines[pos].indent > indent) {
          map[key] = parseBlock(lines[pos].indent);
        } else if (pos < lines.length && lines[pos].indent === indent && lines[pos].content.startsWith('- ')) {
          map[key] = parseBlock(indent);
        } else {
          map[key] = null;
        }
      } else {
        map[key] = parseScalar(value);
      }
    }
    return map;
  }

  const result = parseBlock(lines[0].indent);
  if (pos < lines.length) {
    throw new YamlSubsetError('inconsistent indentation — could not consume the whole document', lines[pos].lineNo);
  }
  return result;
}

export default { parse, YamlSubsetError };
