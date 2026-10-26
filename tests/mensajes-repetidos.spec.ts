import { expect, test } from '@playwright/test';

import { criticalMessagesResponse, mockCriticalMessages } from './fixtures/critical-messages';

// US-3.4: see each message once, with how many times it was shared.

const [firstTopic] = criticalMessagesResponse.topics;

test('cada tópico muestra en "Mensajes similares" el total de veces que se compartieron sus mensajes', async ({ page }) => {
  await mockCriticalMessages(page);
  await page.goto('/panel');
  const topics = page.getByTestId('panel-topic');

  // The first topic has 3 distinct messages shared 7 times in total.
  await expect(topics.nth(0)).toContainText('Mensajes similares: 7');
  await expect(topics.nth(1)).toContainText('Mensajes similares: 1');
});

test('al ver todos los mensajes cada uno se muestra una sola vez con "Compartido N veces" o "Compartido 1 vez"', async ({ page }) => {
  await mockCriticalMessages(page);
  await page.goto('/panel');
  const topic = page.getByTestId('panel-topic').nth(0);

  await topic.getByRole('button', { name: 'Ver todos los mensajes' }).click();

  const messages = topic.getByTestId('panel-topic-message');
  await expect(messages).toHaveCount(firstTopic.messages.length);
  await expect(messages.getByRole('blockquote')).toHaveText(firstTopic.messages.map((message) => message.text));
  await expect(topic.getByTestId('panel-topic-message-count')).toHaveText([
    'Compartido 4 veces',
    'Compartido 2 veces',
    'Compartido 1 vez',
  ]);
});

test('al ver todos los mensajes el detalle del tópico deja de mostrarse', async ({ page }) => {
  await mockCriticalMessages(page);
  await page.goto('/panel');
  const topic = page.getByTestId('panel-topic').nth(0);
  const detail = topic.getByTestId('panel-topic-detail');

  await expect(detail).toBeVisible();

  await topic.getByRole('button', { name: 'Ver todos los mensajes' }).click();

  await expect(detail).toBeHidden();
  await expect(topic.getByTestId('panel-topic-message')).toHaveCount(firstTopic.messages.length);
});
