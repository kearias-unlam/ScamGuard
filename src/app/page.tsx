"use client";

import Link from 'next/link';
import { useState } from 'react';

import {
  ANALYSIS_ERROR_TEXT,
  AnalysisError,
  UNREADABLE_EMAIL_ERROR_TEXT,
  UNREADABLE_URL_ERROR_TEXT,
} from '@/components/AnalysisError';
import { AnalysisInputTabs, type AnalysisInputTab } from '@/components/AnalysisInputTabs';
import { AnalysisResultView } from '@/components/AnalysisResultView';
import { AnalysisStatus, type AnalysisRequestStatus } from '@/components/AnalysisStatus';
import { EmailAnalysisForm } from '@/components/EmailAnalysisForm';
import { MessageAnalysisForm } from '@/components/MessageAnalysisForm';
import { UrlAnalysisForm } from '@/components/UrlAnalysisForm';
import { ApiError, postAnalysis, postEmailAnalysis, postUrlAnalysis } from '@/lib/api';
import type { AnalysisResult, MessageAnalysisRequest, MessageAnalysisResponse } from '@/types';

// What "Analizar" sent last, so "Reintentar" resends it (US-4.2, US-6.2). The email keeps the chosen File and the
// link its submitted text, so a retry resends them even if the form changed since.
type SubmittedRequest =
  | { kind: 'message'; request: MessageAnalysisRequest }
  | { kind: 'email'; emailFile: File }
  | { kind: 'url'; url: string };

async function sendRequest(submitted: SubmittedRequest): Promise<MessageAnalysisResponse> {
  switch (submitted.kind) {
    case 'message':
      return postAnalysis(submitted.request);
    case 'email':
      return postEmailAnalysis({ emailContent: await submitted.emailFile.text() });
    case 'url':
      return postUrlAnalysis({ url: submitted.url });
  }
}

// US-4.2 AC5, US-6.2 AC5: a 422 means the backend could not read the email or the link, so retrying cannot help.
// A message has no such error: any failure is the busy error.
const UNREADABLE_ERROR_TEXTS: Record<SubmittedRequest['kind'], string | null> = {
  message: null,
  email: UNREADABLE_EMAIL_ERROR_TEXT,
  url: UNREADABLE_URL_ERROR_TEXT,
};

function unreadableErrorText(submitted: SubmittedRequest, error: unknown): string | null {
  return error instanceof ApiError && error.status === 422 ? UNREADABLE_ERROR_TEXTS[submitted.kind] : null;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<AnalysisInputTab>('message');
  const [message, setMessage] = useState('');
  const [shareInPanel, setShareInPanel] = useState(false);
  const [sensitiveData, setSensitiveData] = useState('');
  const [emailFile, setEmailFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [lastSubmittedRequest, setLastSubmittedRequest] = useState<SubmittedRequest | null>(null);
  const [status, setStatus] = useState<AnalysisRequestStatus>('idle');
  // Text of the unreadable email or link error (shown without retry), or null for the busy error.
  const [unreadableText, setUnreadableText] = useState<string | null>(null);
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

  function handleUrlChange(nextUrl: string): void {
    setUrl(nextUrl);
  }

  // US-5.4: "Limpiar" empties only the form; the result and the last request for "Reintentar" stay.
  function handleClearMessage(): void {
    setMessage('');
    handleShareInPanelChange(false);
  }

  function handleClearEmail(): void {
    setEmailFile(null);
  }

  function handleClearUrl(): void {
    setUrl('');
  }

  function handleUrlSubmit(): void {
    void runAnalysis({ kind: 'url', url });
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
      setUnreadableText(unreadableErrorText(submitted, error));
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

  // Resends the last submitted request (message with its share fields, email, or link), not the current form content.
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
          Pegá un texto o un link, o subí el correo completo. Analizamos las señales de alerta y te explicamos qué
          encontramos.
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
        ) : null}
        {activeTab === 'email' ? (
          <EmailAnalysisForm
            emailFile={emailFile}
            isSubmitting={status === 'loading'}
            onEmailFileChange={handleEmailFileChange}
            onSubmit={handleEmailSubmit}
            onClear={handleClearEmail}
          />
        ) : null}
        {activeTab === 'url' ? (
          <UrlAnalysisForm
            url={url}
            isSubmitting={status === 'loading'}
            onUrlChange={handleUrlChange}
            onSubmit={handleUrlSubmit}
            onClear={handleClearUrl}
          />
        ) : null}
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
            message={unreadableText ?? ANALYSIS_ERROR_TEXT}
            showRetry={unreadableText === null}
            onRetry={handleRetry}
          />
        ) : null}
        <AnalysisResultView result={result} isIdle={status === 'idle'} />
      </aside>
    </main>
  );
}
