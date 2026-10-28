"use client";

import type { ChangeEvent, FormEvent } from 'react';

interface EmailAnalysisFormProps {
  emailFile: File | null;
  isSubmitting: boolean;
  onEmailFileChange: (emailFile: File | null) => void;
  onSubmit: () => void;
}

export function EmailAnalysisForm({
  emailFile,
  isSubmitting,
  onEmailFileChange,
  onSubmit,
}: EmailAnalysisFormProps) {
  // US-4.1: only .eml files can be sent; the hint shows only after a wrong file is chosen.
  const hasEmlExtension = emailFile !== null && emailFile.name.toLowerCase().endsWith('.eml');
  const showHint = emailFile !== null && !hasEmlExtension;

  // Uncontrolled input: browsers do not allow setting a file input's value.
  function handleEmailFileChange(event: ChangeEvent<HTMLInputElement>): void {
    onEmailFileChange(event.target.files?.[0] ?? null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!hasEmlExtension || isSubmitting) {
      return;
    }
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="card email-form">
      <label htmlFor="email-file">Archivo de correo (.eml)</label>
      <input
        type="file"
        id="email-file"
        name="emailFile"
        accept=".eml"
        aria-describedby={showHint ? 'email-file-hint' : undefined}
        onChange={handleEmailFileChange}
        data-testid="email-file-input"
      />
      {/* Plain paragraph, no role: a second status/alert inside main would clash with the analysis status. */}
      {showHint ? (
        <p id="email-file-hint" className="muted" data-testid="email-file-hint">
          Elegí un archivo con extensión .eml.
        </p>
      ) : null}
      <button
        type="submit"
        className="button button--primary"
        disabled={!hasEmlExtension || isSubmitting}
        data-testid="analyze-email-button"
      >
        Analizar correo
      </button>
    </form>
  );
}
