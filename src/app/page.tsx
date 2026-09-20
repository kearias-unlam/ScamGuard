"use client";

import { useState } from 'react';

import { AnalysisResultView } from '@/components/AnalysisResultView';
import { AnalysisStatus } from '@/components/AnalysisStatus';
import { MessageAnalysisForm } from '@/components/MessageAnalysisForm';
import { getAnalysisEndpoint } from '@/lib/api';
import type { AnalysisResult } from '@/types';

export default function HomePage() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [result] = useState<AnalysisResult | null>(null);

  function handleMessageChange(nextMessage: string): void {
    setMessage(nextMessage);
  }

  function handleSubmit(): void {
    setStatus('loading');
    void getAnalysisEndpoint();
    setStatus('success');
  }

  return (
    <main>
      <h1>ScamGuard</h1>
      <MessageAnalysisForm
        message={message}
        onMessageChange={handleMessageChange}
        onSubmit={handleSubmit}
      />
      <AnalysisStatus status={status} />
      <AnalysisResultView result={result} />
    </main>
  );
}
