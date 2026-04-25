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
import type { AiTool } from "@synosec/contracts";

export const localApplicationId = "5ecf4a8e-df5f-4945-a7e1-230ef43eac80";
export const targetRuntimeId = "6fd90dd7-6f27-47d0-ab24-6328bb2f3624";
export const anthropicProviderId = "88e995dc-c55d-4a74-b831-b64922f25858";
export const localProviderId = "6fb18f09-f230-49df-b0ab-4f1bcedd230c";
export const osiSingleAgentWorkflowId = "8b57f0e7-1dd7-4d6a-8db5-c4ff7be80a21";
export const orchestrationAttackMapWorkflowId = "97fa61fd-8ae7-41d8-b267-d472413fcb9c";

export type SeededProviderKey = "anthropic" | "local";
export type SeededRoleKey = "orchestrator" | "qa-analyst" | "pen-tester" | "reporter";

export function getSeededProviderDefinitions(env: NodeJS.ProcessEnv = process.env) {
  return [
    {
      id: anthropicProviderId,
      key: "anthropic" as const,
      name: "Anthropic",
      kind: "anthropic" as const,
      description: "Default hosted Anthropic provider for production-grade agent workflows.",
      baseUrl: null,
      model: env["CLAUDE_MODEL"] ?? "claude-sonnet-4-6",
      apiKey: env["ANTHROPIC_API_KEY"] ?? null
    },
    {
      id: localProviderId,
      key: "local" as const,
      name: "Local",
      kind: "local" as const,
      description: "Local model endpoint seeded from repo defaults for offline or lab execution.",
      baseUrl: env["LLM_LOCAL_BASE_URL"] ?? "http://127.0.0.1:11434",
      model: env["LLM_LOCAL_MODEL"] ?? "qwen3:1.7b",
      apiKey: null
    }
  ] as const;
}

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
        : pathExclusionCompatibleIds.has(tool.id)
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
    key: "orchestrator" as const,
    name: "Orchestrator",
    description: "Coordinates scans, chooses the next useful step, and delegates the right tool path.",
    systemPrompt:
      "Lead a single evidence-driven SynoSec workflow. Choose the highest-value next action, stay in scope, use only approved tools, prefer concrete target/baseUrl inputs, and stop when confidence stops improving.",
    toolIds: [
      httpReconTool.id,
      httpHeadersTool.id,
      niktoScanTool.id,
      bashProbeTool.id,
      webCrawlTool.id,
      dirbScanTool.id,
      ffufScanTool.id,
      gobusterScanTool.id,
      ncatProbeTool.id,
      netcatProbeTool.id,
      nmapScanTool.id,
      serviceScanTool.id,
      amassEnumTool.id,
      sublist3rEnumTool.id,
      contentDiscoveryTool.id,
      dNSenumTool.id,
      fierceTool.id,
      subfinderTool.id,
      theHarvesterTool.id,
      arjunTool.id,
      dirsearchTool.id,
      feroxbusterTool.id,
      gauTool.id,
      hakrawlerTool.id,
      hTTPxTool.id,
      katanaTool.id,
      nucleiTool.id,
      paramSpiderTool.id,
      waybackurlsTool.id,
      whatWebTool.id,
      wPScanTool.id,
      autoreconTool.id,
      masscanTool.id,
      rustScanTool.id,
      networkSegmentMapTool.id,
      serviceFingerprintTool.id,
      tlsAuditTool.id,
      jwtAnalyzerTool.id,
      authFlowProbeTool.id
    ] as const
  },
  {
    key: "qa-analyst" as const,
    name: "QA Analyst",
    description: "Validates evidence quality, cross-checks findings, and identifies confidence gaps.",
    systemPrompt:
      "You are the QA analyst for SynoSec. Review evidence for consistency, verify that findings are supported, call out uncertainty, and recommend the smallest follow-up needed to confirm or reject a claim. Prefer reproducibility, precise language, and conservative confidence scoring over speculation.",
    toolIds: [
      httpReconTool.id,
      httpHeadersTool.id,
      niktoScanTool.id,
      bashProbeTool.id,
      nmapScanTool.id,
      serviceFingerprintTool.id,
      tlsAuditTool.id,
      jwtAnalyzerTool.id,
      authFlowProbeTool.id,
      vulnAuditTool.id
    ] as const
  },
  {
    key: "pen-tester" as const,
    name: "Pen-Tester",
    description: "Performs controlled offensive validation against approved targets and evidence paths.",
    systemPrompt:
      "You are the pen-tester for SynoSec. Use approved active techniques to validate exploitable conditions, prioritize realistic attack paths, and preserve a clean evidence trail. Stay inside scope, prefer the least invasive validation that proves impact, and clearly separate confirmed exploitation from hypothesis.",
    toolIds: [
      ...seededToolDefinitions.map(t => t.id)
    ] as const
  },
  {
    key: "reporter" as const,
    name: "Reporter",
    description: "Builds clear security reports for both executive and technical audiences.",
    systemPrompt:
      "You are the reporting specialist for SynoSec. Convert findings and evidence into a crisp report with accurate severity framing, clear remediation guidance, and separate executive and technical narratives. Do not introduce unsupported claims. Focus on clarity, prioritization, and traceability back to evidence.",
    toolIds: [httpReconTool.id, httpHeadersTool.id, bashProbeTool.id] as const
  }
] as const;

