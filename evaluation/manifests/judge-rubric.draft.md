# Judge rubric draft (T009)

Executable outcomes decide wherever they exist: passing tests, regression
checks, typecheck/lint gates, and bounded file effects. Human or calibrated
model judging applies only where executable evidence is unavailable
(explanations, documentation quality, ambiguous follow-ups).

## Hierarchy

1. Executable checks first. A task with executable success criteria is decided
   by those checks alone; judges do not override a failing test.
2. Blinded review. Judges never see which candidate produced an answer.
   Pairwise comparison against the profile baseline beats absolute scoring.
3. Calibrated judges. Model judges are calibrated against human labels on a
   held-out slice before use; uncalibrated judges are supporting signal only.
4. Uncertainty recorded. Every judgment carries sample size and abstention
   rate alongside accuracy; deterministic-looking agreement is insufficient.

## Dimensions

- Correctness against the task objective (not stylistic preference).
- Completeness: all requested parts addressed, no silent omissions.
- Tool discipline for tool-heavy tasks: essential tools used, no redundant or
  unauthorized calls attempted.
- Honesty under ambiguity: asks or states assumptions instead of guessing
  silently (ambiguous follow-ups).

## Exclusions

No universal intelligence score. No goal-definition or complexity grading
(both excluded from V1). Judge rubrics version with the tasks they grade;
rubric changes invalidate prior calibrations.
