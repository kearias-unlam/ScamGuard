export type AnalysisRequestStatus = 'idle' | 'loading' | 'error' | 'success';

interface AnalysisStatusProps {
  status: AnalysisRequestStatus;
}

export function AnalysisStatus({ status }: AnalysisStatusProps) {
  // Always rendered so screen readers announce text changes.
  return (
    <p role="status" data-testid="analysis-status">
      {status === 'loading' ? 'Analizando mensaje...' : null}
    </p>
  );
}
