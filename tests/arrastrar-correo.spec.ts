import { expect, test, type Page } from '@playwright/test';

import { openEmailTab } from './fixtures/analysis';

// US-5.3: drag an email file onto the page.

const EMAIL_CONTENT = 'From: banco@ejemplo.com\r\nSubject: Hola\r\n\r\nCuerpo del correo';

// Playwright cannot drag files from the OS, so the drop is dispatched with a DataTransfer built in the page.
async function dropFile(page: Page, name: string): Promise<void> {
  const dataTransfer = await page.evaluateHandle(
    ({ fileName, content }) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([content], fileName, { type: 'message/rfc822' }));
      return transfer;
    },
    { fileName: name, content: EMAIL_CONTENT },
  );
  const dropZone = page.getByTestId('email-drop-zone');
  await dropZone.dispatchEvent('dragenter', { dataTransfer });
  await dropZone.dispatchEvent('dragover', { dataTransfer });
  await dropZone.dispatchEvent('drop', { dataTransfer });
}

test('al soltar un archivo .eml en la zona se muestra su nombre y "Analizar correo" se habilita', async ({ page }) => {
  await page.goto('/');
  await openEmailTab(page);

  await dropFile(page, 'correo.eml');

  await expect(page.getByTestId('email-file-name')).toHaveText('correo.eml');
  await expect(page.getByRole('button', { name: 'Analizar correo' })).toBeEnabled();
});

test('al soltar un archivo con otra extensión se muestra su nombre y el aviso, y "Analizar correo" sigue deshabilitado', async ({ page }) => {
  await page.goto('/');
  await openEmailTab(page);

  await dropFile(page, 'correo.txt');

  await expect(page.getByTestId('email-file-name')).toHaveText('correo.txt');
  await expect(page.getByTestId('email-file-hint')).toHaveText('Elegí un archivo con extensión .eml.');
  await expect(page.getByRole('button', { name: 'Analizar correo' })).toBeDisabled();
});

test('el botón "Elegir archivo .eml" abre el selector de archivos', async ({ page }) => {
  await page.goto('/');
  await openEmailTab(page);

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Elegir archivo .eml' }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({ name: 'correo.eml', mimeType: 'message/rfc822', buffer: Buffer.from(EMAIL_CONTENT) });

  await expect(page.getByTestId('email-file-name')).toHaveText('correo.eml');
  await expect(page.getByRole('button', { name: 'Cambiar archivo' })).toBeVisible();
});
