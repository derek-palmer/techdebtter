# Functional Design — Business Rules

## Sources

- `requirements.md` FR1-FR5
- [scope] `scope-document.md` — verification boundary; no new capability this pass

## One Existing Rule Made Explicit (post-review)

FR1-FR3 are documentation corrections and an investigation; FR4.1's
`DependencyWiring` (narrowed to the `analyze`-path wiring only — see
`functional-spec.md`'s post-review scope correction) is pure construction
logic with no decision logic of its own; FR5 verifies *existing*
`SPEC.md` invariants (V1-V30) rather than introducing new ones. No new
rule is introduced by this pass's changes.

The adversarial review surfaced one **existing, unchanged** rule that must
be stated explicitly so `DependencyWiring`'s narrowed scope is not later
misread as license to unify it: the CLI and GitHub Action Controller use
different remediation-policy sources today, and FR4.1 does not touch or
unify this.

```yaml
rules:
  - id: BR1.1
    statement: >
      The CLI's remediate path uses a hardcoded default remediation
      policy (organization state "absent"; repository remediation
      enabled) reflecting that an explicit `remediate` CLI invocation is
      itself the opt-in. The GitHub Action Controller's remediate path
      instead reads the live organization policy from GitHub via
      `gateway.readOrganizationPolicy` before remediating. This
      divergence is pre-existing, intentional, and out of scope for
      FR4.1 — DependencyWiring does not construct or unify remediate-path
      dependencies.
    category: policy
    applies_to: Ecosystem Remediator Adapters (remediate transaction), CLI, GitHub Action Controller
    trigger: remediate transaction dependency construction
    logic: >
      IF the entry point is CLI THEN use the hardcoded default policy.
      IF the entry point is GitHub Action Controller THEN read and use
      the live organization policy from GitHub.
    violation_behaviour: N/A — this rule documents existing behavior; it introduces no new enforcement.
    source: FR4.1 (documented as an explicit out-of-scope boundary, not a new requirement)

  - id: BR1.2
    statement: >
      The CLI's analyze path uses a hardcoded stub for
      `readOrganizationPolicy` (returns `{ state: "unverifiable" }`
      unconditionally). The GitHub Action Controller's analyze path
      instead performs a live read of the organization policy from
      GitHub via `gateway.readOrganizationPolicy`. This divergence is
      pre-existing and unchanged by FR4.1 — DependencyWiring wires both
      entry points' existing `readOrganizationPolicy` implementation
      as-is rather than unifying them, and equally leaves each entry
      point's cache-root path (CLI: `join(tmpdir(),
      "techdebtter-cache")`; Action: `/tmp/techdebtter-action-cache`)
      unchanged.
    category: policy
    applies_to: Detection & Enrichment Adapters (analyze transaction), CLI, GitHub Action Controller
    trigger: analyze transaction dependency construction
    logic: >
      IF the entry point is CLI THEN readOrganizationPolicy returns the
      hardcoded "unverifiable" stub. IF the entry point is GitHub Action
      Controller THEN readOrganizationPolicy performs a live GitHub read.
    violation_behaviour: N/A — this rule documents existing behavior; it introduces no new enforcement.
    source: FR4.1 (documented as an explicit preserved-divergence boundary, not a new requirement)
```
