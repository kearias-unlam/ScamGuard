import type { Page } from '@playwright/test';

// US-9.1: Auth.js routes mocked with page.route, so no identity provider or AUTH_SECRET is needed.
const SESSION_ROUTE = '**/api/auth/session';
const CSRF_ROUTE = '**/api/auth/csrf';
const PROVIDERS_ROUTE = '**/api/auth/providers';
const SIGNIN_ROUTE = '**/api/auth/signin/*';
const SIGNOUT_ROUTE = '**/api/auth/signout';

export const SESSION_USER_NAME = 'Ana Pérez';
// Opaque for the frontend: it only forwards it to the backend (#104).
export const SESSION_BACKEND_TOKEN = 'test-backend-token';

const providers = {
  google: {
    id: 'google',
    name: 'Google',
    type: 'oidc',
    signinUrl: 'http://localhost:3000/api/auth/signin/google',
    callbackUrl: 'http://localhost:3000/api/auth/callback/google',
  },
  'microsoft-entra-id': {
    id: 'microsoft-entra-id',
    name: 'Microsoft Entra ID',
    type: 'oidc',
    signinUrl: 'http://localhost:3000/api/auth/signin/microsoft-entra-id',
    callbackUrl: 'http://localhost:3000/api/auth/callback/microsoft-entra-id',
  },
};

interface MockSessionOptions {
  signedIn: boolean;
  userName?: string | null;
}

// Mocks the session and the sign-in and sign-out actions. Signing out turns the mocked session into "signed out".
export async function mockSession(page: Page, { signedIn, userName = SESSION_USER_NAME }: MockSessionOptions): Promise<void> {
  let isSignedIn = signedIn;

  await page.route(SESSION_ROUTE, async (route) => {
    const session = isSignedIn
      ? {
          user: userName === null ? {} : { name: userName },
          expires: '2099-01-01T00:00:00.000Z',
          backendToken: SESSION_BACKEND_TOKEN,
        }
      : null;
    await route.fulfill({ json: session });
  });
  await page.route(CSRF_ROUTE, async (route) => {
    await route.fulfill({ json: { csrfToken: 'test-csrf-token' } });
  });
  await page.route(PROVIDERS_ROUTE, async (route) => {
    await route.fulfill({ json: providers });
  });
  // The real flow would redirect to Google; the mock keeps the browser on the home page (US-9.2: no sign-in page).
  await page.route(SIGNIN_ROUTE, async (route) => {
    await route.fulfill({ json: { url: 'http://localhost:3000/' } });
  });
  await page.route(SIGNOUT_ROUTE, async (route) => {
    isSignedIn = false;
    await route.fulfill({ json: { url: 'http://localhost:3000/' } });
  });
}
