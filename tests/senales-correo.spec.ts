import { expect, test } from '@playwright/test';

import type { Indicator } from '../src/types';
import { analysisResponseWithIndicators, mockEmailAnalysis, openEmailTab } from './fixtures/analysis';

// US-4.3: see the email's own signs (sender, authentication, links, attachments).

const AUTH_LINE = 'Autenticación: spf=fail dkim=fail dmarc=fail';
const EMAIL_CONTENT = [
  'From: Banco <soporte@banco-seguro.com>',
  'Authentication-Results: mx.example; spf=fail; dkim=fail; dmarc=fail',
  'Subject: Cuenta bloqueada',
  '',
  'Ingresá tu clave acá',
].join('\r\n');

const failedAuthentication: Indicator = {
  type: 'failed_authentication',
  title: 'Autenticación fallida',
  description: 'El correo no pasó los controles que verifican al remitente, por lo que podría ser suplantado.',
  evidence: AUTH_LINE,
};

test('un indicador propio del correo se muestra con su título, su descripción y la línea citada del correo', async ({ page }) => {
  await mockEmailAnalysis(page, { body: analysisResponseWithIndicators([failedAuthentication]) });
  await page.goto('/');
  await openEmailTab(page);
  await page.getByLabel('Archivo de correo (.eml)').setInputFiles({
    name: 'correo.eml',
    mimeType: 'message/rfc822',
    buffer: Buffer.from(EMAIL_CONTENT),
  });

  await page.getByRole('button', { name: 'Analizar correo' }).click();

  const indicator = page.getByTestId('analysis-result').getByTestId('analysis-indicator');
  await expect(indicator).toHaveCount(1);
  await expect(indicator.getByRole('heading', { level: 3 })).toHaveText(failedAuthentication.title);
  await expect(indicator).toContainText(failedAuthentication.description);
  await expect(indicator.getByTestId('analysis-indicator-evidence')).toHaveText(AUTH_LINE);
});
