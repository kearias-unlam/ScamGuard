# Requirements

Single source of truth for what ScamGuard must do. Implement only what is listed here; if a request is not covered, ask before building it.

- Backlog items (Features, User Stories, acceptance criteria) and user-visible texts are written in Spanish. Everything else is in English.
- Each User Story is loaded into Azure DevOps with the `ado-work-items` skill. Record the ADO ID next to each Feature, User Story, and Task once created.
- Reference story IDs in commits and tests (e.g. `// US-1.2`). Each acceptance criterion maps to one Playwright test.
- Every task ships with the tests it adds or breaks; no task leaves the suite failing.
- E2E tests mock `POST /analysis` with `page.route` through the shared helper `tests/fixtures/analysis.ts`; Pytest covers the backend with the AI client stubbed.
- Selectors marked **(new)** do not exist yet; confirm them with a page snapshot after implementation.
- Task dependencies are listed as "Depends on"; do not start a task before its dependencies are done.

## Feature 1 - Análisis de mensajes de texto

ADO ID: #2

### US-1.1 Ingresar un mensaje
Como usuario quiero ingresar un mensaje de texto para analizarlo y conocer si presenta indicios de fraude o engaño.

ADO ID: #3 · Status: done

Criterios de aceptación:
1. Al abrir la página, el campo "Mensaje" está vacío y el botón "Analizar mensaje" está deshabilitado.
2. Si el mensaje contiene solo espacios, el botón sigue deshabilitado.
3. Al ingresar texto, el botón se habilita.

Tasks:
- #10 Translate form texts and update US-1.1 tests: label "Mensaje", button "Analizar mensaje", `<html lang="es">`; update `tests/ingreso-mensaje.spec.ts` and replace the `User Story #3` comment with `US-1.1`; delete `tests/gestion-tareas.spec.ts`, which only asserts placeholder behavior.
- #24 Frontend: page layout and message form styling. Plain CSS in `src/app/globals.css` (no new dependency) using the palette variables from [Visual design](#visual-design). Replace the centered grid on `main` with a left-aligned column (max-width 48rem, centered with auto margins, 2rem padding, 1.5rem vertical gap, page background `--color-bg`); `h1` at 2rem with an accent underline (`text-decoration-color: var(--color-primary)`, 3px thickness, 0.3em offset). The form is a white card (1px border, 0.5rem radius, 1.5rem padding) with the label above a full-width textarea (`rows={6}`, min-height 10rem, vertical resize, 1rem font, visible border). "Analizar mensaje" is a primary button with hover, a visible `:focus-visible` outline on every button and the textarea, and a disabled state (muted colors, `not-allowed` cursor). `analysis-status` keeps a fixed min-height so showing or hiding the loading text does not shift the page. The error block uses `--color-error-text` on `--color-error-bg` with a left border; "Reintentar" is a secondary (outlined) button. The empty state is muted text. Add class names and the `rows` attribute only: no text, role, element type, or `data-testid` changes, and no CSS-generated text (`::before`/`::after` content). WCAG AA: 4.5:1 for text, 3:1 for focus outlines and borders of controls. Verification: the full Playwright suite stays green with no new assertions; attach screenshots of the empty, loading, and error states. Depends on #23.

### US-1.2 Ejecutar el análisis
Como usuario quiero ejecutar el análisis del mensaje.

ADO ID: #4 · Status: done

El estado vacío se muestra solo antes del primer análisis; durante la carga o ante un error no se muestra. "Reintentar" reenvía el último mensaje enviado. Después de un análisis, el mensaje permanece en el campo.

Criterios de aceptación:
1. Al hacer clic en "Analizar mensaje", se envía `POST /analysis` con el cuerpo `{ "message": "<texto>" }`.
2. Mientras el análisis está en curso, se muestra "Analizando mensaje..." (`role="status"`) y el botón está deshabilitado.
3. Si el análisis falla, se muestra "Los servidores están ocupados. Intentá de nuevo más tarde." (`analysis-error`) y un botón "Reintentar" (`retry-analysis-button`).
4. Al reintentar con éxito, se muestra el resultado (`analysis-result`).
5. Si un nuevo análisis falla, el resultado anterior deja de mostrarse.

