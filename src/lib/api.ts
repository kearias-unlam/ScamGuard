export function buildBackendUrl(path: `/${string}`): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return new URL(path, baseUrl || 'http://localhost:8000').toString();
}

export function getAnalysisEndpoint(): string {
  return buildBackendUrl('/analysis');
}
