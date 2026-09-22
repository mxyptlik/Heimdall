// Task continuity and model-retention rules (T013). Pure reducer over caller
// state, the mapped continuity judgment, and eligibility facts. Coding agents
// retain their model across a continuing task; chat, RAG, and other profiles
// select per invocation. Uncertainty retains; only a clear new task, an
// explicit caller reevaluation, or mandatory eligibility loss reselects.
// Lack of progress alone never triggers automatic reevaluation: it arrives,
// if at all, as a caller reevaluation reason. Tool-only changes never reach
// this reducer with a model question. Stale connector revisions are rejected
// so an older response cannot overwrite newer state.
import {
  makeError,
  type ApplicationProfile,
  type CandidateId,
  type HeimdallError,
  type ModelPin,
  type ReevaluationReason,
  type RoutingState,
} from '@heimdall/contracts';

export type ContinuityCode = 'first_selection' | 'retained' | 'reselect' | 'rejected_stale';

export type ContinuityDecision =
  | {
      readonly action: 'retain';
      readonly candidate: CandidateId;
      readonly code: ContinuityCode;
      readonly detail: string;
    }
  | {
      readonly action: 'select';
      readonly code: ContinuityCode;
      readonly detail: string;
      readonly pinnedTo?: CandidateId;
    }
  | { readonly action: 'reject'; readonly code: ContinuityCode; readonly error: HeimdallError };

export interface ContinuityInputs {
  readonly profile: ApplicationProfile;
  readonly priorCandidate?: CandidateId;
  readonly priorState?: RoutingState;
  /** Mapped continuity judgment: does the work continue the caller objective? */
  readonly continues: boolean;
  /** Judgment uncertainty. Uncertain boundaries retain by default. */
  readonly uncertain: boolean;
  readonly reevaluation?: ReevaluationReason;
  readonly pin?: ModelPin;
  /** Current hard eligibility of the retained candidate. */
  readonly retainedEligible: boolean;
  /** True when the caller revision trails the connector's newest state. */
  readonly stateRevisionStale: boolean;
  /** True when one request carries several tasks: the most capable eligible model serves all of it. */
  readonly compound?: boolean;
}

function select(detail: string, pin?: ModelPin): ContinuityDecision {
  return {
    action: 'select',
    code: 'reselect',
    detail,
    ...(pin === undefined ? {} : { pinnedTo: pin.candidate }),
  };
}

/**
 * Reduce continuity inputs to retain, select, or reject. Deterministic and
 * total: every input combination yields exactly one decision.
 */
export function reduceContinuity(inputs: ContinuityInputs): ContinuityDecision {
  if (inputs.stateRevisionStale) {
    return {
      action: 'reject',
      code: 'rejected_stale',
      error: makeError(
        'INVALID_REQUEST',
        'stale routing state: refresh from the newest connector state',
      ),
    };
  }
  if (inputs.profile !== 'coding-agent') {
    return {
      action: 'select',
      code: 'first_selection',
      detail: `${inputs.profile} routes per invocation`,
    };
  }
  if (inputs.priorCandidate === undefined) {
    return { action: 'select', code: 'first_selection', detail: 'no retained candidate yet' };
  }
  if (!inputs.retainedEligible) {
    return select(`retained candidate ${inputs.priorCandidate} is no longer eligible`, inputs.pin);
  }
  if (inputs.compound === true) {
    return select('compound request uses one most-capable eligible model', inputs.pin);
  }
  if (inputs.reevaluation !== undefined) {
    return select(`explicit caller reevaluation: ${inputs.reevaluation}`, inputs.pin);
  }
  if (inputs.uncertain) {
    return {
      action: 'retain',
      candidate: inputs.priorCandidate,
      code: 'retained',
      detail: 'uncertain boundary retains the eligible model',
    };
  }
  if (!inputs.continues) {
    return select('clear new task', inputs.pin);
  }
  return {
    action: 'retain',
    candidate: inputs.priorCandidate,
    code: 'retained',
    detail: 'continuing task keeps the eligible model across tool-only changes',
  };
}
