"use client";

import Link from 'next/link';
import { useState } from 'react';

import { AnalysisError } from '@/components/AnalysisError';
import { AnalysisResultView } from '@/components/AnalysisResultView';
import { AnalysisStatus, type AnalysisRequestStatus } from '@/components/AnalysisStatus';
import { EmailAnalysisForm } from '@/components/EmailAnalysisForm';
import { MessageAnalysisForm } from '@/components/MessageAnalysisForm';
import { postAnalysis } from '@/lib/api';
import type { AnalysisResult, MessageAnalysisRequest } from '@/types';

export default function HomePage() {
  const [message, setMessage] = useState('');
  const [shareInPanel, setShareInPanel] = useState(false);
  const [sensitiveData, setSensitiveData] = useState('');
  const [emailFile, setEmailFile] = useState<File | null>(null);
  const [lastSubmittedRequest, setLastSubmittedRequest] = useState<MessageAnalysisRequest>({ message: '' });
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
    // US-4.2: wired in #56.
  }

  // Shared by submit and retry; clears the previous result so a failure never shows stale data.
  async function runAnalysis(request: MessageAnalysisRequest): Promise<void> {
    setLastSubmittedRequest(request);
    setResult(null);
    setStatus('loading');
    try {
      const response = await postAnalysis(request);
      setResult(response.result);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  function handleSubmit(): void {
    // The share fields are sent only when checked, so the unchecked body stays { message } (US-1.2 AC1).
    void runAnalysis(shareInPanel ? { message, shareInPanel: true, sensitiveData } : { message });
  }

  // Resends the last submitted request (message and share fields), not the current form content.
  function handleRetry(): void {
    void runAnalysis(lastSubmittedRequest);
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
