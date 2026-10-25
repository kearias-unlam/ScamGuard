const PANEL_ERROR_TEXT = 'No se pudo cargar el panel. Intentá de nuevo más tarde.';

interface PanelErrorProps {
  onRetry: () => void;
}

export function PanelError({ onRetry }: PanelErrorProps) {
  function handleRetryClick(): void {
    onRetry();
  }

  return (
    <div className="analysis-error">
      <p role="alert" data-testid="panel-error">
        {PANEL_ERROR_TEXT}
      </p>
      <button
        type="button"
        className="button button--secondary"
        onClick={handleRetryClick}
        data-testid="panel-retry-button"
      >
        Reintentar
      </button>
    </div>
  );
}
