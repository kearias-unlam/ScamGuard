// US-5.1: brand header on every page. "ScamGuard" is plain text; each page keeps its own h1.
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <span className="site-logo" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3 5.5 5.8v5.1c0 4.4 2.7 7.9 6.5 9.5 3.8-1.6 6.5-5.1 6.5-9.5V5.8L12 3Z" />
            <path d="m9.2 11.8 1.8 1.8 3.9-4.1" />
          </svg>
        </span>
        <span className="site-brand">ScamGuard</span>
      </div>
    </header>
  );
}
