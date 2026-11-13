"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';

import {
  ANALYSIS_ERROR_TEXT,
  HISTORY_FULL_TEXT,
  AnalysisError,
  UNREADABLE_EMAIL_ERROR_TEXT,
  UNREADABLE_URL_ERROR_TEXT,
} from '@/components/AnalysisError';
import { AnalysisInputTabs, type AnalysisInputTab } from '@/components/AnalysisInputTabs';
import { AnalysisResultView } from '@/components/AnalysisResultView';
import { AnalysisStatus, type AnalysisRequestStatus } from '@/components/AnalysisStatus';
import { AnalyzedInputView } from '@/components/AnalyzedInputView';
import { EmailAnalysisForm } from '@/components/EmailAnalysisForm';
import { HistorySidebar } from '@/components/HistorySidebar';
import { LoginInvite } from '@/components/LoginInvite';
import { MessageAnalysisForm } from '@/components/MessageAnalysisForm';
import { UrlAnalysisForm } from '@/components/UrlAnalysisForm';
import {
  ApiError,
  deleteHistoryEntry,
  getHistory,
  getHistoryEntry,
  postAnalysis,
  postEmailAnalysis,
  postUrlAnalysis,
} from '@/lib/api';
import type { HistoryResponse, MessageAnalysisRequest, MessageAnalysisResponse } from '@/types';

// What "Analizar" sent last, so "Reintentar" resends it (US-4.2, US-6.2). The email keeps the chosen File and the
// link its submitted text, so a retry resends them even if the form changed since.
type SubmittedRequest =
  | { kind: 'message'; request: MessageAnalysisRequest }
  | { kind: 'email'; emailFile: File }
  | { kind: 'url'; url: string };

// The token is not part of SubmittedRequest, so "Reintentar" always sends the current one (US-9.1).
async function sendRequest(submitted: SubmittedRequest, token?: string): Promise<MessageAnalysisResponse> {
  switch (submitted.kind) {
    case 'message':
      return postAnalysis(submitted.request, token);
    case 'email':
      return postEmailAnalysis({ emailContent: await submitted.emailFile.text() }, token);
    case 'url':
      return postUrlAnalysis({ url: submitted.url }, token);
  }
}

// US-4.2 AC5, US-6.2 AC5: a 422 means the backend could not read the email or the link, so retrying cannot help.
// A message has no such error: any failure is the busy error.
const UNREADABLE_ERROR_TEXTS: Record<SubmittedRequest['kind'], string | null> = {
  message: null,
  email: UNREADABLE_EMAIL_ERROR_TEXT,
  url: UNREADABLE_URL_ERROR_TEXT,
};

// Errors that "Reintentar" cannot fix get their own text and no retry button; null means the busy error with retry.
// US-10.2: a 409 means the history is full, for any kind of request.
function noRetryErrorText(submitted: SubmittedRequest, error: unknown): string | null {
  if (!(error instanceof ApiError)) {
    return null;
  }
  if (error.status === 409) {
    return HISTORY_FULL_TEXT;
  }
  return error.status === 422 ? UNREADABLE_ERROR_TEXTS[submitted.kind] : null;
}

