// Effective policy resolution (T004). Pure restrictive intersection of the
// platform rule with tenant and application overrides. Lower levels narrow
// only; any widening is an explicit POLICY_DENIED conflict, never a silent
// relaxation. The tenant is bound from the authenticated identity parameter,
// never from request body content. Quotas, secrets, and admin publication
// belong to T022; persistence belongs to T020.
import {
  compareDecimals,
  makeError,
  type EffectivePolicy,
  type EgressRule,
  type HeimdallError,
  type Money,
  type PolicyOverride,
  type PolicyRule,
  type PolicyVersion,
  type RiskTier,
  type TenantId,
} from '@heimdall/contracts';

export interface PolicyLevel {
  readonly version: PolicyVersion;
  readonly override: PolicyOverride;
}

export interface ResolveInputs {
  readonly platform: PolicyRule;
  readonly platformVersion: PolicyVersion;
  readonly tenant: PolicyLevel;
  readonly application?: PolicyLevel;
  /** Authenticated tenant identity. No body field can override this. */
  readonly authenticatedTenant: TenantId;
}

export type ResolveResult =
  | { readonly ok: true; readonly effective: EffectivePolicy }
  | { readonly ok: false; readonly error: HeimdallError };

const RISK_RANK: Record<RiskTier, number> = { low: 0, standard: 1, high: 2, critical: 3 };

function riskRank(tier: RiskTier): number {
  const rank = RISK_RANK[tier];
  if (rank === undefined) throw new Error(`unknown risk tier: ${tier}`);
  return rank;
}

function conflict(message: string): ResolveResult {
  return { ok: false, error: makeError('POLICY_DENIED', message) };
}

/** True when `a` charges no more than `b`. Cross-currency amounts are incomparable. */
function moneyLessOrEqual(a: Money, b: Money): boolean | undefined {
  if (a.currency !== b.currency) return undefined;
  const comparison = compareDecimals(a.amount, b.amount);
  if (comparison === undefined) return undefined;
  return comparison <= 0;
}

function isSubset(candidate: readonly string[], allowed: readonly string[]): boolean {
  return candidate.every((v) => allowed.includes(v));
}

function union(base: readonly string[], extra: readonly string[]): string[] {
  const out = [...base];
  for (const v of extra) if (!out.includes(v)) out.push(v);
  return out;
}

function narrowEgress(level: string, current: EgressRule, next: EgressRule): EgressRule | string {
  if (!isSubset(next.regions, current.regions)) {
    return `${level} egress regions widen platform rule`;
  }
  if (!isSubset(next.providers, current.providers)) {
    return `${level} egress providers widen platform rule`;
  }
  return { regions: [...next.regions], providers: [...next.providers] };
}

