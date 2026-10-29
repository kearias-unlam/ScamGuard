import { expect, test } from '@playwright/test';

import { openEmailTab } from './fixtures/analysis';

// US-5.4: clear the form and count characters.

const MESSAGE_LABEL = 'Mensaje';
const PLACEHOLDER = 'Pegá acá el mensaje, SMS o correo que querés analizar...';

test('al abrir la página se muestra "0 caracteres" y el campo "Mensaje" muestra el texto de ejemplo', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('message-char-count')).toHaveText('0 caracteres');
  await expect(page.getByLabel(MESSAGE_LABEL, { exact: true })).toHaveAttribute('placeholder', PLACEHOLDER);
});

test('al escribir el contador muestra la cantidad de caracteres, con "1 carácter" cuando es uno solo', async ({ page }) => {
  await page.goto('/');
  const messageInput = page.getByLabel(MESSAGE_LABEL, { exact: true });
  const charCount = page.getByTestId('message-char-count');

  await messageInput.fill('a');
  await expect(charCount).toHaveText('1 carácter');

  await messageInput.fill('Hola');
  await expect(charCount).toHaveText('4 caracteres');
});

test('en "Pegar mensaje" "Limpiar" vacía el mensaje, desmarca la casilla y deshabilita "Analizar mensaje"', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(MESSAGE_LABEL, { exact: true }).fill('Tu cuenta será suspendida hoy');
  await page.getByLabel('Compartir este mensaje en el panel de mensajes críticos').check();
  await page.getByLabel('Datos a ocultar (separados por coma)').fill('Juan');

  await page.getByRole('button', { name: 'Limpiar' }).click();

  await expect(page.getByLabel(MESSAGE_LABEL, { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Compartir este mensaje en el panel de mensajes críticos')).not.toBeChecked();
  await expect(page.getByTestId('sensitive-data-input')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Analizar mensaje' })).toBeDisabled();
});

test('en "Subir archivo .eml" "Limpiar" quita el archivo elegido y deshabilita "Analizar correo"', async ({ page }) => {
  await page.goto('/');
  await openEmailTab(page);
  await page.getByLabel('Archivo de correo (.eml)').setInputFiles({
    name: 'correo.eml',
    mimeType: 'message/rfc822',
    buffer: Buffer.from('Subject: Hola\r\n\r\nCuerpo'),
  });
  await expect(page.getByTestId('email-file-name')).toHaveText('correo.eml');

  await page.getByRole('button', { name: 'Limpiar' }).click();

  await expect(page.getByTestId('email-file-name')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Analizar correo' })).toBeDisabled();
});
