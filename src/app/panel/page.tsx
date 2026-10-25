"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CriticalTopicList } from '@/components/CriticalTopicList';
import { PanelError } from '@/components/PanelError';
import { getCriticalMessages } from '@/lib/api';
import type { CriticalTopic } from '@/types';

type PanelRequestStatus = 'loading' | 'error' | 'success';

export default function PanelPage() {
  const [status, setStatus] = useState<PanelRequestStatus>('loading');
  const [topics, setTopics] = useState<CriticalTopic[]>([]);
  // Incremented by retry to run the effect again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Strict Mode runs effects twice in development; ignore responses from a discarded run.
    let ignore = false;
    setStatus('loading');
    getCriticalMessages()
      .then((response) => {
        if (!ignore) {
          setTopics(response.topics);
          setStatus('success');
        }
      })
      .catch(() => {
        if (!ignore) {
          setStatus('error');
        }
      });
    return () => {
      ignore = true;
    };
  }, [attempt]);

  function handleRetry(): void {
    setAttempt((current) => current + 1);
  }

  return (
    <main>
      <h1>Mensajes críticos</h1>
      <Link href="/" data-testid="panel-back-link">
        Volver al análisis
      </Link>
      {/* Always rendered so screen readers announce text changes. */}
      <p role="status" className="analysis-status" data-testid="panel-status">
        {status === 'loading' ? 'Cargando mensajes críticos...' : null}
      </p>
      {status === 'error' ? <PanelError onRetry={handleRetry} /> : null}
      {status === 'success' ? <CriticalTopicList topics={topics} /> : null}
    </main>
  );
}
