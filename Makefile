.PHONY: help up up-build down logs db-reset

ifneq (,$(wildcard .env))
include .env
export
endif

DOCKER_COMPOSE := $(shell \
	if docker compose version >/dev/null 2>&1; then printf 'docker compose'; \
	elif command -v docker-compose >/dev/null 2>&1; then printf 'docker-compose'; \
	else printf ''; fi)

LOCAL_PROFILE_ARGS := $(shell printf '%s' "$${LLM_PROVIDER:-anthropic}" | tr '[:upper:]' '[:lower:]' | grep -qx local && printf -- '--profile local-llm')

help:
	@printf "\033[1;32mSynoSec\033[0m\n"
	@printf "  \033[33mmake up\033[0m         Start the Docker stack\n"
	@printf "  \033[33mmake up-build\033[0m   Rebuild images, then start the stack\n"
	@printf "  \033[33mmake down\033[0m       Stop and remove containers\n"
	@printf "  \033[33mmake logs\033[0m       Follow container logs (SERVICE=name to scope)\n"
	@printf "  \033[33mmake db-reset\033[0m   Reset Postgres, push schema, run seeds\n"
	@printf "  \033[36mLLM_PROVIDER=local\033[0m enables the local-LLM (Ollama) profile\n"

up:
	$(DOCKER_COMPOSE) $(LOCAL_PROFILE_ARGS) up -d --remove-orphans

up-build:
	$(DOCKER_COMPOSE) $(LOCAL_PROFILE_ARGS) up -d --build --remove-orphans

down:
	$(DOCKER_COMPOSE) down --remove-orphans

logs:
	$(DOCKER_COMPOSE) logs -f $(SERVICE)

db-reset:
	$(DOCKER_COMPOSE) up -d postgres
	@until $(DOCKER_COMPOSE) exec -T postgres pg_isready -U synosec -d synosec >/dev/null 2>&1; do printf .; sleep 1; done; printf " ready\n"
	pnpm --filter @synosec/contracts build
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:generate
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend exec prisma db push --force-reset
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:seed
