import { authFlowProbeTool } from "./tools/auth/auth-flow-probe.js";
import { jwtAnalyzerTool } from "./tools/auth/jwt-analyzer.js";
import { contentDiscoveryTool } from "./tools/content/content-discovery.js";
import { dirbScanTool } from "./tools/content/dirb-scan.js";
import { ffufScanTool } from "./tools/content/ffuf-scan.js";
import { gobusterScanTool } from "./tools/content/gobuster-scan.js";
import { webCrawlTool } from "./tools/content/web-crawl.js";
import { metasploitFrameworkTool } from "./tools/exploitation/metasploit-framework.js";
import { binwalkTool } from "./tools/forensics/binwalk.js";
import { bulkExtractorTool } from "./tools/forensics/bulk-extractor.js";
import { exifToolTool } from "./tools/forensics/exiftool.js";
import { foremostTool } from "./tools/forensics/foremost.js";
import { scalpelTool } from "./tools/forensics/scalpel.js";
import { steghideInfoTool } from "./tools/forensics/steghide-info.js";
import { volatilityTool } from "./tools/forensics/volatility.js";
import { autoreconTool } from "./tools/network/autorecon.js";
import { masscanTool } from "./tools/network/masscan.js";
import { ncatProbeTool } from "./tools/network/ncat-probe.js";
import { netcatProbeTool } from "./tools/network/netcat-probe.js";
import { nmapScanTool } from "./tools/network/nmap-scan.js";
import { rustScanTool } from "./tools/network/rustscan.js";
import { serviceFingerprintTool } from "./tools/network/service-fingerprint.js";
import { serviceScanTool } from "./tools/network/service-scan.js";
import { tlsAuditTool } from "./tools/network/tls-audit.js";
import { networkSegmentMapTool } from "./tools/network/network-segment-map.js";
import { cipherIdentifierTool } from "./tools/password/cipher-identifier.js";
import { hashIdentifierTool } from "./tools/password/hash-identifier.js";
import { hashcatCrackTool } from "./tools/password/hashcat-crack.js";
import { hydraTool } from "./tools/password/hydra.js";
import { johntheRipperTool } from "./tools/password/john-the-ripper.js";
import { medusaTool } from "./tools/password/medusa.js";
import { ophcrackTool } from "./tools/password/ophcrack.js";
import { patatorTool } from "./tools/password/patator.js";
import { amassEnumTool } from "./tools/subdomain/amass-enum.js";
import { dNSenumTool } from "./tools/subdomain/dnsenum.js";
import { fierceTool } from "./tools/subdomain/fierce.js";
import { subfinderTool } from "./tools/subdomain/subfinder.js";
import { sublist3rEnumTool } from "./tools/subdomain/sublist3r-enum.js";
import { theHarvesterTool } from "./tools/subdomain/theharvester.js";
import { agentBashCommandTool } from "./tools/utility/agent-bash-command.js";
import { bashProbeTool } from "./tools/utility/bash-probe.js";
import { checksecTool } from "./tools/utility/checksec.js";
import { gDBTool } from "./tools/utility/gdb.js";
import { ghidraTool } from "./tools/utility/ghidra.js";
import { kubebenchTool } from "./tools/utility/kube-bench.js";
import { kubehunterTool } from "./tools/utility/kube-hunter.js";
import { objdumpTool } from "./tools/utility/objdump.js";
import { prowlerTool } from "./tools/utility/prowler.js";
import { radare2Tool } from "./tools/utility/radare2.js";
import { scoutSuiteTool } from "./tools/utility/scout-suite.js";
import { stringsTool } from "./tools/utility/strings.js";
import { trivyTool } from "./tools/utility/trivy.js";
import { arjunTool } from "./tools/web/arjun.js";
import { burpSuiteTool } from "./tools/web/burp-suite.js";
import { dalfoxTool } from "./tools/web/dalfox.js";
import { dirsearchTool } from "./tools/web/dirsearch.js";
import { feroxbusterTool } from "./tools/web/feroxbuster.js";
import { gauTool } from "./tools/web/gau.js";
import { hakrawlerTool } from "./tools/web/hakrawler.js";
import { httpHeadersTool } from "./tools/web/http-headers.js";
import { httpReconTool } from "./tools/web/http-recon.js";
import { hTTPxTool } from "./tools/web/httpx.js";
import { katanaTool } from "./tools/web/katana.js";
import { niktoScanTool } from "./tools/web/nikto-scan.js";
import { nucleiTool } from "./tools/web/nuclei.js";
import { paramSpiderTool } from "./tools/web/paramspider.js";
import { sqlInjectionCheckTool } from "./tools/web/sql-injection-check.js";
import { sqlmapScanTool } from "./tools/web/sqlmap-scan.js";
import { vulnAuditTool } from "./tools/web/vuln-audit.js";
import { waybackurlsTool } from "./tools/web/waybackurls.js";
import { whatWebTool } from "./tools/web/whatweb.js";
import { wPScanTool } from "./tools/web/wpscan.js";
import { crackMapExecTool } from "./tools/windows/crackmapexec.js";
import { enum4linuxngTool } from "./tools/windows/enum4linux-ng.js";
import { enum4linuxTool } from "./tools/windows/enum4linux.js";
import { evilWinRMTool } from "./tools/windows/evil-winrm.js";
import { netExecTool } from "./tools/windows/netexec.js";
import { responderTool } from "./tools/windows/responder.js";
import {
  attackPathHandoffJsonSchema,
  defaultWorkflowStageSystemPrompt,
  type AiTool
} from "@synosec/contracts";