Tasks:
- #11 Contract: add `Indicator.evidence`, `AnalysisResult.explanation`, and the `UNDETERMINED` risk level to `src/types.ts`. Nothing is rendered yet.
- #12 Frontend: send `POST /analysis` and show loading state. Add `postAnalysis` to `src/lib/api.ts` (throws on non-2xx); `page.tsx` stores the result and clears it on submit; button disabled while submitting; `AnalysisStatus` always renders a `role="status"` element that holds the Spanish loading text only while loading; `analysis-result-empty` renders only before the first analysis. Create `tests/fixtures/analysis.ts` and add `tests/analisis-mensaje.spec.ts` for AC1 and AC2. Depends on #10 and #11.
- #13 Frontend: error and retry states with tests. Show the error text in `analysis-error` and a "Reintentar" button that resends the last submitted message; clear the previous result on error. Tests for AC3 (route returns 503), AC4 (503, then 200), and AC5 (200, then 503: `analysis-result` hidden). Depends on #12.
- #14 Backend: FastAPI scaffold, CORS, and Pytest setup. Create the backend structure defined in `AGENTS.md`, with fastapi, uvicorn, pydantic, pytest, httpx, and openai in `backend/requirements.txt`; CORS for `http://localhost:3000`; `backend/.env.example`.
- #15 AI client and config: Azure OpenAI client (`openai` Python SDK, `OpenAI` client with the Azure v1 base URL and the Responses API) in `backend/app/ai/`; endpoint, key, and deployment from `.env`, adding `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_DEPLOYMENT` to `backend/.env.example`; 60-second timeout; defines the typed AI error class and raises it on every SDK failure. Pytest: SDK exception and timeout both become the typed AI error. Depends on #14.
- #16 Backend: `POST /analysis` endpoint, service, and typed models. Pydantic models for the full contract with camelCase aliases; thin router; service calls an injected AI analyzer; empty or whitespace message returns 422; the typed AI error becomes the 503 error (see [API contract](#api-contract)). Pytest: happy path with stubbed analyzer, AI error, empty message. Depends on #11, #14, and #15.
- #17 AI prompt and indicator types: document the prompt and the fixed list of indicator `type` values in the [AI contract](#ai-contract), then implement the prompt. The prompt defines the summary as what the message asks for or claims to be, requires `explanation` and a literal `evidence` quote per indicator, and the model output schema restricts `riskLevel` to `LOW | MEDIUM | HIGH`. Depends on #15.
- #18 AI validation, evidence check, and undetermined risk: validate the model JSON against the output schema (`riskLevel` limited to `LOW | MEDIUM | HIGH`), apply the evidence check and the undetermined rule, and raise the typed AI error on invalid output; wire the validated analyzer as the endpoint's default dependency. Pytest with a stubbed client: happy path, invalid JSON, empty evidence dropped, and all indicators dropped (`UNDETERMINED` with the replacement explanation). Depends on #16 and #17.

### US-1.3 Ver un resumen del análisis
Como usuario quiero ver un resumen del análisis realizado.

ADO ID: #5 · Status: done

El resumen describe qué pide o qué pretende ser el mensaje. No explica el nivel de riesgo (eso es US-2.3).

Criterios de aceptación:
1. Con un resultado, el resumen se muestra en `analysis-summary`.
2. Antes de cualquier análisis, se muestra "Todavía no se analizó ningún mensaje." (`analysis-result-empty`).

Tasks:
- #19 Frontend: single empty state and summary tests. `AnalysisResultView` renders `EmptyState` with `data-testid="analysis-result-empty"` and the Spanish text, removing the duplicated inline text. Add `tests/resumen-analisis.spec.ts` for AC1 and AC2. Depends on #12.

## Feature 2 - Nivel de riesgo e indicadores

