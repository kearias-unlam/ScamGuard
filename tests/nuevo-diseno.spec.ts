import { expect, test, type Page } from '@playwright/test';

import { analysisResponseWithIndicators, mockAnalysis, sameTypeIndicators } from './fixtures/analysis';

// US-5.1: see the page with the new design.

const MESSAGE = 'Ganaste un premio, hacé clic acá';

async function analyzeMessage(page: Page): Promise<void> {
  await page.getByLabel('Mensaje', { exact: true }).fill(MESSAGE);
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();
}

test('la página muestra el encabezado "ScamGuard" y el título "¿Ese mensaje te genera dudas?"', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('banner')).toHaveText('ScamGuard');
  await expect(page.getByRole('heading', { level: 1, name: '¿Ese mensaje te genera dudas?' })).toBeVisible();
});

test('antes de cualquier análisis la columna "Resultado del análisis" muestra el estado vacío', async ({ page }) => {
  await page.goto('/');

  const resultColumn = page.getByRole('complementary', { name: 'Resultado del análisis' });
  await expect(resultColumn.getByTestId('analysis-result-empty')).toHaveText('Todavía no se analizó ningún mensaje.');
});

test('con un resultado se muestra la cantidad de indicadores, también cuando es 0', async ({ page }) => {
  await mockAnalysis(page, { body: analysisResponseWithIndicators(sameTypeIndicators) });
  await page.goto('/');
  await analyzeMessage(page);

  await expect(page.getByRole('heading', { level: 2, name: 'Indicadores detectados' })).toBeVisible();
  await expect(page.getByTestId('analysis-indicators-count')).toHaveText(String(sameTypeIndicators.length));

  // The latest route registered takes precedence.
  await mockAnalysis(page, { body: analysisResponseWithIndicators([]) });
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();

  await expect(page.getByTestId('analysis-indicators-count')).toHaveText('0');
});
