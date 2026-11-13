// US-9.2: invite shown on the home page without a session, explaining what signing in is for (Feature 10).
// No button of its own: the header "Continuar con Google" is the only one.
export function LoginInvite() {
  return (
    <section className="card login-invite" aria-labelledby="login-invite-heading" data-testid="login-invite">
      <span className="login-invite__icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      </span>
      <div className="login-invite__body">
        <h2 id="login-invite-heading">Guardá tus análisis</h2>
        <p>Iniciá sesión con Google para guardar tus análisis y volver a verlos cuando quieras.</p>
      </div>
    </section>
  );
}
