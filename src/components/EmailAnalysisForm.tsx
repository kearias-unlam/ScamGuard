"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';

import { TrashIcon } from '@/components/TrashIcon';

interface EmailAnalysisFormProps {
  emailFile: File | null;
  isSubmitting: boolean;
  onEmailFileChange: (emailFile: File | null) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export function EmailAnalysisForm({
  emailFile,
  isSubmitting,
  onEmailFileChange,
  onSubmit,
  onClear,
}: EmailAnalysisFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // UI-only state: highlights the drop zone while a file is dragged over it (US-5.3).
  const [isDragging, setIsDragging] = useState(false);

  // US-4.1: only .eml files can be sent; the hint shows only after a wrong file is chosen.
  const hasEmlExtension = emailFile !== null && emailFile.name.toLowerCase().endsWith('.eml');
  const showHint = emailFile !== null && !hasEmlExtension;

  // Uncontrolled input: browsers do not allow setting a file input's value.
  function handleEmailFileChange(event: ChangeEvent<HTMLInputElement>): void {
    onEmailFileChange(event.target.files?.[0] ?? null);
  }

  function handleChooseFileClick(): void {
    fileInputRef.current?.click();
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDragging(true);
  }

  // Without preventDefault the browser does not allow dropping and opens the file instead.
  function handleDragOver(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
  }

  // Ignore leaving towards a child element, so the highlight does not flicker.
  function handleDragLeave(event: DragEvent<HTMLDivElement>): void {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDragging(false);
  }

  // A dropped file is handled exactly like a chosen one (US-5.3).
  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDragging(false);
    onEmailFileChange(event.dataTransfer.files[0] ?? null);
  }

  // Resetting the input lets the same file be chosen again (otherwise no change event fires).
  function handleClearClick(): void {
    if (fileInputRef.current !== null) {
      fileInputRef.current.value = '';
    }
    onClear();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!hasEmlExtension || isSubmitting) {
      return;
    }
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="email-form">
      <label htmlFor="email-file">Archivo de correo (.eml)</label>
      <div
        className="drop-zone"
        data-dragging={isDragging}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="email-drop-zone"
      >
        {/* Visually hidden but focusable; the zone shows its focus outline. */}
        <input
          ref={fileInputRef}
          type="file"
          id="email-file"
          name="emailFile"
          accept=".eml"
          className="visually-hidden"
          aria-describedby={showHint ? 'email-file-hint' : undefined}
          onChange={handleEmailFileChange}
          data-testid="email-file-input"
        />
        <span className="drop-zone__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {emailFile === null ? (
              <path d="M12 16V4m0 0L8 8m4-4 4 4M5 15v4h14v-4" />
            ) : (
              <>
                <path d="M6 3h8l4 4v14H6V3Z" />
                <path d="M14 3v5h5M9 13h6M9 17h4" />
              </>
            )}
          </svg>
        </span>
        {emailFile === null ? (
          <>
            <p className="drop-zone__title">Arrastrá tu correo hasta acá</p>
            <p className="muted">o seleccioná un archivo descargado de tu casilla</p>
          </>
        ) : (
          <>
            <p className="drop-zone__title drop-zone__file-name" data-testid="email-file-name">
              {emailFile.name}
            </p>
            {hasEmlExtension ? <p className="muted">Archivo listo para analizar</p> : null}
          </>
        )}
        <button
          type="button"
          className="button button--soft"
          onClick={handleChooseFileClick}
          data-testid="choose-email-file-button"
        >
          {emailFile === null ? 'Elegir archivo .eml' : 'Cambiar archivo'}
        </button>
        {emailFile === null ? <p className="drop-zone__note muted">Máximo 1 MB</p> : null}
      </div>
      {/* Plain paragraph, no role: a second status/alert inside main would clash with the analysis status. */}
      {showHint ? (
        <p id="email-file-hint" className="muted" data-testid="email-file-hint">
          Elegí un archivo con extensión .eml.
        </p>
      ) : null}
      <div className="form-actions">
        <button
          type="button"
          className="button button--ghost"
          onClick={handleClearClick}
          data-testid="clear-email-button"
        >
          <TrashIcon />
          Limpiar
        </button>
        <button
          type="submit"
          className="button button--primary"
          disabled={!hasEmlExtension || isSubmitting}
          data-testid="analyze-email-button"
        >
          Analizar correo
        </button>
      </div>
    </form>
  );
}
