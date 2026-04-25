FROM node:22-bookworm-slim

WORKDIR /workspace

ARG HTTPX_VERSION=1.9.0
ARG KATANA_VERSION=1.5.0
ARG NUCLEI_VERSION=3.4.10
ARG SUBFINDER_VERSION=2.8.0
ARG DALFOX_VERSION=2.12.0

ENV PATH="/root/.local/bin:/root/go/bin:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    binutils \
    build-essential \
    ca-certificates \
    cargo \
    curl \
    default-jre-headless \
    dirb \
    dnsenum \
    enum4linux \
    fierce \
    gdb \
    git \
    golang-go \
    hashcat \
    hydra \
    john \
    libimage-exiftool-perl \
    masscan \
    medusa \
    netcat-openbsd \
    nikto \
    nmap \
    openjdk-17-jre-headless \
    pipx \
    python3 \
    python3-pip \
    responder \
    ruby-full \
    scalpel \
    sqlmap \
    steghide \
    unzip \
    whatweb \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && pipx install arjun \
  && pipx install dirsearch \
  && pipx install enum4linux-ng \
  && pipx install hashid \
  && pipx install kube-hunter \
  && pipx install netexec \
  && pipx install paramspider \
  && pipx install patator \
  && pipx install prowler \
  && pipx install scoutsuite \
  && pipx install sublist3r \
  && pipx install theHarvester \
  && pipx install volatility3 \
  && gem install evil-winrm wpscan \
  && curl -fsSL "https://github.com/projectdiscovery/httpx/releases/download/v${HTTPX_VERSION}/httpx_${HTTPX_VERSION}_linux_amd64.zip" -o /tmp/httpx.zip \
  && unzip -q /tmp/httpx.zip -d /tmp/httpx \
  && install -m 0755 /tmp/httpx/httpx /usr/local/bin/httpx \
  && curl -fsSL "https://github.com/projectdiscovery/katana/releases/download/v${KATANA_VERSION}/katana_${KATANA_VERSION}_linux_amd64.zip" -o /tmp/katana.zip \
  && unzip -q /tmp/katana.zip -d /tmp/katana \
  && install -m 0755 /tmp/katana/katana /usr/local/bin/katana \
  && curl -fsSL "https://github.com/projectdiscovery/nuclei/releases/download/v${NUCLEI_VERSION}/nuclei_${NUCLEI_VERSION}_linux_amd64.zip" -o /tmp/nuclei.zip \
  && unzip -q /tmp/nuclei.zip -d /tmp/nuclei \
  && install -m 0755 /tmp/nuclei/nuclei /usr/local/bin/nuclei \
  && curl -fsSL "https://github.com/projectdiscovery/subfinder/releases/download/v${SUBFINDER_VERSION}/subfinder_${SUBFINDER_VERSION}_linux_amd64.zip" -o /tmp/subfinder.zip \
  && unzip -q /tmp/subfinder.zip -d /tmp/subfinder \
  && install -m 0755 /tmp/subfinder/subfinder /usr/local/bin/subfinder \
  && curl -fsSL "https://github.com/hahwul/dalfox/releases/download/v${DALFOX_VERSION}/dalfox_${DALFOX_VERSION}_linux_amd64.tar.gz" -o /tmp/dalfox.tar.gz \
  && tar -xzf /tmp/dalfox.tar.gz -C /tmp \
  && install -m 0755 /tmp/dalfox /usr/local/bin/dalfox \
  && go install github.com/ffuf/ffuf/v2@latest \
  && go install github.com/lc/gau/v2/cmd/gau@latest \
  && go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest \
  && go install github.com/tomnomnom/waybackurls@latest \
  && go install github.com/hakluke/hakrawler@latest \
  && cargo install feroxbuster \
  && cargo install rustscan \
  && if command -v ghidraRun >/dev/null 2>&1 && ! command -v ghidra >/dev/null 2>&1; then ln -s "$(command -v ghidraRun)" /usr/local/bin/ghidra; fi \
  && if command -v hashid >/dev/null 2>&1 && ! command -v hash-identifier >/dev/null 2>&1; then ln -s "$(command -v hashid)" /usr/local/bin/hash-identifier; fi \
  && if command -v nxc >/dev/null 2>&1 && ! command -v crackmapexec >/dev/null 2>&1; then ln -s "$(command -v nxc)" /usr/local/bin/crackmapexec; fi \
  && if command -v vol >/dev/null 2>&1 && ! command -v volatility >/dev/null 2>&1; then ln -s "$(command -v vol)" /usr/local/bin/volatility; fi \
  && if command -v ScoutSuite >/dev/null 2>&1 && ! command -v scout >/dev/null 2>&1; then ln -s "$(command -v ScoutSuite)" /usr/local/bin/scout; fi \
  && if command -v burpsuite >/dev/null 2>&1 && ! command -v burp >/dev/null 2>&1; then ln -s "$(command -v burpsuite)" /usr/local/bin/burp; fi \
  && rm -rf /tmp/httpx /tmp/katana /tmp/nuclei /tmp/subfinder /tmp/httpx.zip /tmp/katana.zip /tmp/nuclei.zip /tmp/subfinder.zip /tmp/dalfox.tar.gz

CMD ["sh", "-c", "pnpm install --frozen-lockfile || pnpm install && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector dev"]
