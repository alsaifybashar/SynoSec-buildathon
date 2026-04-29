.PHONY: help dev build test database docker-database dev-services docker-up docker-up-build docker-down docker-logs smoke-seeded-sandbox free-dev-ports wait-for-postgres wait-for-service-health check-docker-compose

ifneq (,$(wildcard .env))
include .env
export
endif

BACKEND_PORT ?= 3001
VITE_DEV_PORT ?= 5173
LOCAL_ENABLED ?= FALSE

help:
	@printf "\033[1;32m╔══════════════════════════════════╗\033[0m\n"
	@printf "\033[1;32m║     SynoSec AI PenTest Tool      ║\033[0m\n"
	@printf "\033[1;32m╚══════════════════════════════════╝\033[0m\n"
	@printf "\033[33m  make docker-up\033[0m   Start full stack (Docker Compose) without rebuilding unchanged images\n"
	@printf "\033[33m  make docker-up-build\033[0m Rebuild images, then start full stack\n"
	@printf "\033[33m  make docker-down\033[0m Stop and remove containers\n"
	@printf "\033[33m  make docker-logs\033[0m Follow all container logs\n"
	@printf "\033[33m  CONNECTOR_DOCKER_TARGET\033[0m Select connector image profile (default: connector-dev-web)\n"
	@printf "\033[35m  make database\033[0m    Start Postgres, reset persisted app data, then generate Prisma client, push schema, and seed app data\n"
	@printf "\033[35m  make dev-services\033[0m Start Docker-backed dev dependencies (Postgres, target, optional Ollama when enabled)\n"
	@printf "\033[36m  make test\033[0m        Run workspace tests plus seeded sandbox smoke validation\n"
	@printf "\033[33m  make dev\033[0m         Start local dev against Docker-backed infra without auto-enabling local Ollama\n"
	@printf "\033[33m  make build\033[0m       Build all workspace packages\n"
	@printf "\033[33m  make smoke-seeded-sandbox\033[0m  Run seeded DB-backed tools through connector execute-mode sandbox\n"

DOCKER_COMPOSE := $(shell \
	if timeout 5s docker compose version >/dev/null 2>&1; then \
		printf '%s' 'docker compose'; \
	elif command -v docker-compose >/dev/null 2>&1 && timeout 5s docker-compose version >/dev/null 2>&1; then \
		printf '%s' 'docker-compose'; \
	elif [ -x "./docker-compose" ] && timeout 5s ./docker-compose version >/dev/null 2>&1; then \
		printf '%s' './docker-compose'; \
	else \
		printf '%s' ''; \
	fi)

check-docker-compose:
	@if [ -z "$(DOCKER_COMPOSE)" ]; then \
		printf "\033[1;31mError: no working Docker Compose command was found.\033[0m\n"; \
		printf "Tried: docker compose, docker-compose, and ./docker-compose.\n"; \
		printf "This machine currently has broken Docker CLI plugins.\n"; \
		exit 1; \
	fi
	@if ! timeout 5s $(DOCKER_COMPOSE) version >/dev/null 2>&1; then \
		printf "\033[1;31mError: %s is not available.\033[0m\n" "$(DOCKER_COMPOSE)"; \
		printf "Please install a working Docker Compose plugin or docker-compose binary.\n"; \
		exit 1; \
	fi

docker-up: check-docker-compose
	@set -e; \
	local_enabled=$$(printf '%s' "$${LOCAL_ENABLED:-FALSE}" | tr '[:upper:]' '[:lower:]'); \
	if [ "$$local_enabled" = "true" ]; then \
		$(DOCKER_COMPOSE) --profile local-llm up -d --remove-orphans postgres vulnerable-target full-stack-target ollama ollama-init backend connector frontend; \
	else \
		$(DOCKER_COMPOSE) up -d --remove-orphans postgres vulnerable-target full-stack-target backend connector frontend; \
	fi
	@$(MAKE) wait-for-service-health SERVICE=postgres
	@$(MAKE) wait-for-service-health SERVICE=backend
	@$(MAKE) wait-for-service-health SERVICE=frontend
	@set -e; \
	local_enabled=$$(printf '%s' "$${LOCAL_ENABLED:-FALSE}" | tr '[:upper:]' '[:lower:]'); \
	if [ "$$local_enabled" = "true" ]; then \
		$(MAKE) wait-for-service-health SERVICE=ollama; \
	fi
	@printf "\n\033[1;32m✓ SynoSec started!\033[0m\n"
	@printf "  Frontend: \033[36mhttp://localhost:%s\033[0m\n" "$${VITE_DEV_PORT:-5173}"
	@printf "  Backend:  \033[36mhttp://localhost:%s\033[0m\n" "$${BACKEND_PORT:-3001}"
	@printf "  Connector dispatch: \033[36m%s\033[0m\n" "$${TOOL_EXECUTION_MODE:-connector}"
	@printf "  Connector image: \033[36m%s\033[0m\n" "$${CONNECTOR_DOCKER_TARGET:-connector-dev-web}"
	@printf "  Targets:  \033[36mhttp://localhost:8888\033[0m and \033[36mhttp://localhost:8891\033[0m\n"
	@if [ "$$(printf '%s' "$${LOCAL_ENABLED:-FALSE}" | tr '[:upper:]' '[:lower:]')" = "true" ]; then \
		printf "  Local LLM: \033[36mhttp://localhost:11434\033[0m\n"; \
	fi

