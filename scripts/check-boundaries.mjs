// T001 boundary check: module imports, SDK isolation, workspace exclusion.
// Usage: node scripts/check-boundaries.mjs (exit 0 clean, exit 1 violations).
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const notes = [];

function fail(msg) {
  failures.push(msg);
}

function collectTs(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      collectTs(full, out);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function importsOf(file) {
  const text = readFileSync(file, 'utf8');
  const found = [];
  const re = /(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) found.push(m[1]);
  const bare = /^\s*import\s*['"]([^'"]+)['"]/gm;
  while ((m = bare.exec(text)) !== null) found.push(m[1]);
  const dyn = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dyn.exec(text)) !== null) found.push(m[1]);
  return found;
}

// 1. Workspace globs must exclude the upstream checkout and dependency store.
// Strip YAML comments so the exclusion note itself is not flagged.
const workspaceFile = join(ROOT, 'pnpm-workspace.yaml');
const workspaceRaw = readFileSync(workspaceFile, 'utf8');
const workspace = workspaceRaw
  .split('\n')
  .map((line) => line.split('#')[0])
  .join('\n');
for (const forbidden of ['deepseek-harness', '.pnpm-store', 'node_modules']) {
  if (workspace.includes(forbidden)) {
    fail(`pnpm-workspace.yaml must not reference '${forbidden}'`);
  }
}
for (const required of ['apps/*', 'packages/*', 'sdk/typescript', 'integrations/*']) {
  if (!workspace.includes(required))
    fail(`pnpm-workspace.yaml missing required glob '${required}'`);
}
notes.push('workspace globs exclude deepseek-harness/.pnpm-store');

// 2. .gitignore must exclude upstream, store, output, and env values.
const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf8');
for (const required of ['deepseek-harness/', '.pnpm-store/', 'node_modules/', 'dist/', '.env']) {
  if (!gitignore.includes(required)) fail(`.gitignore missing '${required}'`);
}

// 3. Gateway module public entrypoints must exist.
const modules = [
  'access',
  'catalog',
  'understanding',
  'tool-selection',
  'selection',
  'routing',
  'invocation',
  'feedback',
];
for (const mod of modules) {
  if (!existsSync(join(ROOT, 'apps/gateway/src/modules', mod, 'public.ts'))) {
    fail(`missing apps/gateway/src/modules/${mod}/public.ts`);
  }
}

// 4. Import rules.
const contractsFiles = collectTs(join(ROOT, 'packages/contracts/src'));
const sdkFiles = collectTs(join(ROOT, 'sdk/typescript/src'));
const connectorFiles = collectTs(join(ROOT, 'integrations/deepseek-harness/src'));
const gatewayFiles = collectTs(join(ROOT, 'apps/gateway/src'));

function checkFiles(files, forbidden, label) {
  for (const file of files) {
    for (const spec of importsOf(file)) {
      for (const f of forbidden) {
        if (spec === f || spec.startsWith(f + '/')) {
          fail(`${label} forbidden import: ${relative(ROOT, file)} -> '${spec}'`);
        }
      }
    }
  }
}

checkFiles(
  contractsFiles,
  [
    '@heimdall/gateway',
    '@heimdall/sdk',
    '@heimdall/testkit',
    '@heimdall/dsh-connector',
    'deepseek-harness',
  ],
  'contracts',
);

checkFiles(
  sdkFiles,
  [
    '@heimdall/gateway',
    '@heimdall/testkit',
    '@heimdall/dsh-connector',
    'deepseek-harness',
    'apps/gateway',
  ],
  'sdk',
);

checkFiles(
  connectorFiles,
  ['@heimdall/gateway', '@heimdall/testkit', 'apps/gateway', 'deepseek-harness'],
  'connector',
);

checkFiles(
  gatewayFiles,
  ['@heimdall/sdk', '@heimdall/testkit', '@heimdall/dsh-connector', 'deepseek-harness'],
  'gateway',
);

// 5. Cross-module gateway imports must go through the target's public.ts.
for (const file of gatewayFiles) {
  const rel = relative(join(ROOT, 'apps/gateway/src'), file).replace(/\\/g, '/');
  const owner = rel.startsWith('modules/') ? rel.split('/')[1] : null;
  if (!owner) continue;
  for (const spec of importsOf(file)) {
    const m = spec.match(/modules\/([^/'"]+)\//);
    if (m && m[1] !== owner && !spec.includes('/public')) {
      fail(`gateway deep import: ${rel} -> '${spec}' (use modules/${m[1]}/public)`);
    }
  }
}

if (failures.length > 0) {
  console.error('boundary check FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('boundary check passed');
for (const n of notes) console.log(`  - ${n}`);
console.log(
  `  - scanned ${contractsFiles.length + sdkFiles.length + connectorFiles.length + gatewayFiles.length} source files`,
);
