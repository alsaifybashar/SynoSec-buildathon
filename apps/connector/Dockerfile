FROM node:22-bookworm-slim

WORKDIR /workspace

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
    binutils \
    binwalk \
    build-essential \
    ca-certificates \
    checksec \
    curl \
    default-jre-headless \
    dirb \
    dnsenum \
    fierce \
    gdb \
    git \
    gnupg \
    golang-go \
    hashcat \
    hydra \
    john \
    libimage-exiftool-perl \
    masscan \
    medusa \
    netcat-openbsd \
    ncat \
    nikto \
    nmap \
    openjdk-17-jre-headless \
    ophcrack \
    patator \
    pipx \
    autoconf \
    automake \
    flex \
    foremost \
    libabsl-dev \
    libewf-dev \
    libexpat1-dev \
    libre2-dev \
    libssl-dev \
    libtool \
    libxml2-utils \
    pkg-config \
    python3 \
    python3-dev \
    python3-pip \
    ruby-full \
    scalpel \
    smbclient \
    sqlmap \
    steghide \
    unzip \
    whatweb \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && pipx install arjun \
  && pipx install git+https://github.com/Tib3rius/AutoRecon.git \
  && pipx install dirsearch \
  && pipx install enum4linux.py \
  && pipx install git+https://github.com/cddmp/enum4linux-ng.git \
  && pipx install hashid \
  && pipx install kube-hunter \
  && pipx install git+https://github.com/Pennyw0rth/NetExec \
  && pipx install git+https://github.com/devanshbatham/ParamSpider.git \
  && pipx install prowler \
  && pipx install responder \
  && pipx install scoutsuite \
  && pipx install sublist3r \
  && pipx install git+https://github.com/laramies/theHarvester.git@4.7.1 \
  && pipx install volatility3 \
  && gem install evil-winrm wpscan \
  && curl -fsSL "https://github.com/owasp-amass/amass/releases/download/v${AMASS_VERSION}/amass_linux_amd64.tar.gz" -o /tmp/amass.tar.gz \
  && mkdir -p /tmp/amass \
  && tar -xzf /tmp/amass.tar.gz -C /tmp/amass \
  && install -m 0755 /tmp/amass/amass_linux_amd64/amass /usr/local/bin/amass \
  && curl -fsSL "https://github.com/simsong/bulk_extractor/releases/download/v${BULK_EXTRACTOR_VERSION}/bulk_extractor-${BULK_EXTRACTOR_VERSION}.tar.gz" -o /tmp/bulk_extractor.tar.gz \
  && mkdir -p /tmp/bulk_extractor \
  && tar -xzf /tmp/bulk_extractor.tar.gz -C /tmp/bulk_extractor --strip-components=1 \
  && cd /tmp/bulk_extractor \
  && ./configure -q --enable-silent-rules \
  && make -j2 >/dev/null \
  && make install >/dev/null \
  && cd /workspace \
  && curl -fsSL "https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_${GHIDRA_VERSION}_build/ghidra_${GHIDRA_VERSION}_PUBLIC_${GHIDRA_BUILD_DATE}.zip" -o /tmp/ghidra.zip \
  && unzip -q /tmp/ghidra.zip -d /opt \
  && ln -sf "/opt/ghidra_${GHIDRA_VERSION}_PUBLIC/ghidraRun" /usr/local/bin/ghidra \
  && curl -fsSL "https://github.com/radareorg/radare2/releases/download/${RADARE2_VERSION}/radare2_${RADARE2_VERSION}_amd64.deb" -o /tmp/radare2.deb \
  && dpkg -i /tmp/radare2.deb \
  && curl -fsSL "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.deb" -o /tmp/trivy.deb \
  && dpkg -i /tmp/trivy.deb \
  && printf '%s\n' '#!/usr/bin/env sh' 'value="${1:-}"' 'if [ -z "$value" ]; then value="$(cat)"; fi' 'case "$value" in' '  *[!0-9A-Fa-f]*) printf "%s\n" "unknown" ;;' '  *) printf "%s\n" "hex-like" ;;' 'esac' > /usr/local/bin/cipher-identifier \
  && chmod 0755 /usr/local/bin/cipher-identifier \
  && go install "github.com/OJ/gobuster/v3@v${GOBUSTER_VERSION}" \
  && go install "github.com/aquasecurity/kube-bench@v${KUBE_BENCH_VERSION}" \
  && curl -fsSL https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb -o /tmp/msfinstall \
  && chmod 0755 /tmp/msfinstall \
  && /tmp/msfinstall \
  && curl -fsSL "https://portswigger.net/burp/releases/download?product=community&version=${BURP_VERSION}&type=Jar" -o /opt/burpsuite-community.jar \
  && printf '%s\n' '#!/usr/bin/env sh' 'exec java -jar /opt/burpsuite-community.jar "$@"' > /usr/local/bin/burp \
  && chmod 0755 /usr/local/bin/burp \
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
  && curl -fsSL "https://github.com/hahwul/dalfox/releases/download/v${DALFOX_VERSION}/dalfox-linux-amd64.tar.gz" -o /tmp/dalfox.tar.gz \
  && tar -xzf /tmp/dalfox.tar.gz -C /tmp \
  && install -m 0755 /tmp/dalfox-linux-amd64 /usr/local/bin/dalfox \
  && go install github.com/ffuf/ffuf/v2@latest \
  && go install github.com/lc/gau/v2/cmd/gau@latest \
  && go install github.com/tomnomnom/waybackurls@latest \
  && go install github.com/hakluke/hakrawler@latest \
  && curl -fsSL "https://github.com/epi052/feroxbuster/releases/download/v${FEROXBUSTER_VERSION}/x86_64-linux-feroxbuster.zip" -o /tmp/feroxbuster.zip \
  && unzip -q /tmp/feroxbuster.zip -d /tmp/feroxbuster \
  && install -m 0755 /tmp/feroxbuster/feroxbuster /usr/local/bin/feroxbuster \
  && curl -fsSL "https://github.com/bee-san/RustScan/releases/download/${RUSTSCAN_VERSION}/x86_64-linux-rustscan.tar.gz.zip" -o /tmp/rustscan.zip \
  && unzip -q /tmp/rustscan.zip -d /tmp \
  && tar -xzf /tmp/x86_64-linux-rustscan.tar.gz -C /tmp \
  && install -m 0755 /tmp/rustscan /usr/local/bin/rustscan \
  && if command -v ghidraRun >/dev/null 2>&1 && ! command -v ghidra >/dev/null 2>&1; then ln -s "$(command -v ghidraRun)" /usr/local/bin/ghidra; fi \
  && if command -v hashid >/dev/null 2>&1 && ! command -v hash-identifier >/dev/null 2>&1; then ln -s "$(command -v hashid)" /usr/local/bin/hash-identifier; fi \
  && if command -v nxc >/dev/null 2>&1 && ! command -v crackmapexec >/dev/null 2>&1; then ln -s "$(command -v nxc)" /usr/local/bin/crackmapexec; fi \
  && if command -v vol >/dev/null 2>&1 && ! command -v volatility >/dev/null 2>&1; then ln -s "$(command -v vol)" /usr/local/bin/volatility; fi \
  && if command -v ScoutSuite >/dev/null 2>&1 && ! command -v scout >/dev/null 2>&1; then ln -s "$(command -v ScoutSuite)" /usr/local/bin/scout; fi \
  && if command -v burpsuite >/dev/null 2>&1 && ! command -v burp >/dev/null 2>&1; then ln -s "$(command -v burpsuite)" /usr/local/bin/burp; fi \
  && rm -rf /tmp/amass /tmp/amass.tar.gz /tmp/bulk_extractor /tmp/bulk_extractor.tar.gz /tmp/ghidra.zip /tmp/radare2.deb /tmp/trivy.deb /tmp/httpx /tmp/katana /tmp/nuclei /tmp/subfinder /tmp/feroxbuster /tmp/httpx.zip /tmp/katana.zip /tmp/nuclei.zip /tmp/subfinder.zip /tmp/dalfox.tar.gz /tmp/dalfox-linux-amd64 /tmp/feroxbuster.zip /tmp/rustscan.zip /tmp/x86_64-linux-rustscan.tar.gz /tmp/rustscan /tmp/msfinstall

CMD ["sh", "-c", "pnpm install --frozen-lockfile || pnpm install && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector dev"]