docker-up-build: check-docker-compose
	@set -e; \
	local_enabled=$$(printf '%s' "$${LOCAL_ENABLED:-FALSE}" | tr '[:upper:]' '[:lower:]'); \
	if [ "$$local_enabled" = "true" ]; then \
		$(DOCKER_COMPOSE) --profile local-llm up --build -d --remove-orphans postgres vulnerable-target full-stack-target ollama ollama-init backend connector frontend; \
	else \
		$(DOCKER_COMPOSE) up --build -d --remove-orphans postgres vulnerable-target full-stack-target backend connector frontend; \
	fi
	@$(MAKE) wait-for-service-health SERVICE=postgres
	@$(MAKE) wait-for-service-health SERVICE=backend
	@$(MAKE) wait-for-service-health SERVICE=frontend
	@set -e; \
	local_enabled=$$(printf '%s' "$${LOCAL_ENABLED:-FALSE}" | tr '[:upper:]' '[:lower:]'); \
	if [ "$$local_enabled" = "true" ]; then \
		$(MAKE) wait-for-service-health SERVICE=ollama; \
	fi
	@printf "\n\033[1;32m✓ SynoSec started!\033[0m\n"
	@printf "  Frontend: \033[36mhttp://localhost:%s\033[0m\n" "$${VITE_DEV_PORT:-5173}"
	@printf "  Backend:  \033[36mhttp://localhost:%s\033[0m\n" "$${BACKEND_PORT:-3001}"
	@printf "  Connector dispatch: \033[36m%s\033[0m\n" "$${TOOL_EXECUTION_MODE:-connector}"
	@printf "  Connector image: \033[36m%s\033[0m\n" "$${CONNECTOR_DOCKER_TARGET:-connector-dev-web}"
	@printf "  Targets:  \033[36mhttp://localhost:8888\033[0m and \033[36mhttp://localhost:8891\033[0m\n"
	@if [ "$$(printf '%s' "$${LOCAL_ENABLED:-FALSE}" | tr '[:upper:]' '[:lower:]')" = "true" ]; then \
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
	repo_dir="$$(pwd)"; \
	seen_pgids=""; \
	for port in $(BACKEND_PORT) $(VITE_DEV_PORT); do \
		pids=$$(lsof -tiTCP:$$port -sTCP:LISTEN 2>/dev/null || true); \
		if [ -n "$$pids" ]; then \
			printf "Freeing port %s (PID%s %s)\n" "$$port" "$$( [ $$(printf '%s\n' "$$pids" | wc -w) -gt 1 ] && printf s )" "$$pids"; \
			for pid in $$pids; do \
				pgid=$$(ps -o pgid= -p "$$pid" 2>/dev/null | tr -d '[:space:]'); \
				if [ -n "$$pgid" ] && ! printf '%s\n' "$$seen_pgids" | grep -Fx "$$pgid" >/dev/null 2>&1; then \
					kill -TERM -- "-$$pgid" 2>/dev/null || kill "$$pid" 2>/dev/null || true; \
					seen_pgids="$$seen_pgids\n$$pgid"; \
				fi; \
			done; \
			sleep 1; \
			stale_pids=$$(lsof -tiTCP:$$port -sTCP:LISTEN 2>/dev/null || true); \
			if [ -n "$$stale_pids" ]; then \
				printf "Force killing port %s listener%s %s\n" "$$port" "$$( [ $$(printf '%s\n' "$$stale_pids" | wc -w) -gt 1 ] && printf s )" "$$stale_pids"; \
				for pid in $$stale_pids; do \
					pgid=$$(ps -o pgid= -p "$$pid" 2>/dev/null | tr -d '[:space:]'); \
					if [ -n "$$pgid" ]; then \
						kill -KILL -- "-$$pgid" 2>/dev/null || kill -9 "$$pid" 2>/dev/null || true; \
					else \
						kill -9 "$$pid" 2>/dev/null || true; \
					fi; \
				done; \
			fi; \
		fi; \
	done; \
	stale_repo_pids=$$(ps -eo pid=,args= | awk -v repo="$$repo_dir" 'index($$0, repo) && $$0 ~ /(concurrently|tsx|vite)/ { print $$1 }' || true); \
	if [ -n "$$stale_repo_pids" ]; then \
		printf "Cleaning up stale repo-local dev watchers: %s\n" "$$stale_repo_pids"; \
		for pid in $$stale_repo_pids; do \
			kill "$$pid" 2>/dev/null || true; \
		done; \
		sleep 1; \
		for pid in $$stale_repo_pids; do \
			kill -9 "$$pid" 2>/dev/null || true; \
		done; \
	fi

