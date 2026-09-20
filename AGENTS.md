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
  - AI: Azure Foundry model selected by the team
  - E2E: Playwright in TypeScript
  - Backend tests: Pytest
  - Package manager: npm

## Rules
- Do not add technologies without justification or asking first.
- Keep frontend and backend separated.
- Separate responsibilities strictly: HTTP endpoints, business logic services, AI integration under /ai, and shared contracts/types only where needed.
- Keep API contracts explicit and stable; prefer small typed request/response models.
- Use local filesystem only.
- Keep secrets out of code; use .env files.
- Do not duplicate logic.
- Frontend must not contain business logic.
- Code in English; comments in English.
- If a decision changes architecture, technology, or behavior, update the related documentation.
- Prefer small, reversible changes over broad refactors.
- Keep prompts, model expectations, and risk indicators documented when they affect behavior.
- For AI calls, define the expected input, output schema, and failure fallback before implementation.
- Tests should cover the happy path and the most likely failure path for each touched feature.
- When behavior is uncertain, choose the simplest implementation that satisfies the MVP.
- Do not install dependencies without asking first.
