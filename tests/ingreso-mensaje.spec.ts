import { expect, test } from '@playwright/test';

// User Story #3: enter a text message to analyze it.

test('el botón de analizar está deshabilitado cuando el mensaje está vacío', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByLabel('Message')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Analyze message' })).toBeDisabled();
});

test('el botón de analizar está deshabilitado cuando el mensaje solo tiene espacios', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Message').fill('   ');

  await expect(page.getByRole('button', { name: 'Analyze message' })).toBeDisabled();
});

test('el botón de analizar se habilita al ingresar un mensaje', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Message').fill('Ganaste un premio, hacé clic acá');

  await expect(page.getByRole('button', { name: 'Analyze message' })).toBeEnabled();
});
