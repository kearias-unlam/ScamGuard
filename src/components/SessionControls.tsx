'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

// US-9.1: shown when the provider sends no name.
const DEFAULT_USER_NAME = 'Usuario';

// US-9.1: header session controls. Renders nothing while the session loads, so the header does not flicker.
export function SessionControls() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return null;
  }

  if (status !== 'authenticated') {
    return (
      <Link href="/login" className="button button--secondary site-header__action" data-testid="login-link">
        Iniciar sesión
      </Link>
    );
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
