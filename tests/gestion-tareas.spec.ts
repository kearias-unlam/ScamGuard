import { expect, test } from '@playwright/test';

test('muestra el formulario de análisis de mensaje', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'ScamGuard' })).toBeVisible();
  await expect(page.getByLabel('Message')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyze message' })).toBeVisible();
});

test('permite ingresar un mensaje y ejecutar el análisis', async ({ page }) => {
  await page.goto('/');

  const message = 'Hola, necesito ayuda para entender un cobro sospechoso';
  await page.getByLabel('Message').fill(message);
  await page.getByRole('button', { name: 'Analyze message' }).click();

  await expect(page.getByTestId('analysis-status')).toHaveText('success');
  await expect(page.getByTestId('analysis-result-empty')).toBeVisible();
});

test('muestra el resumen del análisis realizado', async ({ page }) => {
  await page.goto('/');

  const message = 'Hola, necesito ayuda para entender un cobro sospechoso';
  await page.getByLabel('Message').fill(message);
  await page.getByRole('button', { name: 'Analyze message' }).click();

  await expect(page.getByTestId('analysis-result-empty')).toHaveText('No analysis has been run yet.');
});
