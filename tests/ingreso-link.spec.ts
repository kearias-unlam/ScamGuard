import { expect, test } from '@playwright/test';

import { openUrlTab } from './fixtures/analysis';

// US-6.1: paste a link to analyze it without opening it.

const LINK_LABEL = 'Link';

test('al elegir la pestaña "Pegar link" el campo "Link" está vacío y "Analizar link" está deshabilitado', async ({ page }) => {
  await page.goto('/');

  await openUrlTab(page);

  await expect(page.getByRole('tab', { name: 'Pegar link' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel(LINK_LABEL, { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Analizar link' })).toBeDisabled();
});

test('si el link contiene solo espacios el botón "Analizar link" sigue deshabilitado', async ({ page }) => {
  await page.goto('/');
  await openUrlTab(page);

  await page.getByLabel(LINK_LABEL, { exact: true }).fill('   ');

  await expect(page.getByRole('button', { name: 'Analizar link' })).toBeDisabled();
});

test('al ingresar texto en "Link" el botón "Analizar link" se habilita', async ({ page }) => {
  await page.goto('/');
  await openUrlTab(page);

  await page.getByLabel(LINK_LABEL, { exact: true }).fill('https://ejemplo.com');

  await expect(page.getByRole('button', { name: 'Analizar link' })).toBeEnabled();
});

test('"Limpiar" vacía el campo "Link" y deshabilita "Analizar link"', async ({ page }) => {
  await page.goto('/');
  await openUrlTab(page);
  await page.getByLabel(LINK_LABEL, { exact: true }).fill('https://ejemplo.com');

  await page.getByRole('button', { name: 'Limpiar' }).click();

  await expect(page.getByLabel(LINK_LABEL, { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Analizar link' })).toBeDisabled();
});