ADO ID: #1

### US-2.1 Conocer el nivel de riesgo
Como usuario quiero conocer el nivel de riesgo o sospecha del mensaje.

ADO ID: #6 · Status: done

Criterios de aceptación:
1. El resultado muestra el rótulo "Nivel de riesgo" y, en `analysis-risk-level`, solo el valor.
2. Los valores `LOW`, `MEDIUM` y `HIGH` se muestran como "Bajo", "Medio" y "Alto".
3. El valor `UNDETERMINED` se muestra como "Indeterminado".

Tasks:
- #20 Frontend: risk level label and Spanish values with tests. Show "Nivel de riesgo" and, in `analysis-risk-level`, only the mapped value (display mapping only). Add `tests/nivel-riesgo.spec.ts` for AC1 to AC3. Depends on #11 and #12.
- #25 Frontend: result card and risk level badge styling. Plain CSS in `src/app/globals.css` with the palette variables. `analysis-result` is a white card like the form. `RiskLevelView` adds `data-risk-level={riskLevel}` to the `dd`, and CSS renders it as a rounded badge colored by level (LOW green, MEDIUM amber, HIGH red, UNDETERMINED gray). Color is presentation only and never the only signal: the Spanish value stays the only content of the `dd`. The `dt` "Nivel de riesgo" is bold. Explanation and summary are spaced paragraphs in body color. The indicator list has no bullets; each item is a bordered block with 1rem padding and 0.75rem gap. Indicator `h3` titles are underlined with the accent color. The evidence `blockquote` has a 4px left border, italic text, a light background, and no extra quote characters. The disclaimer is a smaller muted note with a top border. No text, role, element type, or `data-testid` changes; no new lists, headings, or `dt` elements inside `analysis-result`. WCAG AA contrast for every badge. Verification: the full Playwright suite stays green with no new assertions; attach screenshots of a result for each risk level and of a result with zero indicators. Depends on #24.

### US-2.2 Conocer los indicadores detectados
Como usuario quiero conocer los indicadores detectados en el mensaje.

