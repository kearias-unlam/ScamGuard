// US-11.1 (#120): popup states and the request to the backend. US-11.2: the result (#121), errors and retry (#122).
import type { EmailAnalysisRequest, MessageAnalysisResponse } from '../../src/types.js';
import {
  ANALYSIS_ERROR_TEXT,
  ANALYSIS_LOADING_TEXT,
  RETRY_TEXT,
  UNREADABLE_EMAIL_ERROR_TEXT,
} from '../../src/lib/display-texts.js';
import { EMAIL_ANALYSIS_ENDPOINT } from './config.js';
import { GMAIL_ORIGIN, readEmailInTab } from './gmail.js';
import { clearResult, renderResult } from './result-view.js';
import { GMAIL_READ_ERROR_TEXT, NOT_GMAIL_HINT_TEXT } from './texts.js';

type PopupState =
  | 'checking'
  | 'not-gmail'
  | 'ready'
  | 'loading'
  | 'gmail-error'
  | 'unreadable-error'
  | 'busy-error'
  | 'done';

// The backend answers 422 when the email cannot be read (US-4.2); retrying cannot help (US-11.2 AC2).
const UNREADABLE_STATUS = 422;

const ERROR_TEXTS: Partial<Record<PopupState, string>> = {
  'gmail-error': GMAIL_READ_ERROR_TEXT, // US-11.1 AC4
  'unreadable-error': UNREADABLE_EMAIL_ERROR_TEXT, // US-11.2 AC2
  'busy-error': ANALYSIS_ERROR_TEXT, // US-11.2 AC3
};

const analyzeButton = document.querySelector<HTMLButtonElement>('#analyze-email-button');
const retryButton = document.querySelector<HTMLButtonElement>('#retry-analysis-button');
const hint = document.querySelector<HTMLParagraphElement>('#popup-hint');
const status = document.querySelector<HTMLParagraphElement>('#popup-status');
const errorBox = document.querySelector<HTMLParagraphElement>('#popup-error');
const resultBox = document.querySelector<HTMLElement>('#analysis-result');

let activeTabId: number | null = null;
// The original last sent, so "Reintentar" resends the same email without reading Gmail again.
let lastOriginal: string | null = null;

function showText(element: HTMLParagraphElement | null, text: string | null): void {
  if (element === null) {
    return;
  }
  element.textContent = text ?? '';
  element.hidden = text === null;
}

function render(state: PopupState): void {
  if (analyzeButton !== null) {
    // US-11.1 AC1: enabled only with an opened Gmail email; AC3: disabled while loading.
    analyzeButton.disabled = state === 'checking' || state === 'not-gmail' || state === 'loading';
  }
  if (retryButton !== null) {
    retryButton.hidden = state !== 'busy-error'; // US-11.2 AC2 and AC3
  }
  showText(hint, state === 'not-gmail' ? NOT_GMAIL_HINT_TEXT : null); // US-11.1 AC2
  if (status !== null) {
    status.textContent = state === 'loading' ? ANALYSIS_LOADING_TEXT : ''; // Always present for screen readers.
  }
  showText(errorBox, ERROR_TEXTS[state] ?? null);
}

// Throws on a network error; returns the HTTP status with the analysis when it is 2xx.
async function sendToBackend(emailContent: string): Promise<{ status: number; analysis: MessageAnalysisResponse | null }> {
  const body: EmailAnalysisRequest = { emailContent };
  // Anonymous request (no Authorization): the backend host permission exempts the popup from CORS.
  const response = await fetch(EMAIL_ANALYSIS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    analysis: response.ok ? ((await response.json()) as MessageAnalysisResponse) : null,
  };
}

async function analyze(original: string): Promise<void> {
  lastOriginal = original;
  render('loading');
  try {
    const { status: httpStatus, analysis } = await sendToBackend(original);
    if (analysis !== null && resultBox !== null) {
      renderResult(resultBox, analysis); // US-11.2 AC1
      render('done');
      return;
    }
    render(httpStatus === UNREADABLE_STATUS ? 'unreadable-error' : 'busy-error');
  } catch {
    render('busy-error'); // Network error.
  }
}

async function handleAnalyzeClick(): Promise<void> {
  if (activeTabId === null) {
    return;
  }
  if (resultBox !== null) {
    clearResult(resultBox); // A new analysis never shows the previous result.
  }
  render('loading');
  const original = await readEmailInTab(activeTabId, 'read');
  if (original === null) {
    render('gmail-error'); // US-11.1 AC4: nothing is sent to the backend.
    return;
  }
  await analyze(original);
}

async function handleRetryClick(): Promise<void> {
  if (lastOriginal !== null) {
    await analyze(lastOriginal);
  }
}

async function checkActiveTab(): Promise<void> {
  render('checking');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // Without the "tabs" permission, tab.url is only known for Gmail (host permission); elsewhere it is undefined.
  if (tab?.id === undefined || !tab.url?.startsWith(GMAIL_ORIGIN)) {
    render('not-gmail');
    return;
  }
  activeTabId = tab.id;
  const openedMessageId = await readEmailInTab(tab.id, 'check');
  render(openedMessageId === null ? 'not-gmail' : 'ready');
}

if (retryButton !== null) {
  retryButton.textContent = RETRY_TEXT;
}
analyzeButton?.addEventListener('click', () => {
  void handleAnalyzeClick();
});
retryButton?.addEventListener('click', () => {
  void handleRetryClick();
});

void checkActiveTab();
