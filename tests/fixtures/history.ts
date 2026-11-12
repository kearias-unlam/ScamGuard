import type { Page } from '@playwright/test';

import type { HistoryEntry, HistoryEntrySummary, HistoryResponse } from '../../src/types';
import { analysisResponse } from './analysis';

// US-10.1: GET /history and GET /history/{id} mocked with page.route. There is no /history page, so the globs only
// match the backend endpoints.
const HISTORY_ROUTE = '**/history';
const HISTORY_ENTRY_ROUTE = '**/history/*';
const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*' };
const HISTORY_LIMIT = 3;

// Noon UTC, so dd/mm/aaaa is the same date in any time zone the tests run in.
export const olderEntry: HistoryEntrySummary = {
  id: 1,
  kind: 'message',
  title: 'Pide transferir dinero a un familiar',
  createdAt: '2026-11-09T12:00:00Z',
};

export const newerEntry: HistoryEntrySummary = {
  id: 2,
  kind: 'url',
  title: 'Link que imita a un banco',
  createdAt: '2026-11-10T12:00:00Z',
};

export const thirdEntry: HistoryEntrySummary = {
  id: 3,
  kind: 'email',
  title: 'Correo de un falso banco',
  createdAt: '2026-11-11T12:00:00Z',
};

export function historyResponse(entries: HistoryEntrySummary[]): HistoryResponse {
  return { entries, limit: HISTORY_LIMIT, isFull: entries.length >= HISTORY_LIMIT };
}

export function historyEntry(
  summary: HistoryEntrySummary,
  resultSummary: string,
  analyzedInput = 'Hola, soy tu banco. Ingresá a este link para validar tu cuenta.',
): HistoryEntry {
  return {
    ...summary,
    analysis: { ...analysisResponse, result: { ...analysisResponse.result, summary: resultSummary } },
    analyzedInput,
  };
}

// Each GET /history answers the next item and repeats the last one; a number answers that error status.
export async function mockHistory(page: Page, responses: (HistoryResponse | number)[]): Promise<void> {
  let call = 0;
  await page.route(HISTORY_ROUTE, async (route) => {
    const next = responses[Math.min(call, responses.length - 1)];
    call += 1;
    if (typeof next === 'number') {
      await route.fulfill({ status: next, json: { detail: 'error' }, headers: CORS_HEADERS });
      return;
    }
    await route.fulfill({ json: next, headers: CORS_HEADERS });
  });
}

// GET /history/{id} answers the entry with that id, or 404.
export async function mockHistoryEntries(page: Page, entries: HistoryEntry[]): Promise<void> {
  await page.route(HISTORY_ENTRY_ROUTE, async (route) => {
    const id = Number(new URL(route.request().url()).pathname.split('/').pop());
    const entry = entries.find((candidate) => candidate.id === id);
    if (entry === undefined) {
      await route.fulfill({ status: 404, json: { detail: 'Not Found' }, headers: CORS_HEADERS });
      return;
    }
    await route.fulfill({ json: entry, headers: CORS_HEADERS });
  });
}

// US-10.2: DELETE /history/{id} answers the given status. Registered after mockHistoryEntries, so it is matched
// first: it answers the CORS preflight and DELETE, and hands any other method to the earlier route.
export async function mockHistoryDelete(page: Page, status = 204): Promise<void> {
  await page.route(HISTORY_ENTRY_ROUTE, async (route) => {
    const method = route.request().method();
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...CORS_HEADERS,
          'Access-Control-Allow-Methods': 'GET, DELETE',
          'Access-Control-Allow-Headers': 'Authorization',
        },
      });
      return;
    }
    if (method !== 'DELETE') {
      await route.fallback();
      return;
    }
    await route.fulfill({ status, headers: CORS_HEADERS });
  });
}
