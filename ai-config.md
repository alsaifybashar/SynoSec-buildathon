● Implementation Plan: SynoSec AI-Driven Pentest System

  ---
  Architecture Overview

  FRONTEND (React)
    Dashboard | Scan Config | DFS Graph | Findings | Report
          |  REST + WebSocket (live updates)
          v
  BACKEND (Express)
    /api/scan  /api/status  /api/findings  /api/graph  /api/abort
          |
          v
  ORCHESTRATOR (Claude AI Core)
    Scope enforcement → DFS graph → Agent dispatch → Analysis → Next round
     |         |         |         |        |       |
     v         v         v         v        v       v
   L3-Agent L4-Agent L5-Agent L6-Agent L7-Agent [L2-Agent]
   ICMP     Port     SMB/RPC  TLS/SSL  HTTP/API  ARP/VLAN
   Route    Scan     NetBIOS  Cert     SQLi/XSS  (stretch)
          \         |         |        /
           v        v         v       v
       KNOWLEDGE STORE (SQLite)
       findings | dfs_nodes | audit_log | scans

  ---
  OSI Layer Coverage

  ┌─────────────────┬─────────────────────────┬─────────────────────────────────────────────────┬──────────────────────────┐
  │      Layer      │          Agent          │                   Techniques                    │        POC Tools         │
  ├─────────────────┼─────────────────────────┼─────────────────────────────────────────────────┼──────────────────────────┤
  │ L1 Physical     │ Manual input            │ RF, hardware tap                                │ N/A (hardware required)  │
  ├─────────────────┼─────────────────────────┼─────────────────────────────────────────────────┼──────────────────────────┤
  │ L2 Data Link    │ l2-agent (stretch)      │ ARP enum, MAC discovery, VLAN                   │ simulated via AI         │
  ├─────────────────┼─────────────────────────┼─────────────────────────────────────────────────┼──────────────────────────┤
  │ L3 Network      │ l3-agent (must-have)    │ Host discovery, ICMP sweep, traceroute          │ AI simulation + nmap -sn │
  ├─────────────────┼─────────────────────────┼─────────────────────────────────────────────────┼──────────────────────────┤
  │ L4 Transport    │ l4-agent (must-have)    │ Port scan, TCP/UDP fingerprint, service version │ AI simulation + nmap -sV │
  ├─────────────────┼─────────────────────────┼─────────────────────────────────────────────────┼──────────────────────────┤
  │ L5 Session      │ l5-agent (nice-to-have) │ NetBIOS, SMB shares, RPC enum                   │ AI simulation            │
  ├─────────────────┼─────────────────────────┼─────────────────────────────────────────────────┼──────────────────────────┤
  │ L6 Presentation │ l6-agent (nice-to-have) │ TLS/SSL cipher audit, cert chain                │ AI simulation + sslscan  │
  ├─────────────────┼─────────────────────────┼─────────────────────────────────────────────────┼──────────────────────────┤
  │ L7 Application  │ l7-agent (must-have)    │ HTTP crawl, header audit, SQLi, XSS, API fuzz   │ AI simulation + nikto    │
  └─────────────────┴─────────────────────────┴─────────────────────────────────────────────────┴──────────────────────────┘

  ---
  DFS Graph Model

  A node = one testable surface: target + layer + service

  192.168.1.1 (L3) ──▶ :22 (L4/SSH) ──▶ SSH Banner Leak (L5)
                   └──▶ :443 (L4/HTTPS) ──▶ TLS Weak Cipher (L6)
                                        └──▶ /admin SQLi (L7)  ← HIGH RISK, explored first

  Risk scoring per node:
  - Service criticality (admin panels, databases = high)
  - Internet-facing vs internal
  - Unauthenticated services = higher priority
  - Known CVE density for detected versions
  - Depth penalty to bound the DFS

  ---
  Trust & Validation Mechanisms

  ┌────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────┐
  │       Mechanism        │                                      How it works                                       │
  ├────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Confidence score       │ Every finding carries confidence: 0.0-1.0. AI reasons about how certain the evidence is │
  ├────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Cross-agent validation │ HIGH/CRITICAL findings trigger a second agent (different technique) to verify           │
  ├────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Evidence requirement   │ Findings without raw evidence are auto-downgraded to info                               │
  ├────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Reproducibility        │ Every finding stores the exact technique/prompt used — can be re-run                    │
  ├────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Audit log              │ Every agent dispatch, result, scope check, and decision is logged with timestamp        │
  └────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────┘

  ---
  Safety Controls

  - Pre-execution scope check — base agent validates target is in scope before any action
  - Kill switch — POST /api/scan/:id/abort halts all agents immediately
  - Depth limit — DFS cannot exceed maxDepth (default: 3 for POC)
  - Time limit — scan auto-terminates after maxDuration minutes
  - Rate limiter — max N concurrent agents, N requests/sec
  - Read-only mode (POC default) — agents reason about findings, no active exploitation

  ---
  Hackathon MVP: Must-Have vs Cut

  ┌──────────────────────────────────────────┬──────────────┐
  │                 Feature                  │   Priority   │
  ├──────────────────────────────────────────┼──────────────┤
  │ Scan config form (input target)          │ Must         │
  ├──────────────────────────────────────────┼──────────────┤
  │ L3 + L4 + L7 agents                      │ Must         │
  ├──────────────────────────────────────────┼──────────────┤
  │ DFS graph visualization (react-flow)     │ Must         │
  ├──────────────────────────────────────────┼──────────────┤
  │ Findings list with severity + confidence │ Must         │
  ├──────────────────────────────────────────┼──────────────┤
  │ AI executive summary report              │ Must         │
  ├──────────────────────────────────────────┼──────────────┤
  │ Pre-seeded fallback demo data            │ Must         │
  ├──────────────────────────────────────────┼──────────────┤
  │ Abort/kill switch                        │ Must         │
  ├──────────────────────────────────────────┼──────────────┤
  │ L5 + L6 agents                           │ Nice-to-have │
  ├──────────────────────────────────────────┼──────────────┤
  │ Cross-agent validation                   │ Nice-to-have │
  ├──────────────────────────────────────────┼──────────────┤
  │ Real tool execution (nmap, sqlmap)       │ Cut          │
  ├──────────────────────────────────────────┼──────────────┤
  │ Auth, multi-tenant, scan history         │ Cut          │
  └──────────────────────────────────────────┴──────────────┘

  ---
  Implementation Phases

  Hour 0-1    Phase 1: Zod contracts/schemas (all types defined first)
  Hour 1-3    Phase 2: SQLite DB + API routes
  Hour 3-8    Phase 3: Base agent + L3/L4/L7 agents + Orchestrator + DFS graph
  Hour 8-9    Phase 4: WebSocket live updates wired to API
  Hour 9-12   Phase 5: All frontend components (config, graph, findings, report)
  Hour 12-14  Phase 6: Pre-seeded demo data + AI report generator
  Hour 14-16  Phase 7: UI polish (dark theme, severity colors, graph animations)
  Hour 16-18  Testing + bug fixes
  Hour 18-22  Demo rehearsal + edge cases
  Hour 22-24  Presentation prep

  ---
  Key Environment Variables

  ANTHROPIC_API_KEY=sk-ant-...
  CLAUDE_MODEL=claude-sonnet-4-6
  SCAN_MAX_DEPTH=3
  SCAN_MAX_DURATION_MINUTES=10
  SCAN_RATE_LIMIT_RPS=5

  ---
  Top Risks

  ┌───────────────────────────────────┬──────────────────────────────────────────────────────────────────┐
  │               Risk                │                            Mitigation                            │
  ├───────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ Claude API hallucinating findings │ Strict output schemas, confidence scoring, evidence requirement  │
  ├───────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ DFS graph explodes in size        │ maxDepth=3, cap at 50 total nodes for demo                       │
  ├───────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ WebSocket complexity              │ Fall back to 2s polling if needed                                │
  ├───────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ Scope violation by AI             │ Hardcoded scope check in base agent class, never delegated to AI │
  ├───────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ API key exposure                  │ .env only, validate at startup, never logged                     │
  └───────────────────────────────────┴──────────────────────────────────────────────────────────────────┘

  ---
  WAITING FOR CONFIRMATION — Does this plan match your vision? Any phases to adjust, scope to cut, or architecture decisions to revisit before I start writing code?
