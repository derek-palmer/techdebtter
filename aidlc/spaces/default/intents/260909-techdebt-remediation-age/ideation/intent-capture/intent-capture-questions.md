# Intent Capture & Framing — Questions

## Sources

- [desc] Initial description: "TechDebtter:"
- [scope] Workflow-selected scope: `techdebt-remediation-agent`.

## Q1. What business problem is this pass of work solving?

The repository already ships vulnerability analysis, GitHub Finding Issue publication, a remediation gateway, ecosystem remediators, and an unattended bot controller. So "build TechDebtter" is already partly done, and this pass needs its own problem statement.

- A. Broaden debt coverage — today the analysis is vulnerability-centric; extend it to the other debt categories the product promises (dependency drift, deprecated APIs, fragile tests, stale CI/CD, IaC debt, documentation gaps, repetitive code-quality issues)
- B. Sharpen prioritization — the impact/risk/confidence/scope/effort scoring needs to become explicit, tunable, and explainable rather than implicit
- C. Deepen remediation — more or better code-changing remediators, and stronger validation/rollback guidance on the pull requests they open
- D. Harden what exists — reliability, correctness, and operability of the current analyze → publish → remediate → verify path before adding surface
- E. Not yet defined — I want to work out the problem statement during this stage
- X. Other (please specify)

[Answer]: X. Other — "I want to make sure the app actually works as it says it does, and finish anything that needs to be done based on the repos info/issues/etc."

## Q2. Who is the customer for this work, and what pain are they living with?

- A. External engineering teams who install TechDebtter into their own repositories (open-source or commercial adopters)
- B. A specific internal team or organization running the bot controller across their own repos
- C. Both — an internal team is the first adopter, but the product is built to be installed by anyone
- D. Primarily me as the maintainer; adoption is a later concern
- E. Not yet defined
- X. Other (please specify)

[Answer]: X. Other — "A proof of concept/fun project, but if useful, I'd deploy it to my work team"

## Q3. What does success look like, and which metrics would show it?

Ideation guardrails require measurable outcomes, so please pick the shape of the target even if the exact number is provisional.

- A. Coverage — a stated number of debt categories detected with evidence-verified findings
- B. Signal quality — a false-positive rate or precision floor on published findings (e.g. under 10% of Finding Issues rejected as noise)
- C. Remediation throughput — a proportion of high-confidence findings that reach a mergeable pull request without human repair
- D. Adoption — a number of repositories or organizations running it unattended
- E. Not yet defined — success criteria still need to be worked out
- X. Other (please specify)

[Answer]: A, B, C

## Q4. What is the trigger for doing this now?

- A. Product completeness — the README promises capabilities the code does not yet deliver, and closing that gap is the driver
- B. A real debt problem in a specific codebase that this tool is needed to solve
- C. Preparing for external release or publication (npm package, GitHub Action, agent skill)
- D. Exploration — building the capability to see what it makes possible, with no external deadline
- E. Not yet defined
- X. Other (please specify)

[Answer]: A. Product completeness

## Q5. Who are the key stakeholders, and what does each care about?

Select all that apply.

- A. Maintainer / author — correctness, maintainability, and the product's coherence
- B. Adopting engineering teams — signal quality and the safety of automated pull requests
- C. Security or compliance reviewers — that vulnerability findings and their evidence are trustworthy
- D. Platform or DevOps owners — that the bot controller behaves predictably inside their CI and permissions model
- E. None identified beyond the maintainer
- X. Other (please specify)

[Answer]: A, B, C, D

## Q6. Who decides scope and priority for this work?

- A. I decide alone — I am the sole maintainer and decision-maker
- B. I decide, with input from adopting teams or reviewers
- C. A team lead or product owner other than me decides
- D. Not yet defined
- X. Other (please specify)

[Answer]: B. I decide, with input from adopting teams or reviewers

## Q7. Are there communication or reporting requirements for this work?

- A. None — this is solo work with no reporting cadence
- B. Public-facing only — release notes, README, and changelog when something ships
- C. Regular updates to a team or stakeholder group on a fixed cadence
- D. Not yet defined
- X. Other (please specify)

[Answer]: B. Public-facing only

## Q8. Does the workflow-selected scope match your intended product boundary?

