// US-11.1 (#120): popup states and the request to the backend.
// Until US-11.2 (#121, #122) the result is not rendered and backend errors return to "ready" without a text.
import type { EmailAnalysisRequest } from '../../src/types.js';
import { ANALYSIS_LOADING_TEXT } from '../../src/lib/display-texts.js';
import { EMAIL_ANALYSIS_ENDPOINT } from './config.js';
import { GMAIL_ORIGIN, readEmailInTab } from './gmail.js';
import { GMAIL_READ_ERROR_TEXT, NOT_GMAIL_HINT_TEXT } from './texts.js';

type PopupState = 'checking' | 'not-gmail' | 'ready' | 'loading' | 'gmail-error' | 'done';

const analyzeButton = document.querySelector<HTMLButtonElement>('#analyze-email-button');
const hint = document.querySelector<HTMLParagraphElement>('#popup-hint');
const status = document.querySelector<HTMLParagraphElement>('#popup-status');
const errorBox = document.querySelector<HTMLParagraphElement>('#popup-error');

let activeTabId: number | null = null;

function showText(element: HTMLParagraphElement | null, text: string | null): void {
  if (element === null) {
    return;
  }
  element.textContent = text ?? '';
  element.hidden = text === null;
}

function render(state: PopupState): void {
  if (analyzeButton !== null) {
    // AC1: enabled only with an opened Gmail email; AC3: disabled while loading.
    analyzeButton.disabled = !(state === 'ready' || state === 'gmail-error' || state === 'done');
  }
  showText(hint, state === 'not-gmail' ? NOT_GMAIL_HINT_TEXT : null); // AC2
  if (status !== null) {
    status.textContent = state === 'loading' ? ANALYSIS_LOADING_TEXT : ''; // Always present for screen readers.
  }
  showText(errorBox, state === 'gmail-error' ? GMAIL_READ_ERROR_TEXT : null); // AC4
}

async function sendToBackend(emailContent: string): Promise<void> {
  const body: EmailAnalysisRequest = { emailContent };
  // Anonymous request (no Authorization): the backend host permission exempts the popup from CORS.
  await fetch(EMAIL_ANALYSIS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function handleAnalyzeClick(): Promise<void> {
  if (activeTabId === null) {
    return;
  }
  render('loading');
  const original = await readEmailInTab(activeTabId, 'read');
  if (original === null) {
    render('gmail-error'); // AC4: nothing is sent to the backend.
    return;
  }
  try {
    await sendToBackend(original);
  } catch {
    // Network errors are handled with the other backend errors in #122.
  }
  render('done');
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

analyzeButton?.addEventListener('click', () => {
  void handleAnalyzeClick();
});

void checkActiveTab();
