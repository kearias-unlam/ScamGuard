# Requirements

Single source of truth for what ScamGuard must do. Implement only what is listed here; if a request is not covered, ask before building it.

- Backlog items (Features, User Stories, acceptance criteria) and user-visible texts are written in Spanish. Everything else is in English.
- Each User Story is loaded into Azure DevOps with the `ado-work-items` skill. Record the ADO ID next to each Feature, User Story, and Task once created.
- Reference story IDs in commits and tests (e.g. `// US-1.2`). Each acceptance criterion maps to one Playwright test.
- Every task ships with the tests it adds or breaks; no task leaves the suite failing.
- E2E tests mock `POST /analysis`, `POST /analysis/email`, and `POST /analysis/url` with `page.route` through the shared helper `tests/fixtures/analysis.ts`, and `GET /critical-messages` through `tests/fixtures/critical-messages.ts`; Pytest covers the backend with the AI client stubbed and SQLite on a temporary file.
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

ScamGuard no puede verificar hechos. Cada indicador separa la cita literal del mensaje (evidencia) de la interpretación del modelo (descripción).

Criterios de aceptación:
1. Cada indicador muestra el fragmento citado del mensaje en `analysis-indicator-evidence`, separado de la descripción.
2. Con cualquier resultado, se muestra el aviso "Este resultado es una ayuda para decidir, no una confirmación de fraude." en `analysis-disclaimer`.

Tasks:
- #23 Frontend: indicator evidence and disclaimer with tests. Show `indicator.evidence` in `analysis-indicator-evidence` and the disclaimer in `analysis-disclaimer` whenever there is a result. Add `tests/evidencia-inferencia.spec.ts` for AC1 and AC2 (disclaimer visible with zero indicators). Depends on #11 and #12.

## Feature 3 - Panel de mensajes críticos

ADO ID: #26

### US-3.1 Ver el panel de mensajes críticos
Como usuario quiero ver un panel con los mensajes de riesgo alto que se analizaron en ScamGuard, agrupados por tópico, para conocer los engaños más frecuentes.

ADO ID: #27 · Status: done

