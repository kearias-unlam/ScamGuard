'use client';

import { signOut, useSession } from 'next-auth/react';

import { GoogleSignInButton } from '@/components/GoogleSignInButton';

// US-9.1: shown when the provider sends no name.
const DEFAULT_USER_NAME = 'Usuario';

// US-9.1: header session controls. Renders nothing while the session loads, so the header does not flicker.
export function SessionControls() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return null;
  }

  if (status !== 'authenticated') {
    // US-9.2: the header starts the Google sign-in directly; there is no sign-in page.
    return <GoogleSignInButton testId="header-login-button" className="site-header__action" />;
  }

  function handleLogout(): void {
    void signOut({ redirectTo: '/' });
  }

  return (
    <div className="session-controls">
      <span className="session-controls__name" data-testid="user-name">
        {session.user?.name?.trim() || DEFAULT_USER_NAME}
      </span>
      <button
        type="button"
        className="button button--secondary site-header__action"
        data-testid="logout-button"
        onClick={handleLogout}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
