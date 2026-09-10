# NFR Requirements — Reliability Requirements

## Sources

- `requirements.md` FR1-FR5

## No New Reliability Targets This Pass

None of FR1-FR5 change TechDebtter's availability, fault-tolerance, or
data-durability guarantees. FR5.1's verification work confirms existing
reliability-relevant invariants hold (e.g. `SPEC.md` V22/V23's draft-PR
and required-CI-observation behavior, V25's cache/artifact-loss
correctness guarantee) — it does not set new reliability targets. No
SLA/SLO is defined for this tool; none is introduced by this pass.
