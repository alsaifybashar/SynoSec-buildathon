# syntax=docker/dockerfile:1.7
FROM node:22-alpine

RUN apk add --no-cache bash curl nmap nmap-scripts openssl netcat-openbsd
RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/prisma.config.ts ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/connector/package.json ./apps/connector/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json

RUN --mount=type=cache,id=synosec-pnpm-store,target=/pnpm/store \
	pnpm config set store-dir /pnpm/store \
	&& pnpm install --frozen-lockfile

EXPOSE 3001
