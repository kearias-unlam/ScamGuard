'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';

type LoginProvider = 'google' | 'microsoft-entra-id';

// US-9.1: login page. Auth.js sends the user to Google or Microsoft and back to the home page.
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
        <button
          type="button"
          className="button button--primary login-card__button"
          data-testid="login-microsoft-button"
          onClick={() => handleLogin('microsoft-entra-id')}
        >
          Continuar con Microsoft
        </button>
      </div>
      <Link href="/" className="button button--secondary" data-testid="login-back-link">
        Volver al análisis
      </Link>
    </main>
  );
}
