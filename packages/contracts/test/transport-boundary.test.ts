// T006 acceptance: no provider HTTP library enters core types. Contract
// validation stays transport-free; HTTP clients belong to gateway adapters.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTTP_CLIENTS = ['axios', 'node-fetch', 'undici', 'got', 'ky', 'superagent', 'node-libcurl'];

describe('transport boundary', () => {
  it('keeps provider HTTP clients out of contract dependencies', () => {
    const pkg = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies ?? {})).toEqual(['ajv']);
    for (const dep of Object.keys(pkg.devDependencies ?? {})) {
      expect(HTTP_CLIENTS).not.toContain(dep);
    }
  });
});