dev-services:
	@$(MAKE) check-docker-compose
	@set -e; \
	local_enabled=$$(printf '%s' "$${LOCAL_ENABLED:-FALSE}" | tr '[:upper:]' '[:lower:]'); \
	if [ "$$local_enabled" = "false" ]; then \
		$(DOCKER_COMPOSE) up -d postgres vulnerable-target full-stack-target; \
	else \
		$(DOCKER_COMPOSE) --profile local-llm up -d postgres vulnerable-target full-stack-target ollama ollama-init; \
	fi
	@$(MAKE) wait-for-service-health SERVICE=postgres
	@set -e; \
	local_enabled=$$(printf '%s' "$${LOCAL_ENABLED:-FALSE}" | tr '[:upper:]' '[:lower:]'); \
	if [ "$$local_enabled" = "true" ]; then \
		$(MAKE) wait-for-service-health SERVICE=ollama; \
	fi

database:
	@$(MAKE) check-docker-compose
	$(DOCKER_COMPOSE) up -d postgres
	$(MAKE) wait-for-postgres
	pnpm --filter @synosec/contracts build
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:generate
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend exec prisma db push --force-reset
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:seed

docker-database:
	@$(MAKE) check-docker-compose
	$(MAKE) wait-for-postgres
	$(DOCKER_COMPOSE) exec -T backend sh -c 'set -e; \
		pnpm --filter @synosec/contracts build; \
		DATABASE_URL=postgres://synosec:synosec@postgres:5432/synosec pnpm --filter @synosec/backend prisma:generate; \
		DATABASE_URL=postgres://synosec:synosec@postgres:5432/synosec pnpm --filter @synosec/backend exec prisma db push --force-reset; \
		DATABASE_URL=postgres://synosec:synosec@postgres:5432/synosec pnpm --filter @synosec/backend prisma:seed'

wait-for-postgres:
	@$(MAKE) wait-for-service-health SERVICE=postgres

wait-for-service-health:
	@set -e; \
	service="$(SERVICE)"; \
	if [ -z "$$service" ]; then \
		printf "SERVICE is required\n" >&2; \
		exit 1; \
	fi; \
	container_id=$$($(DOCKER_COMPOSE) ps -q "$$service"); \
	if [ -z "$$container_id" ]; then \
		printf "Service %s container not found\n" "$$service" >&2; \
		exit 1; \
	fi; \
	if ! docker inspect -f '{{if .State.Health}}configured{{end}}' "$$container_id" | grep -qx 'configured'; then \
		printf "Service %s does not define a healthcheck\n" "$$service" >&2; \
		exit 1; \
	fi; \
	printf "Waiting for %s to become healthy" "$$service"; \
	while true; do \
		status=$$(docker inspect -f '{{.State.Health.Status}}' "$$container_id"); \
		if [ "$$status" = "healthy" ]; then \
			break; \
		fi; \
		if [ "$$status" = "unhealthy" ]; then \
			printf "\nService %s became unhealthy. Recent logs:\n" "$$service" >&2; \
			docker logs --tail=100 "$$container_id" >&2; \
			exit 1; \
		fi; \
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
