import type { Page } from '@playwright/test';

import type { MessageAnalysisResponse } from '../../src/types';

const ANALYSIS_ROUTE = '**/analysis';
const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*' };

export const analysisResponse: MessageAnalysisResponse = {
  result: {
    riskLevel: 'HIGH',
    summary: 'El mensaje anuncia un premio y pide hacer clic en un enlace.',
    explanation: 'Promete un premio inesperado y pide una acción inmediata.',
    indicators: [
      {
        type: 'unexpected_prize',
        title: 'Premio inesperado',
        description: 'El mensaje promete un premio que no se solicitó.',
        evidence: 'Ganaste un premio',
      },
    ],
  },
};

interface MockAnalysisOptions {
  status?: number;
  body?: MessageAnalysisResponse;
}

export async function mockAnalysis(
  page: Page,
  { status = 200, body = analysisResponse }: MockAnalysisOptions = {},
): Promise<void> {
  await page.route(ANALYSIS_ROUTE, (route) =>
    route.fulfill({ status, json: body, headers: CORS_HEADERS }),
  );
}

export interface PendingAnalysis {
  release: () => void;
}

// Holds the request open until release() is called, without timeouts.
export async function mockPendingAnalysis(
  page: Page,
  body: MessageAnalysisResponse = analysisResponse,
): Promise<PendingAnalysis> {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(ANALYSIS_ROUTE, async (route) => {
    await released;
    await route.fulfill({ json: body, headers: CORS_HEADERS });
  });
  return { release };
}

export type AnalysisMockStatus = 200 | 503;

interface AnalysisErrorBody {
  detail: string;
}

// 503 body as defined in the API contract.
export const analysisErrorBody: AnalysisErrorBody = {
  detail: 'Los servidores están ocupados. Intentá de nuevo más tarde.',
};

// Answers each POST /analysis with the next status; the last status repeats.
export async function mockAnalysisSequence(
  page: Page,
  statuses: readonly [AnalysisMockStatus, ...AnalysisMockStatus[]],
): Promise<void> {
  const [first, ...rest] = statuses;
  let next: AnalysisMockStatus = first;
  await page.route(ANALYSIS_ROUTE, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: { ...CORS_HEADERS, 'Access-Control-Allow-Headers': 'Content-Type' },
      });
      return;
    }
    const status = next;
    next = rest.shift() ?? status;
    await route.fulfill({
      status,
      json: status === 200 ? analysisResponse : analysisErrorBody,
      headers: CORS_HEADERS,
    });
  });
}
