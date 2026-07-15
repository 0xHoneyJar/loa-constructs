// JSON Schema — a declared keyword subset (T1.2).
//
// Implemented keywords ONLY: type, required, properties, additionalProperties,
// items, enum, pattern, minItems, maxItems, minimum, maximum, minLength, maxLength,
// const, $ref (local "#/$defs/..." only).
//
// This is not JSON Schema 2020-12 and never claims to be — `capabilities --json`
// publishes SUPPORTED_KEYWORDS so an agent can see exactly what is enforced.
// An unknown keyword in a schema is an ERROR, not a silent no-op: a schema author
// who writes `oneOf` deserves to be told it isn't checked, rather than believing it is.

export const SUPPORTED_KEYWORDS = [
  '$schema', '$id', '$defs', '$ref', 'title', 'description', 'examples', 'default',
  'type', 'required', 'properties', 'additionalProperties', 'items',
  'enum', 'const', 'pattern', 'minItems', 'maxItems',
  'minimum', 'maximum', 'minLength', 'maxLength',
];

export class SchemaSubsetError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SchemaSubsetError';
    this.code = 'SCHEMA_OUT_OF_SUBSET';
  }
}

function assertSupported(schema, where = '#') {
  if (schema == null || typeof schema !== 'object') return;
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED_KEYWORDS.includes(key)) {
      throw new SchemaSubsetError(
        `unsupported schema keyword ${JSON.stringify(key)} at ${where}. ` +
          `This validator implements a declared subset: ${SUPPORTED_KEYWORDS.join(', ')}. ` +
          `Rewrite the schema within the subset — an unenforced keyword is worse than an absent one.`
      );
    }
  }
  if (schema.properties) {
    for (const [k, v] of Object.entries(schema.properties)) assertSupported(v, `${where}/properties/${k}`);
  }
  if (schema.items) assertSupported(schema.items, `${where}/items`);
  if (schema.$defs) {
    for (const [k, v] of Object.entries(schema.$defs)) assertSupported(v, `${where}/$defs/${k}`);
  }
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    assertSupported(schema.additionalProperties, `${where}/additionalProperties`);
  }
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value; // string | number | boolean | object
}

function typeMatches(expected, value) {
  const actual = typeOf(value);
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  if (expected === 'integer') return actual === 'integer';
  return expected === actual;
}

function resolveRef(ref, root) {
  if (!ref.startsWith('#/')) {
    throw new SchemaSubsetError(`only local refs are supported (got ${JSON.stringify(ref)})`);
  }
  let node = root;
  for (const part of ref.slice(2).split('/')) {
    node = node?.[part];
    if (node === undefined) throw new SchemaSubsetError(`unresolvable $ref: ${ref}`);
  }
  return node;
}

function validateNode(schema, value, path, root, errors) {
  if (schema.$ref) {
    validateNode(resolveRef(schema.$ref, root), value, path, root, errors);
    return;
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeMatches(t, value))) {
      errors.push(`${path}: expected ${types.join('|')}, got ${typeOf(value)}`);
      return; // further keyword checks would be noise
    }
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: must equal ${JSON.stringify(schema.const)}`);
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')} (got ${JSON.stringify(value)})`);
  }

  if (typeof value === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: ${JSON.stringify(value)} does not match /${schema.pattern}/`);
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: shorter than minLength ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path}: longer than maxLength ${schema.maxLength}`);
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: above maximum ${schema.maximum}`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: fewer than minItems ${schema.minItems}`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path}: more than maxItems ${schema.maxItems}`);
    }
    if (schema.items) {
      value.forEach((item, i) => validateNode(schema.items, item, `${path}[${i}]`, root, errors));
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) {
      if (!(key in value) || value[key] === undefined) {
        errors.push(`${path}: missing required property ${JSON.stringify(key)}`);
      }
    }
    const props = schema.properties ?? {};
    for (const [key, sub] of Object.entries(props)) {
      if (key in value && value[key] !== null) {
        validateNode(sub, value[key], `${path}/${key}`, root, errors);
      } else if (key in value && value[key] === null && sub.type && !['null'].includes(sub.type)) {
        const types = Array.isArray(sub.type) ? sub.type : [sub.type];
        if (!types.includes('null')) errors.push(`${path}/${key}: expected ${types.join('|')}, got null`);
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in props)) errors.push(`${path}: unknown property ${JSON.stringify(key)} (additionalProperties: false)`);
      }
    } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      for (const [key, v] of Object.entries(value)) {
        if (!(key in props)) validateNode(schema.additionalProperties, v, `${path}/${key}`, root, errors);
      }
    }
  }
}

/**
 * Validate a value against a subset schema.
 * @returns {{valid: boolean, errors: string[]}}
 * @throws {SchemaSubsetError} if the SCHEMA itself uses an unsupported keyword
 */
export function validate(schema, value) {
  assertSupported(schema);
  const errors = [];
  validateNode(schema, value, '', schema, errors);
  return { valid: errors.length === 0, errors };
}

export default { validate, SUPPORTED_KEYWORDS, SchemaSubsetError };
