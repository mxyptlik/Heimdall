/* Generated from src/schemas/heimdall.v1.json — do not edit. */
import type { SchemaObject } from 'ajv/dist/2020.js';
export const CONTRACT_SCHEMA_ID = 'https://heimdall/schemas/contracts/v1' as const;
export const ROOT_SCHEMA: SchemaObject = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://heimdall/schemas/contracts/v1',
  title: 'Heimdall contracts v1',
  description:
    'Single schema source for Heimdall V1 contract primitives and error vocabulary (T002). Generated TypeScript and OpenAPI components derive from this file; never edit generated output. Request/result composition belongs to later tasks (T005+).',
  type: 'object',
  properties: {},
  additionalProperties: false,
  $defs: {
    requestId: {
      title: 'RequestId',
      description:
        'Opaque gateway request identifier. No task-ID fields exist in V1; taskId/task_id/taskID are rejected as unknown properties.',
      type: 'string',
      pattern: '^req_[A-Za-z0-9_-]{8,96}$',
      maxLength: 100,
    },
    decisionId: {
      title: 'DecisionId',
      description: 'Identifier for one routing decision, not a task.',
      type: 'string',
      pattern: '^dec_[A-Za-z0-9_-]{8,96}$',
      maxLength: 100,
    },
    attemptId: {
      title: 'AttemptId',
      description: 'Identifier for one model invocation attempt within a decision.',
      type: 'string',
      pattern: '^att_[A-Za-z0-9_-]{8,96}$',
      maxLength: 100,
    },
    currency: {
      title: 'Currency',
      description:
        'Three-letter uppercase currency code (ISO-4217-shaped). A full allowlist is deferred to real price ingestion (T032).',
      type: 'string',
      pattern: '^[A-Z]{3}$',
    },
    decimalAmount: {
      title: 'DecimalAmount',
      description:
        'Exact decimal money string. Binary floats are never used for billing arithmetic.',
      type: 'string',
      pattern: '^-?\\d{1,18}(\\.\\d{1,9})?$',
      maxLength: 32,
    },
    money: {
      title: 'Money',
      description: 'Exact money value with declared currency.',
      type: 'object',
      properties: {
        currency: {
          $ref: '#/$defs/currency',
        },
        amount: {
          $ref: '#/$defs/decimalAmount',
        },
      },
      required: ['currency', 'amount'],
      additionalProperties: false,
    },
    tokenCount: {
      title: 'TokenCount',
      description:
        'Non-negative exact token count. Values above Number.MAX_SAFE_INTEGER are rejected as unsafe.',
      type: 'integer',
      minimum: 0,
      maximum: 9007199254740991,
    },
    timestamp: {
      title: 'Timestamp',
      description:
        'RFC3339 date-time string with bounded length. The pattern checks field ranges (month, day, hour, minute, second, offset); impossible calendar dates such as February 30 pass the shape check and are a consumer concern.',
      type: 'string',
      pattern:
        '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])T([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(\\.\\d{1,9})?(Z|[+-]([01]\\d|2[0-3]):[0-5]\\d)$',
      maxLength: 64,
    },
    durationMs: {
      title: 'DurationMs',
      description: 'Non-negative duration in whole milliseconds.',
      type: 'integer',
      minimum: 0,
      maximum: 9007199254740991,
    },
    applicationProfile: {
      title: 'ApplicationProfile',
      description:
        'Required caller application profile. Coding agents retain models per task; chat and RAG route per invocation.',
      type: 'string',
      enum: ['coding-agent', 'chat', 'rag'],
    },
    modality: {
      title: 'Modality',
      description:
        'All V1-declared modalities. Presence in the contract is not proof of runtime support; adapters advertise verified support only.',
      type: 'string',
      enum: ['text', 'image', 'audio', 'video', 'file', 'mixed'],
    },
    executionCertainty: {
      title: 'ExecutionCertainty',
      description:
        'How certain Heimdall is that a billable provider call executed. A lost connection never proves zero cost.',
      type: 'string',
      enum: ['not_started', 'possibly_started', 'started', 'completed'],
    },
    errorCode: {
      title: 'ErrorCode',
      description:
        'Typed gateway error vocabulary. Unknown codes fail validation by design; consumers handle them by upgrading, not guessing.',
      type: 'string',
      enum: [
        'INVALID_REQUEST',
        'POLICY_DENIED',
        'UNSUPPORTED_OPTION',
        'NO_ELIGIBLE_MODEL',
        'INSUFFICIENT_EVIDENCE',
        'ESSENTIAL_TOOLS_DO_NOT_FIT',
        'CLASSIFIER_UNAVAILABLE',
        'CATALOG_STALE',
        'CONTEXT_OVERFLOW',
        'BUDGET_EXCEEDED',
        'DEADLINE_EXCEEDED',
        'PROVIDER_UNAVAILABLE',
        'PROVIDER_PROTOCOL_ERROR',
        'STREAM_INTERRUPTED',
        'STALE_PREPARED_ROUTE',
        'IDEMPOTENCY_CONFLICT',
        'CANCELLED',
      ],
    },
    extensions: {
      title: 'Extensions',
      description:
        'Reserved forward-compatibility object. No keys are allowed in v1; each future key is an additive minor version change. Unknown keys are rejected, never silently dropped.',
      type: 'object',
      properties: {},
      additionalProperties: false,
      maxProperties: 8,
    },
    textBlock: {
      title: 'TextBlock',
      description:
        'Plain text content. The only modality with first-slice runtime support; others are expressible but rejected by adapters until verified.',
      type: 'object',
      properties: {
        type: {
          const: 'text',
        },
        text: {
          type: 'string',
          minLength: 1,
          maxLength: 200000,
        },
      },
      required: ['type', 'text'],
      additionalProperties: false,
    },
    urlSource: {
      title: 'UrlSource',
      description:
        'External content reference by URL. Server-side fetching, if ever needed, is allowlisted per adapter; no fetching exists in v1.',
      type: 'object',
      properties: {
        url: {
          type: 'string',
          pattern: '^https?://',
          maxLength: 2048,
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
    refSource: {
      title: 'RefSource',
      description:
        'Caller-held content reference. The gateway never dereferences it; adapters declare what they accept.',
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          pattern: '^[\\w./-]{1,1024}$',
          maxLength: 1024,
        },
      },
      required: ['ref'],
      additionalProperties: false,
    },
    mimeType: {
      title: 'MimeType',
      type: 'string',
      pattern: '^[a-z]+/[a-z0-9.+-]+$',
      maxLength: 128,
    },
    imageBlock: {
      title: 'ImageBlock',
      description:
        'Image requirement. A description never erases the hard requirement to support the image itself.',
      type: 'object',
      properties: {
        type: {
          const: 'image',
        },
        source: {
          oneOf: [
            {
              $ref: '#/$defs/urlSource',
            },
            {
              $ref: '#/$defs/refSource',
            },
          ],
        },
        mimeType: {
          $ref: '#/$defs/mimeType',
        },
        description: {
          type: 'string',
          maxLength: 200000,
        },
      },
      required: ['type', 'source'],
      additionalProperties: false,
    },
    audioBlock: {
      title: 'AudioBlock',
      type: 'object',
      properties: {
        type: {
          const: 'audio',
        },
        source: {
          oneOf: [
            {
              $ref: '#/$defs/urlSource',
            },
            {
              $ref: '#/$defs/refSource',
            },
          ],
        },
        mimeType: {
          $ref: '#/$defs/mimeType',
        },
        description: {
          type: 'string',
          maxLength: 200000,
        },
      },
      required: ['type', 'source'],
      additionalProperties: false,
    },
    videoBlock: {
      title: 'VideoBlock',
      type: 'object',
      properties: {
        type: {
          const: 'video',
        },
        source: {
          oneOf: [
            {
              $ref: '#/$defs/urlSource',
            },
            {
              $ref: '#/$defs/refSource',
            },
          ],
        },
        mimeType: {
          $ref: '#/$defs/mimeType',
        },
        description: {
          type: 'string',
          maxLength: 200000,
        },
      },
      required: ['type', 'source'],
      additionalProperties: false,
    },
    fileBlock: {
      title: 'FileBlock',
      description: 'File/document requirement (text, PDF, archive, or other opaque document).',
      type: 'object',
      properties: {
        type: {
          const: 'file',
        },
        source: {
          oneOf: [
            {
              $ref: '#/$defs/urlSource',
            },
            {
              $ref: '#/$defs/refSource',
            },
          ],
        },
        mimeType: {
          $ref: '#/$defs/mimeType',
        },
        description: {
          type: 'string',
          maxLength: 200000,
        },
      },
      required: ['type', 'source'],
      additionalProperties: false,
    },
    mixedBlock: {
      title: 'MixedBlock',
      description: 'Bounded mixed-modality content. Depth beyond nesting limits is rejected.',
      type: 'object',
      properties: {
        type: {
          const: 'mixed',
        },
        parts: {
          type: 'array',
          minItems: 1,
          maxItems: 64,
          items: {
            $ref: '#/$defs/contentBlock',
          },
        },
      },
      required: ['type', 'parts'],
      additionalProperties: false,
    },
    contentBlock: {
      title: 'ContentBlock',
      description: 'Any single content block across all declared modalities.',
      oneOf: [
        {
          $ref: '#/$defs/textBlock',
        },
        {
          $ref: '#/$defs/imageBlock',
        },
        {
          $ref: '#/$defs/audioBlock',
        },
        {
          $ref: '#/$defs/videoBlock',
        },
        {
          $ref: '#/$defs/fileBlock',
        },
        {
          $ref: '#/$defs/mixedBlock',
        },
      ],
    },
    heimdallError: {
      title: 'HeimdallError',
      description:
        'Typed error envelope. Certainty is per-occurrence, never inferred from the code alone.',
      type: 'object',
      properties: {
        code: {
          $ref: '#/$defs/errorCode',
        },
        message: {
          type: 'string',
          minLength: 1,
          maxLength: 1024,
        },
        retryable: {
          type: 'boolean',
        },
        certainty: {
          $ref: '#/$defs/executionCertainty',
        },
        requestId: {
          $ref: '#/$defs/requestId',
        },
        decisionId: {
          $ref: '#/$defs/decisionId',
        },
        attemptId: {
          $ref: '#/$defs/attemptId',
        },
        extensions: {
          $ref: '#/$defs/extensions',
        },
      },
      required: ['code', 'message', 'retryable'],
      additionalProperties: false,
    },
    capabilityState: {
      title: 'CapabilityState',
      description:
        'Hard capability evidence status. Unknown is first-class and never treated as verified support or as false.',
      type: 'string',
      enum: ['unknown', 'verified', 'unsupported'],
    },
    evidenceKind: {
      title: 'EvidenceKind',
      description:
        'Provenance class of a profile claim. Fixture evidence is synthetic and barred from production.',
      type: 'string',
      enum: ['declared', 'measured', 'fixture'],
    },
    candidateId: {
      title: 'CandidateId',
      description:
        'Opaque model-candidate identifier (provider, model/version, and material configuration).',
      type: 'string',
      pattern: '^cand_[A-Za-z0-9_-]{8,96}$',
      maxLength: 100,
    },
    revisionId: {
      title: 'RevisionId',
      description: 'Opaque profile-revision identifier.',
      type: 'string',
      pattern: '^rev_[A-Za-z0-9_-]{8,96}$',
      maxLength: 100,
    },
    providerFamily: {
      title: 'ProviderFamily',
      description:
        'Provider family key. Lowercase-hyphenated; vendor-neutral, never a vendor-specific core type.',
      type: 'string',
      pattern: '^[a-z][a-z0-9-]{1,63}$',
      maxLength: 64,
    },
    modelRef: {
      title: 'ModelRef',
      description:
        'Model version or documented alias plus alias-resolution status. An unresolved live alias is recorded as such and limits reproducibility claims.',
      type: 'object',
      properties: {
        model: {
          type: 'string',
          minLength: 1,
          maxLength: 256,
        },
        resolvedRevision: {
          type: 'string',
          minLength: 1,
          maxLength: 256,
        },
        unresolvedAlias: {
          type: 'boolean',
        },
      },
      required: ['model', 'unresolvedAlias'],
      additionalProperties: false,
    },
    modalitySupport: {
      title: 'ModalitySupport',
      description:
        'Per-modality hard support. Every key is explicit; domain code maps an absent record to unknown, never to false.',
      type: 'object',
      properties: {
        text: {
          $ref: '#/$defs/capabilityState',
        },
        image: {
          $ref: '#/$defs/capabilityState',
        },
        audio: {
          $ref: '#/$defs/capabilityState',
        },
        video: {
          $ref: '#/$defs/capabilityState',
        },
        file: {
          $ref: '#/$defs/capabilityState',
        },
        mixed: {
          $ref: '#/$defs/capabilityState',
        },
      },
      required: ['text', 'image', 'audio', 'video', 'file', 'mixed'],
      additionalProperties: false,
    },
    toolSupport: {
      title: 'ToolSupport',
      description:
        'Generic tool-calling and structured-output support. Measured success with specific catalogs is quality evidence, not part of this signal.',
      type: 'object',
      properties: {
        genericToolCalling: {
          $ref: '#/$defs/capabilityState',
        },
        structuredOutput: {
          $ref: '#/$defs/capabilityState',
        },
      },
      required: ['genericToolCalling', 'structuredOutput'],
      additionalProperties: false,
    },
    safeCapacity: {
      title: 'SafeCapacity',
      description:
        'Empirically safe token capacity with explicit output reserve, not advertised maxima.',
      type: 'object',
      properties: {
        safeInputTokens: {
          $ref: '#/$defs/tokenCount',
        },
        safeOutputTokens: {
          $ref: '#/$defs/tokenCount',
        },
        outputReserveTokens: {
          $ref: '#/$defs/tokenCount',
        },
      },
      required: ['safeInputTokens', 'safeOutputTokens', 'outputReserveTokens'],
      additionalProperties: false,
    },
    regionCode: {
      title: 'RegionCode',
      type: 'string',
      pattern: '^[A-Za-z0-9_-]{1,64}$',
      maxLength: 64,
    },
    endpointPolicy: {
      title: 'EndpointPolicy',
      description:
        'Where and through which providers a candidate may serve. Lists are explicit; emptiness is rejected rather than read as unrestricted.',
      type: 'object',
      properties: {
        regions: {
          type: 'array',
          minItems: 1,
          maxItems: 64,
          items: {
            $ref: '#/$defs/regionCode',
          },
        },
        providers: {
          type: 'array',
          minItems: 1,
          maxItems: 16,
          items: {
            $ref: '#/$defs/providerFamily',
          },
        },
        allowsLocal: {
          type: 'boolean',
        },
      },
      required: ['regions', 'providers', 'allowsLocal'],
      additionalProperties: false,
    },
    priceRate: {
      title: 'PriceRate',
      description: 'Exact price per one million units in the stated currency.',
      type: 'object',
      properties: {
        currency: {
          $ref: '#/$defs/currency',
        },
        perMillionUnits: {
          $ref: '#/$defs/decimalAmount',
        },
      },
      required: ['currency', 'perMillionUnits'],
      additionalProperties: false,
    },
    priceSchedule: {
      title: 'PriceSchedule',
      description:
        'Effective-dated price record. Cross-rate currency consistency is checked in domain code, not in this schema.',
      type: 'object',
      properties: {
        effectiveAt: {
          $ref: '#/$defs/timestamp',
        },
        input: {
          $ref: '#/$defs/priceRate',
        },
        cachedInput: {
          $ref: '#/$defs/priceRate',
        },
        output: {
          $ref: '#/$defs/priceRate',
        },
        reasoning: {
          $ref: '#/$defs/priceRate',
        },
        request: {
          $ref: '#/$defs/priceRate',
        },
      },
      required: ['effectiveAt', 'input', 'output'],
      additionalProperties: false,
    },
    fraction: {
      title: 'Fraction',
      description: 'Exact decimal fraction between 0 and 1 inclusive.',
      type: 'string',
      pattern: '^(0(\\.\\d{1,9})?|1(\\.0{1,9})?)$',
      maxLength: 12,
    },
    evidenceRecord: {
      title: 'EvidenceRecord',
      description:
        'One sourced claim with observation time, optional expiry and sample size, and uncertainty. No unattributed specialization labels.',
      type: 'object',
      properties: {
        kind: {
          $ref: '#/$defs/evidenceKind',
        },
        source: {
          type: 'string',
          minLength: 1,
          maxLength: 512,
        },
        observedAt: {
          $ref: '#/$defs/timestamp',
        },
        expiresAt: {
          $ref: '#/$defs/timestamp',
        },
        sampleCount: {
          type: 'integer',
          minimum: 0,
          maximum: 9007199254740991,
        },
        uncertainty: {
          $ref: '#/$defs/fraction',
        },
      },
      required: ['kind', 'source', 'observedAt'],
      additionalProperties: false,
    },
    candidateProfile: {
      title: 'CandidateProfile',
      description:
        'Versioned model-candidate record. `fixture` marks unmistakably synthetic development data barred from production.',
      type: 'object',
      properties: {
        candidateId: {
          $ref: '#/$defs/candidateId',
        },
        revision: {
          $ref: '#/$defs/revisionId',
        },
        providerFamily: {
          $ref: '#/$defs/providerFamily',
        },
        model: {
          $ref: '#/$defs/modelRef',
        },
        modalities: {
          $ref: '#/$defs/modalitySupport',
        },
        tools: {
          $ref: '#/$defs/toolSupport',
        },
        capacity: {
          $ref: '#/$defs/safeCapacity',
        },
        endpoints: {
          $ref: '#/$defs/endpointPolicy',
        },
        prices: {
          $ref: '#/$defs/priceSchedule',
        },
        evidence: {
          type: 'array',
          minItems: 1,
          maxItems: 128,
          items: {
            $ref: '#/$defs/evidenceRecord',
          },
        },
        fixture: {
          type: 'boolean',
        },
      },
      required: [
        'candidateId',
        'revision',
        'providerFamily',
        'model',
        'modalities',
        'tools',
        'capacity',
        'endpoints',
        'prices',
        'evidence',
        'fixture',
      ],
      additionalProperties: false,
    },
    tenantId: {
      title: 'TenantId',
      description:
        'Authenticated tenant identifier. Resolved from authentication context, never from a request body field.',
      type: 'string',
      pattern: '^ten_[A-Za-z0-9_-]{8,96}$',
      maxLength: 100,
    },
    policyVersion: {
      title: 'PolicyVersion',
      description: 'Opaque policy-version identifier.',
      type: 'string',
      pattern: '^pol_[A-Za-z0-9_-]{8,96}$',
      maxLength: 100,
    },
    riskTier: {
      title: 'RiskTier',
      description:
        'Caller-defined risk tier. Higher tiers require stronger evidence and can require caller-side validation; Heimdall never lowers a declared tier.',
      type: 'string',
      enum: ['low', 'standard', 'high', 'critical'],
    },
    egressRule: {
      title: 'EgressRule',
      description:
        'Allowed regions and providers for one traffic class. Completion and classifier egress are modeled independently.',
      type: 'object',
      properties: {
        regions: {
          type: 'array',
          minItems: 1,
          maxItems: 64,
          items: {
            $ref: '#/$defs/regionCode',
          },
        },
        providers: {
          type: 'array',
          minItems: 1,
          maxItems: 16,
          items: {
            $ref: '#/$defs/providerFamily',
          },
        },
      },
      required: ['regions', 'providers'],
      additionalProperties: false,
    },
    qualityBaseline: {
      title: 'QualityBaseline',
      description:
        'Caller/profile-specific reference plus maximum tolerated regression as an exact fraction. Numerical values are calibrated in evaluation.',
      type: 'object',
      properties: {
        reference: {
          type: 'string',
          minLength: 1,
          maxLength: 128,
        },
        maxRegression: {
          $ref: '#/$defs/fraction',
        },
      },
      required: ['reference', 'maxRegression'],
      additionalProperties: false,
    },
    latencyLimits: {
      title: 'LatencyLimits',
      description:
        'Application latency requirements. Numerical SLO values are calibrated before hosted rollout.',
      type: 'object',
      properties: {
        maxP99Ms: {
          $ref: '#/$defs/durationMs',
        },
        maxTimeToFirstTokenMs: {
          $ref: '#/$defs/durationMs',
        },
      },
      required: ['maxP99Ms'],
      additionalProperties: false,
    },
    reliabilityFloor: {
      title: 'ReliabilityFloor',
      type: 'object',
      properties: {
        minSuccessRate: {
          $ref: '#/$defs/fraction',
        },
      },
      required: ['minSuccessRate'],
      additionalProperties: false,
    },
    budgetPolicy: {
      title: 'BudgetPolicy',
      description:
        'Declared money bounds. Hard caps gate admission; soft targets influence ranking only. Ledger mechanics belong to later tasks.',
      type: 'object',
      properties: {
        hardCap: {
          $ref: '#/$defs/money',
        },
        softTarget: {
          $ref: '#/$defs/money',
        },
      },
      required: ['hardCap'],
      additionalProperties: false,
    },
    modelPin: {
      title: 'ModelPin',
      description:
        'Explicit candidate pin. Bypasses selection but never eligibility; fallback permission is unambiguous.',
      type: 'object',
      properties: {
        candidate: {
          $ref: '#/$defs/candidateId',
        },
        allowFallback: {
          type: 'boolean',
        },
      },
      required: ['candidate', 'allowFallback'],
      additionalProperties: false,
    },
    policyRule: {
      title: 'PolicyRule',
      description:
        'Complete effective rule for one scope. An empty allowlist constrains nothing; denials are explicit and union across levels.',
      type: 'object',
      properties: {
        allowlist: {
          type: 'array',
          maxItems: 256,
          items: {
            $ref: '#/$defs/candidateId',
          },
        },
        deniedCandidates: {
          type: 'array',
          maxItems: 256,
          items: {
            $ref: '#/$defs/candidateId',
          },
        },
        pin: {
          $ref: '#/$defs/modelPin',
        },
        quality: {
          $ref: '#/$defs/qualityBaseline',
        },
        latency: {
          $ref: '#/$defs/latencyLimits',
        },
        reliability: {
          $ref: '#/$defs/reliabilityFloor',
        },
        riskMinimum: {
          $ref: '#/$defs/riskTier',
        },
        egress: {
          $ref: '#/$defs/egressRule',
        },
        classifierEgress: {
          $ref: '#/$defs/egressRule',
        },
        budgets: {
          $ref: '#/$defs/budgetPolicy',
        },
      },
      required: [
        'allowlist',
        'quality',
        'latency',
        'reliability',
        'riskMinimum',
        'egress',
        'classifierEgress',
        'budgets',
      ],
      additionalProperties: false,
    },
    policyOverride: {
      title: 'PolicyOverride',
      description:
        'Partial tenant/application rule. Set fields narrow the platform rule; any widening is an explicit conflict error, never a silent relaxation.',
      type: 'object',
      properties: {
        allowlist: {
          type: 'array',
          maxItems: 256,
          items: {
            $ref: '#/$defs/candidateId',
          },
        },
        deniedCandidates: {
          type: 'array',
          maxItems: 256,
          items: {
            $ref: '#/$defs/candidateId',
          },
        },
        pin: {
          $ref: '#/$defs/modelPin',
        },
        quality: {
          $ref: '#/$defs/qualityBaseline',
        },
        latency: {
          $ref: '#/$defs/latencyLimits',
        },
        reliability: {
          $ref: '#/$defs/reliabilityFloor',
        },
        riskMinimum: {
          $ref: '#/$defs/riskTier',
        },
        egress: {
          $ref: '#/$defs/egressRule',
        },
        classifierEgress: {
          $ref: '#/$defs/egressRule',
        },
        budgets: {
          $ref: '#/$defs/budgetPolicy',
        },
      },
      additionalProperties: false,
    },
    effectivePolicy: {
      title: 'EffectivePolicy',
      description:
        'Resolved rule bound to the authenticated tenant with level-version provenance. Immutable once issued.',
      type: 'object',
      properties: {
        tenant: {
          $ref: '#/$defs/tenantId',
        },
        rule: {
          $ref: '#/$defs/policyRule',
        },
        versions: {
          type: 'object',
          properties: {
            platform: {
              $ref: '#/$defs/policyVersion',
            },
            tenant: {
              $ref: '#/$defs/policyVersion',
            },
            application: {
              $ref: '#/$defs/policyVersion',
            },
          },
          required: ['platform', 'tenant'],
          additionalProperties: false,
        },
      },
      required: ['tenant', 'rule', 'versions'],
      additionalProperties: false,
    },
  },
};
