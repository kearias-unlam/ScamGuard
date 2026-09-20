"use client";

import type { FormEvent, ChangeEvent } from 'react';

import type { MessageAnalysisRequest } from '@/types';

interface MessageAnalysisFormProps {
  message: string;
  onMessageChange: (message: string) => void;
  onSubmit: () => void;
}

export function MessageAnalysisForm({
  message,
  onMessageChange,
  onSubmit,
}: MessageAnalysisFormProps) {
  function handleMessageChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    onMessageChange(event.target.value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const request: MessageAnalysisRequest = { message };
    void request;
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="message">Message</label>
      <textarea
        id="message"
        name="message"
        value={message}
        onChange={handleMessageChange}
        data-testid="message-input"
      />
      <button type="submit" data-testid="submit-analysis-button">
        Analyze message
      </button>
    </form>
  );
}
