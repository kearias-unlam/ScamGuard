---
applyTo: "tests/**/*.spec.ts"
---

# Playwright Test Instructions

## Rules
- Write test titles in Spanish.
- Use one test per acceptance criterion.
- Prefer locators in this order: `getByRole`, then `getByLabel`, then `getByTestId`.
- Do not use CSS selectors.
- Do not use XPath selectors.
- Do not use `waitForTimeout`.