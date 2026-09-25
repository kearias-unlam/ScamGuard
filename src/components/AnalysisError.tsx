const ANALYSIS_ERROR_TEXT = 'Los servidores están ocupados. Intentá de nuevo más tarde.';

interface AnalysisErrorProps {
  onRetry: () => void;
}

export function AnalysisError({ onRetry }: AnalysisErrorProps) {
  function handleRetryClick(): void {
    onRetry();
  }

  return (
    <div className="analysis-error">
      <p role="alert" data-testid="analysis-error">
        {ANALYSIS_ERROR_TEXT}
      </p>
      <button
        type="button"
        className="button button--secondary"
        onClick={handleRetryClick}
        data-testid="retry-analysis-button"
      >
        Reintentar
      </button>
    </div>
  );
}
