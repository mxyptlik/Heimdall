// Bounded model/tool compatibility orchestration (T016). Pure two-pass use
// case: select tools, filter and rank candidates, then reconcile exactly one
// pairing. One repair round is permitted using already evaluated alternatives
// (ranked fallbacks, evaluated relevance); there is no recursive model/tool
// loop and no third semantic stage. Essential tools are never silently
// dropped to choose a cheaper model: unfillable essentials fail explicitly.
// Token fit is checked twice: eligibility runs on the planner estimate, the
// binding recheck uses the exact selected-definition sum.
import {
  digestCanonical,
  makeError,
  type CandidateId,
  type CandidateProfile,
  type HeimdallError,
  type ModelPin,
  type Money,
  type PolicyRule,
  type RouteRequest,
  type ToolDefinition,
} from '@heimdall/contracts';
import { filterEligible, type CandidateMeasurements, type TokenNeeds } from './eligibility.js';
import { rankCandidates, type RankCosts, type RankingTrace } from './ranking.js';
import { selectTools, type Omission } from '../../tool-selection/public.js';

export interface TwoPassInputs {
  readonly request: RouteRequest;
  readonly candidates: CandidateProfile[];
  readonly policy: PolicyRule;
  readonly costs: Partial<Record<string, RankCosts>>;
  readonly measurements: Partial<Record<string, CandidateMeasurements>>;
  readonly relevance: Partial<Record<string, number>>;
  readonly relevanceThreshold: number;
  readonly tokenBudget: number;
  readonly countCap?: number;
  readonly estimateToolTokens: (definition: ToolDefinition) => number;
  /** Planner token estimate used for eligibility; the binding recheck uses the exact sum. */
  readonly estimatedToolSchemaTokens: number;
  readonly inputTokens: number;
  readonly requiredOutputTokens: number;
  readonly nowMs: number;
  readonly retainedCandidate?: CandidateId;
  readonly retentionHolds: boolean;
  readonly pin?: ModelPin;
  readonly compound: boolean;
  readonly baseline?: CandidateId;
  readonly minSavingsToSwitch: Money;
}

export interface TwoPassDecision {
  readonly candidate: CandidateId;
  readonly selectedTools: ToolDefinition[];
  readonly selectedToolIds: string[];
  readonly fallbacks: CandidateId[];
  readonly schemaDigest: string;
  readonly passesUsed: 1 | 2;
  readonly trace: {
    readonly ranking: RankingTrace;
    readonly omissions: Omission[];
    readonly repaired: boolean;
    readonly repairDetail?: string;
  };
}

export type TwoPassResult =
  | { readonly ok: true; readonly decision: TwoPassDecision }
  | { readonly ok: false; readonly error: HeimdallError };

function supportsSelected(
  candidate: CandidateProfile,
  selected: ToolDefinition[],
  request: RouteRequest,
): boolean {
  if (selected.length > 0 && candidate.tools.genericToolCalling !== 'verified') return false;
  if (request.outputSchema !== undefined && candidate.tools.structuredOutput !== 'verified') {
    return false;
  }
  return true;
}

function fitsExactly(
  candidate: CandidateProfile,
  inputTokens: number,
  schemaTokens: number,
  requiredOutputTokens: number,
): boolean {
  return (
    inputTokens + schemaTokens <= candidate.capacity.safeInputTokens &&
    requiredOutputTokens + candidate.capacity.outputReserveTokens <=
      candidate.capacity.safeOutputTokens
  );
}

function sumTokens(
  tools: ToolDefinition[],
  estimator: (definition: ToolDefinition) => number,
): number {
  let total = 0;
  for (const tool of tools) total += estimator(tool);
  return total;
}

/**
 * Run the bounded two-pass selection. Deterministic: identical inputs yield
 * identical decisions. Network-free and side-effect-free.
 */
