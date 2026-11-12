import { expect, test } from '@playwright/test';

import { mockAnalysis } from './fixtures/analysis';
import { mockSession, SESSION_BACKEND_TOKEN } from './fixtures/session';

// US-9.1 (#104): the session token goes to the backend only with a session.

const MESSAGE = 'Ganaste un premio, hacé clic acá';

test('con sesión, "Analizar mensaje" envía el token de sesión en el encabezado Authorization', async ({ page }) => {
  await mockSession(page, { signedIn: true });
  await mockAnalysis(page);
  await page.goto('/');
  await expect(page.getByRole('banner').getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();

  const analysisRequest = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/analysis'));
  await page.getByLabel('Mensaje', { exact: true }).fill(MESSAGE);
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();

  expect((await analysisRequest).headers().authorization).toBe(`Bearer ${SESSION_BACKEND_TOKEN}`);
  await expect(page.getByTestId('analysis-result')).toBeVisible();
});

test('sin sesión, "Analizar mensaje" no envía el encabezado Authorization', async ({ page }) => {
  await mockSession(page, { signedIn: false });
  await mockAnalysis(page);
  await page.goto('/');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();

  const analysisRequest = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/analysis'));
  await page.getByLabel('Mensaje', { exact: true }).fill(MESSAGE);
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();

  expect((await analysisRequest).headers().authorization).toBeUndefined();
  await expect(page.getByTestId('analysis-result')).toBeVisible();
});
