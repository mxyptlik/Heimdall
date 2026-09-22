// Deterministic fixture helpers plus fake provider and clock (T017).
import { CONTRACTS_VERSION } from '@heimdall/contracts';

export const TESTKIT_CONTRACTS_VERSION = CONTRACTS_VERSION;

export * from './clock.js';
export * from './random.js';
export * from './provider.js';
