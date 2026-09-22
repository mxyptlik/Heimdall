// Strict contract validation (T002). All schemas come from the single source
// `src/schemas/heimdall.v1.json`, embedded into `src/generated/root-schema.ts`
// by `scripts/generate.mjs`. Unknown properties are rejected everywhere;
// task-ID fields do not exist and fail as unknown properties by design.
import { createRequire } from 'node:module';
import type { ErrorObject } from 'ajv/dist/2020.js';
import { CONTRACT_SCHEMA_ID, ROOT_SCHEMA } from './generated/root-schema.js';

interface ValidateFunction {
  (data: unknown): boolean;
  errors?: ErrorObject[] | null;
}

interface AjvInstance {
  addSchema(schema: Record<string, unknown>, key?: string): unknown;
  getSchema(keyRef: string): ValidateFunction | undefined;
}

interface AjvConstructor {
  new (options?: Record<string, unknown>): AjvInstance;
}

// Ajv ships CJS whose default-export types do not resolve under nodenext
// (TS 5.9: default import has no construct signatures), so the constructor
// crosses via createRequire behind this minimal structural interface.
// Runtime import verified against ajv@8.20.0 dist/2020.js.
const require = createRequire(import.meta.url);
const Ajv2020 = require('ajv/dist/2020.js') as AjvConstructor;

export const AJV_OPTIONS = {
  strict: true,
  allErrors: true,
} as const;

let cached: AjvInstance | undefined;

export function buildValidator(): AjvInstance {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  ajv.addSchema(ROOT_SCHEMA, CONTRACT_SCHEMA_ID);
  return ajv;
}

function shared(): AjvInstance {
  cached ??= buildValidator();
  return cached;
}

/** Validate `data` against the named `$defs` entry, e.g. `validatorFor('money')`. */
export function validatorFor(defName: string): (data: unknown) => boolean {
  const validate = shared().getSchema(`${CONTRACT_SCHEMA_ID}#/$defs/${defName}`);
  if (validate === undefined) throw new Error(`unknown contract definition: ${defName}`);
  return validate;
}

export function validationErrors(defName: string, data: unknown): ErrorObject[] {
  const ajv = shared();
  const validate = ajv.getSchema(`${CONTRACT_SCHEMA_ID}#/$defs/${defName}`);
  if (validate === undefined) throw new Error(`unknown contract definition: ${defName}`);
  validate(data);
  return validate.errors ?? [];
}
