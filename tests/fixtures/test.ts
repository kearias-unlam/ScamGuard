import { expect, test as base } from '@playwright/test';

// US-9.1: every test starts signed out with a mocked session, so no test calls the real Auth.js route
// (which answers 500 without AUTH_SECRET and slows the dev server down). A test that needs a session
// calls mockSession from ./session, whose routes are registered later and take precedence.
const SESSION_ROUTE = '**/api/auth/session';

export const test = base.extend<{ signedOutSession: void }>({
  signedOutSession: [
    async ({ page }, use) => {
      await page.route(SESSION_ROUTE, (route) => route.fulfill({ json: null }));
      await use();
    },
    { auto: true },
  ],
});

export { expect };
