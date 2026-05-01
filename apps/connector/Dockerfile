# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS connector-build

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/tsconfig.json ./packages/contracts/
COPY packages/contracts/src ./packages/contracts/src
COPY apps/connector/package.json apps/connector/tsconfig.json ./apps/connector/
COPY apps/connector/src ./apps/connector/src

RUN corepack enable
RUN --mount=type=cache,id=synosec-pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store \
  && pnpm install --frozen-lockfile
RUN pnpm --filter @synosec/contracts build
RUN pnpm --filter @synosec/connector exec tsc -p tsconfig.json

FROM node:22-bookworm-slim AS connector-runtime-base

ARG HTTPX_VERSION=1.9.0
ARG KATANA_VERSION=1.5.0
ARG NUCLEI_VERSION=3.4.10
ARG SUBFINDER_VERSION=2.8.0
ARG DALFOX_VERSION=2.12.0
ARG FEROXBUSTER_VERSION=2.13.1
ARG RUSTSCAN_VERSION=2.4.1
ARG GOBUSTER_VERSION=3.6.0
ARG KUBE_BENCH_VERSION=0.7.0
ARG BURP_VERSION=2026.2.3
ARG AMASS_VERSION=5.1.1
ARG BULK_EXTRACTOR_VERSION=2.1.1
ARG GHIDRA_VERSION=12.0.4
ARG GHIDRA_BUILD_DATE=20260303
ARG RADARE2_VERSION=6.1.4
ARG TRIVY_VERSION=0.70.0

ENV PATH="/root/.local/bin:/root/go/bin:${PATH}"

RUN sed -i 's/Components: main/Components: main contrib non-free non-free-firmware/' /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
    gnupg \
    pipx \
    python3 \
    python3-pip \
    python3-venv \
    unzip \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

COPY apps/connector/docker/install-tool-profile.sh /usr/local/bin/install-tool-profile
RUN chmod 0755 /usr/local/bin/install-tool-profile

FROM connector-runtime-base AS connector-tools-core
RUN install-tool-profile core

FROM connector-tools-core AS connector-tools-web
RUN install-tool-profile web

FROM connector-tools-web AS connector-tools-cloud
RUN install-tool-profile cloud

FROM connector-tools-cloud AS connector-tools-windows
RUN install-tool-profile windows

FROM connector-tools-windows AS connector-tools-forensics
RUN install-tool-profile forensics

FROM connector-tools-forensics AS connector-tools-reversing
RUN install-tool-profile reversing

FROM connector-tools-reversing AS connector-tools-exploitation
RUN install-tool-profile exploitation

FROM connector-tools-exploitation AS connector-tools-full

FROM connector-tools-core AS connector-dev-core
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
CMD ["sh", "-c", "sh ./scripts/docker/ensure-pnpm-deps.sh && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector dev"]

FROM connector-tools-web AS connector-dev-web
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
CMD ["sh", "-c", "sh ./scripts/docker/ensure-pnpm-deps.sh && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector dev"]

FROM connector-tools-cloud AS connector-dev-cloud
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
CMD ["sh", "-c", "sh ./scripts/docker/ensure-pnpm-deps.sh && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector dev"]

FROM connector-tools-windows AS connector-dev-windows
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
CMD ["sh", "-c", "sh ./scripts/docker/ensure-pnpm-deps.sh && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector dev"]

FROM connector-tools-forensics AS connector-dev-forensics
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
CMD ["sh", "-c", "sh ./scripts/docker/ensure-pnpm-deps.sh && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector dev"]

FROM connector-tools-reversing AS connector-dev-reversing
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
CMD ["sh", "-c", "sh ./scripts/docker/ensure-pnpm-deps.sh && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector dev"]

FROM connector-tools-exploitation AS connector-dev-exploitation
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
CMD ["sh", "-c", "sh ./scripts/docker/ensure-pnpm-deps.sh && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector dev"]

FROM connector-tools-full AS connector-dev-full
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
CMD ["sh", "-c", "sh ./scripts/docker/ensure-pnpm-deps.sh && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector dev"]

FROM connector-tools-core AS connector-prod-core
WORKDIR /app
ENV NODE_ENV=production
COPY --from=connector-build /workspace/package.json ./package.json
COPY --from=connector-build /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=connector-build /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=connector-build /workspace/node_modules ./node_modules
COPY --from=connector-build /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=connector-build /workspace/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=connector-build /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=connector-build /workspace/apps/connector/package.json ./apps/connector/package.json
COPY --from=connector-build /workspace/apps/connector/node_modules ./apps/connector/node_modules
COPY --from=connector-build /workspace/apps/connector/dist ./apps/connector/dist
CMD ["node", "apps/connector/dist/main.js"]

