interface AnalysisStatusProps {
  status: 'idle' | 'loading' | 'error' | 'success';
}

export function AnalysisStatus({ status }: AnalysisStatusProps) {
  return <div data-testid="analysis-status">{status}</div>;
}
