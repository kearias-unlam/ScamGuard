"use client";

import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export type AnalysisInputTab = 'message' | 'email';

const PANEL_ID = 'analysis-input-panel';

interface AnalysisInputTabsProps {
  activeTab: AnalysisInputTab;
  onTabChange: (tab: AnalysisInputTab) => void;
  children: ReactNode;
}

// US-5.2: one card with two tabs; only the active form is rendered inside the tab panel.
export function AnalysisInputTabs({ activeTab, onTabChange, children }: AnalysisInputTabsProps) {
  const messageTabRef = useRef<HTMLButtonElement>(null);
  const emailTabRef = useRef<HTMLButtonElement>(null);

  function handleMessageTabClick(): void {
    onTabChange('message');
  }

  function handleEmailTabClick(): void {
    onTabChange('email');
  }

  // WAI-ARIA tabs pattern: arrow keys move between the two tabs and activate them.
  function handleTabListKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const nextTab: AnalysisInputTab = activeTab === 'message' ? 'email' : 'message';
    onTabChange(nextTab);
    (nextTab === 'message' ? messageTabRef : emailTabRef).current?.focus();
  }

  return (
    <section className="card input-card">
      <div role="tablist" aria-label="Método de carga" className="tablist" onKeyDown={handleTabListKeyDown}>
        <button
          ref={messageTabRef}
          type="button"
          role="tab"
          id="message-tab"
          className="tab"
          aria-selected={activeTab === 'message'}
          aria-controls={PANEL_ID}
          tabIndex={activeTab === 'message' ? 0 : -1}
          onClick={handleMessageTabClick}
          data-testid="message-tab"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 6h16M4 12h12M4 18h8" />
          </svg>
          Pegar mensaje
        </button>
        <button
          ref={emailTabRef}
          type="button"
          role="tab"
          id="email-tab"
          className="tab"
          aria-selected={activeTab === 'email'}
          aria-controls={PANEL_ID}
          tabIndex={activeTab === 'email' ? 0 : -1}
          onClick={handleEmailTabClick}
          data-testid="email-tab"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 16V4m0 0L8 8m4-4 4 4M5 15v4h14v-4" />
          </svg>
          Subir archivo .eml
        </button>
      </div>
      <div role="tabpanel" id={PANEL_ID} aria-labelledby={`${activeTab}-tab`} className="tabpanel">
        {children}
      </div>
    </section>
  );
}
