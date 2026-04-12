.PHONY: help dev build database

help:
	@printf "\033[31mAvailable targets:\033[0m\n"
	@printf "\033[33m  make dev\033[0m    Start the contracts watcher, backend, and frontend\n"
	@printf "\033[35m  make database\033[0m  Start Postgres, generate Prisma client, push schema, and seed data\n"
	@printf "\033[32m  make build\033[0m  Build all workspace packages\n"
	@printf "\033[34m  make help\033[0m   Show this help message\n"

dev:
	pnpm dev

database:
	docker compose up -d postgres
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:generate
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:push
	DATABASE_URL=postgres://synosec:synosec@localhost:$${POSTGRES_PORT:-55432}/synosec pnpm --filter @synosec/backend prisma:seed

build:
	pnpm build
