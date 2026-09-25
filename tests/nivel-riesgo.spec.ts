import { expect, test, type Page } from '@playwright/test';

import type { RiskLevel } from '../src/types';
import { analysisResponseWithRisk, mockAnalysis } from './fixtures/analysis';

// US-2.1: know the risk level of the message.

const MESSAGE = 'Ganaste un premio, hacé clic acá';

async function analyzeWithRisk(page: Page, riskLevel: RiskLevel): Promise<void> {
  await mockAnalysis(page, { body: analysisResponseWithRisk(riskLevel) });
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Mensaje').fill(MESSAGE);
});

test('el resultado muestra el rótulo "Nivel de riesgo" y en analysis-risk-level solo el valor', async ({ page }) => {
  await analyzeWithRisk(page, 'HIGH');

  const result = page.getByTestId('analysis-result');
  await expect(result.getByRole('term')).toHaveText('Nivel de riesgo');
  await expect(result.getByTestId('analysis-risk-level')).toHaveText('Alto');
});

test('los valores LOW, MEDIUM y HIGH se muestran como "Bajo", "Medio" y "Alto"', async ({ page }) => {
  const cases: ReadonlyArray<readonly [RiskLevel, string]> = [
    ['LOW', 'Bajo'],
    ['MEDIUM', 'Medio'],
    ['HIGH', 'Alto'],
  ];
  for (const [riskLevel, label] of cases) {
    await test.step(`${riskLevel} -> ${label}`, async () => {
      await analyzeWithRisk(page, riskLevel);
      await expect(page.getByTestId('analysis-risk-level')).toHaveText(label);
    });
  }
});

test('el valor UNDETERMINED se muestra como "Indeterminado"', async ({ page }) => {
  await analyzeWithRisk(page, 'UNDETERMINED');

  await expect(page.getByTestId('analysis-risk-level')).toHaveText('Indeterminado');
});
