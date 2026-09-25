import { expect, test } from '@playwright/test';

import { analysisResponse, mockAnalysis } from './fixtures/analysis';

// US-1.3: see a summary of the analysis.

const MESSAGE = 'Ganaste un premio, hacé clic acá';
const EMPTY_TEXT = 'Todavía no se analizó ningún mensaje.';

test('con un resultado, el resumen se muestra en analysis-summary', async ({ page }) => {
  await mockAnalysis(page);
  await page.goto('/');
  await page.getByLabel('Mensaje').fill(MESSAGE);

  await page.getByRole('button', { name: 'Analizar mensaje' }).click();

  await expect(page.getByTestId('analysis-summary')).toHaveText(analysisResponse.result.summary);
  await expect(page.getByTestId('analysis-result-empty')).toBeHidden();
});

test('antes de cualquier análisis se muestra "Todavía no se analizó ningún mensaje."', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('analysis-result-empty')).toHaveText(EMPTY_TEXT);
});