function applyOverride(
  level: string,
  current: PolicyRule,
  override: PolicyOverride,
): PolicyRule | string {
  const rule: PolicyRule = structuredClone(current);

  if (override.allowlist !== undefined) {
    if (override.allowlist.length === 0 && rule.allowlist.length > 0) {
      return `${level} allowlist would remove platform restrictions`;
    }
    if (rule.allowlist.length > 0 && !isSubset(override.allowlist, rule.allowlist)) {
      return `${level} allowlist widens platform rule`;
    }
    rule.allowlist = [...override.allowlist];
  }
  if (override.deniedCandidates !== undefined) {
    rule.deniedCandidates = union(rule.deniedCandidates ?? [], override.deniedCandidates);
  }
  if (override.pin !== undefined) {
    if (rule.pin !== undefined) {
      if (override.pin.candidate !== rule.pin.candidate) {
        return `${level} pin would replace the platform pin`;
      }
      if (override.pin.allowFallback && !rule.pin.allowFallback) {
        return `${level} pin would permit fallback the platform forbids`;
      }
    } else {
      const permitted =
        (rule.allowlist.length === 0 || rule.allowlist.includes(override.pin.candidate)) &&
        !(rule.deniedCandidates ?? []).includes(override.pin.candidate);
      if (!permitted) return `${level} pin names a candidate the rule forbids`;
    }
    rule.pin = { ...override.pin };
  }
  if (override.quality !== undefined) {
    if (override.quality.reference !== rule.quality.reference) {
      return `${level} quality reference changes the baseline under comparison`;
    }
    const regression = compareDecimals(override.quality.maxRegression, rule.quality.maxRegression);
    if (regression === undefined || regression === 1) {
      return `${level} quality regression tolerance widens platform rule`;
    }
    rule.quality = { ...override.quality };
  }
  if (override.latency !== undefined) {
    if (override.latency.maxP99Ms > rule.latency.maxP99Ms) {
      return `${level} latency limit widens platform rule`;
    }
    if (
      override.latency.maxTimeToFirstTokenMs !== undefined &&
      (rule.latency.maxTimeToFirstTokenMs === undefined ||
        override.latency.maxTimeToFirstTokenMs > rule.latency.maxTimeToFirstTokenMs)
    ) {
      return `${level} time-to-first-token limit widens platform rule`;
    }
    rule.latency = { ...override.latency };
  }
  if (override.reliability !== undefined) {
    const floor = compareDecimals(
      override.reliability.minSuccessRate,
      rule.reliability.minSuccessRate,
    );
    if (floor === undefined || floor === -1) {
      return `${level} reliability floor lowers the platform rule`;
    }
    rule.reliability = { ...override.reliability };
  }
  if (override.riskMinimum !== undefined) {
    if (riskRank(override.riskMinimum) < riskRank(rule.riskMinimum)) {
      return `${level} risk tier lowers the platform minimum`;
    }
    rule.riskMinimum = override.riskMinimum;
  }
  if (override.egress !== undefined) {
    const narrowed = narrowEgress(`${level} completion`, rule.egress, override.egress);
    if (typeof narrowed === 'string') return narrowed;
    rule.egress = narrowed;
  }
  if (override.classifierEgress !== undefined) {
    const narrowed = narrowEgress(
      `${level} classifier`,
      rule.classifierEgress,
      override.classifierEgress,
    );
    if (typeof narrowed === 'string') return narrowed;
    rule.classifierEgress = narrowed;
  }
  if (override.budgets !== undefined) {
    const cap = moneyLessOrEqual(override.budgets.hardCap, rule.budgets.hardCap);
    if (cap !== true) return `${level} hard cap raises or reprices the platform cap`;
    if (override.budgets.softTarget !== undefined) {
      const soft = moneyLessOrEqual(override.budgets.softTarget, rule.budgets.hardCap);
      const base = rule.budgets.softTarget;
      const softBase =
        base === undefined ? true : moneyLessOrEqual(override.budgets.softTarget, base);
      if (soft !== true || softBase !== true) {
        return `${level} soft target exceeds an enforced bound`;
      }
    }
    rule.budgets = { ...override.budgets };
  }
  return rule;
}

/**
 * Resolve the effective policy for an authenticated tenant. Deterministic:
 * identical inputs and versions yield the identical rule.
 */
export function resolvePolicy(inputs: ResolveInputs): ResolveResult {
  let rule = structuredClone(inputs.platform);
  const tenantNarrowed = applyOverride('tenant', rule, inputs.tenant.override);
  if (typeof tenantNarrowed === 'string') return conflict(tenantNarrowed);
  rule = tenantNarrowed;
  if (inputs.application !== undefined) {
    const appNarrowed = applyOverride('application', rule, inputs.application.override);
    if (typeof appNarrowed === 'string') return conflict(appNarrowed);
    rule = appNarrowed;
  }
  if (rule.pin !== undefined) {
    const pinned = rule.pin.candidate;
    const permitted =
      (rule.allowlist.length === 0 || rule.allowlist.includes(pinned)) &&
      !(rule.deniedCandidates ?? []).includes(pinned);
    if (!permitted) return conflict('resolved pin names a candidate the effective rule forbids');
  }
  return {
    ok: true,
    effective: {
      tenant: inputs.authenticatedTenant,
      rule,
      versions: {
        platform: inputs.platformVersion,
        tenant: inputs.tenant.version,
        ...(inputs.application === undefined ? {} : { application: inputs.application.version }),
      },
    },
  };
}
