// Semantic decision-engine port specification (T008). Typed judgments with
// full probability preservation; independent batch A and tool-dependent
// batch B; versioned rubrics, projector spec, and engine limits. This is the
// replaceable port: only `understanding/adapters/jev` (T025) may import the
// vendor SDK. Deterministic policy owns arithmetic and hard checks; Jev
// confidence is a distribution summary, never measured task success.
//
// Excluded by product decision: complexity prediction, goal definition,
// free-form planning, dollar estimates, and model intelligence scores.
export type QuestionKind = 'noul' | 'choice' | 'score';

export interface RubricEntry {
  readonly name: string;
  /** Rubric version. Rubric, projector, or engine changes invalidate calibration and feature-cache versions. */
  readonly version: string;
  readonly kind: QuestionKind;
  /** A: independent over shared state. B: needs batch-A outputs plus a code-built shortlist. */
  readonly batch: 'A' | 'B';
  /** State fields consumed (caller state, messages, catalog projection). Never another answer in batch A. */
  readonly inputFields: readonly string[];
  /** Dependency edges: 'request', 'catalog', or 'batchA.<name>'. */
  readonly requires: readonly string[];
  readonly criteria: string;
  /** Behavior on uncertain, failed, or malformed judgment. Never relaxes hard policy. */
  readonly unknownPath: string;
  /** Downstream owner of the judgment. */
  readonly consumer: string;
  readonly options?: readonly string[];
  readonly levels?: readonly string[];
  /** Batch-B entries are parameterized (for example by shortlisted tool). */
  readonly parameterizedBy?: string;
}

/** Versioned rubric registry. Small global primitives plus application labels; no huge taxonomy. */
export const RUBRICS: readonly RubricEntry[] = [
  {
    name: 'continuity',
    version: 'v1',
    kind: 'noul',
    batch: 'A',
    inputFields: ['routingState', 'messages'],
    requires: ['request'],
    criteria:
      'Does the current work continue the caller-supplied objective (objective continuity, not topic similarity)?',
    unknownPath: 'Retain the current candidate: uncertain boundaries mean continuation.',
    consumer: 'T013 continuity reducer',
  },
  {
    name: 'intent',
    version: 'v1',
    kind: 'choice',
    batch: 'A',
    inputFields: ['messages'],
    requires: ['request'],
    criteria:
      'Select the dominant coding-task family; use other when none fits rather than forcing a wrong label.',
    unknownPath: 'Label other; never blocks eligibility.',
    consumer: 'T015/T027 ranking evidence',
    options: [
      'bug-fix',
      'test-writing',
      'refactor',
      'documentation',
      'explanation',
      'code-generation',
      'review',
      'other',
    ],
  },
  {
    name: 'riskEscalation',
    version: 'v1',
    kind: 'noul',
    batch: 'A',
    inputFields: ['messages', 'declaredImportance'],
    requires: ['request'],
    criteria: 'Does the work carry elevated harm or quality-sensitivity beyond the declared tier?',
    unknownPath:
      'Keep the declared tier; inference may raise caution, never lower declared requirements.',
    consumer: 'T004 floor enforcement',
  },
  {
    name: 'toolNeed',
    version: 'v1',
    kind: 'noul',
    batch: 'A',
    inputFields: ['messages', 'toolSelection.enabled'],
    requires: ['request'],
    criteria: 'Is any caller-authorized tool needed for this invocation?',
    unknownPath: 'False unless tool selection is enabled with a non-empty catalog.',
    consumer: 'T014 shortlist gating',
  },
  {
    name: 'searchNeed',
    version: 'v1',
    kind: 'noul',
    batch: 'A',
    inputFields: ['messages'],
    requires: ['request'],
    criteria:
      'Does the work need web or codebase search? Independent of retrieval and generation flags.',
    unknownPath: 'False.',
    consumer: 'T014 shortlist gating',
  },
  {
    name: 'retrievalNeed',
    version: 'v1',
    kind: 'noul',
    batch: 'A',
    inputFields: ['messages'],
    requires: ['request'],
    criteria:
      'Does the work need retrieved (RAG) context? Independent of search and generation flags.',
    unknownPath: 'False.',
    consumer: 'T014 shortlist gating',
  },
  {
    name: 'generationNeed',
    version: 'v1',
    kind: 'noul',
    batch: 'A',
    inputFields: ['messages'],
    requires: ['request'],
    criteria: 'Does the work need the model to generate new content (code, prose, patches)?',
    unknownPath:
      'True for coding-agent invocations without evidence otherwise; chat/RAG default false.',
    consumer: 'T014 shortlist gating',
  },
  {
    name: 'outputCategory',
    version: 'v1',
    kind: 'choice',
    batch: 'A',
    inputFields: ['messages', 'outputSchema'],
    requires: ['request'],
    criteria:
      'Bounded output category for undeclared responses; an explicit outputSchema wins over inference.',
    unknownPath: 'Label other.',
    consumer: 'T015 ranking context',
    options: ['code', 'tests', 'prose', 'patch', 'structured', 'other'],
  },
  {
    name: 'toolRelevance',
    version: 'v1',
    kind: 'noul',
    batch: 'B',
    inputFields: ['toolId', 'toolDescription', 'messages'],
    requires: ['catalog', 'batchA.toolNeed'],
    criteria: 'Is this shortlisted authorized tool relevant to the current invocation?',
    unknownPath:
      'Exclude unless the tool is essential: essential tools are preserved by the code rule.',
    consumer: 'T014 relevance interpretation',
    parameterizedBy: 'toolId',
  },
];

