FROM node:22-bookworm-slim

WORKDIR /workspace

# ── version pins ────────────────────────────────────────────────────────────
ARG HTTPX_VERSION=1.9.0
ARG KATANA_VERSION=1.5.0
ARG NUCLEI_VERSION=3.3.9
ARG SUBFINDER_VERSION=2.7.1
ARG GAU_VERSION=2.2.4
ARG HAKRAWLER_VERSION=2.3.0
ARG DALFOX_VERSION=2.9.2
ARG GOBUSTER_VERSION=3.6.0
ARG FFUF_VERSION=2.1.0
ARG WAYBACKURLS_VERSION=1.0.2
ARG FEROXBUSTER_VERSION=2.11.0
ARG RUSTSCAN_VERSION=2.3.0
ARG AMASS_VERSION=4.2.0
ARG TRIVY_VERSION=0.57.1
ARG KUBEBENCH_VERSION=0.9.4

# ── apt packages ─────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash curl unzip git ca-certificates openssl \
    nmap ncat netcat-openbsd masscan \
    nikto whatweb dirb sqlmap \
    hydra hashcat john medusa ophcrack \
    gdb binutils radare2 \
    binwalk libimage-exiftool-perl foremost scalpel steghide \
    dnsenum checksec enum4linux \
    dnsutils whois \
    python3 python3-pip ruby-full \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

# ── ProjectDiscovery Go binaries ─────────────────────────────────────────────
RUN curl -fsSL "https://github.com/projectdiscovery/httpx/releases/download/v${HTTPX_VERSION}/httpx_${HTTPX_VERSION}_linux_amd64.zip" -o /tmp/httpx.zip \
  && unzip -q /tmp/httpx.zip -d /tmp/httpx && install -m 0755 /tmp/httpx/httpx /usr/local/bin/httpx && rm -rf /tmp/httpx /tmp/httpx.zip \
  \
  && curl -fsSL "https://github.com/projectdiscovery/katana/releases/download/v${KATANA_VERSION}/katana_${KATANA_VERSION}_linux_amd64.zip" -o /tmp/katana.zip \
  && unzip -q /tmp/katana.zip -d /tmp/katana && install -m 0755 /tmp/katana/katana /usr/local/bin/katana && rm -rf /tmp/katana /tmp/katana.zip \
  \
  && curl -fsSL "https://github.com/projectdiscovery/nuclei/releases/download/v${NUCLEI_VERSION}/nuclei_${NUCLEI_VERSION}_linux_amd64.zip" -o /tmp/nuclei.zip \
  && unzip -q /tmp/nuclei.zip -d /tmp/nuclei && install -m 0755 /tmp/nuclei/nuclei /usr/local/bin/nuclei && rm -rf /tmp/nuclei /tmp/nuclei.zip \
  \
  && curl -fsSL "https://github.com/projectdiscovery/subfinder/releases/download/v${SUBFINDER_VERSION}/subfinder_${SUBFINDER_VERSION}_linux_amd64.zip" -o /tmp/subfinder.zip \
  && unzip -q /tmp/subfinder.zip -d /tmp/subfinder && install -m 0755 /tmp/subfinder/subfinder /usr/local/bin/subfinder && rm -rf /tmp/subfinder /tmp/subfinder.zip

# ── other Go binaries ─────────────────────────────────────────────────────────
RUN curl -fsSL "https://github.com/OJ/gobuster/releases/download/v${GOBUSTER_VERSION}/gobuster_Linux_x86_64.tar.gz" -o /tmp/gobuster.tar.gz \
  && tar -xzf /tmp/gobuster.tar.gz -C /tmp && install -m 0755 /tmp/gobuster /usr/local/bin/gobuster && rm -f /tmp/gobuster /tmp/gobuster.tar.gz \
  \
  && curl -fsSL "https://github.com/ffuf/ffuf/releases/download/v${FFUF_VERSION}/ffuf_${FFUF_VERSION}_linux_amd64.tar.gz" -o /tmp/ffuf.tar.gz \
  && tar -xzf /tmp/ffuf.tar.gz -C /tmp && install -m 0755 /tmp/ffuf /usr/local/bin/ffuf && rm -f /tmp/ffuf /tmp/ffuf.tar.gz \
  \
  && curl -fsSL "https://github.com/hahwul/dalfox/releases/download/v${DALFOX_VERSION}/dalfox_linux_amd64.tar.gz" -o /tmp/dalfox.tar.gz \
  && tar -xzf /tmp/dalfox.tar.gz -C /tmp && install -m 0755 /tmp/dalfox /usr/local/bin/dalfox && rm -f /tmp/dalfox /tmp/dalfox.tar.gz \
  \
  && curl -fsSL "https://github.com/lc/gau/releases/download/v${GAU_VERSION}/gau_${GAU_VERSION}_linux_amd64.tar.gz" -o /tmp/gau.tar.gz \
  && tar -xzf /tmp/gau.tar.gz -C /tmp && install -m 0755 /tmp/gau /usr/local/bin/gau && rm -f /tmp/gau /tmp/gau.tar.gz \
  \
  && curl -fsSL "https://github.com/hakluke/hakrawler/releases/download/v${HAKRAWLER_VERSION}/hakrawler_linux_amd64.zip" -o /tmp/hakrawler.zip \
  && unzip -q /tmp/hakrawler.zip -d /tmp/hakrawler \
  && find /tmp/hakrawler -maxdepth 2 -name 'hakrawler' -type f -exec install -m 0755 {} /usr/local/bin/hakrawler \; \
  && rm -rf /tmp/hakrawler /tmp/hakrawler.zip \
  \
  && curl -fsSL "https://github.com/tomnomnom/waybackurls/releases/download/v${WAYBACKURLS_VERSION}/waybackurls-linux-amd64-${WAYBACKURLS_VERSION}.tgz" -o /tmp/waybackurls.tgz \
  && tar -xzf /tmp/waybackurls.tgz -C /tmp && install -m 0755 /tmp/waybackurls /usr/local/bin/waybackurls && rm -f /tmp/waybackurls /tmp/waybackurls.tgz

