#!/usr/bin/env node
// Gate-1 validator CLI (cycle-001). Exit codes (sdd.md §5.2):
//   0 = zero drift (Gate 1 PASS) · 1 = drift present · 2 = usage error · 3 = internal error.
// The vendored schema path comes from $HIVEMIND_SCHEMA (set by the bash wrapper).

import fs from 'node:fs';
import { getHivemindBlock, analyzeDrift, summarize, formatReport } from './lib/hivemind-labels.mjs';

// --- ajv draft-2020-12: the S0 calibration lesson ---------------------------
// The canonical schema is draft-2020-12. The DEFAULT `Ajv` constructor is draft-07
// and would silently mis-validate (false Gate-1 passes). Use the 2020 build, and
// guard for ESM/CJS interop (the export may arrive as the module or under .default).
import AjvModule from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
const Ajv2020 = AjvModule.default || AjvModule;
const addFormats = addFormatsModule.default || addFormatsModule;
// ---------------------------------------------------------------------------

function fail(code, msg) {
  process.stderr.write(`hivemind-labels-validate: ${msg}\n`);
  process.exit(code);
}

const args = process.argv.slice(2);
const useStdin = args.includes('--stdin');
const asJson = args.includes('--json');
const fileArg = args.find((a) => !a.startsWith('--'));

// 1. Load the vendored schema (exit 3 on failure — internal error)
const schemaPath = process.env.HIVEMIND_SCHEMA;
if (!schemaPath) fail(3, 'HIVEMIND_SCHEMA not set (the wrapper should set it)');
let schema;
try {
  schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
} catch (e) {
  fail(3, `cannot read/parse vendored schema at ${schemaPath}: ${e.message}`);
}

// 2. Read input (exit 2 on usage error)
let text;
let sourceLabel;
if (useStdin) {
  text = fs.readFileSync(0, 'utf8');
  sourceLabel = '<stdin>';
} else if (!fileArg) {
  fail(2, 'usage: hivemind-labels-validate <path-to-canvas-or-journey> | --stdin');
} else {
  if (!fs.existsSync(fileArg)) fail(2, `input file not found: ${fileArg}`);
  text = fs.readFileSync(fileArg, 'utf8');
  sourceLabel = fileArg;
}

// 3. Extract the hivemind: block (exit 2)
let block;
try {
  block = getHivemindBlock(text);
} catch (e) {
  fail(2, `malformed YAML frontmatter: ${e.message}`);
}
if (!block) fail(2, `no hivemind: block found in ${sourceLabel}`);

// 4. Field-by-field drift + ajv (Ajv2020) conformance
const rows = analyzeDrift(block, schema);
const summary = summarize(rows);
let ajvValid = true;
let ajvErrors = null;
try {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  ajvValid = validate(block);
  ajvErrors = validate.errors;
} catch (e) {
  fail(3, `schema compile error: ${e.message}`);
}

const conformant = summary.conformant && ajvValid;
const exitCode = conformant ? 0 : 1;

if (asJson) {
  process.stdout.write(
    JSON.stringify(
      {
        stream_type: 'Verdict',
        schema_version: '1.0.0',
        source: sourceLabel,
        conformant,
        exit_code: exitCode,
        summary,
        fields: rows,
        ajv_valid: ajvValid,
        ajv_errors: ajvErrors,
      },
      null,
      2,
    ) + '\n',
  );
} else {
  process.stdout.write(formatReport(sourceLabel, rows, conformant) + '\n');
  if (!ajvValid && summary.conformant) {
    process.stdout.write(`  NOTE: ajv flags non-conformance beyond field drift: ${JSON.stringify(ajvErrors)}\n`);
  }
}
process.exit(exitCode);
