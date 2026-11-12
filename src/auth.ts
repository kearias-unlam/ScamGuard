// US-9.1: Auth.js configuration (docs/requirements.md, Authentication).
import { createHmac } from 'node:crypto';

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

declare module 'next-auth' {
  interface Session {
    backendToken?: string; // HS256 JWT for the backend, sent as Authorization: Bearer (#104)
  }
}

// JWT is declared in @auth/core (next-auth/jwt only re-exports it), so it is augmented there.
declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string; // "<provider>:<provider account id>"
  }
}

const BACKEND_TOKEN_LIFETIME_SECONDS = 60 * 60;

function base64UrlJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

// Signs the backend token with Node's built-in crypto (no JWT dependency in the frontend).
function signBackendToken(userId: string, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlJson({ sub: userId, iat: now, exp: now + BACKEND_TOKEN_LIFETIME_SECONDS });
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    // Defaults to the `common` v2.0 issuer, so personal and work or school accounts can sign in.
    MicrosoftEntraID({ issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    // `account` is present only on sign-in; the user id is kept in the encrypted session cookie afterwards.
    jwt({ token, account }) {
      if (account) {
        token.userId = `${account.provider}:${account.providerAccountId}`;
      }
      return token;
    },
    // Rebuilt every time the session is read, so the 1-hour token is renewed by the client refetch.
    session({ session, token }) {
      const secret = process.env.SCAMGUARD_JWT_SECRET?.trim();
      if (token.userId && secret) {
        session.backendToken = signBackendToken(token.userId, secret);
      }
      return session;
    },
  },
});
