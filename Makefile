.PHONY: help dev build test database dev-services docker-up docker-down docker-logs seed smoke-e2e free-dev-ports

ifneq (,$(wildcard .env))
include .env
export
endif

BACKEND_PORT ?= 3001
VITE_DEV_PORT ?= 5173
LOCAL_ENABHLED ?= TRUE

help:
	@printf "\033[1;32m╔══════════════════════════════════╗\033[0m\n"
	@printf "\033[1;32m║     SynoSec AI PenTest Tool      ║\033[0m\n"
	@printf "\033[1;32m╚══════════════════════════════════╝\033[0m\n"
	@printf "\033[33m  make docker-up\033[0m   Start full stack (Docker Compose)\n"
	@printf "\033[33m  make docker-down\033[0m Stop and remove containers\n"
	@printf "\033[33m  make docker-logs\033[0m Follow all container logs\n"
	@printf "\033[35m  make database\033[0m    Start Postgres, reset persisted app data, then generate Prisma client, push schema, and seed app data\n"
	@printf "\033[35m  make dev-services\033[0m Start Docker-backed dev dependencies (Postgres, target, optional Ollama)\n"
	@printf "\033[36m  make test\033[0m        Run tests for all workspace services\n"
	@printf "\033[33m  make dev\033[0m         Start local dev against Docker-backed infra\n"
	@printf "\033[33m  make build\033[0m       Build all workspace packages\n"
	@printf "\033[33m  make seed\033[0m        Seed demo data into running backend\n"
	@printf "\033[33m  make smoke-e2e\033[0m  Run the Docker E2E smoke scan and print workflow evidence\n"

docker-up:
	docker compose up --build -d --remove-orphans
	@printf "\n\033[1;32m✓ SynoSec started!\033[0m\n"
	@printf "  Frontend: \033[36mhttp://localhost:%s\033[0m\n" "$${VITE_DEV_PORT:-5173}"
	@printf "  Backend:  \033[36mhttp://localhost:%s\033[0m\n" "$${BACKEND_PORT:-3001}"
	@printf "  Connector dispatch: \033[36m%s\033[0m\n" "$${TOOL_EXECUTION_MODE:-connector}"
	@printf "  Target:   \033[36mhttp://localhost:8888\033[0m\n"

docker-down:
	docker compose down --remove-orphans

docker-logs:
	docker compose logs -f

dev:
	$(MAKE) free-dev-ports
	$(MAKE) dev-services
	$(MAKE) database
	pnpm dev

free-dev-ports:
	@set -e; \
	for port in $(BACKEND_PORT) $(VITE_DEV_PORT); do \
		pids=$$(lsof -tiTCP:$$port -sTCP:LISTEN 2>/dev/null || true); \
		if [ -n "$$pids" ]; then \
			printf "Freeing port %s (PID%s %s)\n" "$$port" "$$( [ $$(printf '%s\n' "$$pids" | wc -w) -gt 1 ] && printf s )" "$$pids"; \
			kill $$pids; \
			sleep 1; \
			stale_pids=$$(lsof -tiTCP:$$port -sTCP:LISTEN 2>/dev/null || true); \
			if [ -n "$$stale_pids" ]; then \
				printf "Force killing port %s listener%s %s\n" "$$port" "$$( [ $$(printf '%s\n' "$$stale_pids" | wc -w) -gt 1 ] && printf s )" "$$stale_pids"; \
				kill -9 $$stale_pids; \
			fi; \
		fi; \
	done

dev-services:
	@set -e; \
	local_enabled=$$(printf '%s' "$${LOCAL_ENABHLED:-TRUE}" | tr '[:upper:]' '[:lower:]'); \
	if [ "$$local_enabled" = "false" ]; then \
		docker compose up -d postgres vulnerable-target; \
	else \
		model_name=$${LLM_LOCAL_MODEL:-qwen3:1.7b}; \
		docker compose rm -sf ollama ollama-init >/dev/null 2>&1 || true; \
		docker compose up -d postgres vulnerable-target ollama; \
		until [ "$$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' synosec-buildathon-ollama-1 2>/dev/null)" = "healthy" ]; do \
			sleep 1; \
		done; \
		if docker compose exec -T ollama ollama list | awk 'NR > 1 { print $$1 }' | grep -Fx "$$model_name" >/dev/null 2>&1; then \
			printf "Ollama model %s already present, skipping pull\n" "$$model_name"; \
		else \
			printf "Ollama model %s missing, starting background pull\n" "$$model_name"; \
			docker compose exec -d ollama ollama pull "$$model_name" >/dev/null; \
		fi; \
	fi

database:
	docker compose up -d postgres
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:generate
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend exec prisma db push --accept-data-loss
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:seed

build:
	pnpm --filter @synosec/contracts build && pnpm build

test:
	pnpm test

seed:
	curl -s -X POST http://localhost:$${BACKEND_PORT:-3001}/api/scan/seed | python3 -m json.tool

smoke-e2e:
	bash scripts/e2e-smoke.sh
