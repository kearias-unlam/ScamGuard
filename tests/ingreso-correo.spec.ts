import { expect, test } from '@playwright/test';

// US-4.1: choose an email file to analyze it.

const EMAIL_FILE_LABEL = 'Archivo de correo (.eml)';
const EMAIL_CONTENT = Buffer.from('From: banco@ejemplo.com\r\nSubject: Hola\r\n\r\nCuerpo del correo');

test('al abrir la página el campo de archivo de correo está vacío y el botón "Analizar correo" está deshabilitado', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByLabel(EMAIL_FILE_LABEL)).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Analizar correo' })).toBeDisabled();
  await expect(page.getByTestId('email-file-hint')).toBeHidden();
});

test('al elegir un archivo .eml el botón "Analizar correo" se habilita', async ({ page }) => {
  await page.goto('/');

  // Uppercase extension: the check is case-insensitive.
  await page.getByLabel(EMAIL_FILE_LABEL).setInputFiles({
    name: 'correo.EML',
    mimeType: 'message/rfc822',
    buffer: EMAIL_CONTENT,
  });

  await expect(page.getByRole('button', { name: 'Analizar correo' })).toBeEnabled();
  await expect(page.getByTestId('email-file-hint')).toBeHidden();
});

test('al elegir un archivo con otra extensión el botón sigue deshabilitado y se muestra el aviso de extensión', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel(EMAIL_FILE_LABEL).setInputFiles({
    name: 'correo.txt',
    mimeType: 'text/plain',
    buffer: EMAIL_CONTENT,
  });

  await expect(page.getByRole('button', { name: 'Analizar correo' })).toBeDisabled();
  await expect(page.getByTestId('email-file-hint')).toHaveText('Elegí un archivo con extensión .eml.');
});
