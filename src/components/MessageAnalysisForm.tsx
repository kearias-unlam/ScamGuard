"use client";

import type { FormEvent, ChangeEvent } from 'react';

interface MessageAnalysisFormProps {
  message: string;
  shareInPanel: boolean;
  sensitiveData: string;
  isSubmitting: boolean;
  onMessageChange: (message: string) => void;
  onShareInPanelChange: (shareInPanel: boolean) => void;
  onSensitiveDataChange: (sensitiveData: string) => void;
  onSubmit: () => void;
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

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (isMessageEmpty || isSubmitting) {
      return;
    }
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="card message-form">
      <label htmlFor="message">Mensaje</label>
      <textarea
        id="message"
        name="message"
        rows={6}
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
      <button
        type="submit"
        className="button button--primary"
        disabled={isMessageEmpty || isSubmitting}
        data-testid="submit-analysis-button"
      >
        Analizar mensaje
      </button>
    </form>
  );
}
