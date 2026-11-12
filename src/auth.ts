// US-9.1: Auth.js configuration (docs/requirements.md, Authentication).
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    // Defaults to the `common` v2.0 issuer, so personal and work or school accounts can sign in.
    MicrosoftEntraID({ issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
});
