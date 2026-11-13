'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';

type LoginProvider = 'google';

// US-9.1: login page. Auth.js sends the user to Google and back to the home page.
// The Microsoft Entra ID provider stays configured in `src/auth.ts`, without a button for now.
export default function LoginPage() {
  function handleLogin(provider: LoginProvider): void {
    void signIn(provider, { redirectTo: '/' });
  }

  return (
    <main className="login-page">
      <h1>Iniciar sesión</h1>
      <div className="card login-card">
        <button
          type="button"
          className="button button--primary login-card__button"
          data-testid="login-google-button"
          onClick={() => handleLogin('google')}
        >
          Continuar con Google
        </button>
      </div>
      <Link href="/" className="button button--secondary" data-testid="login-back-link">
        Volver al análisis
      </Link>
    </main>
  );
}
