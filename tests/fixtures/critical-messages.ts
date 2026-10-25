import type { Page } from '@playwright/test';

import type { CriticalMessagesResponse } from '../../src/types';

// Never matches the /panel page itself, only the backend endpoint.
const CRITICAL_MESSAGES_ROUTE = '**/critical-messages';
const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*' };

// Two topics, already ordered by the backend (most messages first).
export const criticalMessagesResponse: CriticalMessagesResponse = {
  topics: [
    {
      topic: 'family_money_request',
      title: 'Pedido de dinero de un familiar o conocido',
      messages: [
        { id: 3, text: 'Hola, soy [nombre], necesito 10000 pesos urgente, te los devuelvo en un rato.' },
        { id: 2, text: 'Ma, se me rompió el celu, pasame plata a [número].' },
        { id: 1, text: 'Tía, estoy en un problema, transferime hoy mismo.' },
      ],
    },
    {
      topic: 'bank_impersonation',
      title: 'Suplantación de bancos o billeteras virtuales',
      messages: [{ id: 4, text: 'Su cuenta fue bloqueada, ingrese a [enlace] para validarla.' }],
    },
  ],
};

export const emptyCriticalMessagesResponse: CriticalMessagesResponse = { topics: [] };

interface MockCriticalMessagesOptions {
  status?: number;
  body?: CriticalMessagesResponse;
}

export async function mockCriticalMessages(
  page: Page,
  { status = 200, body = criticalMessagesResponse }: MockCriticalMessagesOptions = {},
): Promise<void> {
  await page.route(CRITICAL_MESSAGES_ROUTE, (route) =>
    route.fulfill({ status, json: body, headers: CORS_HEADERS }),
  );
}

// 503 body as defined in the API contract.
const criticalMessagesErrorBody = { detail: 'No se pudo cargar el panel. Intentá de nuevo más tarde.' };

export interface FailingCriticalMessages {
  recover: () => void;
}

// Answers 503 until recover() is called. Not a fixed sequence: Strict Mode loads the panel twice in development.
export async function mockFailingCriticalMessages(
  page: Page,
  body: CriticalMessagesResponse = criticalMessagesResponse,
): Promise<FailingCriticalMessages> {
  let failing = true;
  await page.route(CRITICAL_MESSAGES_ROUTE, (route) =>
    route.fulfill(
      failing
        ? { status: 503, json: criticalMessagesErrorBody, headers: CORS_HEADERS }
        : { json: body, headers: CORS_HEADERS },
    ),
  );
  return {
    recover: () => {
      failing = false;
    },
  };
}
