import type {
  CriticalMessagesResponse,
  EmailAnalysisRequest,
  MessageAnalysisRequest,
  MessageAnalysisResponse,
  UrlAnalysisRequest,
} from '@/types';

// Carries the HTTP status so callers can tell an unreadable email or link (422) from other failures (US-4.2, US-6.2).
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function buildBackendUrl(path: `/${string}`): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return new URL(path, baseUrl || 'http://localhost:8000').toString();
}

export function getAnalysisEndpoint(): string {
  return buildBackendUrl('/analysis');
}

export function getEmailAnalysisEndpoint(): string {
  return buildBackendUrl('/analysis/email');
}

export function getUrlAnalysisEndpoint(): string {
  return buildBackendUrl('/analysis/url');
}

// US-9.1 (#104): with a session, the backend token goes in the Authorization header; without one, no header is sent.
function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function postJson<TResponse>(endpoint: string, body: unknown, token?: string): Promise<TResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new ApiError(`Request to ${endpoint} failed with status ${response.status}`, response.status);
  }
  return (await response.json()) as TResponse;
}

export async function postAnalysis(
  request: MessageAnalysisRequest,
  token?: string,
): Promise<MessageAnalysisResponse> {
  return postJson<MessageAnalysisResponse>(getAnalysisEndpoint(), request, token);
}

export async function postEmailAnalysis(
  request: EmailAnalysisRequest,
  token?: string,
): Promise<MessageAnalysisResponse> {
  return postJson<MessageAnalysisResponse>(getEmailAnalysisEndpoint(), request, token);
}

export async function postUrlAnalysis(request: UrlAnalysisRequest, token?: string): Promise<MessageAnalysisResponse> {
  return postJson<MessageAnalysisResponse>(getUrlAnalysisEndpoint(), request, token);
}

export function getCriticalMessagesEndpoint(): string {
  return buildBackendUrl('/critical-messages');
}

export async function getCriticalMessages(): Promise<CriticalMessagesResponse> {
  const response = await fetch(getCriticalMessagesEndpoint());
  if (!response.ok) {
    throw new Error(`Critical messages request failed with status ${response.status}`);
  }
  return (await response.json()) as CriticalMessagesResponse;
}
