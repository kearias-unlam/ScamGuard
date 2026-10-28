import type { Page } from '@playwright/test';

import type { Indicator, MessageAnalysisResponse, RiskLevel } from '../../src/types';

const ANALYSIS_ROUTE = '**/analysis';
// Does not overlap with ANALYSIS_ROUTE: the glob '**/analysis' never matches '/analysis/email'.
const EMAIL_ANALYSIS_ROUTE = '**/analysis/email';
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

// Same response as analysisResponse with a different risk level.
export function analysisResponseWithRisk(riskLevel: RiskLevel): MessageAnalysisResponse {
  return { result: { ...analysisResponse.result, riskLevel } };
}

// Same response as analysisResponse with a different list of indicators.
export function analysisResponseWithIndicators(indicators: Indicator[]): MessageAnalysisResponse {
  return { result: { ...analysisResponse.result, indicators } };
}

// Two indicators sharing a type, as returned by the real model.
export const sameTypeIndicators: Indicator[] = [
  {
    type: 'payment_request',
    title: 'Pedido de pago',
    description: 'El mensaje pide transferir dinero.',
    evidence: 'Transferí $5000',
  },
  {
    type: 'payment_request',
    title: 'Pago por adelantado',
    description: 'El mensaje exige pagar antes de recibir el premio.',
    evidence: 'pagá el envío',
  },
];

interface MockAnalysisOptions {
  status?: number;
  body?: MessageAnalysisResponse;
}

async function mockRoute(
  page: Page,
  url: string,
  { status = 200, body = analysisResponse }: MockAnalysisOptions,
): Promise<void> {
  await page.route(url, (route) => route.fulfill({ status, json: body, headers: CORS_HEADERS }));
}

export async function mockAnalysis(page: Page, options: MockAnalysisOptions = {}): Promise<void> {
  await mockRoute(page, ANALYSIS_ROUTE, options);
}

// US-4.2: POST /analysis/email answers with the same response shape as POST /analysis.
export async function mockEmailAnalysis(page: Page, options: MockAnalysisOptions = {}): Promise<void> {
  await mockRoute(page, EMAIL_ANALYSIS_ROUTE, options);
}

export interface PendingAnalysis {
  release: () => void;
}

// Holds the request open until release() is called, without timeouts.
async function mockPendingRoute(
  page: Page,
  url: string,
  body: MessageAnalysisResponse,
): Promise<PendingAnalysis> {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(url, async (route) => {
    await released;
    await route.fulfill({ json: body, headers: CORS_HEADERS });
  });
  return { release };
}

export async function mockPendingAnalysis(
  page: Page,
  body: MessageAnalysisResponse = analysisResponse,
): Promise<PendingAnalysis> {
  return mockPendingRoute(page, ANALYSIS_ROUTE, body);
}

export async function mockPendingEmailAnalysis(
  page: Page,
  body: MessageAnalysisResponse = analysisResponse,
): Promise<PendingAnalysis> {
  return mockPendingRoute(page, EMAIL_ANALYSIS_ROUTE, body);
}

export type AnalysisMockStatus = 200 | 422 | 503;

interface AnalysisErrorBody {
  detail: string;
}

// 503 body as defined in the API contract.
export const analysisErrorBody: AnalysisErrorBody = {
  detail: 'Los servidores están ocupados. Intentá de nuevo más tarde.',
};

// 422 body (FastAPI validation error); the frontend ignores it and only reads the status.
const unprocessableBody = { detail: [{ msg: 'Value error, the email has no readable text body' }] };

function bodyForStatus(status: AnalysisMockStatus): unknown {
  if (status === 200) {
    return analysisResponse;
  }
  return status === 422 ? unprocessableBody : analysisErrorBody;
}

type AnalysisStatusSequence = readonly [AnalysisMockStatus, ...AnalysisMockStatus[]];

// Answers each POST to the route with the next status; the last status repeats.
async function mockRouteSequence(page: Page, url: string, statuses: AnalysisStatusSequence): Promise<void> {
  const [first, ...rest] = statuses;
  let next: AnalysisMockStatus = first;
  await page.route(url, async (route) => {
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
      json: bodyForStatus(status),
      headers: CORS_HEADERS,
    });
  });
}

export async function mockAnalysisSequence(page: Page, statuses: AnalysisStatusSequence): Promise<void> {
  await mockRouteSequence(page, ANALYSIS_ROUTE, statuses);
}

export async function mockEmailAnalysisSequence(page: Page, statuses: AnalysisStatusSequence): Promise<void> {
  await mockRouteSequence(page, EMAIL_ANALYSIS_ROUTE, statuses);
}
