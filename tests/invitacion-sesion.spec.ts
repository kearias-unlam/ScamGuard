import { expect, test } from './fixtures/test';

import { mockSession } from './fixtures/session';

// US-9.2: sign in from the home page, with an invite that explains what it is for.

const INVITE_TEXT = 'Iniciá sesión con Google para guardar tus análisis y volver a verlos cuando quieras.';

test('sin sesión la página principal muestra la tarjeta "Guardá tus análisis" entre la presentación y la carga, sin botón propio', async ({ page }) => {
  await mockSession(page, { signedIn: false });
  await page.goto('/');

  const invite = page.getByRole('region', { name: 'Guardá tus análisis' });
  await expect(invite).toBeVisible();
  await expect(invite).toHaveAttribute('data-testid', 'login-invite');
  await expect(invite.getByText(INVITE_TEXT)).toBeVisible();
  await expect(invite.getByRole('button')).toHaveCount(0);

  const heroBox = await page.getByRole('heading', { level: 1, name: '¿Ese mensaje te genera dudas?' }).boundingBox();
  const inviteBox = await invite.boundingBox();
  const tabsBox = await page.getByRole('tablist', { name: 'Método de carga' }).boundingBox();
  expect(heroBox && inviteBox && tabsBox).toBeTruthy();
  expect(inviteBox!.y).toBeGreaterThan(heroBox!.y + heroBox!.height);
  expect(tabsBox!.y).toBeGreaterThan(inviteBox!.y + inviteBox!.height);
});

test('con sesión la tarjeta "Guardá tus análisis" no se muestra', async ({ page }) => {
  await mockSession(page, { signedIn: true });
  await page.goto('/');

  await expect(page.getByTestId('user-name')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Guardá tus análisis' })).toHaveCount(0);
});