The workflow is running the composed scope in `[scope]`, which executes 14 of 33 stages: intent capture, scope definition, approval handoff, reverse engineering, requirements analysis, domain design, functional design, the NFR requirements/design pair, code generation, and build and test. It skips market research, feasibility, team formation, mockups, practices discovery, user stories, units generation, contract design, delivery planning, infrastructure design, CI pipeline, and the whole operation phase.

- A. Confirm — that scope matches the product boundary I have in mind for this pass
- B. Narrower — I want a smaller boundary than that (please describe what to cut)
- C. Broader — I want a larger boundary than that (please describe what to add)
- D. Different boundary — the scope name fits but the product boundary I mean is different (please describe)
- E. Not yet defined
- X. Other (please specify)

[Answer]: A. Confirm

## Q9. When a documented claim is not backed by code, what should happen?

This is the central tension in "make sure the app actually works as it says it does". `README.md` describes detection across eight debt categories (dependency drift, security upgrades, deprecated APIs, fragile tests, stale CI/CD, IaC debt, documentation gaps, repetitive code-quality issues), while `SPEC.md` and `docs/implementation-plan.md` record delivered detection as vulnerability analysis via Trivy with KEV/EPSS enrichment. There are no open GitHub issues or pull requests, so the repository's own documents are the only backlog.

- A. Build the capability — treat each unbacked claim as work to implement, so the code catches up to the documentation
- B. Correct the claim — treat the documentation as overstated and narrow it to what the code actually does
- C. Triage each gap individually — assess every unbacked claim during this workflow and decide build-or-correct case by case, recording the rationale
- D. Verify first, decide later — establish what actually works end to end before committing to either direction
- X. Other (please specify)

[Answer]: C. Triage each gap individually

## Q10. What provisional thresholds should the three success metrics carry?

You selected coverage, signal quality, and remediation throughput. Ideation guardrails require measurable outcomes, so each needs a number now — provisional is fine, and later stages can revise it.

- A. Conservative — all eight documented debt categories detected; under 20% of published findings rejected as noise; at least 25% of high-confidence findings reach a mergeable pull request without human repair
- B. Moderate — at least six of eight categories detected; under 10% rejected as noise; at least 50% reach a mergeable pull request without human repair
- C. Strict — all eight categories detected; under 5% rejected as noise; at least 75% reach a mergeable pull request without human repair
- D. Verification-only — for this pass, success is that every documented capability is proven to work or explicitly recorded as unimplemented; numeric quality targets are set in a later pass
- X. Other (please specify)

[Answer]: D. Verification-only

## Q11. What should the tool be proven against?

"Works as it says it does" needs a subject to run against.

- A. This repository — run TechDebtter against `techdebtter` itself as the proving ground
- B. A separate throwaway fixture repository built to contain known debt in each category
- C. A real repository you already own outside this project
- D. The existing test fixtures only — no live repository run in this pass
- E. Not yet defined
- X. Other (please specify)

[Answer]: B. A separate throwaway fixture repository built to contain known debt in each category — superseded by Q12

## Q12. Revisiting Q11 — should real work repositories be the proving ground?

Raised after Q11 was answered: the maintainer has repositories at work that would genuinely benefit from this tool, which makes them a candidate proving ground rather than only a later deployment target. Running against a real repository exercises real debt, but it also means the tool reads that repository's code and, on the publication path, can write issues and pull requests to it.

- A. Both — build the throwaway fixture repository for controlled per-category verification, and additionally prove the tool against a real work repository
- B. Real work repository instead — drop the throwaway fixture and verify against a repository that actually needs the help
- C. Fixture first, real repository second — keep the fixture as the primary proving ground for this pass, and treat a real work repository as the follow-on validation once the fixture run is clean
- D. Keep Q11 as answered — throwaway fixture repository only for this pass
- X. Other (please specify)

[Answer]: C. Fixture first, real repository second

## Q13. On a real work repository, which operations should be permitted?

Asked only because Q12 may bring a real repository into this pass. The tool's analysis path is read-only toward the target, while publication and remediation write issues and pull requests.

