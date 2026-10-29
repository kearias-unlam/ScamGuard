"use client";

import Link from 'next/link';
import { useState } from 'react';

import { ANALYSIS_ERROR_TEXT, AnalysisError, UNREADABLE_EMAIL_ERROR_TEXT } from '@/components/AnalysisError';
import { AnalysisInputTabs, type AnalysisInputTab } from '@/components/AnalysisInputTabs';
import { AnalysisResultView } from '@/components/AnalysisResultView';
import { AnalysisStatus, type AnalysisRequestStatus } from '@/components/AnalysisStatus';
import { EmailAnalysisForm } from '@/components/EmailAnalysisForm';
import { MessageAnalysisForm } from '@/components/MessageAnalysisForm';
import { ApiError, postAnalysis, postEmailAnalysis } from '@/lib/api';
import type { AnalysisResult, MessageAnalysisRequest, MessageAnalysisResponse } from '@/types';

// What "Analizar" sent last, so "Reintentar" resends it (US-4.2). The email keeps the chosen File,
// so a retry resends the same email even if another file was picked since.
type SubmittedRequest =
  | { kind: 'message'; request: MessageAnalysisRequest }
  | { kind: 'email'; emailFile: File };

async function sendRequest(submitted: SubmittedRequest): Promise<MessageAnalysisResponse> {
  if (submitted.kind === 'message') {
    return postAnalysis(submitted.request);
  }
  return postEmailAnalysis({ emailContent: await submitted.emailFile.text() });
}

// US-4.2 AC5: the backend answers 422 when it cannot read the email; any other failure is the busy error.
function isUnreadableEmail(submitted: SubmittedRequest, error: unknown): boolean {
  return submitted.kind === 'email' && error instanceof ApiError && error.status === 422;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<AnalysisInputTab>('message');
  const [message, setMessage] = useState('');
  const [shareInPanel, setShareInPanel] = useState(false);
  const [sensitiveData, setSensitiveData] = useState('');
  const [emailFile, setEmailFile] = useState<File | null>(null);
  const [lastSubmittedRequest, setLastSubmittedRequest] = useState<SubmittedRequest | null>(null);
  const [status, setStatus] = useState<AnalysisRequestStatus>('idle');
  const [isEmailUnreadable, setIsEmailUnreadable] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // US-5.2: the form state lives here, so changing tabs clears nothing.
  function handleTabChange(nextTab: AnalysisInputTab): void {
    setActiveTab(nextTab);
  }

  function handleMessageChange(nextMessage: string): void {
    setMessage(nextMessage);
  }

  // Unchecking clears the sensitive data so it is never sent by accident.
  function handleShareInPanelChange(nextShareInPanel: boolean): void {
    setShareInPanel(nextShareInPanel);
    if (!nextShareInPanel) {
      setSensitiveData('');
    }
  }

  function handleSensitiveDataChange(nextSensitiveData: string): void {
    setSensitiveData(nextSensitiveData);
  }

  function handleEmailFileChange(nextEmailFile: File | null): void {
    setEmailFile(nextEmailFile);
  }

  // US-5.4: "Limpiar" empties only the form; the result and the last request for "Reintentar" stay.
  function handleClearMessage(): void {
    setMessage('');
    handleShareInPanelChange(false);
  }

  function handleClearEmail(): void {
    setEmailFile(null);
  }

  function handleEmailSubmit(): void {
    if (emailFile === null) {
      return;
    }
    void runAnalysis({ kind: 'email', emailFile });
  }

  // Shared by submit and retry; clears the previous result so a failure never shows stale data.
  async function runAnalysis(submitted: SubmittedRequest): Promise<void> {
    setLastSubmittedRequest(submitted);
    setResult(null);
    setStatus('loading');
    try {
      const response = await sendRequest(submitted);
      setResult(response.result);
      setStatus('success');
    } catch (error) {
      setIsEmailUnreadable(isUnreadableEmail(submitted, error));
      setStatus('error');
    }
  }

  function handleSubmit(): void {
    // The share fields are sent only when checked, so the unchecked body stays { message } (US-1.2 AC1).
    void runAnalysis({
      kind: 'message',
      request: shareInPanel ? { message, shareInPanel: true, sensitiveData } : { message },
    });
  }

  // Resends the last submitted request (message with its share fields, or email), not the current form content.
  function handleRetry(): void {
    if (lastSubmittedRequest !== null) {
      void runAnalysis(lastSubmittedRequest);
    }
  }

  return (
    <main className="home">
      <section className="hero">
        <p className="hero__eyebrow">Detector de estafas</p>
        <h1>¿Ese mensaje te genera dudas?</h1>
        <p className="hero__intro">
          Pegá el texto o subí el correo completo. Analizamos las señales de alerta y te explicamos qué encontramos.
        </p>
        <Link href="/panel" className="button button--secondary" data-testid="panel-link">
          Ver mensajes críticos
        </Link>
      </section>
      <AnalysisInputTabs activeTab={activeTab} onTabChange={handleTabChange}>
        {activeTab === 'message' ? (
          <MessageAnalysisForm
            message={message}
            shareInPanel={shareInPanel}
            sensitiveData={sensitiveData}
            isSubmitting={status === 'loading'}
            onMessageChange={handleMessageChange}
            onShareInPanelChange={handleShareInPanelChange}
            onSensitiveDataChange={handleSensitiveDataChange}
            onSubmit={handleSubmit}
            onClear={handleClearMessage}
          />
        ) : (
          <EmailAnalysisForm
            emailFile={emailFile}
            isSubmitting={status === 'loading'}
            onEmailFileChange={handleEmailFileChange}
            onSubmit={handleEmailSubmit}
            onClear={handleClearEmail}
          />
        )}
      </AnalysisInputTabs>
      {/* US-5.1: named by its heading so it is exposed as a complementary landmark. */}
      <aside className="card result-column" aria-labelledby="result-heading">
        <div className="result-column__header">
          <h2 id="result-heading">Resultado del análisis</h2>
          <p className="muted">Evaluación orientativa</p>
        </div>
        <AnalysisStatus status={status} />
        {status === 'error' ? (
          <AnalysisError
            message={isEmailUnreadable ? UNREADABLE_EMAIL_ERROR_TEXT : ANALYSIS_ERROR_TEXT}
            showRetry={!isEmailUnreadable}
            onRetry={handleRetry}
          />
        ) : null}
        <AnalysisResultView result={result} isIdle={status === 'idle'} />
      </aside>
    </main>
  );
}
