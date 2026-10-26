import { expect, test } from '@playwright/test';

import { mockAnalysis } from './fixtures/analysis';
import { mockFailingCriticalMessages } from './fixtures/critical-messages';

// US-3.3: share a message in the panel without exposing personal data.

const MESSAGE = 'Hola, soy Juan, pasame plata urgente';
const SHARE_LABEL = 'Compartir este mensaje en el panel de mensajes críticos';
const SENSITIVE_DATA_LABEL = 'Datos a ocultar (separados por coma)';
const PRIVACY_NOTICE =
  'Los mensajes se comparten solo si quien los analiza lo permite, y sus datos personales se ocultan antes de guardarlos.';

test('al abrir la página la casilla para compartir está desmarcada y no se muestra el campo de datos a ocultar', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('checkbox', { name: SHARE_LABEL })).not.toBeChecked();
  await expect(page.getByLabel(SENSITIVE_DATA_LABEL)).toBeHidden();
});

test('al marcar la casilla se muestra el campo "Datos a ocultar (separados por coma)"', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('checkbox', { name: SHARE_LABEL }).check();

  await expect(page.getByLabel(SENSITIVE_DATA_LABEL)).toBeVisible();
});

test('con la casilla marcada se envía POST /analysis con el mensaje, shareInPanel y los datos a ocultar', async ({ page }) => {
  await mockAnalysis(page);
  await page.goto('/');
  await page.getByLabel('Mensaje', { exact: true }).fill(MESSAGE);
  await page.getByRole('checkbox', { name: SHARE_LABEL }).check();
  await page.getByLabel(SENSITIVE_DATA_LABEL).fill('Juan, Calle Falsa 123');

  const requestPromise = page.waitForRequest(
    (request) => request.url().endsWith('/analysis') && request.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toEqual({
    message: MESSAGE,
    shareInPanel: true,
    sensitiveData: 'Juan, Calle Falsa 123',
  });
});

test('el panel muestra el aviso de privacidad, con error y con tópicos', async ({ page }) => {
  const failingPanel = await mockFailingCriticalMessages(page);
  await page.goto('/panel');
  const notice = page.getByTestId('panel-privacy-notice');

  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(notice).toHaveText(PRIVACY_NOTICE);

  failingPanel.recover();
  await page.getByRole('button', { name: 'Reintentar' }).click();

  await expect(page.getByTestId('panel-topic')).toHaveCount(2);
  await expect(notice).toHaveText(PRIVACY_NOTICE);
});