export const localApplicationId = "5ecf4a8e-df5f-4945-a7e1-230ef43eac80";
export const localAttackPathApplicationId = "71ddf550-989e-49c2-8567-8521ebea65b8";
export const localFullStackApplicationId = "b21f6edc-6524-4d67-9f3a-8b5dfef6f6f7";
export const portfolioApplicationId = "1f92a3d7-4f70-4950-b750-9bf74c6f3591";
export const securePentApplicationId = "4d8e9e0a-bfd4-4b24-8fb9-8656b511a2b8";
export const osiSingleAgentWorkflowId = "8b57f0e7-1dd7-4d6a-8db5-c4ff7be80a21";
export const attackVectorPlanningWorkflowId = "9b59b237-c956-44db-aab0-a46b9f4bf8b3";
export const bashSingleToolWorkflowId = "6b8d087e-43bc-48d8-8e66-a167f8d9f5cb";
export const portfolioEvidenceGraphWorkflowId = "5edb1601-27cf-4a87-b7d4-a50873f5d985";

const defaultWorkflowStagePrompts = {
  stageSystemPrompt: defaultWorkflowStageSystemPrompt
} as const;

const attackVectorPlanningStagePrompt = [
  "Role and goal:",
  "Complete the current workflow stage by mapping plausible attack venues, attack vectors, and prioritized attack paths across the approved target surface.",
  "",
  "Working style:",
  "Keep progress updates concise and action-oriented.",
  "",
  "Evidence expectations:",
  "Prefer concrete, evidence-backed findings over unsupported narrative.",
  "Use persisted tool-result quotes as evidence; do not invent evidence.",
  "Distinguish confirmed findings from weaker hypotheses when the evidence is incomplete.",
  "Do not describe an attack path as confirmed compromise, takeover, credential theft, or privilege escalation unless the final outcome was directly observed or the transition was validated end-to-end.",
  "If individual findings are confirmed but the full chain lacks replay, label the path as plausible or qualified and state the missing validation explicitly.",
  "",
  "Finding and path requirements:",
  "Report 1-4 supported weaknesses.",
  "Use returned finding ids when linking findings, reporting attack vectors, and building handoff paths.",
  "When one finding enables or supports another, prefer explicit attack-vector records after both findings exist.",
  "If an explicit attack-vector record is not applicable, include relationship fields such as derivedFromFindingIds, relatedFindingIds, or enablesFindingIds, or include chain metadata with explanationSummary and confidenceReason.",
  "Each linked path must state what the venue exposes, what the vector requires, which finding ids support it, and what uncertainty remains.",
  "",
  "Stage result expectations:",
  "Use the handoff to summarize attackVenues, attackVectors, and prioritized attackPaths.",
  "Every handoff attack path must reference returned finding ids.",
  "Separate confirmed findings from unproven attack-path outcomes.",
  "Present recommended next steps as validation work unless compromise was directly observed."
].join("\n");