- A. Read-only — analysis only, no issues or pull requests written to a real work repository
- B. Read plus issues — analysis and Finding Issue publication, but no remediation pull requests
- C. Full path — analysis, issue publication, and draft remediation pull requests
- D. Not applicable — no real work repository is used in this pass
- X. Other (please specify)

[Answer]: X. Other — "Read-only into a directory that we can publish/upload if we want as a \"dry-run\" then act on later if needed so a --dry-run flag might be good?"

## Q14. Is adopting a declarative LLM-programming framework in scope for this pass?

Raised by the maintainer: DSPy (`https://dspy.ai/`) may be a good fit for this
product, with the maintainer noting it may be out of scope for the initial work.
The framework choice itself is a technology decision that belongs to a design
stage rather than to intent capture, so this question settles only the scope
signal: whether it is in or out of the boundary confirmed in Q8.

- A. Out of scope for this pass — record it as a candidate for a later pass; this
  pass stays on verification and documented-gap triage
- B. In scope as a triage candidate — treat it as one of the case-by-case
  build-or-correct decisions under Q9, assessed on its merits during this
  workflow
- C. In scope and intended — this pass should adopt it, making it a stated
  intent rather than a candidate
- D. Not yet defined — decide once verification shows what the AI-assisted parts
  actually need
- X. Other (please specify)

[Answer]: A. Out of scope for this pass

## Consolidated Summary Confirmation

Summary of all answers before artifact generation:

- Problem: confirm the product works as documented, and finish what the repository's own information says still needs doing (Q1)
- Customer: a proof-of-concept / fun project for the maintainer, with possible deployment to the maintainer's work team if it proves useful (Q2)
- Success metric shapes: coverage, signal quality, remediation throughput (Q3), with numeric thresholds deferred — this pass succeeds when every documented capability is proven to work or explicitly recorded as unimplemented (Q10)
- Trigger: product completeness — documented capabilities the code does not yet deliver (Q4)
- Stakeholders: maintainer/author, adopting engineering teams, security/compliance reviewers, platform/DevOps owners (Q5)
- Scope and priority decided by the maintainer, with input from adopting teams or reviewers (Q6)
- Communication: public-facing only — release notes, README, changelog when something ships (Q7)
- Product boundary: the workflow-selected scope is confirmed (Q8)
- Unbacked documented claims are triaged individually, build-or-correct decided case by case with recorded rationale (Q9)
- Proving ground: the throwaway fixture repository containing known debt in each category comes first, and a real work repository is the follow-on validation once the fixture run is clean (Q12, superseding Q11)
- Against a real work repository the run stays read-only toward the target, writing its findings into a directory that can be published later if wanted, so acting on them is a separate deliberate step (Q13)
- Adopting a declarative LLM-programming framework (DSPy) is out of scope for this pass and recorded as a candidate for a later one (Q14)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Assumption Confirmation

Both artifacts carry assumptions that could not be grounded in a confirmed answer. Accepting them keeps them labelled as assumptions; it does not turn them into fact.

In `intent-statement.md`:

1. The three identified measures (coverage, signal quality, remediation throughput) are the right eventual measures of the product's value; only their thresholds were deferred, and the measures themselves were not separately validated against a stakeholder need.
2. Deployment to the maintainer's work team is a possibility conditional on the project proving useful, not a committed outcome; the interests of adopting engineering teams, security/compliance reviewers, and platform/DevOps owners are therefore prospective rather than currently active.
3. "Whatever the repository's own information says still needs doing" is treated as the documented capability gap, because the repository carries no other outstanding work items; the specific inventory of gaps is established in a later stage, not here.
4. The follow-on validation against a real work repository is expected to happen after this pass rather than inside it; which repository, and when, was not established.
5. The throwaway fixture repository does not exist yet; whether building it belongs inside this pass or is a prerequisite completed outside it was not established.

In `stakeholder-map.md`:

6. The three prospective stakeholder groups were named as parties who would care, on the strength of the possible work-team deployment; none has been consulted, and no named individual or team has been identified for any of them.
7. "Input from adopting teams or reviewers" describes the intended decision style; the channel through which that input would arrive was not established.
8. No owner was identified for the real work repository that serves as follow-on validation, so the platform/DevOps and security interests in that step have no named counterpart.

- A. Accept assumptions
- B. Convert to follow-up questions

[Answer]: A. Accept assumptions
