import { randomUUID } from "crypto";
import { localDemoTargetDefaults, type AuditEntry, type DfsNode, type Finding, type Report, type Scan } from "@synosec/contracts";
import { createAuditEntry, createDfsNode, createFinding, createScan } from "../db/neo4j.js";

// ---------------------------------------------------------------------------
// In-memory report store (shared with routes)
// ---------------------------------------------------------------------------

export const reportStore = new Map<string, Report>();

// ---------------------------------------------------------------------------
// Seed demo scan
// ---------------------------------------------------------------------------

export async function seedDemoScan(): Promise<string> {
  const scanId = randomUUID();
  const now = new Date();

  const scan: Scan = {
    id: scanId,
    scope: {
      targets: [localDemoTargetDefaults.internalTarget],
      exclusions: [],
      layers: ["L3", "L4", "L7"],
      maxDepth: 3,
      maxDurationMinutes: 10,
      rateLimitRps: 5,
      allowActiveExploits: false
    },
    status: "complete",
    currentRound: 3,
    nodesTotal: 10,
    nodesComplete: 10,
    createdAt: new Date(now.getTime() - 8 * 60 * 1000).toISOString(),
    completedAt: now.toISOString()
  };

  await createScan(scan);

  // ---------------------------------------------------------------------------
  // Nodes
  // ---------------------------------------------------------------------------

  const nodeIds = {
    l3Root: randomUUID(),
    l3App: randomUUID(),
    l4Server1: randomUUID(),
    l4App: randomUUID(),
    l7Web: randomUUID(),
    l7Admin: randomUUID(),
    l7Api: randomUUID(),
    l5Ssh: randomUUID(),
    l4Db: randomUUID(),
    l7Db: randomUUID()
  };

  const nodes: DfsNode[] = [
    {
      id: nodeIds.l3Root,
      scanId,
      target: localDemoTargetDefaults.internalTarget,
      layer: "L3",
      riskScore: 0.5,
      status: "complete",
      parentId: null,
      depth: 0,
      createdAt: new Date(now.getTime() - 7 * 60 * 1000).toISOString()
    },
    {
      id: nodeIds.l3App,
      scanId,
      target: localDemoTargetDefaults.internalHost,
      layer: "L3",
      riskScore: 0.5,
      status: "complete",
      parentId: null,
      depth: 0,
      createdAt: new Date(now.getTime() - 6 * 60 * 1000).toISOString()
    },
    {
      id: nodeIds.l4Server1,
      scanId,
      target: localDemoTargetDefaults.internalHost,
      layer: "L4",
      riskScore: 0.6,
      status: "complete",
      parentId: nodeIds.l3Root,
      depth: 1,
      createdAt: new Date(now.getTime() - 5.5 * 60 * 1000).toISOString()
    },
    {
      id: nodeIds.l4App,
      scanId,
      target: localDemoTargetDefaults.internalHost,
      layer: "L4",
      riskScore: 0.65,
      status: "complete",
      parentId: nodeIds.l3App,
      depth: 1,
      createdAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    },
    {
      id: nodeIds.l7Web,
      scanId,
      target: localDemoTargetDefaults.internalHost,
      layer: "L7",
      service: "http",
      port: localDemoTargetDefaults.port,
      riskScore: 0.6,
      status: "complete",
      parentId: nodeIds.l4App,
      depth: 2,
      createdAt: new Date(now.getTime() - 4.5 * 60 * 1000).toISOString()
    },
    {
      id: nodeIds.l7Admin,
      scanId,
      target: localDemoTargetDefaults.internalHost,
      layer: "L7",
      service: "http-admin",
      port: localDemoTargetDefaults.port,
      riskScore: 0.9,
      status: "complete",
      parentId: nodeIds.l4App,
      depth: 2,
      createdAt: new Date(now.getTime() - 4 * 60 * 1000).toISOString()
    },
    {
      id: nodeIds.l7Api,
      scanId,
      target: localDemoTargetDefaults.internalHost,
      layer: "L7",
      service: "api",
      port: localDemoTargetDefaults.port,
      riskScore: 0.7,
      status: "complete",
      parentId: nodeIds.l4App,
      depth: 2,
      createdAt: new Date(now.getTime() - 3.5 * 60 * 1000).toISOString()
    },
    {
      id: nodeIds.l5Ssh,
      scanId,
      target: localDemoTargetDefaults.internalHost,
      layer: "L5",
      service: "ssh",
      port: 22,
      riskScore: 0.4,
      status: "complete",
      parentId: nodeIds.l4Server1,
      depth: 2,
      createdAt: new Date(now.getTime() - 3 * 60 * 1000).toISOString()
    },
    {
      id: nodeIds.l4Db,
      scanId,
      target: localDemoTargetDefaults.internalHost,
      layer: "L4",
      riskScore: 0.8,
      status: "complete",
      parentId: nodeIds.l3Root,
      depth: 1,
      createdAt: new Date(now.getTime() - 2.5 * 60 * 1000).toISOString()
    },
    {
      id: nodeIds.l7Db,
      scanId,
      target: localDemoTargetDefaults.internalHost,
      layer: "L7",
      service: "mysql",
      port: 3306,
      riskScore: 0.85,
      status: "complete",
      parentId: nodeIds.l4Db,
      depth: 2,
      createdAt: new Date(now.getTime() - 2 * 60 * 1000).toISOString()
    }
  ];

  for (const node of nodes) {
    await createDfsNode(node);
  }

  // ---------------------------------------------------------------------------
  // Findings
  // ---------------------------------------------------------------------------

  const findings: Finding[] = [
    // Critical
    {
      id: randomUUID(),
      nodeId: nodeIds.l7Web,
      scanId,
      agentId: "l7-application-agent",
      severity: "critical",
      confidence: 0.92,
      title: "SQL Injection in Login Form",
      description: "The /login endpoint is vulnerable to SQL injection via the username parameter. An attacker can bypass authentication or dump the entire database.",
      evidence: `POST /login HTTP/1.1\nHost: app.synosec.local\nContent-Type: application/x-www-form-urlencoded\n\nusername=admin%27+OR+%271%27%3D%271&password=x\n\nHTTP/1.1 200 OK\nContent-Type: text/html\n\n<h1>Welcome back, admin!</h1>\n<!-- Database: synosec_prod, Users: 247 -->`,
      technique: "SQLi probe",
      reproduceCommand: "sqlmap -u http://app.synosec.local/login --data='username=a&password=b' --dbs",
      validated: true,
      createdAt: new Date(now.getTime() - 4.4 * 60 * 1000).toISOString()
    },
    {
      id: randomUUID(),
      nodeId: nodeIds.l7Admin,
      scanId,
      agentId: "l7-application-agent",
      severity: "critical",
      confidence: 0.95,
      title: "Unauthenticated Admin Panel Access",
      description: "The /admin panel is accessible without any authentication. An attacker can view, modify, or delete all application data including user records, configurations, and API keys.",
      evidence: `GET /admin HTTP/1.1\nHost: app.synosec.local:8080\n\nHTTP/1.1 200 OK\nContent-Type: text/html\n\n<html><title>SynoSec Admin</title>\n<body><h1>Admin Dashboard</h1>\n<p>Total Users: 247</p>\n<p>API Key: sk-prod-xK9mN3pQ...</p>\n<a href='/admin/users'>Manage Users</a></body></html>`,
      technique: "Auth bypass",
      reproduceCommand: "curl -i http://app.synosec.local:8080/admin",
      validated: true,
      createdAt: new Date(now.getTime() - 3.9 * 60 * 1000).toISOString()
    },
    // High
    {
      id: randomUUID(),
      nodeId: nodeIds.l4Server1,
      scanId,
      agentId: "l4-transport-agent",
      severity: "high",
      confidence: 0.99,
      title: "Telnet Service Exposed on Port 23",
      description: "The server is running Telnet on port 23. Telnet transmits all data including credentials in cleartext. Any network eavesdropper can capture usernames and passwords.",
      evidence: `$ nmap -sV -p 23 192.168.1.10\nPORT   STATE SERVICE VERSION\n23/tcp open  telnet  Linux telnetd\n\n$ nc 192.168.1.10 23\nDebian GNU/Linux 10\nlogin: `,
      technique: "TCP SYN scan",
      reproduceCommand: "nmap -sV -p 23 192.168.1.10",
      validated: true,
      createdAt: new Date(now.getTime() - 5.3 * 60 * 1000).toISOString()
    },
    {
      id: randomUUID(),
      nodeId: nodeIds.l7Db,
      scanId,
      agentId: "l7-application-agent",
      severity: "high",
      confidence: 0.88,
      title: "MySQL Database Accessible From Network Without Authentication Filter",
      description: "MySQL (port 3306) is accessible from the network. The database accepted a connection attempt and returned version information without IP filtering or firewall protection.",
      evidence: `$ mysql -h 192.168.1.20 -u root -p''\nWelcome to the MySQL monitor. Commands end with ; or \\g.\nYour MySQL connection id is 42\nServer version: 8.0.28 MySQL Community Server - GPL\n\nmysql> show databases;\n+--------------------+\n| Database           |\n+--------------------+\n| information_schema |\n| synosec_prod       |\n| users              |\n+--------------------+`,
      technique: "Banner grab",
      reproduceCommand: "mysql -h 192.168.1.20 -u root --connect-timeout=5",
      validated: false,
      createdAt: new Date(now.getTime() - 1.9 * 60 * 1000).toISOString()
    },
    {
      id: randomUUID(),
      nodeId: nodeIds.l7Api,
      scanId,
      agentId: "l7-application-agent",
      severity: "high",
      confidence: 0.85,
      title: "API Endpoint Returns Sensitive User Data Without Authorization",
      description: "The /api/users endpoint returns a full list of user records including emails, hashed passwords, and internal IDs without requiring authentication.",
      evidence: `GET /api/users HTTP/1.1\nHost: app.synosec.local\n\nHTTP/1.1 200 OK\nContent-Type: application/json\n\n[{"id":1,"email":"admin@synosec.local","password_hash":"$2b$12$...","role":"admin"},\n {"id":2,"email":"john.doe@company.com","password_hash":"$2b$12$...","role":"user"}]`,
      technique: "API endpoint discovery",
      reproduceCommand: "curl -s https://app.synosec.local/api/users | jq .",
      validated: false,
      createdAt: new Date(now.getTime() - 3.3 * 60 * 1000).toISOString()
    },
    // Medium
    {
      id: randomUUID(),
      nodeId: nodeIds.l5Ssh,
      scanId,
      agentId: "l7-application-agent",
      severity: "medium",
      confidence: 0.85,
      title: "SSH Accepts Deprecated Ciphers and Key Exchange Algorithms",
      description: "The SSH server on 192.168.1.10 accepts deprecated cryptographic algorithms including arcfour and diffie-hellman-group1-sha1 which are vulnerable to known attacks.",
      evidence: `$ nmap --script ssh2-enum-algos 192.168.1.10 -p 22\nHost: 192.168.1.10\nPORT   STATE SERVICE\n22/tcp open  ssh\n| ssh2-enum-algos:\n|   kex_algorithms: (8)\n|       diffie-hellman-group1-sha1  <-- DEPRECATED\n|       diffie-hellman-group14-sha1 <-- DEPRECATED\n|   encryption_algorithms: (6)\n|       arcfour256  <-- DEPRECATED\n|       arcfour128  <-- DEPRECATED`,
      technique: "SSH banner grab",
      reproduceCommand: "nmap --script ssh2-enum-algos -p 22 192.168.1.10",
      validated: false,
      createdAt: new Date(now.getTime() - 2.9 * 60 * 1000).toISOString()
    },
    {
      id: randomUUID(),
      nodeId: nodeIds.l7Web,
      scanId,
      agentId: "l7-application-agent",
      severity: "medium",
      confidence: 0.9,
      title: "Verbose Error Messages Reveal Stack Traces",
      description: "Application error pages expose full stack traces including file paths, framework versions, and database query details. This information aids attackers in crafting targeted exploits.",
      evidence: `GET /api/users?id=abc HTTP/1.1\nHost: app.synosec.local\n\nHTTP/1.1 500 Internal Server Error\nContent-Type: text/html\n\n<h1>Application Error</h1>\n<pre>TypeError: Invalid input at /app/src/routes/users.js:42\n    at validateId (/app/src/middleware/validate.js:18)\nNode.js v18.12.0, Express 4.18.2\nMySQL Error: SQLSTATE[HY093]</pre>`,
      technique: "Error page analysis",
      reproduceCommand: "curl 'http://app.synosec.local/api/users?id=abc'",
      validated: false,
      createdAt: new Date(now.getTime() - 4.2 * 60 * 1000).toISOString()
    },
    {
      id: randomUUID(),
      nodeId: nodeIds.l4App,
      scanId,
      agentId: "l4-transport-agent",
      severity: "medium",
      confidence: 0.8,
      title: "SNMP Service with Default Community String",
      description: "SNMP is running on UDP/161 and responds to the default 'public' community string, exposing detailed system information including installed software, network interfaces, and running processes.",
      evidence: `$ snmpwalk -v2c -c public app.synosec.local\niso.3.6.1.2.1.1.1.0 = STRING: Linux app.synosec.local 5.10.0-19\niso.3.6.1.2.1.1.4.0 = STRING: admin@synosec.local\niso.3.6.1.2.1.1.5.0 = STRING: app.synosec.local`,
      technique: "UDP scan",
      reproduceCommand: "snmpwalk -v2c -c public app.synosec.local",
      validated: false,
      createdAt: new Date(now.getTime() - 4.8 * 60 * 1000).toISOString()
    },
    {
      id: randomUUID(),
      nodeId: nodeIds.l7Web,
      scanId,
      agentId: "l7-application-agent",
      severity: "medium",
      confidence: 0.78,
      title: "Reflected Cross-Site Scripting (XSS) in Search Parameter",
      description: "The search functionality at /search?q= reflects user input without proper HTML encoding, allowing attackers to inject malicious scripts that execute in victims' browsers.",
      evidence: `GET /search?q=<script>alert(document.cookie)</script> HTTP/1.1\nHost: app.synosec.local\n\nHTTP/1.1 200 OK\n\n<h2>Results for: <script>alert(document.cookie)</script></h2>`,
      technique: "XSS reflection",
      reproduceCommand: "curl 'http://app.synosec.local/search?q=%3Cscript%3Ealert(1)%3C/script%3E'",
      validated: false,
      createdAt: new Date(now.getTime() - 4.1 * 60 * 1000).toISOString()
    },
    // Low
    {
      id: randomUUID(),
      nodeId: nodeIds.l7Web,
      scanId,
      agentId: "l7-application-agent",
      severity: "low",
      confidence: 0.99,
      title: "Missing HTTP Strict Transport Security (HSTS) Header",
      description: "The application does not set the Strict-Transport-Security header, leaving users vulnerable to SSL stripping attacks and downgrade attacks to HTTP.",
      evidence: `$ curl -I http://app.synosec.local\nHTTP/1.1 200 OK\nDate: Sat, 12 Apr 2026 10:00:00 GMT\nServer: Apache/2.4.38\n[MISSING: Strict-Transport-Security]`,
      technique: "Header audit",
      reproduceCommand: "curl -I http://app.synosec.local | grep -i strict",
      validated: false,
      createdAt: new Date(now.getTime() - 4.0 * 60 * 1000).toISOString()
    },
    {
      id: randomUUID(),
      nodeId: nodeIds.l7Api,
      scanId,
      agentId: "l7-application-agent",
      severity: "low",
      confidence: 0.99,
      title: "X-Powered-By Header Discloses Framework Version",
      description: "The X-Powered-By response header reveals the server-side framework and version (Express/4.18.2, Node.js). This information assists attackers in identifying known CVEs.",
      evidence: `HTTP/1.1 200 OK\nX-Powered-By: Express\nServer: nginx/1.18.0\n\nNote: Combined with error messages disclosing Node.js v18.12.0, full stack is identifiable.`,
      technique: "Tech fingerprint",
      reproduceCommand: "curl -I https://app.synosec.local/api/",
      validated: false,
      createdAt: new Date(now.getTime() - 3.2 * 60 * 1000).toISOString()
    },
    {
      id: randomUUID(),
      nodeId: nodeIds.l7Web,
      scanId,
      agentId: "l7-application-agent",
      severity: "low",
      confidence: 0.95,
      title: "Missing Content-Security-Policy Header",
      description: "No Content-Security-Policy header is present. This increases the risk of XSS attacks by allowing inline scripts and resources from any origin.",
      evidence: `HTTP/1.1 200 OK\nServer: Apache/2.4.38\n[MISSING: Content-Security-Policy]\n[MISSING: X-Frame-Options]\n[MISSING: X-Content-Type-Options]`,
      technique: "Header audit",
      reproduceCommand: "curl -sI http://app.synosec.local | grep -E 'Content-Security|X-Frame|X-Content'",
      validated: false,
      createdAt: new Date(now.getTime() - 4.3 * 60 * 1000).toISOString()
    },
    // Info
    {
      id: randomUUID(),
      nodeId: nodeIds.l5Ssh,
      scanId,
      agentId: "l4-transport-agent",
      severity: "info",
      confidence: 0.99,
      title: "OpenSSH Version Banner Disclosure",
      description: "The SSH service reveals its exact version in the banner. While informational, this can help attackers identify version-specific vulnerabilities.",
      evidence: `$ nc 192.168.1.10 22\nSSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2`,
      technique: "Banner grab",
      reproduceCommand: "nc -w 3 192.168.1.10 22",
      validated: false,
      createdAt: new Date(now.getTime() - 2.8 * 60 * 1000).toISOString()
    },
    {
      id: randomUUID(),
      nodeId: nodeIds.l3Root,
      scanId,
      agentId: "l3-network-agent",
      severity: "info",
      confidence: 0.99,
      title: "Network Topology Mapped — 3 Live Hosts Identified",
      description: "ICMP sweep of 192.168.1.0/24 identified 3 live hosts. Network routing uses a single gateway at 192.168.1.1 with no segmentation between hosts.",
      evidence: `$ nmap -sn 192.168.1.0/24\nHost: 192.168.1.1 is up  (gateway)\nHost: 192.168.1.10 is up (web server)\nHost: 192.168.1.20 is up (database)\nNmap done: 3 hosts up`,
      technique: "ICMP sweep",
      reproduceCommand: "nmap -sn 192.168.1.0/24",
      validated: false,
      createdAt: new Date(now.getTime() - 6.8 * 60 * 1000).toISOString()
    },
    {
      id: randomUUID(),
      nodeId: nodeIds.l3App,
      scanId,
      agentId: "l3-network-agent",
      severity: "info",
      confidence: 0.95,
      title: "OS Fingerprint: Linux 5.10 (Debian) Identified",
      description: "TTL analysis and TCP/IP stack behavior fingerprinting identified the target as running Linux kernel 5.10.x (likely Debian 11).",
      evidence: `$ nmap -O app.synosec.local\nOS details: Linux 5.10 - 5.11\nNetwork Distance: 1 hop\nTTL=64 (Linux default)\nWindow size=65535`,
      technique: "OS fingerprint",
      reproduceCommand: "nmap -O app.synosec.local",
      validated: false,
      createdAt: new Date(now.getTime() - 5.8 * 60 * 1000).toISOString()
    }
  ];

  for (const finding of findings) {
    await createFinding(finding);
  }

  // ---------------------------------------------------------------------------
  // Audit entries
  // ---------------------------------------------------------------------------

  const auditEntries: AuditEntry[] = [
    {
      id: randomUUID(),
      scanId,
      timestamp: new Date(now.getTime() - 7 * 60 * 1000).toISOString(),
      actor: "orchestrator",
      action: "scan-started",
      scopeValid: true,
      details: { targets: [localDemoTargetDefaults.internalTarget], maxDepth: 3 }
    },
    {
      id: randomUUID(),
      scanId,
      timestamp: new Date(now.getTime() - 6 * 60 * 1000).toISOString(),
      actor: "l3-network-agent",
      action: "l3-scan-complete",
      targetNodeId: nodeIds.l3Root,
      scopeValid: true,
      details: { findingsCount: 2, discoveredHosts: [localDemoTargetDefaults.internalHost] }
    },
    {
      id: randomUUID(),
      scanId,
      timestamp: new Date(now.getTime() - 4 * 60 * 1000).toISOString(),
      actor: "orchestrator",
      action: "round-complete",
      scopeValid: true,
      details: { round: 1, summary: `L3 recon complete. Local target ${localDemoTargetDefaults.internalTarget} is reachable. Proceeding with L4 and L7 validation against the same-machine demo service.` }
    },
    {
      id: randomUUID(),
      scanId,
      timestamp: now.toISOString(),
      actor: "orchestrator",
      action: "scan-complete",
      scopeValid: true,
      details: {
        totalFindings: findings.length,
        critical: findings.filter((f) => f.severity === "critical").length,
        high: findings.filter((f) => f.severity === "high").length
      }
    }
  ];

  for (const entry of auditEntries) {
    await createAuditEntry(entry);
  }

  // ---------------------------------------------------------------------------
  // Pre-written report
  // ---------------------------------------------------------------------------

  const findingsBySeverity = {
    info: findings.filter((f) => f.severity === "info").length,
    low: findings.filter((f) => f.severity === "low").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    high: findings.filter((f) => f.severity === "high").length,
    critical: findings.filter((f) => f.severity === "critical").length
  };

  const report: Report = {
    scanId,
    executiveSummary: `The penetration test of the local demo target at ${localDemoTargetDefaults.internalTarget} revealed a critical security posture that requires immediate attention. Two critical vulnerabilities were identified: an SQL injection vulnerability in the authentication endpoint that allows complete authentication bypass, and an unauthenticated administration panel that exposes all system data and configuration.

The application infrastructure shows systemic security deficiencies including network-accessible databases without authentication controls, deprecated cryptographic protocols on SSH, and widespread information disclosure through verbose error messages and missing security headers. The combination of these findings creates multiple viable attack paths from network perimeter to complete system compromise.

Immediate remediation is required for the SQL injection and unauthenticated admin panel vulnerabilities. The telnet service and network-exposed MySQL instance must be addressed within 24-48 hours. The remaining medium and low findings should be remediated as part of a structured security improvement program within 30 days.`,
    totalFindings: findings.length,
    findingsBySeverity,
    topRisks: [
      {
        title: "SQL Injection in Login Form",
        severity: "critical",
        nodeTarget: localDemoTargetDefaults.hostUrl,
        recommendation: "Use parameterized queries or prepared statements for all database operations. Implement a WAF rule to detect SQLi patterns. Conduct a full code audit of database interaction points."
      },
      {
        title: "Unauthenticated Admin Panel Access",
        severity: "critical",
        nodeTarget: `${localDemoTargetDefaults.hostUrl}/admin`,
        recommendation: "Immediately restrict access to /admin with strong authentication (MFA). Move admin interface to a separate internal network segment. Add IP allowlist for admin endpoint access."
      },
      {
        title: "Telnet Service Exposed on Port 23",
        severity: "high",
        nodeTarget: localDemoTargetDefaults.internalHost,
        recommendation: "Disable Telnet immediately and replace with SSH. Remove telnetd package. Add firewall rule to block port 23 at the network perimeter."
      },
      {
        title: "MySQL Database Accessible From Network",
        severity: "high",
        nodeTarget: localDemoTargetDefaults.internalHost,
        recommendation: "Restrict MySQL to localhost or specific application server IPs using bind-address configuration. Implement network segmentation with VLAN for database tier. Review and remove root access from remote hosts."
      },
      {
        title: "API Endpoint Returns Sensitive User Data Without Authorization",
        severity: "high",
        nodeTarget: `${localDemoTargetDefaults.hostUrl}/api/users`,
        recommendation: "Implement authentication middleware on all /api/ routes. Apply principle of least privilege to API responses. Remove sensitive fields (password_hash, internal IDs) from API responses."
      }
    ],
    attackPaths: [
      {
        nodeIds: [nodeIds.l3App, nodeIds.l4App, nodeIds.l7Web],
        risk: 0.95,
        description: `External access → ${localDemoTargetDefaults.hostUrl} → SQL injection in /login → database compromise → full authentication bypass`
      },
      {
        nodeIds: [nodeIds.l3App, nodeIds.l4App, nodeIds.l7Admin],
        risk: 0.95,
        description: `External access → ${localDemoTargetDefaults.hostUrl}/admin → unauthenticated admin panel → complete system takeover`
      },
      {
        nodeIds: [nodeIds.l3Root, nodeIds.l4Db, nodeIds.l7Db],
        risk: 0.85,
        description: `Network access → ${localDemoTargetDefaults.internalHost}:3306 → MySQL without authentication → full database access`
      }
    ],
    generatedAt: now.toISOString()
  };

  reportStore.set(scanId, report);

  return scanId;
}
