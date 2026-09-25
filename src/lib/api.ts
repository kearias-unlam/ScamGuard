import type { MessageAnalysisRequest, MessageAnalysisResponse } from '@/types';

export function buildBackendUrl(path: `/${string}`): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return new URL(path, baseUrl || 'http://localhost:8000').toString();
}

export function getAnalysisEndpoint(): string {
  return buildBackendUrl('/analysis');
}

export async function postAnalysis(
  request: MessageAnalysisRequest,
): Promise<MessageAnalysisResponse> {
  const response = await fetch(getAnalysisEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`Analysis request failed with status ${response.status}`);
  }
  return (await response.json()) as MessageAnalysisResponse;
}
