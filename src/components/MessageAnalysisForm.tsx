"use client";

import type { FormEvent, ChangeEvent } from 'react';

import { TrashIcon } from '@/components/TrashIcon';

// Display mapping only (US-5.4).
function formatCharCount(count: number): string {
  return count === 1 ? '1 carácter' : `${count} caracteres`;
}

interface MessageAnalysisFormProps {
  message: string;
  shareInPanel: boolean;
  sensitiveData: string;
  isSubmitting: boolean;
  onMessageChange: (message: string) => void;
  onShareInPanelChange: (shareInPanel: boolean) => void;
  onSensitiveDataChange: (sensitiveData: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export function MessageAnalysisForm({
  message,
  shareInPanel,
  sensitiveData,
  isSubmitting,
  onMessageChange,
  onShareInPanelChange,
  onSensitiveDataChange,
  onSubmit,
  onClear,
}: MessageAnalysisFormProps) {
  // Whitespace-only input counts as empty.
  const isMessageEmpty = message.trim().length === 0;

  function handleMessageChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    onMessageChange(event.target.value);
  }

  function handleShareInPanelChange(event: ChangeEvent<HTMLInputElement>): void {
    onShareInPanelChange(event.target.checked);
  }

  function handleSensitiveDataChange(event: ChangeEvent<HTMLInputElement>): void {
    onSensitiveDataChange(event.target.value);
  }

  function handleClearClick(): void {
    onClear();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (isMessageEmpty || isSubmitting) {
      return;
    }
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="message-form">
      {/* The count stays outside the label so the field's accessible name is just "Mensaje". */}
      <div className="field-header">
        <label htmlFor="message">Mensaje</label>
        <span className="char-count muted" data-testid="message-char-count">
          {formatCharCount(message.length)}
        </span>
      </div>
      <textarea
        id="message"
        name="message"
        rows={6}
        placeholder="Pegá acá el mensaje, SMS o correo que querés analizar..."
        value={message}
        onChange={handleMessageChange}
        data-testid="message-input"
      />
      <div className="share-option">
        <input
          type="checkbox"
          id="share-in-panel"
          name="shareInPanel"
          checked={shareInPanel}
          onChange={handleShareInPanelChange}
          data-testid="share-in-panel-checkbox"
        />
        <label htmlFor="share-in-panel">Compartir este mensaje en el panel de mensajes críticos</label>
      </div>
      {/* US-3.3: only rendered while the message is shared. */}
      {shareInPanel ? (
        <>
          <label htmlFor="sensitive-data">Datos a ocultar (separados por coma)</label>
          <input
            type="text"
            id="sensitive-data"
            name="sensitiveData"
            value={sensitiveData}
            onChange={handleSensitiveDataChange}
            data-testid="sensitive-data-input"
          />
        </>
      ) : null}
      <div className="form-actions">
        <button
          type="button"
          className="button button--ghost"
          onClick={handleClearClick}
          data-testid="clear-message-button"
        >
          <TrashIcon />
          Limpiar
        </button>
        <button
          type="submit"
          className="button button--primary"
          disabled={isMessageEmpty || isSubmitting}
          data-testid="submit-analysis-button"
        >
          Analizar mensaje
        </button>
      </div>
    </form>
  );
}