/** Answers preserve full distributions. Collapsing to a label discards uncertainty. */
export interface NoulAnswer {
  readonly question: string;
  /** Probability the proposition holds. Noul carries no separate confidence field. */
  readonly probability: number;
}

export interface DistributionEntry {
  readonly option: string;
  readonly probability: number;
}

export interface ChoiceAnswer {
  readonly question: string;
  readonly distribution: readonly DistributionEntry[];
}

export interface ScoreAnswer {
  readonly question: string;
  readonly distribution: readonly DistributionEntry[];
}

export type SemanticAnswer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

/** Engine and protocol limits. Dated documentation snapshot; T025 rechecks versions, models, and SDK behavior before shipping. */
export const ENGINE_SPEC = {
  engine: 'typesafe-jev',
  pinnedModel: 'jev-1.13.0',
  textOnly: true,
  maxTotalTokens: 64000,
  maxStatePlusLongestQuestionTokens: 32000,
  /** Operative working budget, substantially below the documented ceiling. */
  workingBudgetTokens: 8000,
  choiceMaxOptions: 255,
  scoreMinLevels: 2,
  scoreMaxLevels: 10,
  /** Documented per-attempt SDK timeout. Heimdall additionally bounds every call by the total request deadline via a shared AbortSignal. */
  sdkTimeoutMs: 10000,
  /** First prototype configures no SDK-level retries; one measured transient retry may follow if the deadline permits. */
  sdkRetriesDefault: 0,
} as const;

/** Compact-state projector specification. Implementation belongs to T026. */
export const PROJECTOR_SPEC = {
  version: 'v1',
  maxStateTokens: 4000,
  textOnly: true,
  includes: ['objective', 'recentTurns', 'toolContext'],
} as const;

/** Validate the registry. Returns human-readable violations, empty when clean. */
export function validateRegistry(rubrics: readonly RubricEntry[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const entry of rubrics) {
    if (seen.has(entry.name)) errors.push(`duplicate question: ${entry.name}`);
    seen.add(entry.name);
    if (!/^v\d+$/.test(entry.version)) errors.push(`${entry.name}: version must look like vN`);
    if (entry.inputFields.length === 0) errors.push(`${entry.name}: names no input fields`);
    if (entry.criteria.length === 0) errors.push(`${entry.name}: names no criteria`);
    if (entry.unknownPath.length === 0) errors.push(`${entry.name}: names no unknown path`);
    if (entry.consumer.length === 0) errors.push(`${entry.name}: names no consumer`);
    if (entry.kind === 'choice') {
      const count = entry.options?.length ?? 0;
      if (count < 2 || count > ENGINE_SPEC.choiceMaxOptions) {
        errors.push(`${entry.name}: choice needs 2..${ENGINE_SPEC.choiceMaxOptions} options`);
      }
    }
    if (entry.kind === 'score') {
      const count = entry.levels?.length ?? 0;
      if (count < ENGINE_SPEC.scoreMinLevels || count > ENGINE_SPEC.scoreMaxLevels) {
        errors.push(
          `${entry.name}: score needs ${ENGINE_SPEC.scoreMinLevels}..${ENGINE_SPEC.scoreMaxLevels} levels`,
        );
      }
    }
    if (entry.batch === 'A') {
      for (const dep of entry.requires) {
        if (dep.startsWith('batchA.'))
          errors.push(`${entry.name}: batch-A question depends on ${dep}`);
      }
    }
    if (entry.batch === 'B' && !entry.requires.some((dep) => dep.startsWith('batchA.'))) {
      errors.push(`${entry.name}: batch-B question needs a batch-A dependency or shortlist input`);
    }
  }
  return errors;
}

export interface BatchPlan {
  readonly batchA: string[];
  readonly batchB: string[];
}

/** Split questions into the independent batch and the dependent batch. */
export function planBatches(rubrics: readonly RubricEntry[]): BatchPlan {
  return {
    batchA: rubrics.filter((r) => r.batch === 'A').map((r) => r.name),
    batchB: rubrics.filter((r) => r.batch === 'B').map((r) => r.name),
  };
}

/**
 * Exact classifier-budget check. All comparisons are integer token counts:
 * operative working budget, then both documented ceilings.
 */
export function fitsClassifierBudget(stateTokens: number, questionTokens: number[]): boolean {
  if (!Number.isInteger(stateTokens) || stateTokens < 0) return false;
  if (questionTokens.some((q) => !Number.isInteger(q) || q < 0)) return false;
  if (questionTokens.length === 0) return false;
  const longest = Math.max(...questionTokens);
  const total = stateTokens + questionTokens.reduce((a, b) => a + b, 0);
  return (
    total <= ENGINE_SPEC.workingBudgetTokens &&
    stateTokens + longest <= ENGINE_SPEC.maxStatePlusLongestQuestionTokens &&
    total <= ENGINE_SPEC.maxTotalTokens
  );
}

/** Stable top-1 of a choice distribution. Ties keep registry option order. */
export function choiceTop1(answer: ChoiceAnswer): string | undefined {
  let best: DistributionEntry | undefined;
  for (const entry of answer.distribution) {
    if (best === undefined || entry.probability > best.probability) best = entry;
  }
  return best?.option;
}

/**
 * Shannon entropy of a choice distribution, in bits. Measures answer spread
 * only: a concentrated distribution can still be wrong, and entropy is never
 * downstream task success.
 */
export function choiceEntropyBits(answer: ChoiceAnswer): number {
  let entropy = 0;
  for (const entry of answer.distribution) {
    if (entry.probability > 0) entropy -= entry.probability * Math.log2(entry.probability);
  }
  return entropy;
}
