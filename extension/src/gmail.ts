// US-11.1 (#119): read the email opened in Gmail. See docs/requirements.md, Chrome extension.
//
// Known limitation: Gmail has no public API for the opened email in the page, so this depends on Gmail's page
// attributes and on its "download original" URL, which Google can change. They are defined once, in GMAIL_CONFIG.

export type GmailReadMode = 'check' | 'read';

export interface GmailConfig {
  legacySelector: string; // Opened messages with their hex id.
  legacyIdAttribute: string;
  messageIdSelector: string; // Fallback: opened messages with "#msg-f:<decimal id>".
  messageIdAttribute: string;
  accountPathPattern: string; // Account index in the Gmail URL (/mail/u/<n>/).
  originalUrlTemplate: string; // Raw original of one message; {account} and {messageId} are replaced.
}

export const GMAIL_ORIGIN = 'https://mail.google.com/';

export const GMAIL_CONFIG: GmailConfig = {
  legacySelector: 'div[role="main"] [data-legacy-message-id]',
  legacyIdAttribute: 'data-legacy-message-id',
  messageIdSelector: 'div[role="main"] [data-message-id]',
  messageIdAttribute: 'data-message-id',
  accountPathPattern: '/mail/u/(\\d+)/',
  originalUrlTemplate:
    'https://mail.google.com/mail/u/{account}/?view=att&th={messageId}&attid=0&disp=comp&safe=1&zw',
};

// Runs inside the Gmail tab through chrome.scripting.executeScript, so it must be self-contained: no imports and
// no outer variables; the config and the mode arrive as arguments.
// "check" returns the opened message id; "read" returns the raw original. Any failure returns null.
// In a thread, the last opened message is used (the most recent one).
export async function readOpenedEmail(config: GmailConfig, mode: GmailReadMode): Promise<string | null> {
  try {
    const lastAttribute = (selector: string, attribute: string): string | null => {
      const nodes = document.querySelectorAll(selector);
      const last = nodes.item(nodes.length - 1);
      return last === null ? null : last.getAttribute(attribute);
    };

    let messageId = lastAttribute(config.legacySelector, config.legacyIdAttribute);
    if (messageId === null) {
      const decimalId = lastAttribute(config.messageIdSelector, config.messageIdAttribute)?.match(/(\d+)$/)?.[1];
      messageId = decimalId === undefined ? null : BigInt(decimalId).toString(16);
    }
    if (messageId === null || !/^[0-9a-f]+$/i.test(messageId)) {
      return null;
    }
    if (mode === 'check') {
      return messageId;
    }

    const account = new RegExp(config.accountPathPattern).exec(window.location.pathname)?.[1] ?? '0';
    const url = config.originalUrlTemplate.replace('{account}', account).replace('{messageId}', messageId);
    // Same origin as the Gmail page, so the user's own Gmail session is used; nothing leaves the browser here.
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok || (response.headers.get('content-type') ?? '').includes('text/html')) {
      return null; // An HTML answer is a sign-in or error page, not the original.
    }
    const original = await response.text();
    return original.trim() === '' ? null : original;
  } catch {
    return null;
  }
}

// Runs readOpenedEmail in the given tab. Returns null when the tab cannot be scripted (not Gmail) or reading fails.
export async function readEmailInTab(tabId: number, mode: GmailReadMode): Promise<string | null> {
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: readOpenedEmail,
      args: [GMAIL_CONFIG, mode],
    });
    return typeof injection?.result === 'string' ? injection.result : null;
  } catch {
    return null;
  }
}
