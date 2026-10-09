# Domain Documentation Layout

This repository uses a **single-context** domain documentation layout.

## Locations

- **Domain Glossary**: [`GLOSSARY.md`](file:///Users/jacko/Projects/magene-glossary/GLOSSARY.md) at the repository root. Defines ubiquitous language, core business entities (Terms, Versions, Projects, Glossary Rules, Snapshot, Optimistic Lock, Intercept Funnel), and data constraints.
- **Architecture Decision Records (ADRs)**: [`docs/adr/`](file:///Users/jacko/Projects/magene-glossary/docs/adr/) directory. Tracks irreversible architectural choices (e.g., Dual DB Strategy SQLite/PostgreSQL, Multi-Provider AI Fallback, Myers Diff False-Positive Filtering).

## Consumer Rules

1. Before introducing new terminology or data structures, check `GLOSSARY.md` to avoid naming collision and concept drift.
2. When creating significant architectural shifts or refactors, document the context, options, and rationale in a new ADR under `docs/adr/NNN-<title>.md`.
