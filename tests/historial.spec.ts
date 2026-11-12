import { expect, test } from './fixtures/test';
import { mockAnalysis } from './fixtures/analysis';
import {
  historyEntry,
  historyResponse,
  mockHistory,
  mockHistoryEntries,
  newerEntry,
  olderEntry,
} from './fixtures/history';
import { mockSession } from './fixtures/session';

// US-10.1: see my analysis history.

const MESSAGE = 'Ganaste un premio, hacé clic acá';

test('sin sesión la página principal no muestra la barra lateral "Historial"', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: '¿Ese mensaje te genera dudas?' })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Historial' })).toHaveCount(0);
});

test('con sesión y sin análisis guardados el historial muestra el estado vacío', async ({ page }) => {
  await mockSession(page, { signedIn: true });
  await mockHistory(page, [historyResponse([])]);
  await page.goto('/');

  const sidebar = page.getByRole('complementary', { name: 'Historial' });
  await expect(sidebar.getByTestId('history-empty')).toHaveText('Todavía no hay análisis en tu historial.');
});

test('con sesión cada análisis guardado se muestra con su título y su fecha, del más reciente al más antiguo', async ({ page }) => {
  await mockSession(page, { signedIn: true });
  await mockHistory(page, [historyResponse([newerEntry, olderEntry])]);
  await page.goto('/');

  const entries = page.getByRole('complementary', { name: 'Historial' }).getByTestId('history-entry');
  await expect(entries).toHaveCount(2);
  await expect(entries.nth(0)).toContainText(newerEntry.title);
  await expect(entries.nth(0)).toContainText('10/11/2026');
  await expect(entries.nth(1)).toContainText(olderEntry.title);
  await expect(entries.nth(1)).toContainText('09/11/2026');
});

test('después de un análisis exitoso el análisis aparece primero en el historial', async ({ page }) => {
  await mockSession(page, { signedIn: true });
  await mockHistory(page, [historyResponse([olderEntry]), historyResponse([newerEntry, olderEntry])]);
  await mockAnalysis(page);
  await page.goto('/');
  const entries = page.getByRole('complementary', { name: 'Historial' }).getByTestId('history-entry');
  await expect(entries).toHaveCount(1);

  await page.getByLabel('Mensaje', { exact: true }).fill(MESSAGE);
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();

  await expect(page.getByTestId('analysis-result')).toBeVisible();
  await expect(entries).toHaveCount(2);
  await expect(entries.first()).toContainText(newerEntry.title);
});

test('al elegir un análisis del historial su resultado se muestra en el resultado del análisis', async ({ page }) => {
  const savedSummary = 'El link imita la página de un banco para pedir la clave.';
  await mockSession(page, { signedIn: true });
  await mockHistory(page, [historyResponse([newerEntry, olderEntry])]);
  await mockHistoryEntries(page, [historyEntry(newerEntry, savedSummary)]);
  await page.goto('/');

  // Anchored: the "Eliminar <title>" button (US-10.2) also contains the title.
  await page.getByRole('button', { name: new RegExp(`^${newerEntry.title}`) }).click();

  const result = page.getByTestId('analysis-result');
  await expect(result).toBeVisible();
  await expect(result.getByTestId('analysis-summary')).toHaveText(savedSummary);
});

test('si el historial no se puede cargar se muestra el error y el análisis sigue funcionando', async ({ page }) => {
  await mockSession(page, { signedIn: true });
  await mockHistory(page, [503]);
  await mockAnalysis(page);
  await page.goto('/');

  await expect(page.getByTestId('history-error')).toHaveText('No se pudo cargar el historial. Intentá de nuevo más tarde.');

  await page.getByLabel('Mensaje', { exact: true }).fill(MESSAGE);
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();

  await expect(page.getByTestId('analysis-result')).toBeVisible();
});
