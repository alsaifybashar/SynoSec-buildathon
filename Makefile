.PHONY: help dev build test database docker-up docker-down docker-logs seed

help:
	@printf "\033[1;32m╔══════════════════════════════════╗\033[0m\n"
	@printf "\033[1;32m║     SynoSec AI PenTest Tool      ║\033[0m\n"
	@printf "\033[1;32m╚══════════════════════════════════╝\033[0m\n"
	@printf "\033[33m  make docker-up\033[0m   Start full stack (Docker Compose)\n"
	@printf "\033[33m  make docker-down\033[0m Stop and remove containers\n"
	@printf "\033[33m  make docker-logs\033[0m Follow all container logs\n"
	@printf "\033[35m  make database\033[0m    Start Postgres, generate Prisma client, push schema, and seed data\n"
	@printf "\033[36m  make test\033[0m        Run tests for all workspace services\n"
	@printf "\033[33m  make dev\033[0m         Start local dev (no Docker)\n"
	@printf "\033[33m  make build\033[0m       Build all workspace packages\n"
	@printf "\033[33m  make seed\033[0m        Seed demo data into running backend\n"

docker-up:
	docker compose up --build -d --remove-orphans
	@printf "\n\033[1;32m✓ SynoSec started!\033[0m\n"
	@printf "  Frontend: \033[36mhttp://localhost:5173\033[0m\n"
	@printf "  Backend:  \033[36mhttp://localhost:3001\033[0m\n"
	@printf "  Neo4j UI: \033[36mhttp://localhost:7474\033[0m\n"
	@printf "  Target:   \033[36mhttp://localhost:8888\033[0m\n"

docker-down:
	docker compose down --remove-orphans

docker-logs:
	docker compose logs -f

dev:
	pnpm dev

database:
	docker compose up -d postgres
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:generate
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:push
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:seed

build:
	pnpm --filter @synosec/contracts build && pnpm build

test:
	pnpm test

seed:
	curl -s -X POST http://localhost:3001/api/scan/seed | python3 -m json.tool
