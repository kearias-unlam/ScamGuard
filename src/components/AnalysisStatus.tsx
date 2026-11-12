import { ANALYSIS_LOADING_TEXT } from '@/lib/display-texts';

export type AnalysisRequestStatus = 'idle' | 'loading' | 'error' | 'success';

interface AnalysisStatusProps {
  status: AnalysisRequestStatus;
}

export function AnalysisStatus({ status }: AnalysisStatusProps) {
  // Always rendered so screen readers announce text changes.
  return (
    <p role="status" className="analysis-status" data-testid="analysis-status">
      {status === 'loading' ? ANALYSIS_LOADING_TEXT : null}
    </p>
  );
}
