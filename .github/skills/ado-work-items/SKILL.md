---
name: ado-work-items
description: "Use when you need to create, sync, or report the Azure DevOps backlog (Features, User Stories, and Tasks) from docs/requirements.md through whatever Azure DevOps MCP tools are available in the current environment."
argument-hint: "Say which Features or User Stories from docs/requirements.md to load or sync, or leave empty for the full backlog."
---

# ado-work-items

Mirror the backlog defined in `docs/requirements.md` into Azure DevOps using the available Azure DevOps MCP tools.

## Source of truth
- `docs/requirements.md` defines every Feature, User Story, acceptance criterion, and Task. Read it at the start of every run.
- Azure DevOps mirrors that file. Never add, reword, or rescope backlog items in ADO that are not in the file; if something must change, update `docs/requirements.md` first.

## Mapping
| docs/requirements.md | Azure DevOps |
|---|---|
| `## Feature N - <title>` | Feature, title as written |
| `### US-N.M <title>` | User Story, child of its Feature; title `US-N.M <title>` |
| Story sentence ("Como usuario quiero...") | User Story description |
| `Criterios de aceptación` list | User Story acceptance criteria |
| `Tasks` list | Task, child of its User Story |

## Workflow
1. Read `docs/requirements.md` and list the items in scope.
2. List the available Azure DevOps MCP tools and map which ones fit the current environment.
3. Query ADO for existing Features and User Stories to avoid duplicates. Match by `US-N.M` in the title, or by the story sentence for items created before IDs existed.
4. Show the plan to the user: items to create, items to update, and items already in sync. Wait for approval before creating or updating anything.
5. Create or update Features first, then their User Stories, then their Tasks.
6. Report the result in a table with columns for ADO ID, title, type, and parent.
7. Propose writing each new ADO ID into its `ADO ID:` line in `docs/requirements.md`, and apply it only after approval.
8. If a tool cannot be found or the available MCP surface differs, stop and explain the mismatch before proceeding.

## Rules
- Never hardcode Azure DevOps MCP tool names; always list the available tools and use the ones that fit.
- Do not create, update, delete, or close work items without explicit user approval on the proposed plan.
- Do not delete or close any work items.
- Keep the hierarchy strict: Feature > User Story > Task.
- Preserve the wording from `docs/requirements.md` exactly (backlog items are in Spanish).
