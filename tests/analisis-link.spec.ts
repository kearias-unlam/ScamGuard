import { expect, test, type Page } from '@playwright/test';

import { mockPendingUrlAnalysis, mockUrlAnalysis, mockUrlAnalysisSequence, openUrlTab } from './fixtures/analysis';

// US-6.2: analyze the pasted link.

const LINK = 'https://mercadopago-seguridad.com/login';
const ERROR_TEXT = 'Los servidores están ocupados. Intentá de nuevo más tarde.';
const UNREADABLE_LINK_TEXT =
  'No se pudo leer el link. Verificá que sea una dirección completa, por ejemplo https://ejemplo.com.';

async function enterLink(page: Page, link: string): Promise<void> {
  await page.getByLabel('Link', { exact: true }).fill(link);
}

function isUrlAnalysisPost(request: { url: () => string; method: () => string }): boolean {
  return request.url().endsWith('/analysis/url') && request.method() === 'POST';
}

test('al hacer clic en "Analizar link" se envía POST /analysis/url con el link', async ({ page }) => {
  await mockUrlAnalysis(page);
  await page.goto('/');
  await openUrlTab(page);
  await enterLink(page, LINK);

  const requestPromise = page.waitForRequest(isUrlAnalysisPost);
  await page.getByRole('button', { name: 'Analizar link' }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toEqual({ url: LINK });
});

test('mientras se analiza el link se muestra "Analizando mensaje..." y "Analizar link" está deshabilitado', async ({ page }) => {
  const pendingAnalysis = await mockPendingUrlAnalysis(page);
  await page.goto('/');
  await openUrlTab(page);
  await enterLink(page, LINK);
  const button = page.getByRole('button', { name: 'Analizar link' });
  const status = page.getByRole('main').getByRole('status');

  await button.click();

  await expect(status).toHaveText('Analizando mensaje...');
  await expect(button).toBeDisabled();

  pendingAnalysis.release();
  await expect(status).toHaveText('');
  await expect(button).toBeEnabled();
});

test('con un resultado del link, se muestra en analysis-result', async ({ page }) => {
  await mockUrlAnalysis(page);
  await page.goto('/');
  await openUrlTab(page);
  await enterLink(page, LINK);

  await page.getByRole('button', { name: 'Analizar link' }).click();

  await expect(page.getByTestId('analysis-result')).toBeVisible();
});

test('si el análisis del link falla se muestra el error y al reintentar con éxito se reenvía el mismo link y se muestra el resultado', async ({ page }) => {
  await mockUrlAnalysisSequence(page, [503, 200]);
  await page.goto('/');
  const main = page.getByRole('main');
  await openUrlTab(page);
  await enterLink(page, LINK);
  await page.getByRole('button', { name: 'Analizar link' }).click();

  await expect(main.getByRole('alert')).toHaveText(ERROR_TEXT);
  await expect(main.getByRole('button', { name: 'Reintentar' })).toBeVisible();

  // Retry must resend the submitted link, not the one typed afterwards.
  await enterLink(page, 'https://otro-sitio.com');
  const retryRequestPromise = page.waitForRequest(isUrlAnalysisPost);
  await main.getByRole('button', { name: 'Reintentar' }).click();
  const retryRequest = await retryRequestPromise;

  expect(retryRequest.postDataJSON()).toEqual({ url: LINK });
  await expect(page.getByTestId('analysis-result')).toBeVisible();
  await expect(main.getByRole('alert')).toBeHidden();
});

test('si el link no es una dirección válida se muestra el aviso de link ilegible sin el botón "Reintentar"', async ({ page }) => {
  await mockUrlAnalysisSequence(page, [422]);
  await page.goto('/');
  const main = page.getByRole('main');
  await openUrlTab(page);
  await enterLink(page, 'https://ejemplo');

  await page.getByRole('button', { name: 'Analizar link' }).click();

  await expect(main.getByRole('alert')).toHaveText(UNREADABLE_LINK_TEXT);
  await expect(main.getByRole('button', { name: 'Reintentar' })).toBeHidden();
});
