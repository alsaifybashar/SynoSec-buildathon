.PHONY: help dev build

help:
	@printf "\033[31mAvailable targets:\033[0m\n"
	@printf "\033[33m  make dev\033[0m    Start the contracts watcher, backend, and frontend\n"
	@printf "\033[32m  make build\033[0m  Build all workspace packages\n"
	@printf "\033[34m  make help\033[0m   Show this help message\n"

dev:
	pnpm dev

build:
	pnpm build
