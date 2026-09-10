# Stakeholder Map — TechDebtter

## Key Stakeholders and Their Interests

| Stakeholder | Interest | Status | Source |
|-------------|----------|--------|--------|
| Maintainer / author | Correctness, maintainability, and the product's coherence | Active | [Q5] |
| Adopting engineering teams | Signal quality and the safety of automated pull requests | Prospective — conditional on the project proving useful and being deployed to the maintainer's work team [assumption] | [Q5] [Q2] |
| Security / compliance reviewers | That vulnerability findings and their evidence are trustworthy | Prospective — conditional on the same deployment path [assumption] | [Q5] [Q2] |
| Platform / DevOps owners | That the bot controller behaves predictably inside their CI and permissions model | Prospective — conditional on the same deployment path [assumption] | [Q5] [Q2] |

## Decision-Makers vs. Influencers

| Role | Who | Authority | Source |
|------|-----|-----------|--------|
| Decision-maker | Maintainer / author | Decides scope and priority | [Q6] |
| Influencers | Adopting teams, reviewers | Provide input that informs the maintainer's decisions; no scope authority | [Q6] |

## Communication Requirements

| Requirement | Detail | Cadence | Source |
|-------------|--------|---------|--------|
| Public-facing communication | Release notes, README, and changelog when something ships | On ship — no fixed reporting cadence | [Q7] |

No internal reporting cadence to a team or stakeholder group applies for this
pass. [Q7]

## Assumptions & Open Questions

- [assumption] The three prospective stakeholder groups were named as parties who
  would care, on the strength of the possible work-team deployment; none has been
  consulted, and no named individual or team has been identified for any of
  them. [Q2] [Q5]
- [assumption] "Input from adopting teams or reviewers" describes the intended
  decision style; the channel through which that input would arrive was not
  established. [Q6]
- [assumption] No owner was identified for the real work repository that serves
  as follow-on validation, so the platform/DevOps and security interests in that
  step have no named counterpart. [Q12] [Q5]
