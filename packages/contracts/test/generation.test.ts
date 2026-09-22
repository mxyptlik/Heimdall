// T002 acceptance: generation from the single schema source is deterministic
// and committed files match it byte-for-byte (`gen:check` equivalent).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const PKG_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ARTIFACTS = [
  'src/generated/types.ts',
  'src/generated/root-schema.ts',
  'openapi/components.json',
];

describe('contract generation', () => {
  it('regenerates byte-identical artifacts', () => {
    const out = mkdtempSync(join(tmpdir(), 'heimdall-contracts-'));
    execFileSync(process.execPath, [join(PKG_ROOT, 'scripts/generate.mjs'), '--out', out], {
      stdio: 'pipe',
    });
    for (const rel of ARTIFACTS) {
      expect(readFileSync(join(out, rel)).equals(readFileSync(join(PKG_ROOT, rel))), rel).toBe(
        true,
      );
    }
  }, 60000);

  it('reports no drift via --check', () => {
    execFileSync(process.execPath, [join(PKG_ROOT, 'scripts/generate.mjs'), '--check'], {
      stdio: 'pipe',
    });
  }, 60000);
});
