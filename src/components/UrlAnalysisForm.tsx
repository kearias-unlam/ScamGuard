"use client";

import type { ChangeEvent, FormEvent } from 'react';

import { TrashIcon } from '@/components/TrashIcon';

interface UrlAnalysisFormProps {
  url: string;
  isSubmitting: boolean;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

// US-6.1: one link per analysis. The backend validates it; the form only checks that it is not blank.
export function UrlAnalysisForm({ url, isSubmitting, onUrlChange, onSubmit, onClear }: UrlAnalysisFormProps) {
  const isUrlEmpty = url.trim().length === 0;

  function handleUrlChange(event: ChangeEvent<HTMLInputElement>): void {
    onUrlChange(event.target.value);
  }

  function handleClearClick(): void {
    onClear();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (isUrlEmpty || isSubmitting) {
      return;
    }
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="url-form">
      <label htmlFor="url">Link</label>
      {/* type="text", not "url": the browser's URL validation would block links without "http://". */}
      <input
        type="text"
        id="url"
        name="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        placeholder="https://ejemplo.com/..."
        value={url}
        onChange={handleUrlChange}
        data-testid="url-input"
      />
      <div className="form-actions">
        <button type="button" className="button button--ghost" onClick={handleClearClick} data-testid="clear-url-button">
          <TrashIcon />
          Limpiar
        </button>
        <button
          type="submit"
          className="button button--primary"
          disabled={isUrlEmpty || isSubmitting}
          data-testid="analyze-url-button"
        >
          Analizar link
        </button>
      </div>
    </form>
  );
}