const bashAttackPathStagePrompt = [
  "Evaluate the target’s cybersecurity with an attack-path-first approach.",
  "",
  "Your primary goal is to identify whether multiple lower-severity weaknesses can be chained to reach a protected asset,",
  "privileged action, sensitive secret, account/session, internal service, or production-impacting capability.",
  "",
  "Start by mapping the application:",
  "- Identify exposed pages, APIs, parameters, forms, and linked resources.",
  "- Look for leaked identifiers, tokens, emails, build IDs, case IDs, workspace names, nonce values, session hints, feature",
  "flags, internal hostnames, or operational metadata.",
  "- Identify protected or high-impact endpoints and determine what prerequisites they require.",
  "",
  "Prioritize findings that act as attack-path steps:",
  "- Public metadata that reveals required inputs for another endpoint.",
  "- IDOR or weak object lookup where public identifiers unlock private records.",
  "- Weak authentication or recovery flows where leaked values can create sessions.",
  "- Authorization checks that depend only on guessable, leaked, or client-supplied values.",
  "- Endpoints that return secrets, tokens, privileged state, deployment data, or administrative capabilities only after",
  "chained prerequisites are supplied.",
  "",
  "Do not stop at standalone observations if they may be chain inputs.",
  "For each promising finding, ask:",
  "1. What value or capability did this expose?",
  "2. What later endpoint could use it?",
  "3. Can I validate the transition with a concrete request?",
  "4. Can I reach a higher-impact outcome by combining findings?",
  "",
  "Validation requirements:",
  "- Validate each reported finding with concrete request/response evidence.",
  "- Validate attack vectors by proving that output from one step is accepted by the next step.",
  "- Prefer a completed chain over isolated findings.",
  "- Report standalone issues like reflected XSS, missing headers, verbose health checks, or exposed framework versions only if",
  "they materially contribute to a chain or no stronger chain exists.",
  "- Do not inflate severity for a standalone issue when the source evidence only proves a low- or medium-impact condition.",
  "",
  "Use targeted shell commands and available tools to gather evidence.",
  "Log progress as you discover surfaces, hypotheses, validation attempts, and confirmed transitions.",
  "Map progress with nodes/findings and attack graph tools.",
  "",
  "When reporting:",
  "- Prefer at most four strong findings.",
  "- Include the role of each finding in the attack path: prerequisite leak, transition weakness, session creation,",
  "authorization bypass, or final impact.",
  "- Include attack vectors between existing finding IDs when one finding enables exploitation of another.",
  "- If a complete path is proven, include the final protected asset or action reached.",
  "- If a suspected chain cannot be completed, report what was proven and what blocked completion without inventing missing",
  "steps.",
  "",
  "Avoid treating scanner-friendly issues as the main result unless they lead somewhere.",
  "Missing headers, reflected input, version disclosure, health metadata, and generic information disclosure are supporting",
  "evidence, not primary findings, unless you prove concrete downstream impact.",
  "",
  "Suggested attack-path workflow:",
  "1. Crawl root and linked pages.",
  "2. Extract candidate artifacts: IDs, tokens, emails, nonces, build names, workspace names, case refs.",
  "3. Probe likely API routes using discovered artifacts.",
  "4. Identify protected endpoints and required parameters from errors, hints, forms, and route behavior.",
  "5. Reuse leaked artifacts against those endpoints.",
  "6. Confirm whether the chain reaches secrets, sessions, privileged actions, or sensitive records.",
  "7. Report findings and vectors only after evidence proves each transition.",
  "",
  "Avoid treating scanner-friendly issues as the main result unless they lead somewhere.",
  "Missing headers, reflected input, version disclosure, health metadata, and generic information disclosure are supporting evidence, not primary findings, unless you prove concrete downstream impact.",
  "",
  "Suggested attack-path workflow:",
  "1. Crawl root and linked pages.",
  "2. Extract candidate artifacts: IDs, tokens, emails, nonces, build names, workspace names, case refs.",
  "3. Probe likely API routes using discovered artifacts.",
  "4. Identify protected endpoints and required parameters from errors, hints, forms, and route behavior.",
  "5. Reuse leaked artifacts against those endpoints.",
  "6. Confirm whether the chain reaches secrets, sessions, privileged actions, or sensitive records.",
  "7. Report findings and vectors only after evidence proves each transition.",
  "",
  "Available dependencies:",
  "amass, arjun, autorecon, bash, binwalk, bulk_extractor, burp, checksec, cipher-identifier, crackmapexec, curl, dalfox, dirb, dirsearch, dnsenum, enum4linux, enum4linux-ng, evil-winrm, exiftool, feroxbuster, ffuf, fierce, foremost, gau, gdb, ghidra, gobuster, hakrawler, hash-identifier, hashcat, httpx, hydra, john, katana, kube-bench, kube-hunter, masscan, medusa, msfconsole, nc, ncat, nikto, nmap, node, nuclei, nxc, objdump, openssl, ophcrack, paramspider, patator, prowler, r2, responder, rustscan, scalpel, scout, sqlmap, steghide, strings, subfinder, sublist3r, theHarvester, trivy, volatility, waybackurls, whatweb, wpscan"
].join("\n");

