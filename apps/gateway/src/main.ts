// Heimdall gateway composition root (T001 scaffold).
// Real composition lands in T027/T030; this stub proves workspace wiring only.
export const GATEWAY_MODULES = [
  'access',
  'catalog',
  'understanding',
  'tool-selection',
  'selection',
  'routing',
  'invocation',
  'feedback',
] as const;

export type GatewayModule = (typeof GATEWAY_MODULES)[number];

export function main(): void {
  // Placeholder entrypoint; Fastify wiring arrives with T029/T034.
  // eslint-disable-next-line no-console
  console.log(`heimdall gateway scaffold: ${GATEWAY_MODULES.length} modules`);
}

if (process.argv[1]?.endsWith('main.js')) {
  main();
}