export const seededAgentIds = {
  "anthropic:orchestrator": "34e69347-4446-4c54-b8b0-b3962f701f0e",
  "anthropic:qa-analyst": "751d2c0b-85f1-4f7a-8ac6-2c05d0ce0f56",
  "anthropic:pen-tester": "f1f99dd4-c2a7-47e8-946e-6a880f09001f",
  "anthropic:reporter": "897204f6-2e08-4775-aae8-f233d4ec8154",
  "local:orchestrator": "fa1a0bfa-6b02-4948-8e1c-155f6b9a4ae7",
  "local:qa-analyst": "fcfe30d4-9473-4e74-8836-d824ff777c88",
  "local:pen-tester": "36f56ea0-e8ce-48ca-bda8-c33ed49e67b2",
  "local:reporter": "72ea29f0-f780-4402-bfe4-574604830749"
} as const;

export function seededAgentId(providerKey: SeededProviderKey, roleKey: SeededRoleKey) {
  return seededAgentIds[`${providerKey}:${roleKey}` as const];
}

export function getSeededRoleDefinition(roleKey: SeededRoleKey) {
  return seededRoleDefinitions.find((role) => role.key === roleKey);
}

export function getSeededWorkflowDefinitions() {
  return [
    {
      id: osiSingleAgentWorkflowId,
      name: "OSI Single-Agent",
      status: "active" as const,
      executionKind: "workflow" as const,
      description: "Seeded Anthropic workflow that runs one prompt-driven transparent evidence pipeline with approved tools, native finding registration, and explicit completion control.",
      applicationId: localApplicationId,
      runtimeId: targetRuntimeId,
      stages: [
        {
          id: "6e54b520-366c-4acb-9e36-a6cfe1c07fd3",
          label: "Pipeline",
          agentId: seededAgentId("anthropic", "orchestrator"),
          objective: "Run one evidence-backed transparent pipeline across the configured target, use approved tools for collection, register concrete findings through report_finding, and stop only through complete_run or fail_run.",
          allowedToolIds: [
            ...getSeededRoleDefinition("orchestrator")?.toolIds ?? [],
            vulnAuditTool.id
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
            requireToolCall: false,
            allowEmptyResult: true,
            minFindings: 0
          },
          resultSchemaVersion: 1,
          handoffSchema: null
        }
      ]
    },
    {
      id: orchestrationAttackMapWorkflowId,
      name: "Orchestration Attack Map",
      status: "active" as const,
      executionKind: "attack-map" as const,
      description: "Seeded workflow-backed attack-map orchestration run that plans high-value attack paths, executes approved tools, and reports normalized workflow findings.",
      applicationId: localApplicationId,
      runtimeId: targetRuntimeId,
      stages: [
        {
          id: "0586f03f-27e2-4c5a-a12c-abcb1b68e841",
          label: "Attack Map",
          agentId: seededAgentId("anthropic", "orchestrator"),
          objective: "Run a workflow-native attack-map orchestration pass across the configured target, prioritize realistic attack paths, execute approved tools, and report normalized evidence-backed workflow findings.",
          allowedToolIds: [
            ...getSeededRoleDefinition("orchestrator")?.toolIds ?? [],
            vulnAuditTool.id,
            serviceScanTool.id
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
            allowEmptyResult: true,
            minFindings: 0
          },
          resultSchemaVersion: 1,
          handoffSchema: null
        }
      ]
    }
  ] as const;
}
