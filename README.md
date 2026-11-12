# ScamGuard

## Backend

Requires Python 3.14. Run from `backend/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in the Azure OpenAI values
set -a; source .env; set +a
uvicorn app.main:app --reload --port 8000
```

The backend reads configuration with `os.environ` only (no python-dotenv), so load `.env` into the shell before starting uvicorn. Pytest does not need `.env`; the AI client is stubbed.

Run tests: `pytest` (from `backend/` with the venv active).

The frontend calls `http://localhost:8000` by default (`NEXT_PUBLIC_API_BASE_URL`); CORS allows `http://localhost:3000`.

## Login with Google and Microsoft (Feature 9)

Login is optional: without these values the app works as before, signed out. Copy `.env.example` to `.env.local` in the repository root and fill it in:

1. `AUTH_SECRET`: run `openssl rand -base64 32`.
2. Google: in Google Cloud Console, APIs & Services > Credentials, create an OAuth client ID of type "Web application" with the authorized redirect URI `http://localhost:3000/api/auth/callback/google`. Copy its ID and secret to `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
3. Microsoft: in the Azure portal, App registrations > New registration, choose "Accounts in any organizational directory and personal Microsoft accounts" and add the Web redirect URI `http://localhost:3000/api/auth/callback/microsoft-entra-id`. Copy the Application (client) ID to `AUTH_MICROSOFT_ENTRA_ID_ID`, create a client secret (Certificates & secrets) for `AUTH_MICROSOFT_ENTRA_ID_SECRET`, and keep `AUTH_MICROSOFT_ENTRA_ID_ISSUER` as `https://login.microsoftonline.com/common/v2.0`.
4. `SCAMGUARD_JWT_SECRET`: run `openssl rand -base64 32` and put the same value in `.env.local` and in `backend/.env`.

Some universities require an administrator to approve a new app before their Microsoft 365 accounts can sign in; try a university account early.

## Gmail extension (Feature 11)

A Chrome extension (Manifest V3) in `extension/` that analyzes the email opened in Gmail with `POST /analysis/email`. It is loaded unpacked; it is not published in the Chrome Web Store.

1. Build it from the repository root: `npm run build:extension` (compiles `extension/src/` with `tsc` to `extension/dist/`; run it again after every change).
2. Start the backend (see above); the extension calls `http://localhost:8000` (`extension/src/config.ts`, repeated in `host_permissions` of `extension/manifest.json`).
3. In Chrome, open `chrome://extensions`, turn on "Developer mode", click "Load unpacked", and choose the `extension/` folder. After a rebuild, click the reload icon of the extension.
4. Open an email in Gmail and click the ScamGuard icon in the toolbar.

To debug the popup, right-click it and choose "Inspect". The icons in `extension/icons/` were generated once from `shield.svg` with the macOS tools `qlmanage` and `sips`.
