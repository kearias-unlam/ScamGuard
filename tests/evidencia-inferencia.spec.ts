import { expect, test, type Page } from '@playwright/test';

import type { Indicator } from '../src/types';
import {
  analysisResponseWithIndicators,
  mockAnalysis,
  sameTypeIndicators,
} from './fixtures/analysis';

// US-2.4: tell apart what the message says from what the model infers.

const MESSAGE = 'Ganaste un premio, transferí $5000 y pagá el envío';
const DISCLAIMER_TEXT = 'Este resultado es una ayuda para decidir, no una confirmación de fraude.';

async function analyzeWithIndicators(page: Page, indicators: Indicator[]): Promise<void> {
  await mockAnalysis(page, { body: analysisResponseWithIndicators(indicators) });
  await page.goto('/');
  await page.getByLabel('Mensaje').fill(MESSAGE);
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();
}

test('cada indicador muestra la cita del mensaje en analysis-indicator-evidence, separada de la descripción', async ({ page }) => {
  await analyzeWithIndicators(page, sameTypeIndicators);

  const items = page.getByTestId('analysis-result').getByRole('listitem');
  await expect(items).toHaveCount(sameTypeIndicators.length);
  for (const [index, indicator] of sameTypeIndicators.entries()) {
    const evidence = items.nth(index).getByTestId('analysis-indicator-evidence');
    await expect(evidence).toHaveRole('blockquote');
    // Exact text: the quote alone, without the model's description.
    await expect(evidence).toHaveText(indicator.evidence);
    await expect(evidence).not.toContainText(indicator.description);
  }
});

test('con cualquier resultado se muestra el aviso en analysis-disclaimer, incluso sin indicadores', async ({ page }) => {
  await analyzeWithIndicators(page, []);

  const disclaimer = page.getByTestId('analysis-result').getByTestId('analysis-disclaimer');
  await expect(disclaimer).toHaveRole('note');
  await expect(disclaimer).toHaveText(DISCLAIMER_TEXT);
});
