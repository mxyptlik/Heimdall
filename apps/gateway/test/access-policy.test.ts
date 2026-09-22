// T004 acceptance: restrictive intersection holds; lower levels cannot widen
// hard permissions; pins and fallback permission are unambiguous; the tenant
// comes from the authenticated identity, never request content.
import { describe, expect, it } from 'vitest';
import type { CandidateProfile, PolicyOverride, PolicyRule } from '@heimdall/contracts';
import { resolvePolicy, type ResolveInputs } from '../src/modules/access/public.js';

const CAND_A = 'cand_aaaa0001';
const CAND_B = 'cand_bbbb0002';

function platformRule(): PolicyRule {
  return {
    allowlist: [],
    quality: { reference: 'test-baseline', maxRegression: '0.05' },
    latency: { maxP99Ms: 30000 },
    reliability: { minSuccessRate: '0.99' },
    riskMinimum: 'standard',
    egress: { regions: ['region-1'], providers: ['synthetic-hosted-alpha'] },
    classifierEgress: { regions: ['region-1'], providers: ['synthetic-hosted-alpha'] },
    budgets: { hardCap: { currency: 'USD', amount: '100.00' } },
  };
}

function inputs(
  tenantOverride: PolicyOverride = {},
  applicationOverride?: PolicyOverride,
): ResolveInputs {
  return {
    platform: platformRule(),
    platformVersion: 'pol_platform0001',
    tenant: { version: 'pol_tenant00001', override: tenantOverride },
    ...(applicationOverride === undefined
      ? {}
      : { application: { version: 'pol_application01', override: applicationOverride } }),
    authenticatedTenant: 'ten_real00000001',
  };
}

