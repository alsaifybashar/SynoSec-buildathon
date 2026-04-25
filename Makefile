.PHONY: help dev build test database dev-services docker-up docker-down docker-logs smoke-seeded-sandbox free-dev-ports wait-for-postgres check-docker-compose

ifneq (,$(wildcard .env))
include .env
export
endif

BACKEND_PORT ?= 3001
VITE_DEV_PORT ?= 5173
LOCAL_ENABLED ?= $(if $(LOCAL_ENABHLED),$(LOCAL_ENABHLED),FALSE)

help:
	@printf "\033[1;32m╔══════════════════════════════════╗\033[0m\n"
	@printf "\033[1;32m║     SynoSec AI PenTest Tool      ║\033[0m\n"
	@printf "\033[1;32m╚══════════════════════════════════╝\033[0m\n"
	@printf "\033[33m  make docker-up\033[0m   Start full stack (Docker Compose)\n"
	@printf "\033[33m  make docker-down\033[0m Stop and remove containers\n"
	@printf "\033[33m  make docker-logs\033[0m Follow all container logs\n"
	@printf "\033[35m  make database\033[0m    Start Postgres, reset persisted app data, then generate Prisma client, push schema, and seed app data\n"
	@printf "\033[35m  make dev-services\033[0m Start Docker-backed dev dependencies (Postgres, target, optional Ollama when enabled)\n"
	@printf "\033[36m  make test\033[0m        Run workspace tests plus seeded sandbox smoke validation\n"
	@printf "\033[33m  make dev\033[0m         Start local dev against Docker-backed infra without auto-enabling local Ollama\n"
	@printf "\033[33m  make build\033[0m       Build all workspace packages\n"
	@printf "\033[33m  make smoke-seeded-sandbox\033[0m  Run seeded DB-backed tools through connector execute-mode sandbox\n"

DOCKER_COMPOSE := $(shell \
	if docker compose version >/dev/null 2>&1; then \
		printf '%s' 'docker compose'; \
	elif command -v docker-compose >/dev/null 2>&1; then \
		printf '%s' 'docker-compose'; \
	elif [ -f "./docker-compose" ]; then \
		printf '%s' './docker-compose'; \
	else \
		printf '%s' 'docker compose'; \
	fi)

check-docker-compose:
	@if [ "$(DOCKER_COMPOSE)" = "docker compose" ] && ! docker compose version >/dev/null 2>&1; then \
		printf "\033[1;31mError: docker compose is not installed.\033[0m\n"; \
		printf "Please install the Docker Compose plugin or docker-compose binary.\n"; \
		exit 1; \
	fi

docker-up:
	@$(MAKE) check-docker-compose
	@set -e; \
	local_enabled=$$(printf '%s' "$${LOCAL_ENABLED:-$${LOCAL_ENABHLED:-FALSE}}" | tr '[:upper:]' '[:lower:]'); \
	if [ "$$local_enabled" = "true" ]; then \
		$(DOCKER_COMPOSE) --profile local-llm up --build -d --remove-orphans; \
	else \
		$(DOCKER_COMPOSE) up --build -d --remove-orphans; \
	fi
	@printf "\n\033[1;32m✓ SynoSec started!\033[0m\n"
	@printf "  Frontend: \033[36mhttp://localhost:%s\033[0m\n" "$${VITE_DEV_PORT:-5173}"
	@printf "  Backend:  \033[36mhttp://localhost:%s\033[0m\n" "$${BACKEND_PORT:-3001}"
	@printf "  Connector dispatch: \033[36m%s\033[0m\n" "$${TOOL_EXECUTION_MODE:-connector}"
	@printf "  Target:   \033[36mhttp://localhost:8888\033[0m\n"
	@if [ "$$(printf '%s' "$${LOCAL_ENABLED:-$${LOCAL_ENABHLED:-FALSE}}" | tr '[:upper:]' '[:lower:]')" = "true" ]; then \
		printf "  Local LLM: \033[36mhttp://localhost:11434\033[0m\n"; \
	fi

docker-down:
	$(DOCKER_COMPOSE) down --remove-orphans

docker-logs:
	$(DOCKER_COMPOSE) logs -f

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
	@$(MAKE) check-docker-compose
	@set -e; \
	local_enabled=$$(printf '%s' "$${LOCAL_ENABLED:-$${LOCAL_ENABHLED:-FALSE}}" | tr '[:upper:]' '[:lower:]'); \
	if [ "$$local_enabled" = "false" ]; then \
		$(DOCKER_COMPOSE) up -d postgres vulnerable-target; \
	else \
		model_name=$${LLM_LOCAL_MODEL:-qwen3:1.7b}; \
		$(DOCKER_COMPOSE) rm -sf ollama ollama-init >/dev/null 2>&1 || true; \
		$(DOCKER_COMPOSE) up -d postgres vulnerable-target ollama; \
		until [ "$$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' synosec-buildathon-ollama-1 2>/dev/null)" = "healthy" ]; do \
			sleep 1; \
		done; \
		if $(DOCKER_COMPOSE) exec -T ollama ollama list | awk 'NR > 1 { print $$1 }' | grep -Fx "$$model_name" >/dev/null 2>&1; then \
			printf "Ollama model %s already present, skipping pull\n" "$$model_name"; \
		else \
			printf "Ollama model %s missing, starting background pull\n" "$$model_name"; \
			$(DOCKER_COMPOSE) exec -d ollama ollama pull "$$model_name" >/dev/null; \
		fi; \
	fi

database:
	@$(MAKE) check-docker-compose
	$(DOCKER_COMPOSE) up -d postgres
	$(MAKE) wait-for-postgres
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:generate
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend exec prisma db push --force-reset
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:seed

wait-for-postgres:
	@set -e; \
	container_id=$$($(DOCKER_COMPOSE) ps -q postgres); \
	if [ -z "$$container_id" ]; then \
		printf "Postgres container not found\n" >&2; \
		exit 1; \
	fi; \
	printf "Waiting for Postgres to become healthy"; \
	until [ "$$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' "$$container_id")" = "healthy" ]; do \
		printf "."; \
		sleep 1; \
	done; \
	printf " ready\n"

build:
	pnpm --filter @synosec/contracts build && pnpm build

test:
	pnpm test
	$(MAKE) smoke-seeded-sandbox

smoke-seeded-sandbox:
	bash scripts/seeded-sandbox-smoke.sh
