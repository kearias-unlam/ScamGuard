import { expect, test } from '@playwright/test';

// US-1.1: enter a text message to analyze it.

test('el botón de analizar está deshabilitado cuando el mensaje está vacío', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByLabel('Mensaje')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Analizar mensaje' })).toBeDisabled();
});

test('el botón de analizar está deshabilitado cuando el mensaje solo tiene espacios', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Mensaje').fill('   ');

  await expect(page.getByRole('button', { name: 'Analizar mensaje' })).toBeDisabled();
});

test('el botón de analizar se habilita al ingresar un mensaje', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Mensaje').fill('Ganaste un premio, hacé clic acá');

  await expect(page.getByRole('button', { name: 'Analizar mensaje' })).toBeEnabled();
});
