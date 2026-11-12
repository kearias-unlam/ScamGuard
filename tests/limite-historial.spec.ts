import { expect, test } from './fixtures/test';
import { openUrlTab } from './fixtures/analysis';
import {
  historyResponse,
  mockHistory,
  mockHistoryDelete,
  mockHistoryEntries,
  newerEntry,
  olderEntry,
  thirdEntry,
} from './fixtures/history';
import { mockSession } from './fixtures/session';

// US-10.2: history limit in the free version.

const MESSAGE = 'Ganaste un premio, hacé clic acá';
const HISTORY_FULL_TEXT =
  'Llegaste al límite de 3 análisis de la versión gratuita. Eliminá uno del historial para hacer un análisis nuevo.';
const fullHistory = historyResponse([thirdEntry, newerEntry, olderEntry]);

test('la barra lateral muestra el aviso de la versión gratuita', async ({ page }) => {
  await mockSession(page, { signedIn: true });
  await mockHistory(page, [historyResponse([olderEntry])]);
  await page.goto('/');

  await expect(
    page.getByRole('complementary', { name: 'Historial' }).getByTestId('history-limit-notice'),
  ).toHaveText('Versión gratuita: hasta 3 análisis en tu historial.');
});

test('con 3 análisis en el historial el botón de análisis está deshabilitado y se muestra el mensaje de límite', async ({ page }) => {
  await mockSession(page, { signedIn: true });
  await mockHistory(page, [fullHistory]);
  await page.goto('/');

  await expect(page.getByTestId('history-full-message')).toHaveText(HISTORY_FULL_TEXT);
  await page.getByLabel('Mensaje', { exact: true }).fill(MESSAGE);
  await expect(page.getByRole('button', { name: 'Analizar mensaje' })).toBeDisabled();

  await openUrlTab(page);
  await page.getByLabel('Link', { exact: true }).fill('https://banco-seguro.example.com');
  await expect(page.getByRole('button', { name: 'Analizar link' })).toBeDisabled();
  await expect(page.getByTestId('history-full-message')).toHaveText(HISTORY_FULL_TEXT);
});

test('al hacer clic en "Eliminar" el análisis deja de mostrarse en el historial', async ({ page }) => {
  await mockSession(page, { signedIn: true });
  await mockHistory(page, [fullHistory, historyResponse([thirdEntry, olderEntry])]);
  await mockHistoryEntries(page, []);
  await mockHistoryDelete(page);
  await page.goto('/');
  const entries = page.getByRole('complementary', { name: 'Historial' }).getByTestId('history-entry');
  await expect(entries).toHaveCount(3);

  await page.getByRole('button', { name: `Eliminar ${newerEntry.title}` }).click();

  await expect(entries).toHaveCount(2);
  await expect(entries.filter({ hasText: newerEntry.title })).toHaveCount(0);
});

test('con el historial lleno, al eliminar un análisis deja de mostrarse el mensaje de límite y el botón se habilita', async ({ page }) => {
  await mockSession(page, { signedIn: true });
  await mockHistory(page, [fullHistory, historyResponse([thirdEntry, olderEntry])]);
  await mockHistoryEntries(page, []);
  await mockHistoryDelete(page);
  await page.goto('/');
  await page.getByLabel('Mensaje', { exact: true }).fill(MESSAGE);
  await expect(page.getByTestId('history-full-message')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analizar mensaje' })).toBeDisabled();

  await page.getByRole('button', { name: `Eliminar ${newerEntry.title}` }).click();

  await expect(page.getByTestId('history-full-message')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Analizar mensaje' })).toBeEnabled();
});
