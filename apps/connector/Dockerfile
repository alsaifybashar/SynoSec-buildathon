FROM node:22-alpine

WORKDIR /workspace

CMD ["sh", "-c", "pnpm install --frozen-lockfile || pnpm install && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector dev"]
