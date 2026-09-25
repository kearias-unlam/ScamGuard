import { expect, test } from '@playwright/test';

import { analysisResponse, mockAnalysis } from './fixtures/analysis';

// US-2.3: understand why the message got its risk level.

const MESSAGE = 'Ganaste un premio, hacé clic acá';

test('el resultado muestra la explicación del nivel de riesgo en analysis-explanation', async ({ page }) => {
  await mockAnalysis(page);
  await page.goto('/');
  await page.getByLabel('Mensaje').fill(MESSAGE);

  await page.getByRole('button', { name: 'Analizar mensaje' }).click();

  await expect(page.getByTestId('analysis-explanation')).toHaveText(
    analysisResponse.result.explanation,
  );
});

test('la explicación se muestra dentro de analysis-result', async ({ page }) => {
  await mockAnalysis(page);
  await page.goto('/');

  // No result yet: the explanation must not exist outside a result.
  await expect(page.getByTestId('analysis-explanation')).toBeHidden();

  await page.getByLabel('Mensaje').fill(MESSAGE);
  await page.getByRole('button', { name: 'Analizar mensaje' }).click();

  await expect(
    page.getByTestId('analysis-result').getByTestId('analysis-explanation'),
  ).toBeVisible();
});
