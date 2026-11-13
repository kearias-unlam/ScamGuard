import { expect, test } from './fixtures/test';

import { mockSession, SESSION_USER_NAME } from './fixtures/session';

// US-9.1: sign in with Google. Since US-9.2 the header button starts it directly (no sign-in page).

test('sin sesión el encabezado muestra el botón "Continuar con Google" y no "Continuar con Microsoft"', async ({ page }) => {
  await mockSession(page, { signedIn: false });
  await page.goto('/');

  const header = page.getByRole('banner');
  await expect(header.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar con Microsoft' })).toHaveCount(0);
  await expect(header.getByRole('link', { name: 'Iniciar sesión' })).toHaveCount(0);
});

test('al hacer clic en "Continuar con Google" del encabezado se inicia el inicio de sesión con Google', async ({ page }) => {
  await mockSession(page, { signedIn: false });
  await page.goto('/');

  const signInRequest = page.waitForRequest(
    (request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/signin/google',
  );
  await page.getByRole('banner').getByRole('button', { name: 'Continuar con Google' }).click();

  await signInRequest;
});

test('con sesión el encabezado muestra el nombre del usuario y "Cerrar sesión", y no "Continuar con Google"', async ({ page }) => {
  await mockSession(page, { signedIn: true });
  await page.goto('/');

  const header = page.getByRole('banner');
  await expect(header.getByTestId('user-name')).toHaveText(SESSION_USER_NAME);
  await expect(header.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  await expect(header.getByRole('button', { name: 'Continuar con Google' })).toHaveCount(0);
});

test('al hacer clic en "Cerrar sesión" el encabezado vuelve a mostrar "Continuar con Google"', async ({ page }) => {
  await mockSession(page, { signedIn: true });
  await page.goto('/');

  const header = page.getByRole('banner');
  // Signing out reloads the home page; wait for that load before checking the header.
  const reloaded = page.waitForEvent('load');
  await header.getByRole('button', { name: 'Cerrar sesión' }).click();
  await reloaded;

  await expect(header.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  await expect(header.getByTestId('user-name')).toHaveCount(0);
});
