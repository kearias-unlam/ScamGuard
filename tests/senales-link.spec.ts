import { expect, test } from '@playwright/test';

import type { Indicator } from '../src/types';
import { analysisResponseWithIndicators, mockUrlAnalysis, openUrlTab } from './fixtures/analysis';

// US-6.3: see which parts of the link show signs of scam.

const LINK = 'https://mercadopago-seguridad.com/login';
const DOMAIN_LINE = 'Dominio: mercadopago-seguridad.com';

const lookalikeDomain: Indicator = {
  type: 'lookalike_domain',
  title: 'Dominio que imita a una marca',
  description: 'El dominio agrega una palabra al nombre de una billetera conocida, algo común en sitios falsos.',
  evidence: DOMAIN_LINE,
};

test('un indicador del link se muestra con su título, su descripción y la línea citada del análisis del link', async ({ page }) => {
  await mockUrlAnalysis(page, { body: analysisResponseWithIndicators([lookalikeDomain]) });
  await page.goto('/');
  await openUrlTab(page);
  await page.getByLabel('Link', { exact: true }).fill(LINK);

  await page.getByRole('button', { name: 'Analizar link' }).click();

  const indicator = page.getByTestId('analysis-result').getByTestId('analysis-indicator');
  await expect(indicator).toHaveCount(1);
  await expect(indicator.getByRole('heading', { level: 3 })).toHaveText(lookalikeDomain.title);
  await expect(indicator).toContainText(lookalikeDomain.description);
  await expect(indicator.getByTestId('analysis-indicator-evidence')).toHaveText(DOMAIN_LINE);
});
