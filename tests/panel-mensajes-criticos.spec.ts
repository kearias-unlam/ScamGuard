import { expect, test } from '@playwright/test';

import {
  emptyCriticalMessagesResponse,
  mockCriticalMessages,
  mockFailingCriticalMessages,
} from './fixtures/critical-messages';

// US-3.1: see the critical messages panel.

test('el enlace "Ver mensajes críticos" lleva al panel con su título y el enlace para volver', async ({ page }) => {
  await mockCriticalMessages(page);
  await page.goto('/');

  await page.getByRole('link', { name: 'Ver mensajes críticos' }).click();

  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Mensajes críticos' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Volver al análisis' })).toBeVisible();
});

test('cada tópico se muestra con su título y la cantidad de mensajes similares, en el orden recibido', async ({ page }) => {
  await mockCriticalMessages(page);
  await page.goto('/panel');
  const topics = page.getByTestId('panel-topic');

  await expect(topics).toHaveCount(2);
  await expect(topics.nth(0).getByRole('heading', { level: 2 })).toHaveText('Pedido de dinero de un familiar o conocido');
  await expect(topics.nth(0)).toContainText('Mensajes similares: 7');
  await expect(topics.nth(1).getByRole('heading', { level: 2 })).toHaveText('Suplantación de bancos o billeteras virtuales');
  await expect(topics.nth(1)).toContainText('Mensajes similares: 1');
});

test('si no hay mensajes críticos se muestra "Todavía no hay mensajes críticos registrados."', async ({ page }) => {
  await mockCriticalMessages(page, { body: emptyCriticalMessagesResponse });
  await page.goto('/panel');

  await expect(page.getByTestId('panel-empty')).toHaveText('Todavía no hay mensajes críticos registrados.');
  await expect(page.getByTestId('panel-topic')).toHaveCount(0);
});

test('si la carga falla se muestra el error y al reintentar con éxito se muestran los tópicos', async ({ page }) => {
  const failingPanel = await mockFailingCriticalMessages(page);
  await page.goto('/panel');
  // Scoped to main: the Next.js dev overlay renders its own alert outside it.
  const error = page.getByRole('main').getByRole('alert');

  await expect(error).toHaveText('No se pudo cargar el panel. Intentá de nuevo más tarde.');
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();

  failingPanel.recover();
  await page.getByRole('button', { name: 'Reintentar' }).click();

  await expect(error).toBeHidden();
  await expect(page.getByTestId('panel-topic')).toHaveCount(2);
});
