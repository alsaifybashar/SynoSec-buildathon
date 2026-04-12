.PHONY: help dev build docker-up docker-down docker-logs seed

help:
	@printf "\033[1;32m╔══════════════════════════════════╗\033[0m\n"
	@printf "\033[1;32m║     SynoSec AI PenTest Tool      ║\033[0m\n"
	@printf "\033[1;32m╚══════════════════════════════════╝\033[0m\n"
	@printf "\033[33m  make docker-up\033[0m   Start full stack (Docker Compose)\n"
	@printf "\033[33m  make docker-down\033[0m Stop and remove containers\n"
	@printf "\033[33m  make docker-logs\033[0m Follow all container logs\n"
	@printf "\033[33m  make dev\033[0m         Start local dev (no Docker)\n"
	@printf "\033[33m  make build\033[0m       Build all workspace packages\n"
	@printf "\033[33m  make seed\033[0m        Seed demo data into running backend\n"

docker-up:
	docker compose up --build -d
	@printf "\n\033[1;32m✓ SynoSec started!\033[0m\n"
	@printf "  Frontend: \033[36mhttp://localhost:5173\033[0m\n"
	@printf "  Backend:  \033[36mhttp://localhost:3001\033[0m\n"
	@printf "  Neo4j UI: \033[36mhttp://localhost:7474\033[0m\n"
	@printf "  Target:   \033[36mhttp://localhost:8888\033[0m\n"

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

dev:
	pnpm dev

build:
	pnpm --filter @synosec/contracts build && pnpm build

seed:
	curl -s -X POST http://localhost:3001/api/scan/seed | python3 -m json.tool
