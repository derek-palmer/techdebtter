# NFR Requirements — Questions

`requirements.md` carries only NFR1 (no coverage gate this pass) and NFR2
(change-limit compliance) — both process constraints, not runtime
performance/security/scalability/reliability/observability targets. FR1-FR4
introduce no new runtime NFR; FR5 verifies *existing* `SPEC.md` invariants
rather than setting new ones.

## Q1. Given no new runtime NFRs exist, how should this stage's seven artifacts be produced?

- A. Lean artifacts: `security-requirements.md` documents the existing
  security posture FR5 verifies, grounded in the named `SPEC.md`
  invariants (V8, V9-V12, V21, V26, V27, V29) since it is this stage's
  designated adversarial-review artifact and FR5 covers security-relevant
  invariants directly; `performance-requirements.md`,
  `scalability-requirements.md`, `reliability-requirements.md`,
  `observability-requirements.md`, and `tech-stack-decisions.md` each
  state "no new targets this pass" since none of FR1-FR5 change them
- B. Produce full quantitative targets across all five categories even
  though none are required by FR1-FR5
- X. Other (please specify)

[Answer]: A. Lean artifacts: security-requirements.md documents the existing security posture FR5 verifies; the other four plus tech-stack-decisions.md state no new targets this pass

## Consolidated Summary Confirmation

NFR Requirements produces seven artifacts. `security-requirements.md` is
the only one with substantive content: it documents TechDebtter's
existing security posture (worktree-cleanliness gate V8, policy-authority
chain V9-V12, bot-never-executes-target-code V21, write-token isolation
V26, pinned-Actions supply-chain control V27, AI-use opt-in gate V29) as
the baseline FR5's verification work checks against — this pass does not
change any of it. The other five artifacts (`performance-requirements.md`,
`scalability-requirements.md`, `reliability-requirements.md`,
`observability-requirements.md`, `tech-stack-decisions.md`) each state
explicitly that no new targets are introduced this pass, since FR1-FR5
touch documentation, an investigation, one construction-logic extraction,
and verification of existing behavior — none of which sets a new
performance, scalability, reliability, observability, or tech-stack
target. `traceability.json` maps NFR1/NFR2 to this stage's artifacts.

[Answer]: Looks correct
