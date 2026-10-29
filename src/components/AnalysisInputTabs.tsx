"use client";

import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export type AnalysisInputTab = 'message' | 'email' | 'url';

const PANEL_ID = 'analysis-input-panel';

interface TabDefinition {
  id: AnalysisInputTab;
  label: string;
  icon: ReactNode;
}

// US-5.2 and US-6.1: tab order, labels, and decorative icons.
const TABS: readonly TabDefinition[] = [
  { id: 'message', label: 'Pegar mensaje', icon: <path d="M4 6h16M4 12h12M4 18h8" /> },
  { id: 'email', label: 'Subir archivo .eml', icon: <path d="M12 16V4m0 0L8 8m4-4 4 4M5 15v4h14v-4" /> },
  {
    id: 'url',
    label: 'Pegar link',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
      </>
    ),
  },
];

interface AnalysisInputTabsProps {
  activeTab: AnalysisInputTab;
  onTabChange: (tab: AnalysisInputTab) => void;
  children: ReactNode;
}

// One card with the input tabs; only the active form is rendered inside the tab panel.
export function AnalysisInputTabs({ activeTab, onTabChange, children }: AnalysisInputTabsProps) {
  const tabRefs = useRef<Partial<Record<AnalysisInputTab, HTMLButtonElement | null>>>({});

  function handleTabClick(tab: AnalysisInputTab): void {
    onTabChange(tab);
  }

  // WAI-ARIA tabs pattern: the arrow keys move to the previous or next tab (wrapping) and activate it.
  function handleTabListKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : TABS.length - 1;
    const activeIndex = TABS.findIndex((tab) => tab.id === activeTab);
    const nextTab = TABS[(activeIndex + step) % TABS.length].id;
    onTabChange(nextTab);
    tabRefs.current[nextTab]?.focus();
  }

  return (
    <section className="card input-card">
      <div role="tablist" aria-label="Método de carga" className="tablist" onKeyDown={handleTabListKeyDown}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[tab.id] = element;
            }}
            type="button"
            role="tab"
            id={`${tab.id}-tab`}
            className="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={PANEL_ID}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => handleTabClick(tab.id)}
            data-testid={`${tab.id}-tab`}
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
              {tab.icon}
            </svg>
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={PANEL_ID} aria-labelledby={`${activeTab}-tab`} className="tabpanel">
        {children}
      </div>
    </section>
  );
}
