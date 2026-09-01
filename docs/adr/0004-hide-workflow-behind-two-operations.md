# Hide the workflow behind two operations

TechDebtter's core workflow Module will expose `analyze(scope): AnalysisReport` and `publish(report, selections): PublicationResult`. The first operation is read-only toward target repositories; the second is the explicit GitHub write boundary. Detector orchestration, Triage, grouping, Criticality, fingerprints, and reconciliation remain inside the Module, while the CLI and future GitHub App are delivery adapters over the same interface and tests exercise that interface with external-dependency adapters replaced.
