# AGENTS.md

## Scope
- Build a minimal, university-ready MVP for scam/fraud detection.
- Primary input for the first delivery is text messages; other formats can be considered later only if they do not expand scope.
- Closed scope: 2 user-facing features only.
  - Submit a message and receive an analysis result.
  - Display risk level and the indicators detected by the model.
- Treat the output as decision support, not as a guarantee of fraud detection.
- Target stack:
  - Frontend: Next.js + TypeScript
  - Backend: Python + FastAPI
  - AI: `gpt-5.4-mini` deployed on Azure Foundry, called with the `openai` Python SDK (`AzureOpenAI` client)
  - E2E: Playwright in TypeScript
  - Backend tests: Pytest
  - Package manager: npm (frontend); pip with `backend/requirements.txt` (backend)

## Backend structure
- `backend/app/main.py`: FastAPI app, CORS, and router registration.
- `backend/app/models.py`: Pydantic request/response models.
- `backend/app/services/`: business logic.
- `backend/app/ai/`: Azure OpenAI client, prompt, and output validation (the `/ai` layer).
- `backend/tests/`: Pytest.
- `backend/requirements.txt`: Python dependencies.

## Requirements
- The backlog (Features, User Stories, acceptance criteria), API contract, AI contract, and non-functional requirements live in [docs/requirements.md](docs/requirements.md): @docs/requirements.md
- `docs/requirements.md` is the source of truth; Azure DevOps mirrors it. Change requirements there first, then sync ADO.
- Implement only what is listed there; if a request is not covered, ask first.

## Rules
- Do not add technologies without justification or asking first.
- Keep frontend and backend separated.
- Separate responsibilities strictly: HTTP endpoints, business logic services, AI integration under `backend/app/ai/`, and shared contracts/types only where needed.
- Keep API contracts explicit and stable; prefer small typed request/response models.
- Use local filesystem only.
- Keep secrets out of code; use .env files.
- Do not duplicate logic.
- Frontend must not contain business logic.
- Code in English; comments in English.
- User-visible UI texts in Spanish; backlog items in Spanish. Everything else (code, identifiers, `data-testid`, docs structure) in English.
- If a decision changes architecture, technology, or behavior, update the related documentation.
- Prefer small, reversible changes over broad refactors.
- Keep prompts, model expectations, and risk indicators documented when they affect behavior.
- For AI calls, define the expected input, output schema, and failure fallback before implementation.
- Tests should cover the happy path and the most likely failure path for each touched feature.
- When behavior is uncertain, choose the simplest implementation that satisfies the MVP.
- Do not install dependencies without asking first.

## Copilot / Claude parity
- `.github/instructions/*.instructions.md` is the source of truth for path-scoped rules; `.claude/rules/*.md` only imports them. If an `applyTo` pattern changes, update the matching `paths` in `.claude/rules/` (and vice versa). When adding or removing an instructions file, add or remove its rule file.
- `.github/agents/*.agent.md` and `.claude/agents/*.md` must stay in sync: any change to one agent's body must be applied to its counterpart in the same change.
- `.claude/skills` is a symlink to `.github/skills`; edit skills only under `.github/skills`.
- MCP servers are declared in both `.vscode/mcp.json` (Copilot, `servers` key) and `.mcp.json` (Claude, `mcpServers` key); any server change must be applied to both.
