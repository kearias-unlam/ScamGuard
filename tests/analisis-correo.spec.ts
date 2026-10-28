import { expect, test, type Page } from '@playwright/test';

import { mockEmailAnalysis, mockEmailAnalysisSequence, mockPendingEmailAnalysis } from './fixtures/analysis';

// US-4.2: analyze the chosen email.

const EMAIL_FILE_LABEL = 'Archivo de correo (.eml)';
const EMAIL_CONTENT = 'From: Banco <soporte@banco-seguro.com>\r\nSubject: Cuenta bloqueada\r\n\r\nIngresá tu clave acá';
const ERROR_TEXT = 'Los servidores están ocupados. Intentá de nuevo más tarde.';

async function chooseEmailFile(page: Page, name: string, content: string): Promise<void> {
  await page.getByLabel(EMAIL_FILE_LABEL).setInputFiles({
    name,
    mimeType: 'message/rfc822',
    buffer: Buffer.from(content),
  });
}

function isEmailAnalysisPost(request: { url: () => string; method: () => string }): boolean {
  return request.url().endsWith('/analysis/email') && request.method() === 'POST';
}

test('al hacer clic en "Analizar correo" se envía POST /analysis/email con el contenido del archivo', async ({ page }) => {
  await mockEmailAnalysis(page);
  await page.goto('/');
  await chooseEmailFile(page, 'correo.eml', EMAIL_CONTENT);

  const requestPromise = page.waitForRequest(isEmailAnalysisPost);
  await page.getByRole('button', { name: 'Analizar correo' }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toEqual({ emailContent: EMAIL_CONTENT });
});

test('mientras se analiza el correo se muestra "Analizando mensaje..." y los dos botones de análisis están deshabilitados', async ({ page }) => {
  const pendingAnalysis = await mockPendingEmailAnalysis(page);
  await page.goto('/');
  await page.getByLabel('Mensaje', { exact: true }).fill('Hola');
  await chooseEmailFile(page, 'correo.eml', EMAIL_CONTENT);
  const emailButton = page.getByRole('button', { name: 'Analizar correo' });
  const messageButton = page.getByRole('button', { name: 'Analizar mensaje' });
  const status = page.getByRole('main').getByRole('status');

  await emailButton.click();

  await expect(status).toHaveText('Analizando mensaje...');
  await expect(emailButton).toBeDisabled();
  await expect(messageButton).toBeDisabled();

  pendingAnalysis.release();
  await expect(status).toHaveText('');
  await expect(emailButton).toBeEnabled();
  await expect(messageButton).toBeEnabled();
});

test('con un resultado del correo, se muestra en analysis-result', async ({ page }) => {
  await mockEmailAnalysis(page);
  await page.goto('/');
  await chooseEmailFile(page, 'correo.eml', EMAIL_CONTENT);

  await page.getByRole('button', { name: 'Analizar correo' }).click();

  await expect(page.getByTestId('analysis-result')).toBeVisible();
});

test('si el análisis del correo falla se muestra el error y al reintentar con éxito se reenvía el mismo correo y se muestra el resultado', async ({ page }) => {
  await mockEmailAnalysisSequence(page, [503, 200]);
  await page.goto('/');
  const main = page.getByRole('main');
  await chooseEmailFile(page, 'correo.eml', EMAIL_CONTENT);
  await page.getByRole('button', { name: 'Analizar correo' }).click();

  await expect(main.getByRole('alert')).toHaveText(ERROR_TEXT);
  await expect(main.getByRole('button', { name: 'Reintentar' })).toBeVisible();

  // Retry must resend the submitted email, not the file chosen afterwards.
  await chooseEmailFile(page, 'otro.eml', 'Subject: Otro correo\r\n\r\nOtro cuerpo');
  const retryRequestPromise = page.waitForRequest(isEmailAnalysisPost);
  await main.getByRole('button', { name: 'Reintentar' }).click();
  const retryRequest = await retryRequestPromise;

  expect(retryRequest.postDataJSON()).toEqual({ emailContent: EMAIL_CONTENT });
  await expect(page.getByTestId('analysis-result')).toBeVisible();
  await expect(main.getByRole('alert')).toBeHidden();
});