const attackPathSemanticFamilyToolIds = [
  "builtin-http-surface-assessment",
  "builtin-network-service-enumeration",
  "builtin-tls-posture-audit",
  "builtin-content-discovery",
  "builtin-web-crawl-mapping",
  "builtin-parameter-discovery",
  "builtin-web-vulnerability-audit",
  "builtin-sql-injection-validation",
  "builtin-xss-validation",
  "builtin-auth-flow-assessment",
  "builtin-subdomain-discovery",
  "builtin-dns-enumeration"
] as const;

const workflowBuiltinActionToolIds = [
  "builtin-log-progress",
  "builtin-report-finding",
  "builtin-complete-run"
] as const;

export type SeededRoleKey = "generic-pentester" | "bash-poc-agent";

function withConstraintProfile<
  T extends {
    id: string;
    category: string;
    riskTier: string;
    bashSource: string;
    executorType: "bash";
    sandboxProfile: "network-recon" | "read-only-parser" | "active-recon" | "controlled-exploit-lab";
    privilegeProfile: "read-only-network" | "active-network" | "controlled-exploit";
    timeoutMs: number;
    capabilities: readonly string[];
  }
>(tool: T) {
  const pathExclusionCompatibleIds = new Set([
    "seed-httpx",
    "seed-http-recon",
    "seed-http-headers",
    "seed-web-crawl",
    "seed-katana",
    "seed-hakrawler",
    "seed-gau",
    "seed-waybackurls",
    "seed-whatweb",
    "seed-nikto-scan",
    "seed-content-discovery",
    "seed-dirsearch",
    "seed-feroxbuster",
    "seed-gobuster-scan",
    "seed-ffuf-scan",
    "seed-arjun",
    "seed-nuclei",
    "seed-paramspider"
  ]);
  const contentEnumerationIds = new Set([
    "seed-web-crawl",
    "seed-katana",
    "seed-content-discovery",
    "seed-dirsearch",
    "seed-feroxbuster",
    "seed-gobuster-scan",
    "seed-ffuf-scan",
    "seed-arjun",
    "seed-paramspider"
  ]);

  const readOnlyWebCategories = new Set(["topology", "auth", "web", "content", "dns", "subdomain", "network", "cloud", "kubernetes", "utility"]);
  const targetKinds: NonNullable<AiTool["constraintProfile"]>["targetKinds"] = tool.category === "web" || tool.category === "content"
    ? ["host", "domain", "url"]
    : ["host", "domain"];
  return {
    ...tool,
    constraintProfile: {
      enforced: tool.riskTier !== "controlled-exploit" && tool.category !== "exploitation",
      targetKinds,
      networkBehavior: tool.riskTier === "passive" ? "outbound-read" : "outbound-active",
      mutationClass: tool.riskTier === "controlled-exploit"
        ? "exploit"
        : contentEnumerationIds.has(tool.id)
          ? "content-enumeration"
          : tool.riskTier === "active"
            ? "active-validation"
            : "none",
      supportsHostAllowlist: readOnlyWebCategories.has(tool.category),
      supportsPathExclusions: pathExclusionCompatibleIds.has(tool.id),
      supportsRateLimit: pathExclusionCompatibleIds.has(tool.id)
    }
  } as const;
}

