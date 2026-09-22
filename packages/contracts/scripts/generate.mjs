// Contract generation (T002): single schema source -> TypeScript types,
// embedded root schema, and OpenAPI components. Deterministic: same input
// bytes always produce same output bytes (pinned prettier + sorted keys).
//
// Usage:
//   node scripts/generate.mjs            # write generated files
//   node scripts/generate.mjs --check    # exit 1 if committed files drift
//   node scripts/generate.mjs --out DIR  # write into DIR (used by tests)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'json-schema-to-typescript';
import prettier from 'prettier';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SCHEMA_PATH = join(ROOT, 'src/schemas/heimdall.v1.json');
const SCHEMA_ID = 'https://heimdall/schemas/contracts/v1';
const SCHEMA_VERSION = '1';

const HEADER = `/* Generated from src/schemas/heimdall.v1.json — do not edit. */`;

function stableStringify(value) {
  const seen = new Set();
  const sort = (node) => {
    if (Array.isArray(node)) return node.map(sort);
    if (node !== null && typeof node === 'object') {
      if (seen.has(node)) throw new Error('circular value cannot be serialized');
      seen.add(node);
      const out = {};
      for (const key of Object.keys(node).sort()) out[key] = sort(node[key]);
      seen.delete(node);
      return out;
    }
    return node;
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}

async function formatTs(source) {
  const config = (await prettier.resolveConfig(ROOT)) ?? {};
  return prettier.format(source, { ...config, parser: 'typescript' });
}

async function formatJson(source) {
  const config = (await prettier.resolveConfig(ROOT)) ?? {};
  return prettier.format(source, { ...config, parser: 'json' });
}

/** Rewrite internal `#/$defs/X` refs to OpenAPI `#/components/schemas/X` refs. */
function toOpenApiRefs(node) {
  if (Array.isArray(node)) return node.map(toOpenApiRefs);
  if (node !== null && typeof node === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] =
        key === '$ref' && typeof value === 'string'
          ? value.replace('#/$defs/', '#/components/schemas/')
          : toOpenApiRefs(value);
    }
    return out;
  }
  return node;
}

export async function generate() {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));

  const rawTypes = await compile(schema, 'heimdall.v1.json', {
    bannerComment: `${HEADER}\nexport const CONTRACT_SCHEMA_ID = '${SCHEMA_ID}' as const;\nexport const CONTRACT_SCHEMA_VERSION = '${SCHEMA_VERSION}' as const;`,
    unreachableDefinitions: true,
    format: false,
  });
  const typesTs = await formatTs(rawTypes);

  const rootSchemaTs = await formatTs(
    `${HEADER}\nimport type { SchemaObject } from 'ajv/dist/2020.js';\nexport const CONTRACT_SCHEMA_ID = '${SCHEMA_ID}' as const;\nexport const ROOT_SCHEMA: SchemaObject = ${JSON.stringify(schema, null, 2)};\n`,
  );

  const defs = schema.$defs;
  const components = {};
  for (const name of Object.keys(defs).sort()) components[name] = toOpenApiRefs(defs[name]);
  const openApi = await formatJson(
    stableStringify({
      openapi: '3.1.0',
      info: { title: 'Heimdall contracts v1', version: SCHEMA_VERSION },
      components: { schemas: components },
    }),
  );

  return { typesTs, rootSchemaTs, openApi };
}

export function outputPaths(outDir) {
  return {
    types: join(outDir, 'src/generated/types.ts'),
    rootSchema: join(outDir, 'src/generated/root-schema.ts'),
    openApi: join(outDir, 'openapi/components.json'),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const outFlag = args.indexOf('--out');
  const outDir = outFlag === -1 ? ROOT : args[outFlag + 1];
  if (outFlag !== -1 && outDir === undefined) throw new Error('--out requires a directory');

  const { typesTs, rootSchemaTs, openApi } = await generate();
  const paths = outputPaths(outDir);
  const produced = [
    [paths.types, typesTs],
    [paths.rootSchema, rootSchemaTs],
    [paths.openApi, openApi],
  ];

  if (check) {
    let drifted = false;
    for (const [path, content] of produced) {
      if (readFileSync(path, 'utf8') !== content) {
        console.error(`drifted: ${path}`);
        drifted = true;
      }
    }
    if (drifted) process.exit(1);
    console.log('contracts up to date');
    return;
  }

  for (const [path, content] of produced) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  console.log('contracts generated');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