El panel está en `/panel`. Los mensajes se agrupan por el `topic` que asigna la IA (ver [AI contract](#ai-contract)). Cada tópico muestra su título y la cantidad de mensajes similares. Los tópicos llegan ordenados desde el backend, de mayor a menor cantidad de mensajes.

Criterios de aceptación:
1. En la página principal, el enlace "Ver mensajes críticos" lleva al panel, que muestra el título "Mensajes críticos" y un enlace "Volver al análisis".
2. Cada tópico se muestra en `panel-topic` con su título y "Mensajes similares: N", en el orden recibido del backend.
3. Si no hay mensajes críticos, se muestra "Todavía no hay mensajes críticos registrados." (`panel-empty`).
4. Si la carga del panel falla, se muestra "No se pudo cargar el panel. Intentá de nuevo más tarde." (`panel-error`) y un botón "Reintentar" (`panel-retry-button`); al reintentar con éxito se muestran los tópicos.

Tasks:
- #30 Contract: add `Topic`, `CriticalMessage`, `CriticalTopic`, and `CriticalMessagesResponse`, and the optional `shareInPanel` and `sensitiveData` fields of `MessageAnalysisRequest`, to `src/types.ts` and the matching Pydantic models (camelCase aliases; `share_in_panel` defaults to `false`, `sensitive_data` to `""`) to `backend/app/models.py`. Nothing is rendered, sent, or served yet.
- #31 Storage: `backend/app/storage/critical_messages.py` with `sqlite3` (standard library): create the table on first use, `save_critical_message(topic, text)`, and `list_critical_topics()` grouped and ordered as documented in [Critical messages storage](#critical-messages-storage). DB path from `SCAMGUARD_DB_PATH` (default `backend/data/scamguard.db`); add the variable to `backend/.env.example` and `/backend/data/` to `.gitignore`. Define a typed `StorageError` and raise it on any `sqlite3` or `OSError` error. Pytest on a temporary DB file: save and list (grouping and order), empty DB, and a `sqlite3` error becoming `StorageError`. Depends on #30.
- #32 Backend: `GET /critical-messages` endpoint. Thin router; the service builds the response with the Spanish topic titles (defined once in the backend); CORS also allows `GET`; `StorageError` becomes the 503 error (see [API contract](#api-contract)). Pytest: grouped and ordered response with titles, empty list, storage error returning 503, and CORS for `GET`. Depends on #30 and #31.
- #33 Frontend: panel page, topic list, empty, and error states. Add `getCriticalMessages` to `src/lib/api.ts` (throws on non-2xx). Create `src/app/panel/page.tsx` with the heading, the "Volver al análisis" link, a `role="status"` element holding "Cargando mensajes críticos..." while loading, the topic list (title and "Mensajes similares: N" from `messages.length`), the empty state, and error with retry. Add the "Ver mensajes críticos" link to the home page. New selectors **(new)**: `panel-link` (home link), `panel-back-link`, and `panel-status`. Create `tests/fixtures/critical-messages.ts` (mocks `**/critical-messages`) and add `tests/panel-mensajes-criticos.spec.ts` for AC1 to AC4. Depends on #30.

### US-3.2 Ver los mensajes de un tópico
Como usuario quiero ver el detalle y todos los mensajes guardados de un tópico para reconocer cómo se escriben esos engaños.

ADO ID: #28 · Status: done

Criterios de aceptación:
1. El detalle del tópico ("Ver detalle", `panel-topic-detail`) está cerrado al cargar y, al abrirlo, muestra el mensaje más reciente del tópico.
2. Al hacer clic en "Ver todos los mensajes" (`panel-topic-show-all`), cada mensaje guardado del tópico se muestra en `panel-topic-message`.

Tasks:
- #38 Frontend: topic detail and all messages. Each `panel-topic` has a native `<details>`/`<summary>` "Ver detalle" (`panel-topic-detail`) showing `messages[0]`, and a "Ver todos los mensajes" button that shows every message in `panel-topic-message`. `panel-topic-detail` goes on the `<summary>`; `panel-topic-message` is used only in the full list, not in the detail. The button disappears once all messages are shown (no hide toggle; since US-3.4 the detail is hidden too), and it is shown even when the topic has a single message. Each topic is a `CriticalTopicItem` component with its own state. Add `tests/mensajes-topico.spec.ts` for AC1 and AC2. Depends on #33.
- #39 Frontend: panel styling. Plain CSS in `src/app/globals.css` with the palette variables: each topic is a white card like the result card; the topic title is bold; the count is muted text; the detail and the message list reuse the evidence `blockquote` style; links and buttons reuse the existing button and focus styles; the privacy notice is a muted note like the disclaimer. In the home form (US-3.3): the share checkbox and its label sit on one line with regular-weight text, the sensitive data input is styled like the textarea, and the `panel-link` reuses the secondary button style. No text, role, element type, or `data-testid` changes. WCAG AA contrast. Verification: the full Playwright suite stays green with no new assertions; attach screenshots of the panel with topics, with a detail open, with all messages shown, empty, and with an error, and of the home form with the share checkbox checked. Depends on #38 and #37.

### US-3.4 Ver cada mensaje una sola vez
Como usuario quiero ver cada mensaje compartido una sola vez, con la cantidad de veces que se compartió, para no leer mensajes repetidos y saber qué engaños circulan más.

ADO ID: #40 · Status: done

Si un mensaje compartido ya existe en el mismo tópico (mismo texto enmascarado, sin distinguir mayúsculas ni espacios repetidos), no se guarda de nuevo: se suma 1 a su contador. Como el enmascarado reemplaza nombres, números y links, los mensajes que solo difieren en esos datos se cuentan como el mismo. La detección es exacta, no por similitud: dos redacciones distintas del mismo engaño se guardan por separado. Para comparar, todos los marcadores (`[nombre]`, `[dato oculto]`, `[número]`, etc.) cuentan como iguales, porque la IA no siempre oculta el mismo dato con el mismo marcador. "Mensajes similares: N" pasa a contar todas las veces que se compartieron mensajes del tópico. Al ver todos los mensajes, el detalle deja de mostrarse para que ningún mensaje aparezca dos veces.

Criterios de aceptación:
1. Cada tópico muestra en "Mensajes similares: N" la cantidad total de veces que se compartieron sus mensajes, aunque tenga menos mensajes distintos.
2. Al hacer clic en "Ver todos los mensajes", cada mensaje se muestra una sola vez con "Compartido N veces" (`panel-topic-message-count`), o "Compartido 1 vez" si se compartió una sola vez.
3. Al hacer clic en "Ver todos los mensajes", el detalle del tópico ("Ver detalle", `panel-topic-detail`) deja de mostrarse.

Tasks:
- #41 Contract: add `timesShared` to `CriticalMessage` (times that message was shared) and to `CriticalTopic` (total of its messages) in `src/types.ts` and `backend/app/models.py` (`times_shared`). Nothing is rendered or served yet.
- #42 Storage: deduplicate on save. Change the `critical_messages` table as documented in [Critical messages storage](#critical-messages-storage) (`normalized_text`, `times_shared`, `last_shared_at`, unique `topic` + `normalized_text`); `save_critical_message` inserts a new row or, for an existing one, adds 1 to `times_shared` and updates `last_shared_at`; `list_critical_topics` returns each message once with its `times_shared`, in the documented order. The normalization is the same as the evidence check (case-insensitive, whitespace collapsed and trimmed) and is defined once. No migration: after deploying, delete the local `backend/data/scamguard.db` so it is recreated with the new table. Pytest on a temporary DB file: same text twice gives one row with `times_shared` 2; different case or spacing counts as the same message; same text in another topic is a separate row; ordering by total shares and by last share. Depends on #41.
- #43 Backend: `GET /critical-messages` returns `timesShared` per message and per topic (sum of its messages). Pytest: response with the counts and the documented order, and a topic with fewer distinct messages than total shares. Depends on #41 and #42.
- #44 Frontend: "Mensajes similares: N" shows `topic.timesShared` instead of `messages.length`; each item of the "Ver todos los mensajes" list shows "Compartido N veces" or "Compartido 1 vez" in `panel-topic-message-count` **(new)**, as muted text below the quote (display mapping only). Add `timesShared` to the data in `tests/fixtures/critical-messages.ts` and update the existing panel tests that depend on the count. Add `tests/mensajes-repetidos.spec.ts` for AC1 and AC2. Depends on #41.
- #45 Backend: placeholders count as equal for duplicates. The duplicate key (`normalized_text`) also replaces every placeholder (`[...]`) with the same token, as documented in [Critical messages storage](#critical-messages-storage); the placeholder pattern is defined once and shared with the masking. The stored `text` is unchanged. Delete the local `backend/data/scamguard.db` afterwards, since existing rows keep the old key. Pytest: two masked texts that differ only in the placeholder (`[dato oculto]` vs `[número]`) are one message shared twice; the stored text is the first one; a different text is still a separate message. Depends on #42.
- #46 Frontend: hide the detail when all messages are shown. In `CriticalTopicItem`, the `<details>` "Ver detalle" is rendered only while the full list is hidden. Add the AC3 test to `tests/mensajes-repetidos.spec.ts`. Depends on #44.

### US-3.3 Compartir un mensaje en el panel sin exponer datos personales
Como usuario quiero elegir si mi mensaje se comparte en el panel e indicar qué datos ocultar, para ayudar a otras personas sin exponer información personal.

ADO ID: #29 · Status: done

Un mensaje se guarda solo si el usuario marcó la casilla y el nivel de riesgo final es `HIGH` (después del chequeo de evidencia). Antes de guardarlo, se ocultan los datos personales que detecta la IA, los que indicó el usuario y los links, emails y números (ver [Critical messages storage](#critical-messages-storage)). El guardado y el enmascarado ocurren en el backend y se cubren con Pytest; el resultado del análisis no cambia para el usuario. "Reintentar" reenvía el último pedido completo, incluidos la casilla y los datos a ocultar.

Criterios de aceptación:
1. Al abrir la página, la casilla "Compartir este mensaje en el panel de mensajes críticos" (`share-in-panel-checkbox`) está desmarcada y el campo "Datos a ocultar (separados por coma)" no se muestra.
2. Al marcar la casilla, se muestra el campo "Datos a ocultar (separados por coma)" (`sensitive-data-input`).
3. Con la casilla marcada, "Analizar mensaje" envía `POST /analysis` con el cuerpo `{ "message": "<texto>", "shareInPanel": true, "sensitiveData": "<datos>" }`.
4. El panel muestra el aviso "Los mensajes se comparten solo si quien los analiza lo permite, y sus datos personales se ocultan antes de guardarlos." (`panel-privacy-notice`).

Tasks:
- #34 AI topic and masked message: add the required `topic` (enum from the fixed [topic list](#ai-contract)) and `maskedMessage` fields to `OUTPUT_SCHEMA` and describe them in `INSTRUCTIONS`. `analyze_with_model` returns an internal `AnalyzedMessage` (`result: AnalysisResult`, `topic: Topic`, `masked_message: str`); adapt the `Analyzer` type and `analyze_message` so the `POST /analysis` response does not change. Pytest: the schema has both fields; stubbed output with a valid topic and masked message; a topic outside the list raises the typed AI error; the `POST /analysis` response has neither `topic` nor `maskedMessage`. Depends on #30.
- #35 Masking: `mask_personal_data(text: str, sensitive_data: str) -> str` in `backend/app/services/masking.py`, applying the user's terms and the pattern rules in [Critical messages storage](#critical-messages-storage). Pytest: user terms (case-insensitive, trimmed, empty terms ignored), URL, shortened link, email, phone, CBU/card number, DNI with dots, and text that must stay unchanged ("10000 pesos", "$1.000.000", "1500000 pesos").
- #36 Backend: save shared critical messages. In `services/analysis.py`, after the evidence check, if `shareInPanel` is true, `riskLevel` is `HIGH`, and `maskedMessage` is not blank, apply `mask_personal_data` to the model's `maskedMessage` with the request's `sensitiveData` and save it with its topic through an injected storage dependency. A `StorageError` on save is logged and the analysis is returned as usual. Pytest: shared `HIGH` saved masked with its topic; not shared `HIGH` not saved; shared `LOW`, `MEDIUM`, and `UNDETERMINED` not saved; blank `maskedMessage` not saved; a storage error still returns 200 with the result. Depends on #31, #34, and #35.
- #37 Frontend: share checkbox, sensitive data field, and privacy notice. Add the native checkbox and the text input (each with its `label`) to the message form; the input is rendered only while the checkbox is checked, and unchecking the checkbox clears it. `page.tsx` builds the request with `shareInPanel` and `sensitiveData` only when the checkbox is checked (`postAnalysis` sends it unchanged), so the unchecked body stays `{ "message": "<texto>" }` (US-1.2 AC1). "Reintentar" resends the last full request, including `shareInPanel` and `sensitiveData`. Show the notice in `panel-privacy-notice` on the panel, also when it is empty or has an error. Add `tests/compartir-mensaje.spec.ts` for AC1 to AC4. Depends on #33.

## Feature 4 - Análisis de correos electrónicos

ADO ID: #47

Primera entrega: solo archivos `.eml` (los exportan Gmail, Outlook web, Apple Mail y Thunderbird). `.msg` y `.mbox` quedan fuera de alcance. El archivo se procesa en memoria y nunca se guarda. Los correos no se comparten en el panel de mensajes críticos.

### US-4.1 Elegir un archivo de correo
Como usuario quiero elegir un archivo de correo electrónico para analizarlo sin copiar su contenido a mano.

ADO ID: #48 · Status: done

Criterios de aceptación:
1. Al abrir la página, el campo "Archivo de correo (.eml)" está vacío y el botón "Analizar correo" está deshabilitado. Desde US-5.2 el campo está en la pestaña "Subir archivo .eml", que se abre antes de comprobarlo.
2. Al elegir un archivo `.eml`, el botón se habilita.
3. Al elegir un archivo con otra extensión, el botón sigue deshabilitado y se muestra "Elegí un archivo con extensión .eml." (`email-file-hint`).

Tasks:
- #55 Frontend: email form. `EmailAnalysisForm` component below the message form: native `<input type="file" accept=".eml">` with its label and the "Analizar correo" button, enabled only when a file is chosen and its name ends in `.eml` (case-insensitive); `email-file-hint` is shown when a chosen file's name does not end in `.eml`. `page.tsx` renders it; the submit is wired in #56. New selectors **(new)**: `email-file-input`, `analyze-email-button`, `email-file-hint`. Add `tests/ingreso-correo.spec.ts` for US-4.1 AC1 to AC3.
- #59 Frontend: email form styling. Plain CSS in `src/app/globals.css` with the palette variables: the email form is a card like the message form; the file input has a visible border and the shared `:focus-visible` outline; the hint is muted text; "Analizar correo" reuses the primary button. No text, role, element type, or `data-testid` changes. WCAG AA contrast. Verification: the full Playwright suite stays green with no new assertions; attach screenshots of the home page with no file, with an `.eml` file chosen, with a wrong file, and with the unreadable email error. Depends on #57.

### US-4.2 Analizar un correo
Como usuario quiero analizar el correo elegido para conocer si presenta indicios de fraude o engaño.

ADO ID: #49 · Status: done

El resultado se muestra en el mismo lugar y con el mismo formato que el de un mensaje (Features 1 y 2). "Reintentar" reenvía el último pedido, sea un mensaje o un correo.

Criterios de aceptación:
1. Al hacer clic en "Analizar correo", se envía `POST /analysis/email` con el cuerpo `{ "emailContent": "<contenido del archivo>" }`.
2. Mientras el análisis está en curso, se muestra "Analizando mensaje..." (`role="status"`) y los botones "Analizar mensaje" y "Analizar correo" están deshabilitados. Desde US-5.2 cada botón está en su pestaña: el de la pestaña visible está deshabilitado y, al cambiar de pestaña, el otro también.
3. Con un resultado, se muestra en `analysis-result`.
4. Si el análisis falla, se muestra "Los servidores están ocupados. Intentá de nuevo más tarde." (`analysis-error`) y "Reintentar"; al reintentar con éxito se reenvía el mismo correo y se muestra el resultado.
5. Si el correo no se puede leer, se muestra "No se pudo leer el correo. Verificá que sea un archivo .eml de hasta 1 MB." (`analysis-error`) sin el botón "Reintentar".

Tasks:
- #51 Contract: add `EmailAnalysisRequest` (`emailContent`) to `src/types.ts` and the matching Pydantic model (`email_content`) to `backend/app/models.py`. Nothing is sent or served yet.
- #54 Backend: `POST /analysis/email` endpoint. Thin router; blank `emailContent` or more than 1,000,000 characters returns 422; the service builds the digest (`InvalidEmailError` becomes 422 with the documented body) and calls `analyze_message` with it, so the evidence check runs against the digest; emails are never saved. The typed AI error becomes the 503 error. Pytest: happy path (the stubbed analyzer receives the digest), an indicator quoting a header line is kept, a quote not in the digest is dropped, blank content, too large, invalid email, AI error, the response has neither `topic` nor `maskedMessage`, and nothing is saved. Depends on #51, #52, and #53.
- #56 Frontend: email request, loading, and retry. The file is read with `File.text()`. Add `postEmailAnalysis` to `src/lib/api.ts`, throwing an `ApiError` that carries the status on non-2xx. `page.tsx` keeps the last request as a union (message or email) so "Reintentar" resends whichever was last, and disables both submit buttons while loading. Add email helpers mocking `**/analysis/email` to `tests/fixtures/analysis.ts` and `tests/analisis-correo.spec.ts` for US-4.2 AC1 to AC4. Depends on #51 and #55.
- #57 Frontend: unreadable email error. On an `ApiError` with status 422 from `postEmailAnalysis`, `analysis-error` shows the unreadable email text and no "Reintentar" button; any other failure keeps the current error and retry. `AnalysisError` receives the text and whether to show retry as props (no text duplicated). Add the US-4.2 AC5 test to `tests/analisis-correo.spec.ts`. Depends on #56.

### US-4.3 Ver las señales propias del correo
Como usuario quiero saber si el remitente, la autenticación, los enlaces o los adjuntos del correo muestran señales de engaño.

ADO ID: #50 · Status: done

El backend extrae del correo los datos que el texto no muestra (dirección visible del remitente, "Responder a", dirección de retorno, resultado de SPF/DKIM/DMARC, destino real de los enlaces y nombres de los adjuntos) y se los pasa a la IA junto con el cuerpo (ver [Email digest](#email-digest)). Tipos de indicador nuevos: remitente que no coincide, autenticación fallida, enlaces engañosos y adjuntos peligrosos. Usan la misma cita literal y el mismo chequeo de evidencia que el resto. La extracción se cubre con Pytest.

Criterios de aceptación:
1. Un indicador propio del correo se muestra en `analysis-indicator` con su título y descripción, y la línea citada del correo en `analysis-indicator-evidence`.

Tasks:
- #52 Backend: email digest. `build_email_digest(raw: str) -> str` in `backend/app/services/email_digest.py` with the standard library `email` (`policy.default`) and `html.parser` (no new dependency), producing the format in [Email digest](#email-digest). Define a typed `InvalidEmailError` and raise it when there is no readable text body. Pytest: plain text email; HTML-only email (text extracted, script and style dropped, links listed with visible text and destination); `From` with display name, `Reply-To`, and `Return-Path` lines; `Authentication-Results` parsed; attachment names listed and their content never included; missing optional headers omit their line; body truncated at 20,000 characters; an email without a text body raises `InvalidEmailError`. Depends on #51.
- #53 AI prompt: add the email indicator types to `IndicatorType` and `INSTRUCTIONS` and document them in the [AI contract](#ai-contract). The prompt describes the digest: only the lines before `Cuerpo:` come from the system, the email types apply only when the input is a digest, and `maskedMessage` is `""` for a digest. Pytest: the output schema `type` enum has the 11 indicator types.
- #58 Frontend: email indicators test. Add `tests/senales-correo.spec.ts` for US-4.3 AC1 (mocked `failed_authentication` indicator whose evidence is the `Autenticación:` line). Depends on #56.

## Feature 5 - Nuevo diseño de la interfaz

ADO ID: #60

Rediseño de la página principal y del panel a partir del mockup de Figma (carpeta local `NO SUBIR/mockup`, fuera del repositorio), con la paleta azul de [Visual design](#visual-design). El mockup es una guía general, no una copia exacta. Quedan fuera: el porcentaje de riesgo (el backend no calcula un puntaje; se muestra solo el nivel), el aviso de privacidad de la página principal y Tailwind (se sigue con CSS plano). Todo lo que ya existe se conserva (compartir en el panel, datos a ocultar, resumen, explicación, evidencia, aviso, error y "Reintentar"). El backend y la API no cambian.

### US-5.1 Ver la página con el nuevo diseño
Como usuario quiero una página clara y ordenada para analizar un mensaje y leer el resultado sin perderme.

ADO ID: #61 · Status: done

La página tiene un encabezado con el logo y "ScamGuard", una presentación ("Detector de estafas", el título y una introducción) con el enlace "Ver mensajes críticos", y dos columnas en pantallas anchas: a la izquierda la carga del mensaje y a la derecha la columna "Resultado del análisis" (estado de carga, error, estado vacío o resultado). En pantallas angostas las columnas quedan una debajo de la otra. Cada indicador muestra un ícono decorativo según su `type`.

Criterios de aceptación:
1. La página muestra el encabezado "ScamGuard" y el título "¿Ese mensaje te genera dudas?".
2. Antes de cualquier análisis, la columna "Resultado del análisis" muestra "Todavía no se analizó ningún mensaje." (`analysis-result-empty`).
3. Con un resultado, junto a "Indicadores detectados" se muestra la cantidad de indicadores (`analysis-indicators-count`), también cuando es 0.

Tasks:
- #65 Frontend: palette, font, header, and hero. Replace the tokens in `src/app/globals.css` with the ones in [Visual design](#visual-design); load Manrope with `next/font/google` in `src/app/layout.tsx` (built into Next.js, no new dependency; the font files are downloaded at build time and served by the app, so the browser never calls Google). Add a `SiteHeader` component (inline SVG shield logo with `aria-hidden`, and "ScamGuard" as text, not a heading) rendered by the layout on every page. In `page.tsx`, the `h1` becomes "¿Ese mensaje te genera dudas?", preceded by the "Detector de estafas" eyebrow and followed by the intro text and the `panel-link`. The panel page uses the same header, cards, and buttons. Add `tests/nuevo-diseno.spec.ts` for AC1; the rest of the suite stays green. Attach screenshots of the home page and of the panel.
- #66 Frontend: two-column layout and result column. `main` becomes a grid with the hero (spanning both columns), the form column, and an `aside` named by its heading (two columns from 64rem, one below). The `aside` has the `h2` "Resultado del análisis", the muted subtitle "Evaluación orientativa", and holds `AnalysisStatus`, `AnalysisError`, and `AnalysisResultView`. Inside `analysis-result`: the risk badge first, then explanation, summary, the `h2` "Indicadores detectados" **(new)** with the count badge `analysis-indicators-count` **(new)**, the indicators, and the disclaimer. Indicator titles stay `h3`. An `IndicatorIcon` component maps each of the 11 indicator types to an inline SVG with `aria-hidden` (display mapping only; an unknown type shows a generic alert icon). No changes to existing texts or `data-testid` values. Add the AC2 and AC3 tests to `tests/nuevo-diseno.spec.ts`. Attach screenshots of the empty state, loading, error, and a result for each risk level. Depends on #65.

### US-5.2 Elegir cómo cargar el mensaje
Como usuario quiero elegir entre pegar un mensaje o subir un correo para ver solo el formulario que necesito.

ADO ID: #62 · Status: done

La carga tiene dos pestañas: "Pegar mensaje" (formulario de mensaje, US-1.1 y US-3.3) y "Subir archivo .eml" (formulario de correo, US-4.1). Desde US-6.1 hay una tercera, "Pegar link". Cambiar de pestaña no borra lo cargado en la otra ni el resultado; "Reintentar" sigue reenviando el último pedido.

Criterios de aceptación:
1. Al abrir la página, la pestaña "Pegar mensaje" está seleccionada y se muestra el campo "Mensaje"; el campo "Archivo de correo (.eml)" no se muestra.
2. Al elegir la pestaña "Subir archivo .eml", se muestra el campo "Archivo de correo (.eml)" y no el campo "Mensaje".
3. Al volver a "Pegar mensaje", se muestra el mensaje que se había escrito.

Tasks:
- #67 Frontend: input tabs. An `AnalysisInputTabs` component with a `role="tablist"` (`aria-label="Método de carga"`) and two `role="tab"` buttons (`aria-selected`, `aria-controls`) "Pegar mensaje" (`message-tab`) and "Subir archivo .eml" (`email-tab`) **(new)**, each with a decorative icon; the active form is rendered inside a `role="tabpanel"`. `page.tsx` keeps the active tab in state and renders only the active form; the message, share fields, and chosen file stay in `page.tsx` state, so they survive a tab change. The file input itself is re-created empty on each tab change; the "Analizar correo" state comes from `page.tsx`. Update US-4.1 AC1 tests and every email test (`ingreso-correo`, `analisis-correo`, `senales-correo`) to open the email tab first through a shared `openEmailTab(page)` helper in `tests/fixtures/analysis.ts`. Add `tests/pestanas-carga.spec.ts` for AC1 to AC3. Depends on #66.

### US-5.3 Arrastrar un correo
Como usuario quiero arrastrar el archivo del correo hasta la página para no tener que buscarlo en el selector de archivos.

ADO ID: #63 · Status: done

La pestaña "Subir archivo .eml" muestra una zona con "Arrastrá tu correo hasta acá", "o seleccioná un archivo descargado de tu casilla", el botón "Elegir archivo .eml" y "Máximo 1 MB". Un archivo soltado se trata igual que uno elegido (US-4.1): solo un `.eml` habilita "Analizar correo". Con un archivo elegido, la zona muestra su nombre, "Archivo listo para analizar" (solo si es `.eml`) y el botón pasa a decir "Cambiar archivo".

Criterios de aceptación:
1. Al soltar un archivo `.eml` en la zona, se muestra su nombre (`email-file-name`) y "Analizar correo" se habilita.
2. Al soltar un archivo con otra extensión, se muestra su nombre y "Elegí un archivo con extensión .eml." (`email-file-hint`), y "Analizar correo" sigue deshabilitado.
3. El botón "Elegir archivo .eml" abre el selector de archivos.

Tasks:
- #68 Frontend: drop zone. In `EmailAnalysisForm`, the drop zone (`email-drop-zone` **(new)**) handles `dragenter`, `dragover`, `dragleave`, and `drop` (highlighted while dragging) and passes the first dropped file to `onEmailFileChange`. The label "Archivo de correo (.eml)" stays visible above the zone. The native file input is visually hidden but still focusable (the zone shows the shared focus outline while the input has keyboard focus, `:has(input:focus-visible)`, so focusing the button inside does not draw two outlines); the "Elegir archivo .eml" / "Cambiar archivo" button (`choose-email-file-button` **(new)**) opens it through a ref. `email-file-name` **(new)** shows the chosen file name, also when returning to the email tab (from `page.tsx` state). While dragging, the zone has `data-dragging="true"` (styling only). Add `tests/arrastrar-correo.spec.ts` for AC1 to AC3 (drop through a `DataTransfer` built in the page, file chooser through `page.waitForEvent('filechooser')`). Depends on #67.

### US-5.4 Limpiar el formulario y contar caracteres
Como usuario quiero ver cuántos caracteres tiene el mensaje y poder vaciar el formulario de un clic.

ADO ID: #64 · Status: done

"Limpiar" vacía solo la pestaña activa: en "Pegar mensaje", el mensaje, la casilla de compartir y los datos a ocultar; en "Subir archivo .eml", el archivo elegido; en "Pegar link" (US-6.1), el link. No borra el resultado ni cambia lo que reenvía "Reintentar", y sigue habilitado durante un análisis en curso (el pedido ya se envió).

Criterios de aceptación:
1. Al abrir la página, se muestra "0 caracteres" (`message-char-count`) y el campo "Mensaje" muestra el texto de ejemplo "Pegá acá el mensaje, SMS o correo que querés analizar...".
2. Al escribir, el contador muestra la cantidad de caracteres del mensaje, con "1 carácter" cuando es uno solo.
3. En "Pegar mensaje", al hacer clic en "Limpiar" (`clear-message-button`), el campo "Mensaje" queda vacío, la casilla de compartir se desmarca y "Analizar mensaje" se deshabilita.
4. En "Subir archivo .eml", al hacer clic en "Limpiar" (`clear-email-button`), deja de mostrarse el archivo elegido y "Analizar correo" se deshabilita.

Tasks:
- #69 Frontend: character count, placeholder, and clear buttons. `message-char-count` **(new)** next to the "Mensaje" label shows `message.length` ("N caracteres" / "1 carácter"; display mapping only); the textarea gets the placeholder. Each form has a "Limpiar" button with a decorative trash icon (`clear-message-button` and `clear-email-button` **(new)**, `type="button"`); the email one also resets the file input value through its ref. `page.tsx` handles both, reusing the existing state setters. Add `tests/limpiar-contador.spec.ts` for AC1 to AC4. Depends on #67 (AC4 also on #68, which owns the file input ref).

## Feature 6 - Análisis de links

ADO ID: #70

El usuario pega un link que recibió para saber si presenta indicios de estafa. ScamGuard analiza solo la dirección: el backend la separa en sus partes (ver [URL digest](#url-digest)) y la IA la evalúa. Nunca abre el link ni descarga la página, así que no ve su contenido ni a dónde redirige un acortador. Un solo link por análisis; para textos con varios links está la pestaña "Pegar mensaje". Los links no se guardan ni se comparten en el panel de mensajes críticos.

### US-6.1 Ingresar un link
Como usuario quiero pegar un link que recibí para analizarlo sin tener que abrirlo.

ADO ID: #71 · Status: done

La carga tiene una tercera pestaña, "Pegar link", después de "Subir archivo .eml". Cambiar de pestaña no borra el link escrito (US-5.2). "Limpiar" vacía el link (US-5.4).

Criterios de aceptación:
1. Al elegir la pestaña "Pegar link", el campo "Link" está vacío y el botón "Analizar link" está deshabilitado.
2. Si el link contiene solo espacios, el botón sigue deshabilitado.
3. Al ingresar texto en "Link", el botón se habilita.
4. Al hacer clic en "Limpiar" (`clear-url-button`), el campo "Link" queda vacío y "Analizar link" se deshabilita.

Tasks:
- #78 Frontend: link tab and form. Add `'url'` to `AnalysisInputTab` and a third tab "Pegar link" (`url-tab` **(new)**, decorative link icon) to `AnalysisInputTabs`; the arrow keys cycle through the three tabs. A `UrlAnalysisForm` component with the label "Link", a single-line `<input type="text" inputMode="url" autoComplete="off" spellCheck={false}>` (`url-input` **(new)**; not `type="url"`, whose browser validation would block links without `http://`), the placeholder "https://ejemplo.com/...", "Limpiar" (`clear-url-button` **(new)**) and "Analizar link" (`analyze-url-button` **(new)**), enabled while the trimmed value is not empty. The link lives in `page.tsx` state; the submit is wired in #79 (#78 and #79 are delivered together, so the button never does nothing). The hero intro changes to the text in [UI texts](#ui-texts). Add an `openUrlTab(page)` helper to `tests/fixtures/analysis.ts` and `tests/ingreso-link.spec.ts` for AC1 to AC4. Depends on #74.

### US-6.2 Analizar un link
Como usuario quiero analizar el link para conocer si presenta indicios de fraude o engaño.

ADO ID: #72 · Status: done

El resultado se muestra en el mismo lugar y con el mismo formato que el de un mensaje. "Reintentar" reenvía el último pedido, sea un mensaje, un correo o un link.

Criterios de aceptación:
1. Al hacer clic en "Analizar link", se envía `POST /analysis/url` con el cuerpo `{ "url": "<link>" }`.
2. Mientras el análisis está en curso, se muestra "Analizando mensaje..." (`role="status"`) y "Analizar link" está deshabilitado.
3. Con un resultado, se muestra en `analysis-result`.
4. Si el análisis falla, se muestra "Los servidores están ocupados. Intentá de nuevo más tarde." (`analysis-error`) y "Reintentar"; al reintentar con éxito se reenvía el mismo link y se muestra el resultado.
5. Si el link no es una dirección válida, se muestra "No se pudo leer el link. Verificá que sea una dirección completa, por ejemplo https://ejemplo.com." (`analysis-error`) sin el botón "Reintentar".

Tasks:
- #74 Contract: add `UrlAnalysisRequest` (`url`) to `src/types.ts` and the matching Pydantic model to `backend/app/models.py` (blank or more than 2,000 characters returns 422). Nothing is sent or served yet.
- #77 Backend: `POST /analysis/url` endpoint. Thin router; the service builds the digest (`InvalidUrlError` becomes 422 with the documented body) and calls `analyze_message` with it, so the evidence check runs against the digest; links are never saved (no saver dependency). The typed AI error becomes the 503 error. Pytest: happy path (the stubbed analyzer receives the digest), an indicator quoting a digest line is kept, a quote not in the digest is dropped, blank, too long, invalid link, AI error, the response has neither `topic` nor `maskedMessage`, and nothing is saved. Depends on #74, #75, and #76.
- #79 Frontend: link request, loading, retry, and unreadable link error. Add `postUrlAnalysis` to `src/lib/api.ts` (throws `ApiError` with the status on non-2xx). `page.tsx` adds `{ kind: 'url'; url: string }` to the last request union, so "Reintentar" resends the submitted link; the busy state disables "Analizar link" like the other buttons. On an `ApiError` with status 422 from `postUrlAnalysis`, `analysis-error` shows the unreadable link text from `AnalysisError` and no "Reintentar" (same mechanism as US-4.2 AC5). Add `mockUrlAnalysis`, `mockPendingUrlAnalysis`, and `mockUrlAnalysisSequence` (route `**/analysis/url`) to `tests/fixtures/analysis.ts` and `tests/analisis-link.spec.ts` for AC1 to AC5. Depends on #78.

### US-6.3 Ver las señales del link
Como usuario quiero saber qué partes del link muestran señales de engaño.

ADO ID: #73 · Status: done

El backend separa el link en sus partes (protocolo, dominio, si es una dirección IP, si usa un acortador conocido, si incluye un usuario antes de `@`, ruta y parámetros) y se las pasa a la IA (ver [URL digest](#url-digest)). Tipos de indicador nuevos: dominio que imita a una marca y link disfrazado. También aplican los existentes enlaces sospechosos (acortadores, dominios raros) y suplantación de identidad. Usan la misma cita literal y el mismo chequeo de evidencia que el resto.

Criterios de aceptación:
1. Un indicador del link se muestra en `analysis-indicator` con su título y descripción, y la línea citada del análisis del link en `analysis-indicator-evidence`.

Tasks:
- #75 Backend: URL digest. `build_url_digest(raw: str) -> str` in `backend/app/services/url_digest.py` with the standard library (`urllib.parse`, `ipaddress`, and the `idna` codec; no new dependency), producing the format in [URL digest](#url-digest). Define a typed `InvalidUrlError` and raise it for the invalid cases listed there. Pytest: full `https` link; link without scheme (`Protocolo: ninguno`); `http`; IPv4 and IPv6 hosts; userinfo before `@`; explicit port; punycode host shown decoded with its ASCII form; known shortener; path and query listed; empty path and query omit their lines; invalid cases (spaces, other scheme, no host, host without a dot) raise `InvalidUrlError`.
- #76 AI prompt: add `lookalike_domain` and `obfuscated_link` to `IndicatorType` and `INSTRUCTIONS`, and document them in the [AI contract](#ai-contract). The prompt describes the URL digest: only the `Enlace:` line comes from the user; the model judges only the address (it never saw the page), `suspicious_link` and `impersonation` also apply, the email-only types do not, and `maskedMessage` is `""` for a URL digest. Pytest: the output schema `type` enum has the 13 indicator types.
- #T7 AI prompt: risk level by severity. Add the [risk level criteria](#ai-contract) to `INSTRUCTIONS`, so a link with one or two strong indicators can be `HIGH` instead of defaulting to `MEDIUM`. The criteria apply to every input (message, email digest, URL digest). Pytest: the prompt states that the level follows severity, not count, and that caution never lowers it.
- #80 Frontend: link indicators. `IndicatorIcon` gets icons for `lookalike_domain` and `obfuscated_link`. Add `tests/senales-link.spec.ts` for AC1 (mocked `lookalike_domain` indicator whose evidence is the `Dominio:` line). Depends on #79.

## Feature 7 - Recomendaciones de acción

ADO ID: #81

Además del resultado, ScamGuard sugiere qué hacer: por ejemplo, no compartir claves, no abrir el link o verificar por un canal oficial. Las recomendaciones no las escribe la IA: el backend las elige de un catálogo fijo según el nivel de riesgo final y los tipos de indicador que pasaron el chequeo de evidencia (ver [Recommendations](#recommendations)). Así nunca repiten datos del mensaje (un número o un link del estafador) y se cubren con Pytest. Aplican a mensajes, correos y links por igual.

### US-7.1 Ver qué hacer con el resultado
Como usuario quiero ver recomendaciones concretas según el resultado del análisis para saber cómo actuar.

ADO ID: #82 · Status: done

La sección "Qué podés hacer" está dentro de `analysis-result`, después de los indicadores y antes del aviso. Todo resultado tiene al menos una recomendación, también el de riesgo bajo o indeterminado.

Criterios de aceptación:
1. Con un resultado, se muestra el título "Qué podés hacer" y cada recomendación en `analysis-recommendation`, en el orden recibido.
2. Si no se detectaron indicadores, las recomendaciones se siguen mostrando.
3. Si un nuevo análisis falla, las recomendaciones anteriores dejan de mostrarse.

Tasks:
- #84 Contract: add `RecommendationType`, `Recommendation`, and the `recommendations` field of `MessageAnalysisResponse` (see [API contract](#api-contract)) to `src/types.ts` and the matching Pydantic models to `backend/app/models.py`. The three analysis endpoints return an empty list until #85. Add `recommendations: []` to the default mocked response in `tests/fixtures/analysis.ts` so the suite stays green. Nothing is rendered yet.
- #85 Backend: recommendations by risk level. `build_recommendations(result: AnalysisResult) -> list[Recommendation]` in `backend/app/services/recommendations.py`, with the catalog in [Recommendations](#recommendations) (types and Spanish texts defined once) and the risk level rules. `POST /analysis`, `POST /analysis/email`, and `POST /analysis/url` return `MessageAnalysisResponse(result=result, recommendations=build_recommendations(result))`, so the rules see the result after the evidence check. Pytest: `HIGH`, `MEDIUM`, `LOW`, and `UNDETERMINED` each give their recommendations in catalog order; every level gives at least one; the three endpoints include `recommendations`. Depends on #84.
- #86 Frontend: recommendations section. `page.tsx` stores the recommendations together with the result and clears them together (on submit and on error). A `RecommendationList` component renders, inside `analysis-result` after the indicators and before the disclaimer, the `h2` "Qué podés hacer" and a list with one `analysis-recommendation` **(new)** item per recommendation inside `analysis-recommendations` **(new)**, with `${type}-${index}` keys (display only). Add `tests/recomendaciones.spec.ts` for AC1 to AC3. Depends on #84.
- #87 Frontend: recommendations styling. Plain CSS in `src/app/globals.css` with the palette variables: the section is spaced like the indicators; each recommendation is a block with a 1rem radius on `--color-surface-soft` with a decorative check icon (`aria-hidden`). No text, role, element type, or `data-testid` changes. WCAG AA contrast. Verification: the full Playwright suite stays green with no new assertions; attach screenshots of a result for each risk level. Depends on #86.

### US-7.2 Recibir recomendaciones según las señales detectadas
Como usuario quiero que las recomendaciones respondan a las señales que se encontraron para saber qué evitar en mi caso.

ADO ID: #83 · Status: pending

Cada tipo de indicador puede sumar una recomendación propia (por ejemplo, un pedido de datos suma "No compartas claves, códigos ni datos de tarjeta o de cuenta..."). Si varias señales llevan a la misma recomendación, se muestra una sola vez. La selección ocurre en el backend y se cubre con Pytest.

Criterios de aceptación:
1. Con un indicador de pedido de datos personales, se muestra en `analysis-recommendation` la recomendación de no compartir claves, junto a las del nivel de riesgo.

Tasks:
- #88 Backend: recommendations by indicator type. Extend `build_recommendations` with the indicator rules in [Recommendations](#recommendations): each recommendation appears once, in catalog order, whatever the number of indicators that trigger it. Pytest: `personal_data_request` adds `do_not_share_data`; `suspicious_link`, `lookalike_domain`, `obfuscated_link`, and `deceptive_link` together add `do_not_open_link` once; `impersonation` with `MEDIUM` adds `verify_official_channel` once; `writing_errors` adds nothing; dropped indicators (evidence check) add nothing. Depends on #85.
- #89 Frontend: indicator recommendations test. Add `tests/recomendaciones-indicadores.spec.ts` for AC1 (mocked `personal_data_request` indicator with `HIGH` and the matching recommendations). Depends on #86.

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
| Home link to the panel | Ver mensajes críticos |
| Panel heading | Mensajes críticos |
| Panel link back to home | Volver al análisis |
| Share checkbox label | Compartir este mensaje en el panel de mensajes críticos |
| Sensitive data field label | Datos a ocultar (separados por coma) |
| Panel privacy notice | Los mensajes se comparten solo si quien los analiza lo permite, y sus datos personales se ocultan antes de guardarlos. |
| Panel loading status | Cargando mensajes críticos... |
| Topic count | Mensajes similares: N (total times its messages were shared) |
| Message share count | Compartido N veces / Compartido 1 vez |
| Topic detail toggle | Ver detalle |
| Topic show all button | Ver todos los mensajes |
| Panel empty | Todavía no hay mensajes críticos registrados. |
| Panel error | No se pudo cargar el panel. Intentá de nuevo más tarde. |
| Panel retry button | Reintentar |
| Topic titles (set by the backend) | See the topic list in [AI contract](#ai-contract) |
| Email file field label | Archivo de correo (.eml) |
| Email submit button | Analizar correo |
| Email file hint (wrong extension) | Elegí un archivo con extensión .eml. |
| Unreadable email error | No se pudo leer el correo. Verificá que sea un archivo .eml de hasta 1 MB. |
| Header brand (US-5.1) | ScamGuard |
| Hero eyebrow | Detector de estafas |
| Home heading (`h1`, replaces "ScamGuard") | ¿Ese mensaje te genera dudas? |
| Hero intro (updated in US-6.1) | Pegá un texto o un link, o subí el correo completo. Analizamos las señales de alerta y te explicamos qué encontramos. |
| Result column heading | Resultado del análisis |
| Result column subtitle | Evaluación orientativa |
| Indicators heading | Indicadores detectados |
| Message tab (US-5.2) | Pegar mensaje |
| Email tab | Subir archivo .eml |
| Tab list accessible name (`aria-label`) | Método de carga |
| Drop zone (US-5.3) | Arrastrá tu correo hasta acá / o seleccioná un archivo descargado de tu casilla / Máximo 1 MB |
| Choose file button | Elegir archivo .eml / Cambiar archivo (with a file chosen) |
| File ready | Archivo listo para analizar |
| Message placeholder (US-5.4) | Pegá acá el mensaje, SMS o correo que querés analizar... |
| Character count | N caracteres / 1 carácter |
| Clear button | Limpiar |
| Link tab (US-6.1) | Pegar link |
| Link field label | Link |
| Link placeholder | https://ejemplo.com/... |
| Link submit button | Analizar link |
| Unreadable link error | No se pudo leer el link. Verificá que sea una dirección completa, por ejemplo https://ejemplo.com. |
| Recommendations heading (US-7.1) | Qué podés hacer |
| Recommendation texts (set by the backend) | See the catalog in [Recommendations](#recommendations) |

## Visual design

Plain CSS in `src/app/globals.css` (built into Next.js; no CSS framework). Colors are CSS variables in `:root`; components use class names, never `data-testid` selectors, for styling. Styling never adds or changes visible text, roles, or `data-testid` values. Since Feature 5 the look follows the Figma mockup with a blue palette instead of its green one.

- Font (Feature 5): Manrope (weights 400 to 800) through `next/font/google`, with `system-ui, sans-serif` as fallback.
- Shape (Feature 5): cards have a 1.5rem radius, a 1px `--color-border` border, and a soft `--shadow-card`; inner blocks (textarea, drop zone, indicators) have a 1rem radius; badges are pills. The accent underlines of the `h1` (#24) and of the indicator `h3` titles (#25) are dropped.
- The drop zone highlight is selected with `[data-dragging="true"]`, like the risk badge with `[data-risk-level]`.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#f5f7fb` | Page background, evidence background |
| `--color-surface` | `#ffffff` | Cards (form, result, indicators), header |
| `--color-surface-soft` | `#f9fafc` | Textarea, drop zone, and indicator background |
| `--color-text` | `#111827` | Body text |
| `--color-muted` | `#4b5563` | Empty state, empty indicators, disclaimer, status text, subtitles, inactive tabs, character count, textarea border, evidence border, disabled button text |
| `--color-border` | `#d1d5db` | Card, indicator, disclaimer, header, and disabled button borders |
| `--color-primary` | `#1d4ed8` | Primary button, active tab underline, logo background, brand accent, focus outline |
| `--color-primary-hover` | `#1e40af` | Primary button hover |
| `--color-primary-soft` | `#e8eefc` | Eyebrow, logo-tinted icon backgrounds, drop zone while dragging, secondary soft buttons (text in `--color-primary`) |
| `--shadow-card` | `0 16px 50px rgba(15, 23, 42, 0.07)` | Card shadow |
| `--color-disabled-bg` | `#e5e7eb` | Disabled button background |
| `--color-error-text` / `--color-error-bg` | `#b91c1c` / `#fef2f2` | Error block |
| `--color-risk-low` / `-bg` | `#166534` / `#dcfce7` | Risk badge "Bajo" |
| `--color-risk-medium` / `-bg` | `#92400e` / `#fef3c7` | Risk badge "Medio" |
| `--color-risk-high` / `-bg` | `#991b1b` / `#fee2e2` | Risk badge "Alto" |
| `--color-risk-undetermined` / `-bg` | `#374151` / `#e5e7eb` | Risk badge "Indeterminado" |

- The risk badge color is selected with `[data-risk-level="..."]` on the `dd`; the Spanish label is always shown, so color is never the only signal.
- All text/background pairs meet WCAG AA (4.5:1); focus is always visible (`:focus-visible` outline, 2px `--color-primary`, 2px offset).
- Layout (Feature 5): full-width header with an inner max-width of 77.5rem; `main` with the same max-width, centered, with 1.25rem side padding (2rem from 40rem). The home page has two columns from 64rem (form about 54%, result column at least 24rem) and one column below; the panel stays a single column.
- Risk badge colors keep the `--color-risk-*` tokens; the indicator icon backgrounds use `--color-primary-soft`, since an indicator has no level of its own.

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
  shareInPanel?: boolean; // Sent only when the share checkbox is checked (US-3.3)
  sensitiveData?: string; // Comma-separated terms to hide; sent with shareInPanel
}

export interface AnalysisResult {
  riskLevel: RiskLevel;
  summary: string;
  explanation: string;
  indicators: Indicator[];
}

export type RecommendationType =
  | 'do_not_follow'
  | 'do_not_share_data'
  | 'do_not_pay'
  | 'verify_official_channel'
  | 'do_not_open_link'
  | 'do_not_open_attachments'
  | 'take_your_time'
  | 'distrust_prizes'
  | 'if_already_acted'
  | 'stay_alert';

export interface Recommendation {
  type: RecommendationType;
  text: string; // Spanish text, set by the backend
}

export interface MessageAnalysisResponse {
  result: AnalysisResult;
  recommendations: Recommendation[]; // Feature 7; never empty once #85 is done
}
```

- `recommendations` sits next to `result`, not inside it, because `AnalysisResult` is also the shape the model returns; the model never writes recommendations (see [Recommendations](#recommendations)).

- `evidence`, `explanation`, and `UNDETERMINED` are new and must be added to `src/types.ts` (task #11) and to the backend models.
- The frontend reads the backend base URL from `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`). E2E tests mock `**/analysis`, `**/analysis/email`, `**/analysis/url`, and `**/critical-messages`, so no backend needs to run.
- JSON fields are camelCase; backend models use snake_case with camelCase aliases.
- Errors:
  - `422`: empty or whitespace-only message. The UI cannot send it (the button is disabled), so it is covered by Pytest only.
  - `503`: the AI call failed, timed out, or returned invalid output. Body: `{ "detail": "Los servidores están ocupados. Intentá de nuevo más tarde." }`.
- The frontend ignores the error body and shows the error text from [UI texts](#ui-texts) for any non-2xx response or network error.
- The AI `topic` and `maskedMessage` are internal: they are never part of the `POST /analysis` response.
- `shareInPanel` defaults to `false` and `sensitiveData` to `""`; the request without them stays valid.

`GET /critical-messages`

```ts
export type Topic =
  | 'family_money_request'
  | 'bank_impersonation'
  | 'credentials_request'
  | 'prize_or_giveaway'
  | 'package_delivery'
  | 'investment_offer'
  | 'job_offer'
  | 'other';

export interface CriticalMessage {
  id: number;
  text: string; // Masked text, never the original
  timesShared: number; // Times this message was shared (US-3.4); at least 1
}

export interface CriticalTopic {
  topic: Topic;
  title: string; // Spanish title, set by the backend
  timesShared: number; // Total times its messages were shared (US-3.4)
  messages: CriticalMessage[]; // Each message once, most recently shared first; never empty
}

export interface CriticalMessagesResponse {
  topics: CriticalTopic[]; // Most shared first; empty when nothing is stored
}
```

- Errors: `503` when the storage cannot be read. Body: `{ "detail": "No se pudo cargar el panel. Intentá de nuevo más tarde." }`. The frontend ignores the body, as with `POST /analysis`.

`POST /analysis/email`

```ts
export interface EmailAnalysisRequest {
  emailContent: string; // Raw .eml file content, read as text by the frontend
}
```

- Response: `MessageAnalysisResponse`, the same as `POST /analysis`.
- The file is sent as text inside JSON, not as `multipart/form-data`, so no new backend dependency is needed.
- Errors:
  - `422`: `emailContent` is blank, has more than 1,000,000 characters, or has no readable text body (see [Email digest](#email-digest)). For an unreadable email the body is `{ "detail": "No se pudo leer el correo. Verificá que sea un archivo .eml de hasta 1 MB." }`; blank or too large content keeps FastAPI's default validation body. The frontend ignores the body and shows the unreadable email text from [UI texts](#ui-texts), without retry.
  - `503`: same as `POST /analysis`. Any other non-2xx or network error shows the `POST /analysis` error text with retry.
- Emails are never shared in the panel: the request has no `shareInPanel`.

`POST /analysis/url` (Feature 6)

```ts
export interface UrlAnalysisRequest {
  url: string; // One link as pasted by the user
}
```

- Response: `MessageAnalysisResponse`, the same as `POST /analysis`.
- Errors:
  - `422`: `url` is blank, has more than 2,000 characters, or is not a valid link (see [URL digest](#url-digest)). For an invalid link the body is `{ "detail": "No se pudo leer el link. Verificá que sea una dirección completa, por ejemplo https://ejemplo.com." }`; blank or too long keeps FastAPI's default validation body. The frontend ignores the body and shows the unreadable link text from [UI texts](#ui-texts), without retry.
  - `503`: same as `POST /analysis`. Any other non-2xx or network error shows the `POST /analysis` error text with retry.
- Links are never fetched, stored, or shared in the panel: the request has no `shareInPanel`.

## AI contract

- Model: `gpt-5.4-mini`, deployed on Azure Foundry. Endpoint (the v1 base URL), key, and deployment name come from `.env`.
- SDK: `openai` Python package, `OpenAI` client with `base_url` set to the Azure v1 endpoint (`https://<resource>.services.ai.azure.com/openai/v1/`), calling the Responses API (`responses.create`). No `api_version` is needed. Structured JSON output uses `text.format` with a JSON schema (see Output schema below).
- Timeout: 60 seconds, with no SDK retries (`max_retries=0`).
- Input: the user message, the [email digest](#email-digest) built by the backend (Feature 4), or the [URL digest](#url-digest) built by the backend (Feature 6).
- Output: JSON with the `AnalysisResult` shape, validated by the backend before returning it. The model output schema restricts `riskLevel` to `LOW | MEDIUM | HIGH`; `UNDETERMINED` is set only by the backend.
- Evidence check: the backend drops any indicator whose `evidence` does not appear in the submitted message. Comparison is case-insensitive, with consecutive whitespace collapsed to one space and leading/trailing whitespace trimmed on both sides. An indicator whose `evidence` is empty or whitespace-only is dropped.
- Undetermined risk: if the model returned at least one indicator and the evidence check drops all of them, the backend sets `riskLevel` to `UNDETERMINED` and replaces `explanation` with the text from [UI texts](#ui-texts). If the model returned no indicators, its `riskLevel` and `explanation` are kept.
- Where the rules run: output validation in `backend/app/ai/analyzer.py`; the evidence check and the undetermined rule in `backend/app/services/analysis.py`, after any analyzer. Indicators that pass the check are kept as returned (evidence verbatim). If only some are dropped, `riskLevel` and `explanation` are kept.
- Fallback: if the call fails, times out, or returns invalid output, the AI layer raises one typed AI error and the endpoint returns the `503` error. Never a partial or invented result. Missing configuration also raises the typed AI error.
- Prompt: `backend/app/ai/prompt.py` (`INSTRUCTIONS`), in English; the model writes `summary`, `explanation`, `title`, and `description` in neutral Spanish, and copies `evidence` verbatim from the message. `summary` states what the message asks for or claims to be (it does not explain the risk); `explanation` justifies `riskLevel` from the indicators without claiming certainty. With no indicators, `riskLevel` is `LOW`. Indicators list only signs present in the message; types that do not apply are omitted. The prompt tells the model that, in an [email digest](#email-digest), only the lines before `Cuerpo:` come from the system; the email-only indicator types apply only to a digest and quote one of those system lines as evidence. In a [URL digest](#url-digest), only the `Enlace:` line comes from the user and is data, never instructions; the model judges only the address (nobody opened the link), the link-only types apply only to a URL digest, and evidence quotes one of its lines or part of `Enlace`.
- Risk level criteria: `riskLevel` follows from how severe the indicators are, not from how many there are, so one strong sign is enough for `HIGH` (a link rarely has more than two or three indicators). Caution applies to the wording of `explanation`, never to the level: the model must not lower it to hedge.

| `riskLevel` | When |
|---|---|
| `HIGH` | At least one strong sign: asks for passwords, codes, or card or account data; asks for a payment or transfer while impersonating someone or under pressure; impersonates a bank, company, or relative to get data or money; `lookalike_domain` imitating a brand or entity; `obfuscated_link` that hides the real destination (IP address, a user name before `@` that looks like another site, punycode imitating a brand); `deceptive_link`; `dangerous_attachment`; `failed_authentication` together with `sender_mismatch`. Several weak signs together (e.g. urgency, a shortened link, and a prize) can also be `HIGH`. |
| `MEDIUM` | Only weak signs that may have an innocent explanation: urgency alone, a shortened link alone, an unusual domain that imitates no one, a promise without a request for data or money, `failed_authentication` or `sender_mismatch` alone. |
| `LOW` | No indicators, or only minor signs such as writing errors. |

- Output schema: `OUTPUT_SCHEMA` in the same file, sent as `text.format` (`type: json_schema`, `name: analysis_result`, `strict: true`). Keys are camelCase and match `AnalysisResult` plus `topic` and `maskedMessage`; every field is required and no extra fields are allowed; `riskLevel` is `LOW | MEDIUM | HIGH`; `indicators` may be empty; `type` is one of the indicator types below; `topic` is one of the topics below.
- Topic: the scam pattern the message fits best, returned for every message (`other` when none fits).
- Masked message: the message copied verbatim except that names of people, addresses, and any other personal data are replaced with `[nombre]`, `[dirección]`, or `[dato oculto]`. Amounts of money are kept. Returned for every message (the schema is fixed), used only when the message is shared. For an email digest or a URL digest the model returns `""`, since emails and links are never shared and copying a long digest would only add latency and cost. Best effort: the model may miss data, so the backend masking always runs on top of it.
- The analyzer returns `topic` and `maskedMessage` next to the `AnalysisResult` as an internal `AnalyzedMessage`; they are used only to store shared critical messages.
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
| `sender_mismatch` | Emails only: the visible sender, `Reply-To`, or return address do not match |
| `failed_authentication` | Emails only: SPF, DKIM, or DMARC did not pass |
| `deceptive_link` | Emails only: a link's visible text shows a different destination than the real one |
| `dangerous_attachment` | Emails only: attachments that can run code or hide their type (e.g. `.exe`, `.scr`, `.js`, `.html`, `factura.pdf.exe`) |
| `lookalike_domain` | Links only: the domain imitates a known brand or entity (misspellings, extra words, swapped letters, unusual extensions, e.g. `mercadopago-seguridad.com`, `paypa1.com`) |
| `obfuscated_link` | Links only: the address hides where it leads (IP address instead of a domain, a user name before `@`, punycode, many subdomains, encoded characters) |

- In a [URL digest](#url-digest), `suspicious_link` (shorteners, odd domains) and `impersonation` also apply; the email-only types do not.

- Topics (fixed list; the title is shown in the panel):

| `topic` | Meaning | Title |
|---|---|---|
| `family_money_request` | A relative or acquaintance urgently asks for money | Pedido de dinero de un familiar o conocido |
| `bank_impersonation` | Pretends to be a bank or digital wallet | Suplantación de bancos o billeteras virtuales |
| `credentials_request` | Asks for passwords, codes, or account data | Pedido de claves, códigos o datos de cuenta |
| `prize_or_giveaway` | Prizes, giveaways, or gifts | Premios, sorteos y regalos |
| `package_delivery` | Held packages or delivery fees | Envíos y paquetes retenidos |
| `investment_offer` | Investments or easy gains | Inversiones y ganancias fáciles |
| `job_offer` | Job offers | Ofertas de trabajo |
| `other` | None of the above | Otros engaños |

## Email digest

The backend turns an `.eml` file into one text, the digest, which is the message for the analyzer and the evidence check. Every rule in the [AI contract](#ai-contract) applies to it unchanged.

- Parsing: standard library `email` (`policy.default`, which decodes encoded headers and transfer encodings) and `html.parser`, in `backend/app/services/email_digest.py`. No new dependency.
- Format: Spanish labels, since quoted lines are shown as evidence. Each line before `Cuerpo:` appears only when its data exists.

```
De: <From, decoded, with display name and address>
Responder a: <Reply-To>
Dirección de retorno: <Return-Path>
Asunto: <Subject>
Autenticación: spf=<result> dkim=<result> dmarc=<result>
Adjuntos: <file names, comma-separated>
Enlaces:
- "<visible text>" -> <href>
Cuerpo:
<body text>
```

- Header lines: each value is decoded and collapsed to one line, so a header can never add a digest line. A header that cannot be parsed omits its line.
- `Autenticación`: from the first (topmost) `Authentication-Results` header; only the `spf`, `dkim`, and `dmarc` results present are listed, in that order and lowercase.
- `Enlaces`: each `<a href>` of the HTML body with its visible text, in order of appearance, up to 20. Repeated links are dropped; a link is repeated only when both its visible text and its destination are equal, so a deceptive link that shares a destination with another one is still listed. Taken from the HTML part even when the body comes from `text/plain`.
- `Adjuntos`: file names only, separated by `, `; attachment content is never read or sent to the model.
- `Cuerpo`: the `text/plain` part; if there is none or it is blank, the `text/html` part converted to text (script and style content dropped). Only the body is truncated, to 20,000 characters; header lines are not. A part without a declared charset, with an ASCII charset, or with an unknown charset is decoded as UTF-8, replacing unreadable characters.
- Invalid email: no `text/plain` or `text/html` part, or a blank body after conversion, raises `InvalidEmailError` (`422`). Text without email headers is analyzed as an email with only `Cuerpo:`.
- Privacy: the file and the digest exist only during the request; they are never stored, logged, or shared.
- Known limitation: the body is free text, so a sender could write lines that look like header lines. The prompt tells the model that only lines before `Cuerpo:` come from the system, but the evidence check cannot tell them apart.

## URL digest

The backend turns the pasted link into one text, the URL digest, which is the message for the analyzer and the evidence check (Feature 6). Every rule in the [AI contract](#ai-contract) applies to it unchanged. The link is never opened, fetched, or resolved.

- Parsing: standard library `urllib.parse`, `ipaddress`, and the `idna` codec, in `backend/app/services/url_digest.py`. No new dependency.
- Format: Spanish labels, since quoted lines are shown as evidence. Optional lines appear only when their data exists.

```
Enlace: <the link as pasted, trimmed>
Protocolo: <https, http, or ninguno>
Dominio: <host in lowercase; a punycode host is shown decoded>
Dominio en punycode: <ASCII form, only when it differs from Dominio>
Dirección IP: sí                       (only when the host is an IPv4 or IPv6 address)
Usuario antes de @: <text>             (only when the link has a user name before the host)
Puerto: <port>                         (only when explicit)
Acortador de enlaces: sí               (only for a known shortener)
Ruta: <path>                           (only when not empty or "/")
Parámetros: <query string>             (only when not empty)
```

- Only `Enlace:` comes from the user; the other lines come from the system. The fragment (`#...`) is ignored. `Ruta` and `Parámetros` are shown raw (percent-encoding is not decoded), so they stay quotable and encoded characters stay visible.
- Known shorteners (fixed list, defined once in the backend): `bit.ly`, `tinyurl.com`, `t.co`, `goo.gl`, `ow.ly`, `is.gd`, `cutt.ly`, `rebrand.ly`, `shorturl.at`, `acortar.link`, `rb.gy`, `t.ly`. A host matches when it equals one of them or ends with `.` plus one of them (`www.bit.ly` matches, `notbit.ly` and `bit.ly.example.com` do not).
- Scheme: a link starting with `<scheme>://` uses that scheme (case-insensitive). Without `://`, a leading `<letters>:` not followed by a digit is another scheme (`javascript:`, `mailto:`) and is invalid; otherwise the link is parsed as if it started with `http://` and `Protocolo` is `ninguno` (so `ejemplo.com:8080` is a host and a port).
- `Dominio`: one trailing dot is removed (`ejemplo.com.` → `ejemplo.com`). If the host cannot be converted to or from punycode, `Dominio` shows it as is and the `Dominio en punycode` line is omitted; it is not an invalid link.
- Invalid link (`InvalidUrlError`, `422`): after trimming the ends, it contains whitespace; it has a scheme other than `http` or `https`; the port is not a number from 0 to 65535; it has no host; or the host is neither an IP address nor contains a dot. The error never includes the link.
- Privacy: the link and the digest exist only during the request; they are never stored, logged, or shared.
- Known limitation: ScamGuard does not see the page or where a shortener redirects, so a clean-looking address is not proof that the link is safe; the disclaimer (NFR-01) still applies.
- Known limitation: text pasted in "Pegar mensaje" could imitate a URL or email digest. The prompt tells the model which lines come from the system, but the evidence check cannot tell them apart.

## Recommendations

What the user could do next, chosen by the backend from a fixed catalog (Feature 7). Rules in `backend/app/services/recommendations.py`; Spanish texts defined once there.

- Input: the final `AnalysisResult`, after the evidence check and the undetermined rule, so a dropped indicator never adds a recommendation.
- Not AI: the texts are fixed, so they never repeat data from the message (a phone number, a link, or a name given by the scammer) and never claim certainty; the disclaimer (NFR-01) still applies.
- Order and duplicates: the output follows the catalog order below; each recommendation appears at most once, whatever the number of rules that trigger it.
- Every result gets at least one recommendation: each risk level triggers one.

| `type` | Text | When |
|---|---|---|
| `do_not_follow` | No respondas, no hagas clic y no sigas las instrucciones del mensaje. | `riskLevel` is `HIGH` |
| `do_not_share_data` | No compartas claves, códigos ni datos de tarjeta o de cuenta. Ningún banco ni empresa te los pide por mensaje. | `personal_data_request` |
| `do_not_pay` | No hagas pagos ni transferencias hasta confirmar el pedido por otro medio. | `payment_request` |
| `verify_official_channel` | Comunicate con la persona o la empresa por un canal que ya conozcas (su app, su sitio oficial o un número que tengas agendado), no por los datos que aparecen en el mensaje. | `impersonation`, `sender_mismatch`, or `failed_authentication`; or `riskLevel` is `MEDIUM` or `UNDETERMINED` |
| `do_not_open_link` | No abras el link. Si necesitás entrar al sitio, escribí vos la dirección oficial. | `suspicious_link`, `lookalike_domain`, `obfuscated_link`, or `deceptive_link` |
| `do_not_open_attachments` | No abras ni descargues los archivos adjuntos. | `dangerous_attachment` |
| `take_your_time` | Tomate tu tiempo: la urgencia busca que actúes sin verificar. | `urgency` |
| `distrust_prizes` | Desconfiá de premios o ganancias que no pediste, sobre todo si para recibirlos tenés que pagar o dar datos. | `unrealistic_promise` |
| `if_already_acted` | Si ya compartiste datos o hiciste un pago, comunicate cuanto antes con tu banco y cambiá tus claves. | `riskLevel` is `HIGH` |
| `stay_alert` | Aunque no se encontraron señales graves, desconfiá si más adelante te piden datos, códigos o dinero. | `riskLevel` is `LOW` |

- `writing_errors` has no recommendation of its own; it is a weak sign, covered by the risk level rules.

## Critical messages storage

- Engine: SQLite through the Python standard library `sqlite3` (no new dependency), in `backend/app/storage/`. File path from `SCAMGUARD_DB_PATH` (default `backend/data/scamguard.db`, resolved relative to the backend package, not the working directory; ignored by git).
- Table `critical_messages`: `id INTEGER PRIMARY KEY`, `topic TEXT NOT NULL`, `text TEXT NOT NULL` (masked, as first shared), `normalized_text TEXT NOT NULL`, `times_shared INTEGER NOT NULL` (starts at 1), `created_at TEXT NOT NULL` (first share), `last_shared_at TEXT NOT NULL` (latest share), with `UNIQUE (topic, normalized_text)`. Dates are UTC, ISO 8601. Created on first use.
- Duplicates (US-3.4): `normalized_text` is the masked text with the evidence check normalization (case-insensitive, whitespace collapsed and trimmed) and every placeholder (`[...]`) replaced with the same token, so texts that differ only in which placeholder hides a datum (e.g. `[dato oculto]` vs `[número]`) are the same message. Saving a message whose `topic` and `normalized_text` already exist adds 1 to `times_shared` and updates `last_shared_at` instead of inserting a row. Detection is exact, not by similarity.
- What is saved: only messages the user chose to share (`shareInPanel`) whose final `riskLevel` is `HIGH` (after the evidence check), as masked text with their topic. If `maskedMessage` is blank, nothing is saved. The original text, the user's `sensitiveData`, and the indicators are never stored.
- Masking, applied in this order:
  1. The model's `maskedMessage` (names, addresses, and other personal data; see [AI contract](#ai-contract)) is the starting text.
  2. Links (`backend/app/services/masking.py`): tokens starting with `http://`, `https://`, or `www.`, or containing a domain followed by a path (e.g. `bit.ly/abc`), become `[enlace]`.
  3. Emails become `[email]`.
  4. User terms: each comma-separated term of `sensitiveData`, trimmed and non-empty, is replaced case-insensitively with `[dato oculto]`. Runs after links and emails so a term inside them does not break their detection, and never alters a placeholder already in the text (e.g. `[nombre]`, `[email]`).
  5. Sequences of 7 or more digits, optionally starting with `+` and with spaces, dots, or dashes between digits (phones, CBU, cards, DNI), become `[número]`. Amounts of money are kept: a sequence preceded by a currency symbol or code (`$`, `US$`, `U$S`, `USD`, `ARS`) or followed by a currency word (`pesos`, `dólares`, `dolares`, `USD`, `ARS`), case-insensitive, is never masked.
  - Steps 2 to 5 are deterministic; step 1 is best effort, so names or addresses the model misses and the user does not list may remain (known limitation).
- Grouping and order: one group per topic with at least one message; groups by total `times_shared` (descending), ties by most recent `last_shared_at`; messages by `last_shared_at` (most recent first). Equal dates are ordered by `id` (descending).
- Errors: any `sqlite3` or filesystem (`OSError`) error is raised as the typed `StorageError`.
- Failure: a save error is logged and never changes the `POST /analysis` response; a read error returns the `503` of `GET /critical-messages`.
- Retention: messages are never deleted.

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

### NFR-07 Privacy of stored messages
Only `HIGH` risk messages the user chose to share are stored, always masked, and the panel says so. See [Critical messages storage](#critical-messages-storage). Email files (Feature 4) are never stored or shared; see [Email digest](#email-digest). Links (Feature 6) are never fetched, stored, or shared; see [URL digest](#url-digest).
