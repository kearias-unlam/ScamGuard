import type { ReactNode } from 'react';

// Display-only mapping from the indicator type (AI contract) to a decorative icon (US-5.1).
const ICON_PATHS: Record<string, ReactNode> = {
  urgency: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  personal_data_request: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  suspicious_link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
  impersonation: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16a3 3 0 0 1 6 0M15 10h3M15 14h3" />
    </>
  ),
  writing_errors: (
    <>
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14 8 3 3" />
    </>
  ),
  unrealistic_promise: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="1" />
      <path d="M3 9h18M12 9v11M12 9c-1.5-3-5-3.5-5-1.5S10 9 12 9Zm0 0c1.5-3 5-3.5 5-1.5S14 9 12 9Z" />
    </>
  ),
  payment_request: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  sender_mismatch: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </>
  ),
  failed_authentication: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 7.5-2" />
    </>
  ),
  deceptive_link: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  dangerous_attachment: (
    <>
      <path d="M6 3h8l4 4v14H6V3Z" />
      <path d="M14 3v4h4M12 11v4M12 18v.1" />
    </>
  ),
};

// Generic alert for any type outside the fixed list.
const FALLBACK_ICON: ReactNode = (
  <>
    <path d="M12 4 3.8 19h16.4L12 4Z" />
    <path d="M12 9v4m0 3v.1" />
  </>
);

interface IndicatorIconProps {
  type: string;
}

export function IndicatorIcon({ type }: IndicatorIconProps) {
  return (
    <span className="indicator-icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICON_PATHS[type] ?? FALLBACK_ICON}
      </svg>
    </span>
  );
}