export function composeRoute(inputs: TwoPassInputs): TwoPassResult {
  const selection = selectTools({
    catalog: inputs.request.toolSelection?.catalog ?? [],
    enabled: inputs.request.toolSelection?.enabled ?? false,
    relevance: inputs.relevance,
    relevanceThreshold: inputs.relevanceThreshold,
    tokenBudget: inputs.tokenBudget,
    ...(inputs.countCap === undefined ? {} : { countCap: inputs.countCap }),
    estimateTokens: inputs.estimateToolTokens,
  });
  if (!selection.ok) return selection;

  const tokenNeeds: TokenNeeds = {
    inputTokens: inputs.inputTokens,
    toolSchemaTokens: inputs.estimatedToolSchemaTokens,
    requiredOutputTokens: inputs.requiredOutputTokens,
  };
  const verdicts = filterEligible({
    request: inputs.request,
    candidates: inputs.candidates,
    policy: inputs.policy,
    tokenNeeds,
    measurements: inputs.measurements,
    nowMs: inputs.nowMs,
  });
  const ranking = rankCandidates({
    verdicts,
    costs: inputs.costs,
    ...(inputs.retainedCandidate === undefined
      ? {}
      : { retainedCandidate: inputs.retainedCandidate }),
    retentionHolds: inputs.retentionHolds,
    ...(inputs.pin === undefined ? {} : { pin: inputs.pin }),
    compound: inputs.compound,
    ...(inputs.baseline === undefined ? {} : { baseline: inputs.baseline }),
    minSavingsToSwitch: inputs.minSavingsToSwitch,
  });
  if (!ranking.ok) return ranking;

  const ordered = [ranking.primary, ...ranking.fallbacks];
  const exactTokens = sumTokens(selection.selected, inputs.estimateToolTokens);
  const byId = new Map(inputs.candidates.map((c) => [c.candidateId, c] as const));

  for (const candidateId of ordered) {
    const candidate = byId.get(candidateId);
    if (
      candidate &&
      supportsSelected(candidate, selection.selected, inputs.request) &&
      fitsExactly(candidate, inputs.inputTokens, exactTokens, inputs.requiredOutputTokens)
    ) {
      return {
        ok: true,
        decision: {
          candidate: candidateId,
          selectedTools: selection.selected,
          selectedToolIds: selection.selectedIds,
          fallbacks: ordered.filter((id) => id !== candidateId),
          schemaDigest: selection.schemaDigest,
          passesUsed: 1,
          trace: { ranking: ranking.trace, omissions: selection.omitted, repaired: false },
        },
      };
    }
  }

  return repairOnce(inputs, selection.selected, selection.omitted, ordered, byId, ranking.trace);
}

function repairOnce(
  inputs: TwoPassInputs,
  selected: ToolDefinition[],
  omissions: Omission[],
  ordered: CandidateId[],
  byId: Map<string, CandidateProfile>,
  rankingTrace: RankingTrace,
): TwoPassResult {
  // Single repair round: trim non-essential tools, then re-walk the already
  // ranked order. No new semantic judgments; essentials are never dropped.
  const trimmed = selected.filter((tool) => tool.essential);
  const trimmedOmissions: Omission[] = [
    ...omissions,
    ...selected
      .filter((tool) => !tool.essential)
      .map((tool) => ({ id: tool.id, reason: 'compatibility_repair' })),
  ];
  const exactTokens = sumTokens(trimmed, inputs.estimateToolTokens);
  for (const candidateId of ordered) {
    const candidate = byId.get(candidateId);
    if (
      candidate &&
      supportsSelected(candidate, trimmed, inputs.request) &&
      fitsExactly(candidate, inputs.inputTokens, exactTokens, inputs.requiredOutputTokens)
    ) {
      return {
        ok: true,
        decision: {
          candidate: candidateId,
          selectedTools: trimmed,
          selectedToolIds: trimmed.map((tool) => tool.id),
          fallbacks: ordered.filter((id) => id !== candidateId),
          schemaDigest: digestCanonical(trimmed),
          passesUsed: 2,
          trace: {
            ranking: rankingTrace,
            omissions: trimmedOmissions,
            repaired: true,
            repairDetail: `trimmed to ${trimmed.length} essential tools`,
          },
        },
      };
    }
  }

  const essentials = selected.filter((tool) => tool.essential);
  return failExplicit(essentials, inputs, ordered, byId);
}

/**
 * Explicit failure after the single repair round. An essential tool that no
 * ranked candidate can serve fails as unfillable; anything else is no route.
 * Nothing is silently dropped.
 */
function failExplicit(
  essentials: ToolDefinition[],
  inputs: TwoPassInputs,
  ordered: CandidateId[],
  byId: Map<string, CandidateProfile>,
): TwoPassResult {
  const essentialTokens = sumTokens(essentials, inputs.estimateToolTokens);
  const unservable = essentials.some((tool) =>
    ordered.every((candidateId) => {
      const candidate = byId.get(candidateId);
      if (!candidate) return true;
      if (!supportsSelected(candidate, [tool], inputs.request)) return true;
      return !fitsExactly(
        candidate,
        inputs.inputTokens,
        essentialTokens,
        inputs.requiredOutputTokens,
      );
    }),
  );
  if (unservable) {
    return {
      ok: false,
      error: makeError(
        'ESSENTIAL_TOOLS_DO_NOT_FIT',
        'essential tools cannot be served by any ranked candidate',
      ),
    };
  }
  return {
    ok: false,
    error: makeError(
      'NO_ELIGIBLE_MODEL',
      'no ranked candidate is compatible with the selected tools',
    ),
  };
}
