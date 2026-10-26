import { expect, test } from '@playwright/test';

import { criticalMessagesResponse, mockCriticalMessages } from './fixtures/critical-messages';

// US-3.2: see the detail and all saved messages of a topic.

const [firstTopic] = criticalMessagesResponse.topics;

test('el detalle del tópico está cerrado al cargar y al abrirlo muestra el mensaje más reciente', async ({ page }) => {
  await mockCriticalMessages(page);
  await page.goto('/panel');
  const detail = page.getByTestId('panel-topic').nth(0).getByRole('group');
  const latestMessage = detail.getByRole('blockquote');

  await expect(detail).not.toHaveAttribute('open');
  await expect(latestMessage).toBeHidden();

  await detail.getByTestId('panel-topic-detail').click();

  await expect(latestMessage).toBeVisible();
  await expect(latestMessage).toHaveText(firstTopic.messages[0].text);
});

test('al hacer clic en "Ver todos los mensajes" se muestra cada mensaje guardado del tópico', async ({ page }) => {
  await mockCriticalMessages(page);
  await page.goto('/panel');
  const topic = page.getByTestId('panel-topic').nth(0);
  const messages = topic.getByTestId('panel-topic-message');

  await expect(messages).toHaveCount(0);

  await topic.getByRole('button', { name: 'Ver todos los mensajes' }).click();

  await expect(messages.getByRole('blockquote')).toHaveText(firstTopic.messages.map((message) => message.text));
  await expect(topic.getByRole('button', { name: 'Ver todos los mensajes' })).toBeHidden();
  await expect(page.getByTestId('panel-topic').nth(1).getByTestId('panel-topic-message')).toHaveCount(0);
});
