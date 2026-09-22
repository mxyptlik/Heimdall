// Authorized tool selection and schema budget (T014). Filters the caller's
// authorized catalog only: selection never grants execution permission and
// never invents tools. Deterministic shortlist first (essential first, then
// stable ID order), injected relevance judgments second, declared bundles
// preserved, definition-token budget and optional count cap enforced in
// catalog order. Empty selection is valid; unfillable essential tools fail
// visibly. Caller-driven reselection merges through boosted relevance.
import {
  digestCanonical,
  makeError,
  validatorFor,
  type HeimdallError,
  type ToolDefinition,
} from '@heimdall/contracts';

/** Working shortlist bound below the 255-option engine ceiling. */
export const TOOL_SHORTLIST_MAX = 200;

export interface ToolSelectionInputs {
  /** Caller-authorized catalog. Only these definitions may reach the model. */
  readonly catalog: ToolDefinition[];
  readonly enabled: boolean;
  /** Injected relevance judgments in [0, 1] by tool ID. Missing means irrelevant. */
  readonly relevance: Partial<Record<string, number>>;
  /** Minimum relevance for non-essential tools. Calibrated in evaluation tasks. */
  readonly relevanceThreshold: number;
  /** Maximum selected-definition tokens. */
  readonly tokenBudget: number;
  readonly countCap?: number;
  /** Exact definition-token estimator injected by the caller. No hidden tokenizer. */
  readonly estimateTokens: (definition: ToolDefinition) => number;
}

export interface Omission {
  readonly id: string;
  readonly reason: string;
}

export type ToolSelectionResult =
  | {
      readonly ok: true;
      readonly selected: ToolDefinition[];
      readonly selectedIds: string[];
      readonly omitted: Omission[];
      /** Digest over the exact selected definitions for request binding. */
      readonly schemaDigest: string;
    }
  | { readonly ok: false; readonly error: HeimdallError };

function validRelevance(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Select the visible tool set. Deterministic: identical inputs yield
 * identical selection in catalog order.
 */
export function selectTools(inputs: ToolSelectionInputs): ToolSelectionResult {
  const validate = validatorFor('toolDefinition');
  const authorized: ToolDefinition[] = [];
  const omitted: Omission[] = [];
  for (const entry of inputs.catalog) {
    if (validate(entry)) {
      authorized.push(entry as ToolDefinition);
    } else {
      const id = (entry as Partial<ToolDefinition>).id;
      omitted.push({
        id: typeof id === 'string' ? id : '<unidentified>',
        reason: 'invalid_definition',
      });
    }
  }

  if (!inputs.enabled) {
    return {
      ok: true,
      selected: authorized,
      selectedIds: authorized.map((tool) => tool.id),
      omitted,
      schemaDigest: digestCanonical(authorized),
    };
  }

  const ordered = [...authorized].sort((a, b) => {
    if (a.essential !== b.essential) return a.essential ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const shortlisted = ordered.slice(0, TOOL_SHORTLIST_MAX);
  for (const dropped of ordered.slice(TOOL_SHORTLIST_MAX)) {
    omitted.push({ id: dropped.id, reason: 'shortlist_bound' });
  }

  const wanted = shortlisted.filter(
    (tool) =>
      tool.essential || validRelevance(inputs.relevance[tool.id]) >= inputs.relevanceThreshold,
  );
  for (const skipped of shortlisted) {
    if (!wanted.includes(skipped)) {
      omitted.push({ id: skipped.id, reason: 'below_threshold' });
    }
  }

  const withBundles: ToolDefinition[] = [];
  for (const tool of wanted) {
    withBundles.push(tool);
    if (tool.bundle !== undefined) {
      for (const mate of authorized) {
        if (mate.bundle === tool.bundle && !withBundles.includes(mate)) withBundles.push(mate);
      }
    }
  }

  const selected: ToolDefinition[] = [];
  let spent = 0;
  for (const tool of withBundles) {
    const cost = inputs.estimateTokens(tool);
    if (!Number.isInteger(cost) || cost < 0) {
      return {
        ok: false,
        error: makeError(
          'INVALID_REQUEST',
          `token estimator returned an invalid cost for ${tool.id}`,
        ),
      };
    }
    const overBudget = spent + cost > inputs.tokenBudget;
    const overCount = inputs.countCap !== undefined && selected.length >= inputs.countCap;
    if (overBudget || overCount) {
      if (tool.essential) {
        return {
          ok: false,
          error: makeError(
            'ESSENTIAL_TOOLS_DO_NOT_FIT',
            `essential tool ${tool.id} exceeds the definition budget`,
          ),
        };
      }
      omitted.push({ id: tool.id, reason: overBudget ? 'token_budget' : 'count_cap' });
      continue;
    }
    spent += cost;
    selected.push(tool);
  }

  selected.sort((a, b) => authorized.indexOf(a) - authorized.indexOf(b));
  return {
    ok: true,
    selected,
    selectedIds: selected.map((tool) => tool.id),
    omitted,
    schemaDigest: digestCanonical(selected),
  };
}

/**
 * Boost relevance for a caller-driven reselection round, for example after
 * the model signals `additional_tool_needed`. Returns a new relevance map;
 * the caller re-invokes selection with it.
 */
export function boostRelevance(
  relevance: Partial<Record<string, number>>,
  ids: readonly string[],
  boostTo = 1,
): Partial<Record<string, number>> {
  const next = { ...relevance };
  for (const id of ids) next[id] = Math.max(validRelevance(next[id]), validRelevance(boostTo));
  return next;
}
