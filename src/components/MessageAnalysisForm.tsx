"use client";

import type { FormEvent, ChangeEvent } from 'react';

interface MessageAnalysisFormProps {
  message: string;
  isSubmitting: boolean;
  onMessageChange: (message: string) => void;
  onSubmit: () => void;
}

export function MessageAnalysisForm({
  message,
  isSubmitting,
  onMessageChange,
  onSubmit,
}: MessageAnalysisFormProps) {
  // Whitespace-only input counts as empty.
  const isMessageEmpty = message.trim().length === 0;

  function handleMessageChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    onMessageChange(event.target.value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (isMessageEmpty || isSubmitting) {
      return;
    }
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="message">Mensaje</label>
      <textarea
        id="message"
        name="message"
        value={message}
        onChange={handleMessageChange}
        data-testid="message-input"
      />
      <button
        type="submit"
        disabled={isMessageEmpty || isSubmitting}
        data-testid="submit-analysis-button"
      >
        Analizar mensaje
      </button>
    </form>
  );
}
