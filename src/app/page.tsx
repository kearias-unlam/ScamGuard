"use client";

import Link from 'next/link';
import { useState } from 'react';

import { AnalysisError } from '@/components/AnalysisError';
import { AnalysisResultView } from '@/components/AnalysisResultView';
import { AnalysisStatus, type AnalysisRequestStatus } from '@/components/AnalysisStatus';
import { EmailAnalysisForm } from '@/components/EmailAnalysisForm';
import { MessageAnalysisForm } from '@/components/MessageAnalysisForm';
import { postAnalysis, postEmailAnalysis } from '@/lib/api';
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

export default function HomePage() {
  const [message, setMessage] = useState('');
  const [shareInPanel, setShareInPanel] = useState(false);
  const [sensitiveData, setSensitiveData] = useState('');
  const [emailFile, setEmailFile] = useState<File | null>(null);
  const [lastSubmittedRequest, setLastSubmittedRequest] = useState<SubmittedRequest | null>(null);
  const [status, setStatus] = useState<AnalysisRequestStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);

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
    } catch {
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
    <main>
      <h1>ScamGuard</h1>
      <Link href="/panel" className="button button--secondary" data-testid="panel-link">
        Ver mensajes críticos
      </Link>
      <MessageAnalysisForm
        message={message}
        shareInPanel={shareInPanel}
        sensitiveData={sensitiveData}
        isSubmitting={status === 'loading'}
        onMessageChange={handleMessageChange}
        onShareInPanelChange={handleShareInPanelChange}
        onSensitiveDataChange={handleSensitiveDataChange}
        onSubmit={handleSubmit}
      />
      <EmailAnalysisForm
        emailFile={emailFile}
        isSubmitting={status === 'loading'}
        onEmailFileChange={handleEmailFileChange}
        onSubmit={handleEmailSubmit}
      />
      <AnalysisStatus status={status} />
      {status === 'error' ? <AnalysisError onRetry={handleRetry} /> : null}
      <AnalysisResultView result={result} isIdle={status === 'idle'} />
    </main>
  );
}
