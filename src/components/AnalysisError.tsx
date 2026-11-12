import { RETRY_TEXT } from '@/lib/display-texts';

// User-visible error texts are defined once in src/lib/display-texts.ts (shared with the Gmail extension, Feature 11).
export {
  ANALYSIS_ERROR_TEXT,
  HISTORY_FULL_TEXT,
  UNREADABLE_EMAIL_ERROR_TEXT,
  UNREADABLE_URL_ERROR_TEXT,
} from '@/lib/display-texts';

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
      {/* US-4.2 AC5, US-6.2 AC5, US-10.2: an unreadable email or link, or a full history, cannot succeed on retry,
          so the button is hidden. */}
      {showRetry ? (
        <button
          type="button"
          className="button button--secondary"
          onClick={handleRetryClick}
          data-testid="retry-analysis-button"
        >
          {RETRY_TEXT}
        </button>
      ) : null}
    </div>
  );
}
