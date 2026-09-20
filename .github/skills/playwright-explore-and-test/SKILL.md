---
name: playwright-explore-and-test
description: "Use when creating Playwright tests from a real UI exploration flow: inspect localhost first, derive locators from the live accessibility snapshot, then run the test suite and classify failures as app or test issues before editing selectors."
argument-hint: "Describe the feature or test area to explore and test."
---

# playwright-explore-and-test

First look, then write. Never invent a selector.

## Phase 1: Explore
- Verify that `localhost:3000` responds before doing anything else.
- Navigate with the Playwright MCP tools.
- Take an accessibility snapshot of the page.
- Interact like a user to understand the real UI state.
- Report the elements found with their role and `data-testid`.
- If the app is not reachable, stop and explain that the issue is with the app or environment.

## Phase 2: Write
- Only after Phase 1, create or update the test file under `tests/`.
- Derive locators only from the real snapshot and interactions from Phase 1.
- Write one file per feature.
- Write one test per acceptance criterion.
- Do not invent selectors or assume DOM structure that was not observed.

## Phase 3: Execute
- Run `npx playwright test --reporter=list`.
- If something fails, return to Phase 1 and inspect the DOM again before touching the test.
- Explicitly state whether the problem is in the app or in the test.
- Keep iterating only after re-observing the UI.

## Rules
- Always inspect the live UI before writing any selector.
- Never invent a selector.
- Prefer accessible locators grounded in the snapshot.
- Keep tests aligned with the observed behavior of the app.
- If the UI changed, re-explore before editing the test.
