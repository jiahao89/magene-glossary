# Issue Tracker: Local Markdown

Issues and refactoring tickets in this repository are tracked as Markdown files under `.scratch/`.

## Conventions

- **Directory**: `.scratch/tickets/` (or `.scratch/<feature>/` for feature-specific groupings)
- **File naming**: `<id>-<slug>.md` (e.g., `001-decouple-ai-service.md`, `002-extract-db-repository.md`)
- **Status field**: Each ticket contains status metadata:
  - `status`: `todo` | `in-progress` | `done` | `wontfix`
  - `labels`: `needs-triage` | `ready-for-agent` | `ready-for-human` | `needs-info`
- **Workflow**:
  1. Engineering skills (`to-tickets`, `request-refactor-plan`) create ticket files under `.scratch/tickets/`.
  2. Agents read tasks directly from `.scratch/tickets/` and update checklist items.
  3. Completed tickets are marked with `status: done` or moved to `.scratch/archive/`.