describe('policy resolution', () => {
  it('passes through the platform rule with empty overrides', () => {
    const result = resolvePolicy(inputs());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effective.rule).toEqual(platformRule());
    expect(result.effective.tenant).toBe('ten_real00000001');
    expect(result.effective.versions).toEqual({
      platform: 'pol_platform0001',
      tenant: 'pol_tenant00001',
    });
  });

  it('binds the tenant from authentication, and only from authentication', () => {
    const first = resolvePolicy({ ...inputs(), authenticatedTenant: 'ten_real00000001' });
    const second = resolvePolicy({ ...inputs(), authenticatedTenant: 'ten_other0000002' });
    if (!first.ok || !second.ok) throw new Error('expected success');
    expect(first.effective.tenant).toBe('ten_real00000001');
    expect(second.effective.tenant).toBe('ten_other0000002');
  });

  it('is deterministic for identical inputs', () => {
    expect(resolvePolicy(inputs({ riskMinimum: 'high' }))).toEqual(
      resolvePolicy(inputs({ riskMinimum: 'high' })),
    );
  });

  it('narrows allowlists but rejects widening', () => {
    const narrowed = resolvePolicy({
      ...inputs(),
      platform: { ...platformRule(), allowlist: [CAND_A, CAND_B] },
      tenant: { version: 'pol_tenant00001', override: { allowlist: [CAND_A] } },
    });
    expect(narrowed.ok).toBe(true);

    const widened = resolvePolicy({
      ...inputs(),
      platform: { ...platformRule(), allowlist: [CAND_A] },
      tenant: { version: 'pol_tenant00001', override: { allowlist: [CAND_A, CAND_B] } },
    });
    expect(widened.ok).toBe(false);
    if (!widened.ok) expect(widened.error.code).toBe('POLICY_DENIED');
  });

  it('rejects clearing a platform allowlist', () => {
    const result = resolvePolicy({
      ...inputs(),
      platform: { ...platformRule(), allowlist: [CAND_A] },
      tenant: { version: 'pol_tenant00001', override: { allowlist: [] } },
    });
    expect(result.ok).toBe(false);
  });

  it('unions denials across levels', () => {
    const result = resolvePolicy(inputs({ deniedCandidates: [CAND_B] }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effective.rule.deniedCandidates).toEqual([CAND_B]);
  });

  it('keeps pins strict and unambiguous', () => {
    const strict = {
      ...inputs(),
      platform: { ...platformRule(), pin: { candidate: CAND_A, allowFallback: false } },
    };
    const loosened = resolvePolicy({
      ...strict,
      tenant: {
        version: 'pol_tenant00001',
        override: { pin: { candidate: CAND_A, allowFallback: true } },
      },
    });
    expect(loosened.ok).toBe(false);

    const replaced = resolvePolicy({
      ...strict,
      tenant: {
        version: 'pol_tenant00001',
        override: { pin: { candidate: CAND_B, allowFallback: false } },
      },
    });
    expect(replaced.ok).toBe(false);

    const pinned = resolvePolicy(inputs({ pin: { candidate: CAND_A, allowFallback: false } }));
    expect(pinned.ok).toBe(true);
    if (!pinned.ok) return;
    expect(pinned.effective.rule.pin).toEqual({ candidate: CAND_A, allowFallback: false });
  });

  it('rejects a resolved pin the effective rule forbids', () => {
    const result = resolvePolicy({
      ...inputs(),
      platform: { ...platformRule(), pin: { candidate: CAND_A, allowFallback: true } },
      tenant: { version: 'pol_tenant00001', override: { allowlist: [CAND_B] } },
    });
    expect(result.ok).toBe(false);
  });

  it('tightens quality/latency/reliability but never loosens them', () => {
    expect(
      resolvePolicy(inputs({ quality: { reference: 'test-baseline', maxRegression: '0.01' } })).ok,
    ).toBe(true);
    expect(
      resolvePolicy(inputs({ quality: { reference: 'test-baseline', maxRegression: '0.10' } })).ok,
    ).toBe(false);
    expect(
      resolvePolicy(inputs({ quality: { reference: 'other', maxRegression: '0.01' } })).ok,
    ).toBe(false);
    expect(resolvePolicy(inputs({ latency: { maxP99Ms: 1000 } })).ok).toBe(true);
    expect(resolvePolicy(inputs({ latency: { maxP99Ms: 60000 } })).ok).toBe(false);
    expect(resolvePolicy(inputs({ reliability: { minSuccessRate: '0.999' } })).ok).toBe(true);
    expect(resolvePolicy(inputs({ reliability: { minSuccessRate: '0.9' } })).ok).toBe(false);
  });

  it('raises risk tiers but never lowers the minimum', () => {
    expect(resolvePolicy(inputs({ riskMinimum: 'critical' })).ok).toBe(true);
    expect(resolvePolicy(inputs({ riskMinimum: 'low' })).ok).toBe(false);
  });

  it('intersects egress independently for completion and classifier traffic', () => {
    const twoRegion: PolicyRule = {
      ...platformRule(),
      egress: { regions: ['region-1', 'region-2'], providers: ['synthetic-hosted-alpha'] },
    };
    const narrowed = resolvePolicy({
      ...inputs({
        egress: { regions: ['region-1'], providers: ['synthetic-hosted-alpha'] },
      }),
      platform: twoRegion,
    });
    expect(narrowed.ok).toBe(true);
    if (!narrowed.ok) return;
    expect(narrowed.effective.rule.egress.regions).toEqual(['region-1']);

    const widened = resolvePolicy(
      inputs({
        egress: { regions: ['region-1', 'region-x'], providers: ['synthetic-hosted-alpha'] },
      }),
    );
    expect(widened.ok).toBe(false);
    if (!widened.ok) expect(widened.error.code).toBe('POLICY_DENIED');

    const classifierOnly = resolvePolicy(
      inputs({
        classifierEgress: { regions: ['region-1'], providers: ['synthetic-hosted-alpha'] },
      }),
    );
    expect(classifierOnly.ok).toBe(true);
    if (!classifierOnly.ok) return;
    expect(classifierOnly.effective.rule.egress).toEqual(platformRule().egress);
  });

  it('lowers hard caps but never raises or reprices them', () => {
    expect(
      resolvePolicy(inputs({ budgets: { hardCap: { currency: 'USD', amount: '50.00' } } })).ok,
    ).toBe(true);
    expect(
      resolvePolicy(inputs({ budgets: { hardCap: { currency: 'USD', amount: '500.00' } } })).ok,
    ).toBe(false);
    expect(
      resolvePolicy(inputs({ budgets: { hardCap: { currency: 'EUR', amount: '50.00' } } })).ok,
    ).toBe(false);
  });

  it('applies application overrides after tenant overrides', () => {
    const result = resolvePolicy(
      inputs({ allowlist: [CAND_A, CAND_B] }, { allowlist: [CAND_A, 'cand_cccc0003'] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('POLICY_DENIED');
  });
});