const rawSeededToolDefinitions = [
  authFlowProbeTool,
  jwtAnalyzerTool,
  contentDiscoveryTool,
  dirbScanTool,
  ffufScanTool,
  gobusterScanTool,
  webCrawlTool,
  metasploitFrameworkTool,
  binwalkTool,
  bulkExtractorTool,
  exifToolTool,
  foremostTool,
  scalpelTool,
  steghideInfoTool,
  volatilityTool,
  autoreconTool,
  masscanTool,
  ncatProbeTool,
  netcatProbeTool,
  nmapScanTool,
  rustScanTool,
  serviceFingerprintTool,
  serviceScanTool,
  tlsAuditTool,
  networkSegmentMapTool,
  cipherIdentifierTool,
  hashIdentifierTool,
  hashcatCrackTool,
  hydraTool,
  johntheRipperTool,
  medusaTool,
  ophcrackTool,
  patatorTool,
  amassEnumTool,
  dNSenumTool,
  fierceTool,
  subfinderTool,
  sublist3rEnumTool,
  theHarvesterTool,
  agentBashCommandTool,
  bashProbeTool,
  checksecTool,
  gDBTool,
  ghidraTool,
  kubebenchTool,
  kubehunterTool,
  objdumpTool,
  prowlerTool,
  radare2Tool,
  scoutSuiteTool,
  stringsTool,
  trivyTool,
  arjunTool,
  burpSuiteTool,
  dalfoxTool,
  dirsearchTool,
  feroxbusterTool,
  gauTool,
  hakrawlerTool,
  httpHeadersTool,
  httpReconTool,
  hTTPxTool,
  katanaTool,
  niktoScanTool,
  nucleiTool,
  paramSpiderTool,
  sqlInjectionCheckTool,
  sqlmapScanTool,
  vulnAuditTool,
  waybackurlsTool,
  whatWebTool,
  wPScanTool,
  crackMapExecTool,
  enum4linuxngTool,
  enum4linuxTool,
  evilWinRMTool,
  netExecTool,
  responderTool
] as const;

export const seededToolDefinitions = rawSeededToolDefinitions.map((tool) => withConstraintProfile(tool));

export function validateSeededToolDefinitions() {
  for (const tool of seededToolDefinitions) {
    const bashSource = tool.bashSource;

    if (typeof bashSource !== "string" || bashSource.trim().length === 0) {
      throw new Error(`Seeded tool ${tool.id} did not resolve a valid bashSource.`);
    }
  }
}

