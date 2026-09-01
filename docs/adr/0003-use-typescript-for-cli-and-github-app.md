# Use TypeScript for the CLI and GitHub App

TechDebtter will use TypeScript on Node.js for both the initial CLI and the future GitHub App. This lets both delivery adapters share one typed domain and workflow implementation, including the versioned Analysis Report, while using GitHub's Octokit tooling for User and Bot Identities. Trivy remains an external Detector that communicates through versioned JSON rather than constraining the implementation language.
