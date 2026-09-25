"use client";

import { useState } from 'react';

import { AnalysisError } from '@/components/AnalysisError';
import { AnalysisResultView } from '@/components/AnalysisResultView';
import { AnalysisStatus, type AnalysisRequestStatus } from '@/components/AnalysisStatus';
import { MessageAnalysisForm } from '@/components/MessageAnalysisForm';
import { postAnalysis } from '@/lib/api';
import type { AnalysisResult } from '@/types';

export default function HomePage() {
  const [message, setMessage] = useState('');
  const [lastSubmittedMessage, setLastSubmittedMessage] = useState('');
  const [status, setStatus] = useState<AnalysisRequestStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  function handleMessageChange(nextMessage: string): void {
    setMessage(nextMessage);
  }

  // Shared by submit and retry; clears the previous result so a failure never shows stale data.
  async function runAnalysis(messageToAnalyze: string): Promise<void> {
    setLastSubmittedMessage(messageToAnalyze);
    setResult(null);
    setStatus('loading');
    try {
      const response = await postAnalysis({ message: messageToAnalyze });
      setResult(response.result);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  function handleSubmit(): void {
    void runAnalysis(message);
  }

  // Resends the last submitted message, not the current field content.
  function handleRetry(): void {
    void runAnalysis(lastSubmittedMessage);
  }

  return (
    <main>
      <h1>ScamGuard</h1>
      <MessageAnalysisForm
        message={message}
        isSubmitting={status === 'loading'}
        onMessageChange={handleMessageChange}
        onSubmit={handleSubmit}
      />
      <AnalysisStatus status={status} />
      {status === 'error' ? <AnalysisError onRetry={handleRetry} /> : null}
      <AnalysisResultView result={result} isIdle={status === 'idle'} />
    </main>
  );
}