export const seededRoleDefinitions = [
  {
    key: "generic-pentester" as const,
    name: "Generic Pentester",
    description: "Default pentesting agent for capability-level workflow execution and attack-path reasoning.",
    systemPrompt:
      [
        "Role and goal:",
        "Map how weaknesses may connect, identify plausible attack paths, and keep every linked vulnerability grounded in evidence or explicitly qualified uncertainty.",
        "",
        "Scope and safety boundaries:",
        "Do not ask for raw tool access, brand-specific substitutions, or alternate execution paths outside the exposed workflow surface.",
        "",
        "Evidence and reporting requirements:",
        "Prefer structured evidence-backed findings over free-form narrative.",
        "Focus on linking potential vulnerabilities, preconditions, and follow-on impact rather than reporting isolated observations with no attack-path context.",
        "Distinguish confirmed findings, plausible hypotheses, and rejected leads in your reporting.",
        "For concrete supported findings and plausible linked vulnerabilities with partial evidence, use lower confidence and validationStatus such as suspected or unverified.",
        "When findings connect, capture the relationship explicitly with derivedFromFindingIds, relatedFindingIds, or enablesFindingIds instead of implying the connection only in prose.",
        "Use relationshipExplanations, chain, explanationSummary, and confidenceReason to explain why a finding belongs in an attack path and what uncertainty remains.",
        "Each finding should describe the affected asset or URL, the preconditions that make the issue matter, the observed or plausible impact, and the most direct remediation.",
        "Keep operator-visible progress updates short and action-oriented, and treat them as secondary to evidence quality.",
        "",
        "Blocked or failed behavior:",
        "If evidence does not support a vulnerability link or attack path, keep it out of findings, preserve the original uncertainty, and close with a qualified summary of the remaining hypotheses."
      ].join("\n"),
    toolIds: [
      "builtin-http-surface-assessment",
      "builtin-network-service-enumeration",
      "builtin-content-discovery",
      "builtin-web-crawl-mapping",
      "builtin-web-vulnerability-audit",
      "builtin-sql-injection-validation"
    ] as const
  },
  {
    key: "bash-poc-agent" as const,
    name: "Bash PoC Agent",
    description: "Proof-of-concept agent with a single seeded bash execution tool.",
    systemPrompt:
      [
        "Evaluate the target’s cybersecurity with an attack-path-first approach.",
        "",
        "Your primary goal is to identify whether multiple lower-severity weaknesses can be chained to reach a protected asset,",
        "privileged action, sensitive secret, account/session, internal service, or production-impacting capability.",
        "",
        "Start by mapping the application:",
        "- Identify exposed pages, APIs, parameters, forms, and linked resources.",
        "- Look for leaked identifiers, tokens, emails, build IDs, case IDs, workspace names, nonce values, session hints, feature",
        "flags, internal hostnames, or operational metadata.",
        "- Identify protected or high-impact endpoints and determine what prerequisites they require.",
        "",
        "Prioritize findings that act as attack-path steps:",
        "- Public metadata that reveals required inputs for another endpoint.",
        "- IDOR or weak object lookup where public identifiers unlock private records.",
        "- Weak authentication or recovery flows where leaked values can create sessions.",
        "- Authorization checks that depend only on guessable, leaked, or client-supplied values.",
        "- Endpoints that return secrets, tokens, privileged state, deployment data, or administrative capabilities only after",
        "chained prerequisites are supplied.",
        "",
        "Do not stop at standalone observations if they may be chain inputs.",
        "For each promising finding, ask:",
        "1. What value or capability did this expose?",
        "2. What later endpoint could use it?",
        "3. Can I validate the transition with a concrete request?",
        "4. Can I reach a higher-impact outcome by combining findings?",
        "",
        "Validation requirements:",
        "- Validate each reported finding with concrete request/response evidence.",
        "- Validate attack vectors by proving that output from one step is accepted by the next step.",
        "- Prefer a completed chain over isolated findings.",
        "- Report standalone issues like reflected XSS, missing headers, verbose health checks, or exposed framework versions only if",
        "they materially contribute to a chain or no stronger chain exists.",
        "- Do not inflate severity for a standalone issue when the source evidence only proves a low- or medium-impact condition.",
        "",
        "Use targeted shell commands and available tools to gather evidence.",
        "Log progress as you discover surfaces, hypotheses, validation attempts, and confirmed transitions.",
        "Map progress with nodes/findings and attack graph tools.",
        "",
        "When reporting:",
        "- Prefer at most four strong findings.",
        "- Include the role of each finding in the attack path: prerequisite leak, transition weakness, session creation,",
        "authorization bypass, or final impact.",
        "- Include attack vectors between existing finding IDs when one finding enables exploitation of another.",
        "- If a complete path is proven, include the final protected asset or action reached.",
        "- If a suspected chain cannot be completed, report what was proven and what blocked completion without inventing missing",
        "steps.",
        "",
        "Avoid treating scanner-friendly issues as the main result unless they lead somewhere.",
        "Missing headers, reflected input, version disclosure, health metadata, and generic information disclosure are supporting",
        "evidence, not primary findings, unless you prove concrete downstream impact.",
        "",
        "Suggested attack-path workflow:",
        "1. Crawl root and linked pages.",
        "2. Extract candidate artifacts: IDs, tokens, emails, nonces, build names, workspace names, case refs.",
        "3. Probe likely API routes using discovered artifacts.",
        "4. Identify protected endpoints and required parameters from errors, hints, forms, and route behavior.",
        "5. Reuse leaked artifacts against those endpoints.",
        "6. Confirm whether the chain reaches secrets, sessions, privileged actions, or sensitive records.",
        "7. Report findings and vectors only after evidence proves each transition.",
        "",
        "Avoid treating scanner-friendly issues as the main result unless they lead somewhere.",
        "Missing headers, reflected input, version disclosure, health metadata, and generic information disclosure are supporting evidence, not primary findings, unless you prove concrete downstream impact.",
        "",
        "Suggested attack-path workflow:",
        "1. Crawl root and linked pages.",
        "2. Extract candidate artifacts: IDs, tokens, emails, nonces, build names, workspace names, case refs.",
        "3. Probe likely API routes using discovered artifacts.",
        "4. Identify protected endpoints and required parameters from errors, hints, forms, and route behavior.",
        "5. Reuse leaked artifacts against those endpoints.",
        "6. Confirm whether the chain reaches secrets, sessions, privileged actions, or sensitive records.",
        "7. Report findings and vectors only after evidence proves each transition.",
        "",
        "Available dependencies:",
        "amass, arjun, autorecon, bash, binwalk, bulk_extractor, burp, checksec, cipher-identifier, crackmapexec, curl, dalfox, dirb, dirsearch, dnsenum, enum4linux, enum4linux-ng, evil-winrm, exiftool, feroxbuster, ffuf, fierce, foremost, gau, gdb, ghidra, gobuster, hakrawler, hash-identifier, hashcat, httpx, hydra, john, katana, kube-bench, kube-hunter, masscan, medusa, msfconsole, nc, ncat, nikto, nmap, node, nuclei, nxc, objdump, openssl, ophcrack, paramspider, patator, prowler, r2, responder, rustscan, scalpel, scout, sqlmap, steghide, strings, subfinder, sublist3r, theHarvester, trivy, volatility, waybackurls, whatweb, wpscan"
      ].join("\n"),
    toolIds: [
      "seed-agent-bash-command"
    ] as const
  }
] as const;

