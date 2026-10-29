import { expect, test } from '@playwright/test';

import { openEmailTab } from './fixtures/analysis';

// US-5.2: choose how to load the message.

const MESSAGE_LABEL = 'Mensaje';
const EMAIL_FILE_LABEL = 'Archivo de correo (.eml)';

test('al abrir la página la pestaña "Pegar mensaje" está seleccionada y solo se muestra el campo "Mensaje"', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('tab', { name: 'Pegar mensaje' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel(MESSAGE_LABEL, { exact: true })).toBeVisible();
  await expect(page.getByLabel(EMAIL_FILE_LABEL)).toHaveCount(0);
});

test('al elegir la pestaña "Subir archivo .eml" se muestra el campo de archivo y no el campo "Mensaje"', async ({ page }) => {
  await page.goto('/');

  await openEmailTab(page);

  await expect(page.getByRole('tab', { name: 'Subir archivo .eml' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel(EMAIL_FILE_LABEL)).toBeVisible();
  await expect(page.getByLabel(MESSAGE_LABEL, { exact: true })).toHaveCount(0);
});

test('al volver a "Pegar mensaje" se muestra el mensaje que se había escrito', async ({ page }) => {
  const message = 'Tu cuenta será suspendida hoy';
  await page.goto('/');
  await page.getByLabel(MESSAGE_LABEL, { exact: true }).fill(message);

  await openEmailTab(page);
  await page.getByRole('tab', { name: 'Pegar mensaje' }).click();

  await expect(page.getByLabel(MESSAGE_LABEL, { exact: true })).toHaveValue(message);
});
