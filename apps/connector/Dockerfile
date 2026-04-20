FROM node:22-bookworm-slim

WORKDIR /workspace

ARG HTTPX_VERSION=1.9.0
ARG KATANA_VERSION=1.5.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash curl unzip nmap ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && curl -fsSL "https://github.com/projectdiscovery/httpx/releases/download/v${HTTPX_VERSION}/httpx_${HTTPX_VERSION}_linux_amd64.zip" -o /tmp/httpx.zip \
  && unzip -q /tmp/httpx.zip -d /tmp/httpx \
  && install -m 0755 /tmp/httpx/httpx /usr/local/bin/httpx \
  && curl -fsSL "https://github.com/projectdiscovery/katana/releases/download/v${KATANA_VERSION}/katana_${KATANA_VERSION}_linux_amd64.zip" -o /tmp/katana.zip \
  && unzip -q /tmp/katana.zip -d /tmp/katana \
  && install -m 0755 /tmp/katana/katana /usr/local/bin/katana \
  && rm -rf /tmp/httpx /tmp/katana /tmp/httpx.zip /tmp/katana.zip

CMD ["sh", "-c", "pnpm install --frozen-lockfile || pnpm install && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector dev"]