export default function HomePage() {
  const { data: session, status: sessionStatus } = useSession();
  const backendToken = session?.backendToken;
  const hasSession = sessionStatus === 'authenticated';
  const [activeTab, setActiveTab] = useState<AnalysisInputTab>('message');
  const [message, setMessage] = useState('');
  const [shareInPanel, setShareInPanel] = useState(false);
  const [sensitiveData, setSensitiveData] = useState('');
  const [emailFile, setEmailFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [lastSubmittedRequest, setLastSubmittedRequest] = useState<SubmittedRequest | null>(null);
  const [status, setStatus] = useState<AnalysisRequestStatus>('idle');
  // Text of an error shown without retry (unreadable email or link, full history), or null for the busy error.
  const [noRetryText, setNoRetryText] = useState<string | null>(null);
  // The whole response, so the result and its recommendations (US-7.1) are always set and cleared together.
  const [analysis, setAnalysis] = useState<MessageAnalysisResponse | null>(null);
  // US-10.3: what was analyzed, only while an entry opened from the history is shown.
  const [analyzedInput, setAnalyzedInput] = useState<string | null>(null);
  // US-10.1: the signed-in user's history; null until loaded.
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [historyError, setHistoryError] = useState(false);
  // US-10.2: the frontend relies on isFull from the backend and never counts entries itself.
  const isHistoryFull = hasSession && history?.isFull === true;

  const loadHistory = useCallback(async (token: string): Promise<void> => {
    try {
      setHistory(await getHistory(token));
      setHistoryError(false);
    } catch {
      setHistoryError(true);
    }
  }, []);

  // Loads the history when the session (and its token) is available; the 30-minute token refresh reloads it too.
  useEffect(() => {
    if (backendToken) {
      void loadHistory(backendToken);
    }
  }, [backendToken, loadHistory]);

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
    setAnalysis(null);
    setAnalyzedInput(null); // US-10.3 AC2
    setStatus('loading');
    try {
      const response = await sendRequest(submitted, backendToken);
      setAnalysis(response);
      setStatus('success');
      // US-10.1 AC4: the new analysis was saved by the backend; reload so it shows first.
      if (backendToken) {
        void loadHistory(backendToken);
      }
    } catch (error) {
      setNoRetryText(noRetryErrorText(submitted, error));
      setStatus('error');
      // US-10.2: after a 409 the history is reloaded, so the forms are blocked by isFull.
      if (error instanceof ApiError && error.status === 409 && backendToken) {
        void loadHistory(backendToken);
      }
    }
  }

  function handleSubmit(): void {
    // The share fields are sent only when checked, so the unchecked body stays { message } (US-1.2 AC1).
    void runAnalysis({
      kind: 'message',
      request: shareInPanel ? { message, shareInPanel: true, sensitiveData } : { message },
    });
  }

  // US-10.1 AC5: show a saved analysis in the result column, as a new result. The form, the last request for
  // "Reintentar", and the history stay. If it cannot be loaded, the history error is shown and the result stays.
  async function handleSelectHistoryEntry(id: number): Promise<void> {
    if (!backendToken) {
      setHistoryError(true);
      return;
    }
    try {
      const entry = await getHistoryEntry(id, backendToken);
      setAnalysis(entry.analysis);
      setAnalyzedInput(entry.analyzedInput);
      setNoRetryText(null);
      setStatus('success');
    } catch {
      setHistoryError(true);
    }
  }

  // US-10.2: delete an entry and reload the history. The result already shown stays, even if it was that entry.
  async function handleDeleteHistoryEntry(id: number): Promise<void> {
    if (!backendToken) {
      setHistoryError(true);
      return;
    }
    try {
      await deleteHistoryEntry(id, backendToken);
      await loadHistory(backendToken);
    } catch {
      setHistoryError(true);
    }
  }

  // Resends the last submitted request (message with its share fields, email, or link), not the current form content.
  function handleRetry(): void {
    if (lastSubmittedRequest !== null) {
      void runAnalysis(lastSubmittedRequest);
    }
  }

  return (
    <main className={hasSession ? 'home home--with-history' : 'home'}>
      {hasSession ? (
        <HistorySidebar
          history={history}
          hasError={historyError || !backendToken}
          isBusy={status === 'loading'}
          onSelectEntry={(id) => void handleSelectHistoryEntry(id)}
          onDeleteEntry={(id) => void handleDeleteHistoryEntry(id)}
        />
      ) : null}
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
      {/* US-9.2: only once the session is known to be missing, so it never flashes for a signed-in user. */}
      {sessionStatus === 'unauthenticated' ? <LoginInvite /> : null}
      <AnalysisInputTabs activeTab={activeTab} onTabChange={handleTabChange}>
        {isHistoryFull ? (
          <p className="history-full-message" data-testid="history-full-message">
            {HISTORY_FULL_TEXT}
          </p>
        ) : null}
        {activeTab === 'message' ? (
          <MessageAnalysisForm
            message={message}
            shareInPanel={shareInPanel}
            sensitiveData={sensitiveData}
            isSubmitting={status === 'loading'}
            isAnalysisBlocked={isHistoryFull}
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
            isAnalysisBlocked={isHistoryFull}
            onEmailFileChange={handleEmailFileChange}
            onSubmit={handleEmailSubmit}
            onClear={handleClearEmail}
          />
        ) : null}
        {activeTab === 'url' ? (
          <UrlAnalysisForm
            url={url}
            isSubmitting={status === 'loading'}
            isAnalysisBlocked={isHistoryFull}
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
            message={noRetryText ?? ANALYSIS_ERROR_TEXT}
            showRetry={noRetryText === null}
            onRetry={handleRetry}
          />
        ) : null}
        {analyzedInput !== null && analysis !== null ? <AnalyzedInputView analyzedInput={analyzedInput} /> : null}
        <AnalysisResultView
          result={analysis?.result ?? null}
          recommendations={analysis?.recommendations ?? []}
          isIdle={status === 'idle'}
        />
      </aside>
    </main>
  );
}
