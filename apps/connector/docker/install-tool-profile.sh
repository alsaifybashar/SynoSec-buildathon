#!/usr/bin/env sh
set -eu

install_core() {
  apt-get update
  apt-get install -y --no-install-recommends \
    bash \
    binutils \
    build-essential \
    ca-certificates \
    curl \
    git \
    gnupg \
    golang-go \
    iproute2 \
    iputils-ping \
    lsof \
    ncat \
    net-tools \
    netcat-openbsd \
    nmap \
    openssl \
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    unzip
  rm -rf /var/lib/apt/lists/*
  printf '%s\n' '#!/usr/bin/env sh' 'value="${1:-}"' 'if [ -z "$value" ]; then value="$(cat)"; fi' 'case "$value" in' '  *[!0-9A-Fa-f]*) printf "%s\n" "unknown" ;;' '  *) printf "%s\n" "hex-like" ;;' 'esac' > /usr/local/bin/cipher-identifier
  chmod 0755 /usr/local/bin/cipher-identifier
}

install_web() {
  apt-get update
  apt-get install -y --no-install-recommends \
    dirb \
    nikto \
    ruby-full \
    sqlmap \
    whatweb
  rm -rf /var/lib/apt/lists/*
  pipx install arjun
  pipx install dirsearch
  pipx install git+https://github.com/devanshbatham/ParamSpider.git
  gem install wpscan
  curl -fsSL "https://github.com/owasp-amass/amass/releases/download/v${AMASS_VERSION}/amass_linux_amd64.tar.gz" -o /tmp/amass.tar.gz
  mkdir -p /tmp/amass
  tar -xzf /tmp/amass.tar.gz -C /tmp/amass
  install -m 0755 /tmp/amass/amass_linux_amd64/amass /usr/local/bin/amass
  curl -fsSL "https://github.com/projectdiscovery/httpx/releases/download/v${HTTPX_VERSION}/httpx_${HTTPX_VERSION}_linux_amd64.zip" -o /tmp/httpx.zip
  unzip -q /tmp/httpx.zip -d /tmp/httpx
  install -m 0755 /tmp/httpx/httpx /usr/local/bin/httpx
  curl -fsSL "https://github.com/projectdiscovery/katana/releases/download/v${KATANA_VERSION}/katana_${KATANA_VERSION}_linux_amd64.zip" -o /tmp/katana.zip
  unzip -q /tmp/katana.zip -d /tmp/katana
  install -m 0755 /tmp/katana/katana /usr/local/bin/katana
  curl -fsSL "https://github.com/projectdiscovery/nuclei/releases/download/v${NUCLEI_VERSION}/nuclei_${NUCLEI_VERSION}_linux_amd64.zip" -o /tmp/nuclei.zip
  unzip -q /tmp/nuclei.zip -d /tmp/nuclei
  install -m 0755 /tmp/nuclei/nuclei /usr/local/bin/nuclei
  curl -fsSL "https://github.com/projectdiscovery/subfinder/releases/download/v${SUBFINDER_VERSION}/subfinder_${SUBFINDER_VERSION}_linux_amd64.zip" -o /tmp/subfinder.zip
  unzip -q /tmp/subfinder.zip -d /tmp/subfinder
  install -m 0755 /tmp/subfinder/subfinder /usr/local/bin/subfinder
  curl -fsSL "https://github.com/hahwul/dalfox/releases/download/v${DALFOX_VERSION}/dalfox-linux-amd64.tar.gz" -o /tmp/dalfox.tar.gz
  tar -xzf /tmp/dalfox.tar.gz -C /tmp
  install -m 0755 /tmp/dalfox-linux-amd64 /usr/local/bin/dalfox
  go install "github.com/OJ/gobuster/v3@v${GOBUSTER_VERSION}"
  go install github.com/ffuf/ffuf/v2@latest
  go install github.com/lc/gau/v2/cmd/gau@latest
  go install github.com/tomnomnom/waybackurls@latest
  go install github.com/hakluke/hakrawler@latest
  curl -fsSL "https://github.com/epi052/feroxbuster/releases/download/v${FEROXBUSTER_VERSION}/x86_64-linux-feroxbuster.zip" -o /tmp/feroxbuster.zip
  unzip -q /tmp/feroxbuster.zip -d /tmp/feroxbuster
  install -m 0755 /tmp/feroxbuster/feroxbuster /usr/local/bin/feroxbuster
  rm -rf /tmp/amass /tmp/amass.tar.gz /tmp/httpx /tmp/httpx.zip /tmp/katana /tmp/katana.zip /tmp/nuclei /tmp/nuclei.zip /tmp/subfinder /tmp/subfinder.zip /tmp/dalfox.tar.gz /tmp/dalfox-linux-amd64 /tmp/feroxbuster /tmp/feroxbuster.zip
}

install_cloud() {
  pipx install kube-hunter
  pipx install prowler
  pipx install scoutsuite
  go install "github.com/aquasecurity/kube-bench@v${KUBE_BENCH_VERSION}"
  curl -fsSL "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.deb" -o /tmp/trivy.deb
  dpkg -i /tmp/trivy.deb
  rm -f /tmp/trivy.deb
  if command -v ScoutSuite >/dev/null 2>&1 && ! command -v scout >/dev/null 2>&1; then ln -s "$(command -v ScoutSuite)" /usr/local/bin/scout; fi
}

install_windows() {
  apt-get update
  apt-get install -y --no-install-recommends \
    dnsenum \
    fierce \
    hashcat \
    hydra \
    john \
    medusa \
    ophcrack \
    patator \
    smbclient
  rm -rf /var/lib/apt/lists/*
  pipx install enum4linux.py
  pipx install git+https://github.com/cddmp/enum4linux-ng.git
  pipx install git+https://github.com/Pennyw0rth/NetExec
  pipx install responder
  gem install evil-winrm
  if command -v nxc >/dev/null 2>&1 && ! command -v crackmapexec >/dev/null 2>&1; then ln -s "$(command -v nxc)" /usr/local/bin/crackmapexec; fi
}

install_forensics() {
  apt-get update
  apt-get install -y --no-install-recommends \
    autoconf \
    automake \
    flex \
    foremost \
    libabsl-dev \
    libewf-dev \
    libexpat1-dev \
    libimage-exiftool-perl \
    libre2-dev \
    libssl-dev \
    libtool \
    pkg-config \
    scalpel \
    steghide
  rm -rf /var/lib/apt/lists/*
  pipx install volatility3
  curl -fsSL "https://github.com/simsong/bulk_extractor/releases/download/v${BULK_EXTRACTOR_VERSION}/bulk_extractor-${BULK_EXTRACTOR_VERSION}.tar.gz" -o /tmp/bulk_extractor.tar.gz
  mkdir -p /tmp/bulk_extractor
  tar -xzf /tmp/bulk_extractor.tar.gz -C /tmp/bulk_extractor --strip-components=1
  cd /tmp/bulk_extractor
  ./configure -q --enable-silent-rules
  make -j2 >/dev/null
  make install >/dev/null
  cd /
  rm -rf /tmp/bulk_extractor /tmp/bulk_extractor.tar.gz
  if command -v vol >/dev/null 2>&1 && ! command -v volatility >/dev/null 2>&1; then ln -s "$(command -v vol)" /usr/local/bin/volatility; fi
}

install_reversing() {
  apt-get update
  apt-get install -y --no-install-recommends \
    binwalk \
    checksec \
    default-jre-headless \
    gdb \
    openjdk-17-jre-headless
  rm -rf /var/lib/apt/lists/*
  curl -fsSL "https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_${GHIDRA_VERSION}_build/ghidra_${GHIDRA_VERSION}_PUBLIC_${GHIDRA_BUILD_DATE}.zip" -o /tmp/ghidra.zip
  unzip -q /tmp/ghidra.zip -d /opt
  ln -sf "/opt/ghidra_${GHIDRA_VERSION}_PUBLIC/ghidraRun" /usr/local/bin/ghidra
  curl -fsSL "https://github.com/radareorg/radare2/releases/download/${RADARE2_VERSION}/radare2_${RADARE2_VERSION}_amd64.deb" -o /tmp/radare2.deb
  dpkg -i /tmp/radare2.deb
  rm -f /tmp/ghidra.zip /tmp/radare2.deb
}

install_exploitation() {
  apt-get update
  apt-get install -y --no-install-recommends \
    libxml2-utils \
    masscan \
    pipx
  rm -rf /var/lib/apt/lists/*
  pipx install git+https://github.com/Tib3rius/AutoRecon.git
  pipx install hashid
  pipx install sublist3r
  pipx install git+https://github.com/laramies/theHarvester.git@4.7.1
  curl -fsSL "https://portswigger.net/burp/releases/download?product=community&version=${BURP_VERSION}&type=Jar" -o /opt/burpsuite-community.jar
  printf '%s\n' '#!/usr/bin/env sh' 'exec java -jar /opt/burpsuite-community.jar "$@"' > /usr/local/bin/burp
  chmod 0755 /usr/local/bin/burp
  curl -fsSL https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb -o /tmp/msfinstall
  chmod 0755 /tmp/msfinstall
  /tmp/msfinstall
  curl -fsSL "https://github.com/bee-san/RustScan/releases/download/${RUSTSCAN_VERSION}/x86_64-linux-rustscan.tar.gz.zip" -o /tmp/rustscan.zip
  unzip -q /tmp/rustscan.zip -d /tmp
  tar -xzf /tmp/x86_64-linux-rustscan.tar.gz -C /tmp
  install -m 0755 /tmp/rustscan /usr/local/bin/rustscan
  rm -f /tmp/msfinstall /tmp/rustscan.zip /tmp/x86_64-linux-rustscan.tar.gz /tmp/rustscan
  if command -v hashid >/dev/null 2>&1 && ! command -v hash-identifier >/dev/null 2>&1; then ln -s "$(command -v hashid)" /usr/local/bin/hash-identifier; fi
}

if [ "$#" -ne 1 ]; then
  echo "usage: install-tool-profile <profile>" >&2
  exit 1
fi

case "$1" in
  core) install_core ;;
  web) install_web ;;
  cloud) install_cloud ;;
  windows) install_windows ;;
  forensics) install_forensics ;;
  reversing) install_reversing ;;
  exploitation) install_exploitation ;;
  *)
    echo "unknown connector tool profile: $1" >&2
    exit 1
    ;;
esac
