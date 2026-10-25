.PHONY: start-backend start-frontend start-scamguard

start-backend:
	@echo "Ejecutando backend..."
	mkdir -p logs && \
	cd backend && \
	source .venv/bin/activate && \
	set -a; source .env;set +a && \
	uvicorn app.main:app --reload --port 8000 > $(PWD)/logs/backend.log 2>&1 &

start-frontend:
	@echo "Ejecutando frontend..."
	npm run dev > logs/frontend.log 2>&1 &

start-scamguard: start-backend start-frontend
	@echo "ScamGuard está corriendo en http://localhost:3000"

stop-scamguard:
	@echo "Deteniendo ScamGuard..."
	@pkill -f "uvicorn app.main:app" || true
	@pkill -f "npm run dev" || true