Tipos de indicador: urgencia inusual, pedido de datos personales o códigos, enlaces sospechosos, suplantación de identidad, errores de redacción, promesas poco realistas y pedidos de pago o transferencias (ver [AI contract](#ai-contract)).

ADO ID: #7 · Status: done

Criterios de aceptación:
1. Cada indicador se muestra en `analysis-indicator` con su título y descripción.
2. Si no se detectan indicadores, se muestra "No se detectaron indicadores." en `analysis-indicators-empty`.

Tasks:
- #21 Frontend: indicators empty message, key fix, and tests. Show the empty message when the list is empty; change the React key from `indicator.type` to `${type}-${index}`. Add `tests/indicadores.spec.ts` for AC1 (two indicators with the same type) and AC2. Depends on #12.

### US-2.3 Entender el nivel de riesgo
Como usuario quiero entender por qué el mensaje recibió ese nivel de riesgo.

ADO ID: #8 · Status: done

Criterios de aceptación:
1. El resultado muestra la explicación del nivel de riesgo en `analysis-explanation`.
2. La explicación se muestra dentro de `analysis-result`.

Tasks:
- #22 Frontend: risk explanation with tests. Show `result.explanation` in `analysis-explanation` inside `analysis-result`. Add `tests/explicacion-riesgo.spec.ts` for AC1 and AC2. Depends on #11 and #12.

### US-2.4 Diferenciar evidencia de inferencia
Como usuario quiero diferenciar entre lo que dice el mensaje y lo que el modelo infiere.

ADO ID: #9 · Status: done

El MVP no puede verificar hechos. Cada indicador separa la cita literal del mensaje (evidencia) de la interpretación del modelo (descripción).

Criterios de aceptación:
1. Cada indicador muestra el fragmento citado del mensaje en `analysis-indicator-evidence`, separado de la descripción.
2. Con cualquier resultado, se muestra el aviso "Este resultado es una ayuda para decidir, no una confirmación de fraude." en `analysis-disclaimer`.

Tasks:
- #23 Frontend: indicator evidence and disclaimer with tests. Show `indicator.evidence` in `analysis-indicator-evidence` and the disclaimer in `analysis-disclaimer` whenever there is a result. Add `tests/evidencia-inferencia.spec.ts` for AC1 and AC2 (disclaimer visible with zero indicators). Depends on #11 and #12.

## UI texts

| Where | Text |
|---|---|
| Message field label | Mensaje |
| Submit button | Analizar mensaje |
| Loading status | Analizando mensaje... |
| Error | Los servidores están ocupados. Intentá de nuevo más tarde. |
| Retry button | Reintentar |
| Empty result | Todavía no se analizó ningún mensaje. |
| Risk level label | Nivel de riesgo |
| Risk values | Bajo / Medio / Alto / Indeterminado |
| No indicators | No se detectaron indicadores. |
| Disclaimer | Este resultado es una ayuda para decidir, no una confirmación de fraude. |
| Explanation when `UNDETERMINED` (set by the backend) | No se encontraron citas del mensaje que respalden los indicadores. |

## Visual design

Plain CSS in `src/app/globals.css` (built into Next.js; no CSS framework). Colors are CSS variables in `:root`; components use class names, never `data-testid` selectors, for styling. Styling never adds or changes visible text, roles, or `data-testid` values.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#f6f7fb` | Page background, evidence background |
| `--color-surface` | `#ffffff` | Cards (form, result, indicators) |
| `--color-text` | `#111827` | Body text |
| `--color-muted` | `#4b5563` | Empty state, empty indicators, disclaimer, status text, textarea border, evidence border, disabled button text |
| `--color-border` | `#d1d5db` | Card, indicator, disclaimer, and disabled button borders |
| `--color-primary` | `#1d4ed8` | Primary button, heading underline, focus outline |
| `--color-primary-hover` | `#1e40af` | Primary button hover |
| `--color-disabled-bg` | `#e5e7eb` | Disabled button background |
| `--color-error-text` / `--color-error-bg` | `#b91c1c` / `#fef2f2` | Error block |
| `--color-risk-low` / `-bg` | `#166534` / `#dcfce7` | Risk badge "Bajo" |
| `--color-risk-medium` / `-bg` | `#92400e` / `#fef3c7` | Risk badge "Medio" |
| `--color-risk-high` / `-bg` | `#991b1b` / `#fee2e2` | Risk badge "Alto" |
| `--color-risk-undetermined` / `-bg` | `#374151` / `#e5e7eb` | Risk badge "Indeterminado" |

- The risk badge color is selected with `[data-risk-level="..."]` on the `dd`; the Spanish label is always shown, so color is never the only signal.
- All text/background pairs meet WCAG AA (4.5:1); focus is always visible (`:focus-visible` outline, 2px `--color-primary`, 2px offset).
- Layout: single column, max-width 48rem, centered.

## API contract

`POST /analysis`

```ts
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNDETERMINED';

export interface Indicator {
  type: string;
  title: string;
  description: string;
  evidence: string;
}

export interface MessageAnalysisRequest {
  message: string;
}

export interface AnalysisResult {
  riskLevel: RiskLevel;
  summary: string;
  explanation: string;
  indicators: Indicator[];
}

export interface MessageAnalysisResponse {
  result: AnalysisResult;
}
```

- `evidence`, `explanation`, and `UNDETERMINED` are new and must be added to `src/types.ts` (task #11) and to the backend models.
- The frontend reads the backend base URL from `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`). E2E tests mock `**/analysis`, so no backend needs to run.
- JSON fields are camelCase; backend models use snake_case with camelCase aliases.
- Errors:
  - `422`: empty or whitespace-only message. The UI cannot send it (the button is disabled), so it is covered by Pytest only.
  - `503`: the AI call failed, timed out, or returned invalid output. Body: `{ "detail": "Los servidores están ocupados. Intentá de nuevo más tarde." }`.
- The frontend ignores the error body and shows the error text from [UI texts](#ui-texts) for any non-2xx response or network error.

## AI contract

- Model: `gpt-5.4-mini`, deployed on Azure Foundry. Endpoint (the v1 base URL), key, and deployment name come from `.env`.
- SDK: `openai` Python package, `OpenAI` client with `base_url` set to the Azure v1 endpoint (`https://<resource>.services.ai.azure.com/openai/v1/`), calling the Responses API (`responses.create`). No `api_version` is needed. Structured JSON output uses `text.format` with a JSON schema (see Output schema below).
- Timeout: 60 seconds, with no SDK retries (`max_retries=0`).
- Input: the user message.
- Output: JSON with the `AnalysisResult` shape, validated by the backend before returning it. The model output schema restricts `riskLevel` to `LOW | MEDIUM | HIGH`; `UNDETERMINED` is set only by the backend.
- Evidence check: the backend drops any indicator whose `evidence` does not appear in the submitted message. Comparison is case-insensitive, with consecutive whitespace collapsed to one space and leading/trailing whitespace trimmed on both sides. An indicator whose `evidence` is empty or whitespace-only is dropped.
- Undetermined risk: if the model returned at least one indicator and the evidence check drops all of them, the backend sets `riskLevel` to `UNDETERMINED` and replaces `explanation` with the text from [UI texts](#ui-texts). If the model returned no indicators, its `riskLevel` and `explanation` are kept.
- Where the rules run: output validation in `backend/app/ai/analyzer.py`; the evidence check and the undetermined rule in `backend/app/services/analysis.py`, after any analyzer. Indicators that pass the check are kept as returned (evidence verbatim). If only some are dropped, `riskLevel` and `explanation` are kept.
- Fallback: if the call fails, times out, or returns invalid output, the AI layer raises one typed AI error and the endpoint returns the `503` error. Never a partial or invented result. Missing configuration also raises the typed AI error.
- Prompt: `backend/app/ai/prompt.py` (`INSTRUCTIONS`), in English; the model writes `summary`, `explanation`, `title`, and `description` in neutral Spanish, and copies `evidence` verbatim from the message. `summary` states what the message asks for or claims to be (it does not explain the risk); `explanation` justifies `riskLevel` from the indicators without claiming certainty. With no indicators, `riskLevel` is `LOW`. Indicators list only signs present in the message; types that do not apply are omitted.
- Output schema: `OUTPUT_SCHEMA` in the same file, sent as `text.format` (`type: json_schema`, `name: analysis_result`, `strict: true`). Keys are camelCase and match `AnalysisResult`; every field is required and no extra fields are allowed; `riskLevel` is `LOW | MEDIUM | HIGH`; `indicators` may be empty; `type` is one of the values below.
- Indicator types (fixed list):

| `type` | Meaning |
|---|---|
| `urgency` | Unusual urgency or time pressure |
| `personal_data_request` | Asks for personal data, passwords, or codes |
| `suspicious_link` | Suspicious or shortened links |
| `impersonation` | Pretends to be a bank, company, or relative |
| `writing_errors` | Spelling or grammar errors |
| `unrealistic_promise` | Prizes or unrealistic gains |
| `payment_request` | Asks for transfers or payments |

## Non-functional requirements

### NFR-01 Decision support disclaimer
The result is presented as decision support, not as a guarantee that a message is or is not a scam. Satisfied by US-2.4: the disclaimer in `analysis-disclaimer` is shown with every result.

### NFR-02 Stable API contract
The request/response contract is explicit and typed. Any change must be applied to the frontend, the backend, and this document in the same change.

### NFR-03 AI failure fallback
See the fallback in the [AI contract](#ai-contract).

### NFR-04 Secrets management
API keys and endpoints are read from `.env` files and never committed.

### NFR-05 Frontend and test conventions
Follow `.github/instructions/*.instructions.md`.

### NFR-06 Test coverage
Each story has tests for the happy path and the most likely failure path, as defined in `AGENTS.md`.
