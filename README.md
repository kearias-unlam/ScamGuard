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
