# NFR Requirements — Performance Requirements

## Sources

- `requirements.md` FR1-FR5

## No New Performance Targets This Pass

None of FR1-FR5 change TechDebtter's response-time, throughput, latency,
or resource-utilization behavior. FR4.1's DependencyWiring extraction is
verified (per `functional-design/functional-spec.md`, post-review) to
preserve identical adapter-construction behavior for both entry points —
no performance characteristic changes. FR5's verification work exercises
existing behavior and does not add a performance target.
