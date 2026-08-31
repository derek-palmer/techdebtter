# Run the initial Bot as stateless GitHub Actions

TechDebtter's initial Bot will run daily or manually from one private controller repository per Organization. GitHub Actions supplies execution and concurrency, while a GitHub App supplies short-lived tokens scoped by phase and repository. GitHub Issues, PRs, labels, and hidden metadata remain authoritative; artifacts and caches are disposable. The Bot therefore needs no service or database and may repeat safe, idempotent work. A webhook receiver, durable queue, or database is deferred until measured latency or scale requires it.