# ── Rust binaries ─────────────────────────────────────────────────────────────
RUN curl -fsSL "https://github.com/epi052/feroxbuster/releases/download/v${FEROXBUSTER_VERSION}/x86_64-linux-feroxbuster.zip" -o /tmp/feroxbuster.zip \
  && unzip -q /tmp/feroxbuster.zip feroxbuster -d /tmp && install -m 0755 /tmp/feroxbuster /usr/local/bin/feroxbuster && rm -f /tmp/feroxbuster /tmp/feroxbuster.zip \
  \
  && curl -fsSL "https://github.com/RustScan/RustScan/releases/download/${RUSTSCAN_VERSION}/rustscan_${RUSTSCAN_VERSION}_amd64.deb" -o /tmp/rustscan.deb \
  && dpkg -i /tmp/rustscan.deb && rm /tmp/rustscan.deb

# ── amass + trivy + kube-bench ────────────────────────────────────────────────
RUN curl -fsSL "https://github.com/owasp-amass/amass/releases/download/v${AMASS_VERSION}/amass_Linux_amd64.zip" -o /tmp/amass.zip \
  && unzip -q /tmp/amass.zip -d /tmp/amass \
  && find /tmp/amass -maxdepth 3 -name 'amass' -type f -exec install -m 0755 {} /usr/local/bin/amass \; \
  && rm -rf /tmp/amass /tmp/amass.zip \
  \
  && curl -fsSL "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz" -o /tmp/trivy.tar.gz \
  && tar -xzf /tmp/trivy.tar.gz -C /tmp trivy && install -m 0755 /tmp/trivy /usr/local/bin/trivy && rm -f /tmp/trivy /tmp/trivy.tar.gz \
  \
  && curl -fsSL "https://github.com/aquasecurity/kube-bench/releases/download/v${KUBEBENCH_VERSION}/kube-bench_${KUBEBENCH_VERSION}_linux_amd64.tar.gz" -o /tmp/kube-bench.tar.gz \
  && tar -xzf /tmp/kube-bench.tar.gz -C /tmp kube-bench && install -m 0755 /tmp/kube-bench /usr/local/bin/kube-bench && rm -f /tmp/kube-bench /tmp/kube-bench.tar.gz

# ── Python tools ──────────────────────────────────────────────────────────────
RUN pip3 install --no-cache-dir --break-system-packages \
    theHarvester fierce sublist3r \
    arjun paramspider dirsearch \
    enum4linux-ng netexec crackmapexec \
    kube-hunter prowler scoutsuite \
    volatility3 patator \
    hash-identifier cipher-identifier \
  && ln -sf "$(command -v vol3 2>/dev/null || command -v vol 2>/dev/null || echo vol3)" /usr/local/bin/volatility

# ── Ruby tools ────────────────────────────────────────────────────────────────
RUN gem install wpscan evil-winrm --no-document

# ── Responder (git clone — not a pip/apt package on Bookworm) ─────────────────
RUN git clone --depth 1 https://github.com/lgandx/Responder.git /opt/Responder \
  && ln -sf /opt/Responder/Responder.py /usr/local/bin/responder \
  && chmod +x /opt/Responder/Responder.py

CMD ["sh", "-c", "pnpm install --frozen-lockfile || pnpm install && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector dev"]
