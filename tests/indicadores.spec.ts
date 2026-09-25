import { expect, test, type Page } from '@playwright/test';

import type { Indicator } from '../src/types';
import {
  analysisResponseWithIndicators,
  mockAnalysis,
  sameTypeIndicators,
} from './fixtures/analysis';

// US-2.2: know the indicators detected in the message.

const MESSAGE = 'Ganaste un premio, transferí $5000 y pagá el envío';
const EMPTY_TEXT = 'No se detectaron indicadores.';
const DUPLICATE_KEY_WARNING = /same key/i;

async function analyzeWithIndicators(page: Page, indicators: Indicator[]): Promise<void> {
  await mockAnalysis(page, { body: analysisResponseWithIndicators(indicators) });
  await page.goto('/');
  await page.getByLabel('Mensaje').fill(MESSAGE);
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();
}

test('cada indicador se muestra en analysis-indicator con su título y descripción', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await analyzeWithIndicators(page, sameTypeIndicators);

  const items = page.getByTestId('analysis-result').getByRole('listitem');
  await expect(items).toHaveCount(sameTypeIndicators.length);
  for (const [index, indicator] of sameTypeIndicators.entries()) {
    const item = items.nth(index);
    await expect(item.getByRole('heading', { level: 3 })).toHaveText(indicator.title);
    await expect(item).toContainText(indicator.description);
  }
  // Regression check: two indicators of the same type must not share a React key.
  expect(consoleErrors.filter((text) => DUPLICATE_KEY_WARNING.test(text))).toEqual([]);
});

test('si no se detectan indicadores se muestra "No se detectaron indicadores."', async ({ page }) => {
  await analyzeWithIndicators(page, []);

  const result = page.getByTestId('analysis-result');
  await expect(result.getByTestId('analysis-indicators-empty')).toHaveText(EMPTY_TEXT);
  await expect(result.getByRole('list')).toHaveCount(0);
});
