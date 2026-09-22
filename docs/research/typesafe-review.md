# TypeSafe documentation review for Hemdall

Reviewed 2026-09-20. This is a documentation-based assessment, not a live API benchmark or an implementation approval.

## Coverage

Retrieved all 109 Markdown pages in the official [documentation index](https://docs.typesafe.ai/llms.txt), and compared their URLs against the official sitemap: both list the same 109 pages.

| Area | Pages | Review scope |
| --- | ---: | --- |
| Core documentation | 26 | Introduction, quickstart, concepts, primitives, patterns, demos, SDK overview, models, HTTP API, agent skill, legal landing page, model limitations |
| Python SDK | 12 | Setup, usage, changelog, sync/async clients, questions, responses, common types, retries, exceptions, constants |
| JavaScript SDK | 53 | Setup, changelog, client, promises, errors, request/response interfaces, helpers, type aliases, constants |
| Cookbooks | 18 | Every indexed cookbook, including model escalation, skill selection, evaluation, retrieval, and extraction |

Raw pages, index, sitemap, and retrieval manifest are preserved in `typesafe-source/`. The review focused on architectural behavior, limits, interfaces, and experimental claims. Example programs were not executed, and external linked repositories, datasets, legal agreements, and interactive playgrounds are not included in the 109-page coverage claim.

## What TypeSafe can contribute

Jev supplies bounded semantic decisions. Choice selects an enumerated option, Score evaluates an ordered descriptive rubric, and Noul estimates whether a specified proposition holds. A single request can evaluate multiple independent questions over shared state. Hemdall could use these judgments as routing features while keeping exact constraints and arithmetic in application code. [Primitives](https://docs.typesafe.ai/primitives), [building guidance](https://docs.typesafe.ai/concepts/how-to-build-with-system-one).

Choice probabilities describe a relative selection among supplied options. They do not establish that any candidate is suitable. An explicit none-suitable outcome or independently evaluated suitability criterion is important when the catalog may not cover the work. [Choice](https://docs.typesafe.ai/primitives/choice), [line-by-line search](https://docs.typesafe.ai/cookbooks/semantic_find).

Score is a probability-weighted position on descriptive levels. It is not an exact estimate of dollar cost, response duration, or general intelligence. Noul expresses the probability of a proposition, not the degree of a property. Use known prices and measurements directly. [Score](https://docs.typesafe.ai/primitives/score), [Noul](https://docs.typesafe.ai/primitives/noul).

## Constraints that affect the proposal

### Parallelism has a dependency boundary

Questions in one call do not consume one another's results. Intent, difficulty, and likely tool requirements may be evaluated together when the original request and context support all three. If an answer determines newly retrieved evidence or the options for a later judgment, another stage is needed. Changes to state can change subsequent answers; equivalence with a sequential workflow must be tested. [Parallel questions and dependencies](https://docs.typesafe.ai/primitives#when-one-question-depends-on-another).

### Classification cannot generate arbitrary plans

Jev does not produce free-form text, code, or reasoning explanations, and currently accepts text only. Selecting predefined goal categories fits; generating an arbitrary goal decomposition requires another mechanism. Attachment metadata may identify a required modality without inspecting the attachment's actual contents. [System One](https://docs.typesafe.ai/concepts/system-one).

### Confidence is not task success

Choice and Score confidence summarize a returned distribution. A concentrated distribution can still be wrong. Thresholds need labeled examples from the intended workload. Routing confidence, candidate suitability, downstream success, and uncertainty in measured model performance are separate concepts. [Confidence](https://docs.typesafe.ai/confidence).

### Current limits and deployment details

The models page lists Jev 1.13.0 at $0.042 per million input tokens, free output, a 64k total request budget, and a 32k budget for state plus the longest question. It lists 250,000 tokens/second and 1,200 requests/minute while warning that rate limits may change. These are a dated snapshot, not Hemdall performance promises. Log actual versions and consider pinning versions when thresholds are tuned. [Models](https://docs.typesafe.ai/models).

The documented model-list endpoint supplies names, descriptions, and release dates. It does not supply Hemdall's proposed cross-provider report cards with task benchmarks, prices, context limits, and observed latency. Hemdall needs its own evidence collection or an additional source. [ModelCard interface](https://docs.typesafe.ai/sdk/javascript/api/interfaces/ModelCard).

Both SDKs retry by default. JavaScript documents a 10-second per-attempt timeout and no total retry budget; Python documents a separate retry budget. An application requiring very low routing overhead must explicitly bound total elapsed time and fallback behavior. [JavaScript configuration](https://docs.typesafe.ai/sdk/javascript/api/interfaces/TypeSafeClientConfig), [JavaScript retry policy](https://docs.typesafe.ai/sdk/javascript/api/interfaces/RetryPolicy), [Python retries](https://docs.typesafe.ai/sdk/python/api/retries).

### Known weaknesses

The Jev 1.13 limitations page documents failures involving arithmetic, dates, multi-hop reasoning, irrelevant long context, adversarial content, contradictory criteria, and expected identities between separate questions. Do not calculate prices or enforce permissions with semantic judgments. Independent evaluation also does not imply statistical independence of errors. [Jev limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13).

## Cookbook findings

These are interpretations for Hemdall, not claims that the examples prove performance on Hemdall workloads.

| Cookbook | Lesson for this product |
| --- | --- |
| [Self-consistency: nouls](https://docs.typesafe.ai/cookbooks/consistency_noul_cookbook) | Stable probabilities can cross action thresholds; abstention reduces unstable actions but does not prove correctness. |
| [Self-consistency: choices](https://docs.typesafe.ai/cookbooks/consistency_choice_cookbook) | Report raw agreement, abstention, and accuracy separately; deterministic-looking behavior is insufficient. |
| [Parallel questions](https://docs.typesafe.ai/cookbooks/parallel_questions) | Shared-state batching avoids resending context; its latency comparison uses sequential single-question calls. |
| [Re-ranking](https://docs.typesafe.ai/cookbooks/rerank_typesafe) | A second-stage ranker cannot recover a candidate omitted from the shortlist. |
| [Line-by-line search](https://docs.typesafe.ai/cookbooks/semantic_find) | A winning candidate and the existence of a suitable candidate are different judgments. |
| [Structure recovery](https://docs.typesafe.ai/cookbooks/autoformat) | Stages remain sequential when the second stage's input objects do not exist before the first. |
| [Function calling](https://docs.typesafe.ai/cookbooks/function_calling) | Closed-set function arguments fit; arbitrary strings and numbers need other extraction mechanisms. |
| [Skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion) | Broad ranking then detailed verification can help catalog selection, but wrong suggestions can damage a previously correct agent decision. |
| [Entity alignment](https://docs.typesafe.ai/cookbooks/entity_alignment) | An explicit review outcome makes uncertainty actionable; numerical cut points still encode policy. |
| [Classifying RAG passages](https://docs.typesafe.ai/cookbooks/classifying_rag_passages) | Relevance, conflicting evidence, and malicious instructions need separate treatment. |
| [Citation checking](https://docs.typesafe.ai/cookbooks/citation_check) | Combine exact checks with narrow semantic verification; matching a quote does not establish support for a claim. |
| [LLM guardrails](https://docs.typesafe.ai/cookbooks/llm_guardrails) | Questions supply signals and application policy determines actions; detection is not a permission boundary. |
| [SDE cascade](https://docs.typesafe.ai/cookbooks/sde_cascade) | Cheap execution, output verification, and escalation form a distinct strategy from initial model selection. |
| [Date extraction](https://docs.typesafe.ai/cookbooks/date_extraction_cookbook) | Select bounded components, then validate combinations and calculate in code. |
| [Pre-parsed extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook) | Generate candidate spans first and select among them; missing candidates cannot be selected. |
| [Hierarchical classification](https://docs.typesafe.ai/cookbooks/hierarchical_classification) | Keeping several branches can repair early ambiguity; it adds stages and uses a ranking heuristic, not a guaranteed success probability. |
| [Autoresearch](https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery) | Semantic features can feed a learned selector, with a final test set kept outside feature discovery and tuning. |
| [Confidence-based classification](https://docs.typesafe.ai/cookbooks/classification_using_confidence) | Lower-confidence decisions can produce a broader, less specific outcome instead of an unjustified precise one. |

Published cookbook prices sometimes use historical assumptions or older Jev versions. Some walkthrough outputs are cached, and the SDE example deliberately uses a fixed fabricated extraction to demonstrate its verifier. These examples establish possible designs, not production service guarantees. The introductory batching figures also differ from the current parallel-questions cookbook; do not turn either into a product promise.

## Recommendations to debate

1. Begin by deciding whether Hemdall recommends a model, invokes models, or owns the full agent loop. This determines whether tool execution, state transitions, and duplicate effects belong inside its scope.
2. Define a quality floor against a named baseline and optimize expected total task cost subject to that floor and a latency target. Include routing, input/output tokens, tool costs, retries, verification, escalation, and duplicated attempts.
3. Apply hard eligibility checks before ranking: required modality, usable context budget, tool-calling compatibility, provider permissions, and availability. A high benchmark score cannot compensate for a missing required capability.
4. Treat report-card benchmarks as initial evidence. Measure success by workload and model configuration, plus current provider latency and failures. Avoid one universal intelligence number.
5. Separate report-card caching from decision caching. A small catalog may fit entirely in memory. Decision reuse must account for goal, task state, tools, permissions, context size, quality policy, and model/catalog versions; do not assume similar wording means interchangeable work.
6. Treat launching another model while the first is still running as hedging. It can lower tail latency while increasing cost. Define first-token versus completion deadlines, select only quality-eligible alternatives, and prevent competing attempts from duplicating tool effects. Five seconds is not yet a justified threshold.
7. Keep normal routing to one semantic call where feasible, and measure when extra retrieval or verification earns its delay. Measure total p50/p95/p99 overhead from the deployment environment instead of adopting a vendor example's average.
8. Include a no-suitable-model outcome, a router-unavailable policy, and an uncertainty policy. Do not force every request into the closest listed option.

These recommendations remain proposals. No architecture decision has been recorded as accepted.