export const seededAgentIds = {
  "anthropic:generic-pentester": "4c526f02-d11c-4e01-aeb4-a84f271ec3bc",
  "anthropic:bash-poc-agent": "56e647a5-3fa2-4c52-a937-61b17f88bc9d"
} as const;

export function seededAgentId(roleKey: SeededRoleKey) {
  return seededAgentIds[`anthropic:${roleKey}`];
}

export function getSeededRoleDefinition(roleKey: SeededRoleKey) {
  return seededRoleDefinitions.find((role) => role.key === roleKey);
}

export function getSeededWorkflowDefinitions() {
  return [
    {
      id: attackVectorPlanningWorkflowId,
      name: "Attack Vector Planning",
      status: "active" as const,
      executionKind: "workflow" as const,
      description: "Default workflow for mapping attack vectors across the capability-level tool surface and linking plausible vulnerabilities through the evidence graph.",
      stages: [
        {
          id: "05a7fec4-548b-4857-a09f-7e4d81bb3f35",
          label: "Attack Vector Planning",
          agentId: seededAgentId("generic-pentester"),
          objective:
            "Run one evidence-backed attack-vector planning pass across the configured target. Link plausible vulnerabilities into explicit attack paths, distinguish supported findings from clearly qualified suspected findings, and produce a clear stage result.",
          stageSystemPrompt: attackVectorPlanningStagePrompt,
          allowedToolIds: [
            ...workflowBuiltinActionToolIds,
            ...attackPathSemanticFamilyToolIds
          ],
          requiredEvidenceTypes: [],
          findingPolicy: {
            taxonomy: "typed-core-v1",
            allowedTypes: [
              "service_exposure",
              "content_discovery",
              "missing_security_header",
              "tls_weakness",
              "injection_signal",
              "auth_weakness",
              "sensitive_data_exposure",
              "misconfiguration",
              "other"
            ]
          },
          completionRule: {
            requireStageResult: true,
            requireToolCall: true,
            allowEmptyResult: false,
            minFindings: 1,
            requireReachableSurface: true,
            requireEvidenceBackedWeakness: true,
            requireOsiCoverageStatus: true,
            requireChainedFindings: true
          },
          resultSchemaVersion: 1,
          handoffSchema: attackPathHandoffJsonSchema
        }
      ]
    },
    {
      id: bashSingleToolWorkflowId,
      name: "Bash Single-Tool PoC",
      status: "active" as const,
      executionKind: "workflow" as const,
      description: "Proof-of-concept workflow where agent execution is constrained to one seeded bash tool plus built-in reporting actions.",
      stages: [
        {
          id: "84f366d7-638d-4403-a012-0f27d4e6e981",
          label: "Bash Execution",
          agentId: seededAgentId("bash-poc-agent"),
          objective:
            "Complete the task by calling the bash tool with structured arguments. Put bash source in `command` and keep execution metadata in dedicated fields.",
          ...defaultWorkflowStagePrompts,
          stageSystemPrompt: bashAttackPathStagePrompt,
          allowedToolIds: [
            ...workflowBuiltinActionToolIds,
            "seed-agent-bash-command"
          ],
          requiredEvidenceTypes: [],
          findingPolicy: {
            taxonomy: "typed-core-v1",
            allowedTypes: [
              "service_exposure",
              "content_discovery",
              "missing_security_header",
              "tls_weakness",
              "injection_signal",
              "auth_weakness",
              "sensitive_data_exposure",
              "misconfiguration",
              "other"
            ]
          },
          completionRule: {
            requireStageResult: true,
            requireToolCall: true,
            allowEmptyResult: false,
            minFindings: 0,
            requireReachableSurface: false,
            requireEvidenceBackedWeakness: false,
            requireOsiCoverageStatus: false,
            requireChainedFindings: false
          },
          resultSchemaVersion: 1,
          handoffSchema: null
        }
      ]
    }
  ] as const;
}
