// User-visible error texts (docs/requirements.md, UI texts). Defined once here.
export const ANALYSIS_ERROR_TEXT = 'Los servidores están ocupados. Intentá de nuevo más tarde.';
export const UNREADABLE_EMAIL_ERROR_TEXT =
  'No se pudo leer el correo. Verificá que sea un archivo .eml de hasta 1 MB.';
export const UNREADABLE_URL_ERROR_TEXT =
  'No se pudo leer el link. Verificá que sea una dirección completa, por ejemplo https://ejemplo.com.';

interface AnalysisErrorProps {
  message: string;
  showRetry: boolean;
  onRetry: () => void;
}

export function AnalysisError({ message, showRetry, onRetry }: AnalysisErrorProps) {
  function handleRetryClick(): void {
    onRetry();
  }

  return (
    <div className="analysis-error">
      <p role="alert" data-testid="analysis-error">
        {message}
      </p>
      {/* US-4.2 AC5, US-6.2 AC5: an unreadable email or link cannot succeed on retry, so the button is hidden. */}
      {showRetry ? (
        <button
          type="button"
          className="button button--secondary"
          onClick={handleRetryClick}
          data-testid="retry-analysis-button"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