FROM connector-tools-web AS connector-prod-web
WORKDIR /app
ENV NODE_ENV=production
COPY --from=connector-build /workspace/package.json ./package.json
COPY --from=connector-build /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=connector-build /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=connector-build /workspace/node_modules ./node_modules
COPY --from=connector-build /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=connector-build /workspace/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=connector-build /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=connector-build /workspace/apps/connector/package.json ./apps/connector/package.json
COPY --from=connector-build /workspace/apps/connector/node_modules ./apps/connector/node_modules
COPY --from=connector-build /workspace/apps/connector/dist ./apps/connector/dist
CMD ["node", "apps/connector/dist/main.js"]

FROM connector-tools-cloud AS connector-prod-cloud
WORKDIR /app
ENV NODE_ENV=production
COPY --from=connector-build /workspace/package.json ./package.json
COPY --from=connector-build /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=connector-build /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=connector-build /workspace/node_modules ./node_modules
COPY --from=connector-build /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=connector-build /workspace/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=connector-build /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=connector-build /workspace/apps/connector/package.json ./apps/connector/package.json
COPY --from=connector-build /workspace/apps/connector/node_modules ./apps/connector/node_modules
COPY --from=connector-build /workspace/apps/connector/dist ./apps/connector/dist
CMD ["node", "apps/connector/dist/main.js"]

FROM connector-tools-windows AS connector-prod-windows
WORKDIR /app
ENV NODE_ENV=production
COPY --from=connector-build /workspace/package.json ./package.json
COPY --from=connector-build /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=connector-build /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=connector-build /workspace/node_modules ./node_modules
COPY --from=connector-build /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=connector-build /workspace/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=connector-build /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=connector-build /workspace/apps/connector/package.json ./apps/connector/package.json
COPY --from=connector-build /workspace/apps/connector/node_modules ./apps/connector/node_modules
COPY --from=connector-build /workspace/apps/connector/dist ./apps/connector/dist
CMD ["node", "apps/connector/dist/main.js"]

FROM connector-tools-forensics AS connector-prod-forensics
WORKDIR /app
ENV NODE_ENV=production
COPY --from=connector-build /workspace/package.json ./package.json
COPY --from=connector-build /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=connector-build /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=connector-build /workspace/node_modules ./node_modules
COPY --from=connector-build /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=connector-build /workspace/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=connector-build /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=connector-build /workspace/apps/connector/package.json ./apps/connector/package.json
COPY --from=connector-build /workspace/apps/connector/node_modules ./apps/connector/node_modules
COPY --from=connector-build /workspace/apps/connector/dist ./apps/connector/dist
CMD ["node", "apps/connector/dist/main.js"]

FROM connector-tools-reversing AS connector-prod-reversing
WORKDIR /app
ENV NODE_ENV=production
COPY --from=connector-build /workspace/package.json ./package.json
COPY --from=connector-build /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=connector-build /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=connector-build /workspace/node_modules ./node_modules
COPY --from=connector-build /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=connector-build /workspace/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=connector-build /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=connector-build /workspace/apps/connector/package.json ./apps/connector/package.json
COPY --from=connector-build /workspace/apps/connector/node_modules ./apps/connector/node_modules
COPY --from=connector-build /workspace/apps/connector/dist ./apps/connector/dist
CMD ["node", "apps/connector/dist/main.js"]

FROM connector-tools-exploitation AS connector-prod-exploitation
WORKDIR /app
ENV NODE_ENV=production
COPY --from=connector-build /workspace/package.json ./package.json
COPY --from=connector-build /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=connector-build /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=connector-build /workspace/node_modules ./node_modules
COPY --from=connector-build /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=connector-build /workspace/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=connector-build /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=connector-build /workspace/apps/connector/package.json ./apps/connector/package.json
COPY --from=connector-build /workspace/apps/connector/node_modules ./apps/connector/node_modules
COPY --from=connector-build /workspace/apps/connector/dist ./apps/connector/dist
CMD ["node", "apps/connector/dist/main.js"]

FROM connector-tools-full AS connector-prod-full
WORKDIR /app
ENV NODE_ENV=production
COPY --from=connector-build /workspace/package.json ./package.json
COPY --from=connector-build /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=connector-build /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=connector-build /workspace/node_modules ./node_modules
COPY --from=connector-build /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=connector-build /workspace/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=connector-build /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=connector-build /workspace/apps/connector/package.json ./apps/connector/package.json
COPY --from=connector-build /workspace/apps/connector/node_modules ./apps/connector/node_modules
COPY --from=connector-build /workspace/apps/connector/dist ./apps/connector/dist
CMD ["node", "apps/connector/dist/main.js"]
