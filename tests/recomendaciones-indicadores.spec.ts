import { expect, test } from '@playwright/test';

import type { Indicator, Recommendation } from '../src/types';
import { analysisResponseWithRecommendations, mockAnalysis } from './fixtures/analysis';

// US-7.2: recommendations according to the detected signals.

const MESSAGE = 'Hola, soy del banco. Pasame tu clave para validar tu cuenta.';

const PERSONAL_DATA_INDICATOR: Indicator = {
  type: 'personal_data_request',
  title: 'Pedido de datos personales',
  description: 'El mensaje pide la clave de la cuenta.',
  evidence: 'Pasame tu clave',
};

// Sent by the backend for a HIGH result with a personal_data_request indicator, in catalog order.
const HIGH_WITH_PERSONAL_DATA_RECOMMENDATIONS: Recommendation[] = [
  {
    type: 'do_not_follow',
    text: 'No respondas, no hagas clic y no sigas las instrucciones del mensaje.',
  },
  {
    type: 'do_not_share_data',
    text: 'No compartas claves, códigos ni datos de tarjeta o de cuenta. Ningún banco ni empresa te los pide por mensaje.',
  },
  {
    type: 'if_already_acted',
    text: 'Si ya compartiste datos o hiciste un pago, comunicate cuanto antes con tu banco y cambiá tus claves.',
  },
];

test('con un indicador de pedido de datos personales se muestra la recomendación de no compartir claves junto a las del nivel de riesgo', async ({ page }) => {
  await mockAnalysis(page, {
    body: analysisResponseWithRecommendations(HIGH_WITH_PERSONAL_DATA_RECOMMENDATIONS, [PERSONAL_DATA_INDICATOR]),
  });
  await page.goto('/');
  await page.getByLabel('Mensaje', { exact: true }).fill(MESSAGE);
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();

  const result = page.getByTestId('analysis-result');
  await expect(result.getByRole('heading', { level: 3, name: PERSONAL_DATA_INDICATOR.title })).toBeVisible();
  await expect(result.getByTestId('analysis-risk-level')).toHaveText('Alto');
  await expect(result.getByTestId('analysis-recommendation')).toHaveText(
    HIGH_WITH_PERSONAL_DATA_RECOMMENDATIONS.map((recommendation) => recommendation.text),
  );
});
