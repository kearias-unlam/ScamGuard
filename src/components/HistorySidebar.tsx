import type { HistoryResponse } from '@/types';

// User-visible texts (docs/requirements.md, UI texts).
const HISTORY_EMPTY_TEXT = 'Todavía no hay análisis en tu historial.';
const HISTORY_ERROR_TEXT = 'No se pudo cargar el historial. Intentá de nuevo más tarde.';

// dd/mm/aaaa in the user's time zone (display mapping only; createdAt is UTC).
const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function formatDate(createdAt: string): string {
  return DATE_FORMAT.format(new Date(createdAt));
}

interface HistorySidebarProps {
  history: HistoryResponse | null;
  hasError: boolean;
  isBusy: boolean;
  onSelectEntry: (id: number) => void;
}

// US-10.1: the signed-in user's analyses, most recent first. Rendered by the home page only with a session.
export function HistorySidebar({ history, hasError, isBusy, onSelectEntry }: HistorySidebarProps) {
  return (
    <aside className="card history-sidebar" aria-labelledby="history-heading">
      <h2 id="history-heading">Historial</h2>
      {hasError ? (
        <p className="history-sidebar__error" data-testid="history-error">
          {HISTORY_ERROR_TEXT}
        </p>
      ) : null}
      {history !== null && history.entries.length === 0 ? (
        <p className="muted" data-testid="history-empty">
          {HISTORY_EMPTY_TEXT}
        </p>
      ) : null}
      {history !== null && history.entries.length > 0 ? (
        <ul className="history-sidebar__list">
          {history.entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="history-entry"
                data-testid="history-entry"
                disabled={isBusy}
                onClick={() => onSelectEntry(entry.id)}
              >
                <span className="history-entry__title">{entry.title}</span>
                <span className="history-entry__date">{formatDate(entry.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
