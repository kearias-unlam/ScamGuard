import { expect, test } from '@playwright/test';

import { mockAnalysis, mockAnalysisSequence, mockPendingAnalysis } from './fixtures/analysis';

// US-1.2: run the message analysis.

const MESSAGE = 'Ganaste un premio, hacé clic acá';

test('al hacer clic en analizar se envía POST /analysis con el mensaje', async ({ page }) => {
  await mockAnalysis(page);
  await page.goto('/');
  await page.getByLabel('Mensaje').fill(MESSAGE);

  const requestPromise = page.waitForRequest(
    (request) => request.url().endsWith('/analysis') && request.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toEqual({ message: MESSAGE });
});

test('mientras se analiza se muestra "Analizando mensaje..." y el botón está deshabilitado', async ({ page }) => {
  const pendingAnalysis = await mockPendingAnalysis(page);
  await page.goto('/');
  await page.getByLabel('Mensaje').fill(MESSAGE);
  const submitButton = page.getByRole('button', { name: 'Analizar mensaje' });
  const status = page.getByRole('main').getByRole('status');

  await submitButton.click();

  await expect(status).toHaveText('Analizando mensaje...');
  await expect(submitButton).toBeDisabled();

  pendingAnalysis.release();
  await expect(status).toHaveText('');
  await expect(submitButton).toBeEnabled();
});

const ERROR_TEXT = 'Los servidores están ocupados. Intentá de nuevo más tarde.';

test('si el análisis falla se muestra el mensaje de error y el botón "Reintentar"', async ({ page }) => {
  await mockAnalysisSequence(page, [503]);
  await page.goto('/');
  const main = page.getByRole('main');
  await page.getByLabel('Mensaje').fill(MESSAGE);

  await page.getByRole('button', { name: 'Analizar mensaje' }).click();

  await expect(main.getByRole('alert')).toHaveText(ERROR_TEXT);
  await expect(main.getByRole('button', { name: 'Reintentar' })).toBeVisible();
});

test('al reintentar con éxito se muestra el resultado', async ({ page }) => {
  await mockAnalysisSequence(page, [503, 200]);
  await page.goto('/');
  const main = page.getByRole('main');
  const messageField = page.getByLabel('Mensaje');
  await messageField.fill(MESSAGE);
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();
  await expect(main.getByRole('alert')).toHaveText(ERROR_TEXT);

  // Retry must resend the last submitted message, not the edited field.
  await messageField.fill('Otro texto');
  const retryRequestPromise = page.waitForRequest(
    (request) => request.url().endsWith('/analysis') && request.method() === 'POST',
  );
  await main.getByRole('button', { name: 'Reintentar' }).click();
  const retryRequest = await retryRequestPromise;

  expect(retryRequest.postDataJSON()).toEqual({ message: MESSAGE });
  await expect(page.getByTestId('analysis-result')).toBeVisible();
  await expect(main.getByRole('alert')).toBeHidden();
});

test('si un nuevo análisis falla, el resultado anterior deja de mostrarse', async ({ page }) => {
  await mockAnalysisSequence(page, [200, 503]);
  await page.goto('/');
  const main = page.getByRole('main');
  const submitButton = page.getByRole('button', { name: 'Analizar mensaje' });
  await page.getByLabel('Mensaje').fill(MESSAGE);

  await submitButton.click();
  await expect(page.getByTestId('analysis-result')).toBeVisible();

  await submitButton.click();

  await expect(main.getByRole('alert')).toHaveText(ERROR_TEXT);
  await expect(page.getByTestId('analysis-result')).toBeHidden();
});
