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

async function postJson<TResponse>(endpoint: string, body: unknown): Promise<TResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new ApiError(`Request to ${endpoint} failed with status ${response.status}`, response.status);
  }
  return (await response.json()) as TResponse;
}

export async function postAnalysis(
  request: MessageAnalysisRequest,
): Promise<MessageAnalysisResponse> {
  return postJson<MessageAnalysisResponse>(getAnalysisEndpoint(), request);
}

export async function postEmailAnalysis(
  request: EmailAnalysisRequest,
): Promise<MessageAnalysisResponse> {
  return postJson<MessageAnalysisResponse>(getEmailAnalysisEndpoint(), request);
}

export async function postUrlAnalysis(request: UrlAnalysisRequest): Promise<MessageAnalysisResponse> {
  return postJson<MessageAnalysisResponse>(getUrlAnalysisEndpoint(), request);
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
