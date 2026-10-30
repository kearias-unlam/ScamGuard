import { expect, test, type Page } from '@playwright/test';

import type { Recommendation } from '../src/types';
import {
  analysisResponseWithRecommendations,
  mockAnalysis,
  sampleRecommendations,
} from './fixtures/analysis';

// US-7.1: see what to do with the result.

const MESSAGE = 'Ganaste un premio, hacé clic acá';
const STAY_ALERT: Recommendation = {
  type: 'stay_alert',
  text: 'Aunque no se encontraron señales graves, desconfiá si más adelante te piden datos, códigos o dinero.',
};

async function analyzeMessage(page: Page): Promise<void> {
  await page.getByLabel('Mensaje', { exact: true }).fill(MESSAGE);
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();
}

test('con un resultado se muestra "Qué podés hacer" y cada recomendación en el orden recibido', async ({ page }) => {
  await mockAnalysis(page, { body: analysisResponseWithRecommendations(sampleRecommendations) });
  await page.goto('/');
  await analyzeMessage(page);

  const result = page.getByTestId('analysis-result');
  await expect(result.getByRole('heading', { level: 2, name: 'Qué podés hacer' })).toBeVisible();
  await expect(result.getByTestId('analysis-recommendation')).toHaveText(
    sampleRecommendations.map((recommendation) => recommendation.text),
  );
});

test('si no se detectaron indicadores, las recomendaciones se siguen mostrando', async ({ page }) => {
  await mockAnalysis(page, { body: analysisResponseWithRecommendations([STAY_ALERT], []) });
  await page.goto('/');
  await analyzeMessage(page);

  await expect(page.getByTestId('analysis-indicators-empty')).toBeVisible();
  await expect(page.getByTestId('analysis-recommendation')).toHaveText([STAY_ALERT.text]);
});

test('si un nuevo análisis falla, las recomendaciones anteriores dejan de mostrarse', async ({ page }) => {
  await mockAnalysis(page, { body: analysisResponseWithRecommendations(sampleRecommendations) });
  await page.goto('/');
  await analyzeMessage(page);
  await expect(page.getByTestId('analysis-recommendation')).toHaveCount(sampleRecommendations.length);

  // The latest route registered takes precedence.
  await mockAnalysis(page, { status: 503 });
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();

  await expect(page.getByTestId('analysis-error')).toHaveText(
    'Los servidores están ocupados. Intentá de nuevo más tarde.',
  );
  await expect(page.getByTestId('analysis-recommendation')).toHaveCount(0);
});
