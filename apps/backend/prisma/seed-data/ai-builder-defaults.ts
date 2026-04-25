import { contentDiscoveryTool } from "./tools/content/content-discovery.js";
import { dirbScanTool } from "./tools/content/dirb-scan.js";
import { ffufScanTool } from "./tools/content/ffuf-scan.js";
import { gobusterScanTool } from "./tools/content/gobuster-scan.js";
import { webCrawlTool } from "./tools/content/web-crawl.js";
import { metasploitFrameworkTool } from "./tools/exploitation/metasploit-framework.js";
import { familyContentDiscoveryTool } from "./tools/family/content-discovery.js";
import { familyHttpSurfaceTool } from "./tools/family/http-surface.js";
import { familyNetworkEnumerationTool } from "./tools/family/network-enumeration.js";
import { familySubdomainDiscoveryTool } from "./tools/family/subdomain-discovery.js";
import { familyVulnerabilityValidationTool } from "./tools/family/vulnerability-validation.js";
import { familyWebCrawlTool } from "./tools/family/web-crawl.js";
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
import { serviceScanTool } from "./tools/network/service-scan.js";
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
export const portfolioApplicationId = "1f92a3d7-4f70-4950-b750-9bf74c6f3591";
export const anthropicProviderId = "88e995dc-c55d-4a74-b831-b64922f25858";
export const localProviderId = "6fb18f09-f230-49df-b0ab-4f1bcedd230c";
export const osiSingleAgentWorkflowId = "8b57f0e7-1dd7-4d6a-8db5-c4ff7be80a21";
export const orchestrationAttackMapWorkflowId = "97fa61fd-8ae7-41d8-b267-d472413fcb9c";
export const osiCompactFamilyWorkflowId = "0e8e3912-c48f-4c34-9ac0-c54ec70df3f6";
export const portfolioEvidenceGraphWorkflowId = "5edb1601-27cf-4a87-b7d4-a50873f5d985";

export type SeededProviderKey = "anthropic";
export type SeededRoleKey = "orchestrator" | "compact-evaluator" | "portfolio-evaluator";

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

  const readOnlyWebCategories = new Set(["web", "content", "dns", "subdomain", "network", "cloud", "kubernetes", "utility"]);
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
  contentDiscoveryTool,
  dirbScanTool,
  ffufScanTool,
  gobusterScanTool,
  webCrawlTool,
  familyContentDiscoveryTool,
  familyHttpSurfaceTool,
  familyNetworkEnumerationTool,
  familySubdomainDiscoveryTool,
  familyVulnerabilityValidationTool,
  familyWebCrawlTool,
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
  serviceScanTool,
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
      "Lead a single evidence-driven SynoSec workflow. Choose the highest-value next action, stay in scope, use only approved tools, prefer concrete target/baseUrl inputs, and stop when confidence stops improving. Keep the operator informed with short visible progress updates by calling log_progress before tool calls and after meaningful results. Do not expose private chain-of-thought; provide concise action-oriented progress notes instead.",
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
      rustScanTool.id
    ] as const
  },
  {
    key: "compact-evaluator" as const,
    name: "Compact Evaluator",
    description: "Evaluates the semantic-family tool surface as a compact alternative to the raw pentest catalog.",
    systemPrompt:
      "You are the compact evaluation agent for SynoSec. Use only the available semantic family tools, think in terms of task families rather than tool brands, and keep the evidence chain explicit. Do not ask for raw tool access. Prefer structured evidence-backed findings over free-form narrative. Distinguish confirmed findings, plausible hypotheses, and rejected leads in your reporting. When findings connect, capture the relationship explicitly with derivedFromFindingIds, relatedFindingIds, or enablesFindingIds instead of implying the connection only in prose. Each finding should describe the affected asset or URL, the preconditions that make the issue matter, the observed impact, and the most direct remediation. Keep the operator informed with short visible progress updates by calling log_progress before tool calls and after meaningful results, but treat log_progress as secondary to high-quality report_finding calls. Stop when confidence stops improving. Do not expose private chain-of-thought; provide concise action-oriented progress notes instead.",
    toolIds: [
      familyHttpSurfaceTool.id,
      familyNetworkEnumerationTool.id,
      familySubdomainDiscoveryTool.id,
      familyWebCrawlTool.id,
      familyContentDiscoveryTool.id,
      familyVulnerabilityValidationTool.id
    ] as const
  },
  {
    key: "portfolio-evaluator" as const,
    name: "Portfolio Evaluator",
    description: "Assesses the seeded nilswickman.com workflow with compact family tools and evidence-graph-first reporting.",
    systemPrompt:
      "You are the portfolio evaluation agent for SynoSec. Assess a prerendered portfolio-style web target using only the available semantic family tools. Treat OSI-inspired language only as shorthand for dependency boundaries across network exposure, HTTP/TLS behavior, and application behavior. Prefer structured evidence-backed findings over free-form narrative. Distinguish confirmed findings, plausible hypotheses, and rejected leads in your reporting. Focus on realistic portfolio surfaces such as headers, redirects, public assets, sitemap and robots exposure, content discovery, web crawl findings, and deployment or CDN assumptions. When findings connect, capture the relationship explicitly with derivedFromFindingIds, relatedFindingIds, or enablesFindingIds instead of implying the connection only in prose. Each finding should describe the affected asset or URL, the preconditions that make the issue matter, the observed impact, and the most direct remediation. Keep the operator informed with short visible progress updates by calling log_progress before tool calls and after meaningful results, but treat log_progress as secondary to high-quality report_finding calls. Stop when confidence stops improving. Do not expose private chain-of-thought; provide concise action-oriented progress notes instead.",
    toolIds: [
      familyHttpSurfaceTool.id,
      familyNetworkEnumerationTool.id,
      familySubdomainDiscoveryTool.id,
      familyWebCrawlTool.id,
      familyContentDiscoveryTool.id,
      familyVulnerabilityValidationTool.id
    ] as const
  }
] as const;

export const seededAgentIds = {
  "anthropic:orchestrator": "34e69347-4446-4c54-b8b0-b3962f701f0e",
  "anthropic:compact-evaluator": "3d9992c0-a20b-4527-86d3-9479e86d6c3b",
  "anthropic:portfolio-evaluator": "18adcb50-327a-40d3-a4c5-ff05ec4d2458"
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
      name: "Single-Agent",
      status: "active" as const,
      executionKind: "workflow" as const,
      description: "Seeded Anthropic workflow that runs one prompt-driven transparent evidence pipeline with approved tools, native finding registration, and explicit completion control.",
      applicationId: localApplicationId,
      stages: [
        {
          id: "6e54b520-366c-4acb-9e36-a6cfe1c07fd3",
          label: "Pipeline",
          agentId: seededAgentId("anthropic", "orchestrator"),
          objective: "Run one evidence-backed transparent pipeline across the configured target, use approved tools for collection, call log_progress for short operator-visible progress updates before tool calls and after meaningful results, register concrete findings through report_finding, and stop only through complete_run or fail_run.",
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
      stages: [
        {
          id: "0586f03f-27e2-4c5a-a12c-abcb1b68e841",
          label: "Attack Map",
          agentId: seededAgentId("anthropic", "orchestrator"),
          objective: "Run a workflow-native attack-map orchestration pass across the configured target, prioritize realistic attack paths, call log_progress for short operator-visible progress updates before tool calls and after meaningful results, execute approved tools, and report normalized evidence-backed workflow findings.",
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
    },
    {
      id: osiCompactFamilyWorkflowId,
      name: "Compact Family Evaluation",
      status: "active" as const,
      executionKind: "workflow" as const,
      description: "Seeded Anthropic workflow for evaluating a compact semantic-family tool surface against the same local target and evidence pipeline.",
      applicationId: localApplicationId,
      stages: [
        {
          id: "d6be6af5-fc56-42fa-a802-702d002b4bf6",
          label: "Compact Evaluation",
          agentId: seededAgentId("anthropic", "compact-evaluator"),
          objective: "Run one evidence-backed compact-family evaluation pipeline across the configured target, use only the semantic family tools for collection and validation, call log_progress for short operator-visible progress updates before tool calls and after meaningful results, register concrete findings through report_finding, and stop only through complete_run or fail_run.",
          allowedToolIds: [
            ...getSeededRoleDefinition("compact-evaluator")?.toolIds ?? []
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
      id: portfolioEvidenceGraphWorkflowId,
      name: "Portfolio Evidence Graph",
      status: "active" as const,
      executionKind: "workflow" as const,
      description: "Seeded Anthropic workflow for evaluating nilswickman.com with compact family tools and evidence-graph-oriented reporting.",
      applicationId: portfolioApplicationId,
      stages: [
        {
          id: "78f81dbf-b482-4d8d-b63f-a6e63cd3d38f",
          label: "Portfolio Assessment",
          agentId: seededAgentId("anthropic", "portfolio-evaluator"),
          objective: "Assess the configured portfolio target as a prerendered Nuxt site using only the compact semantic family tools. Treat OSI-inspired terms only as shorthand for dependency boundaries across network exposure, HTTP/TLS behavior, and application behavior. Focus on realistic portfolio surfaces such as headers, redirects, public assets, sitemap and robots exposure, content discovery, web crawl findings, and deployment or CDN assumptions. Register concrete findings through report_finding with evidence-backed URLs or assets, explicit preconditions, and plain-language remediation. When one finding depends on, correlates with, or enables another, populate derivedFromFindingIds, relatedFindingIds, or enablesFindingIds. Do not present speculative exploit chains as confirmed; mark only directly supported connections as findings and keep weaker links as hypotheses in the final summary. Use complete_run to summarize the highest-confidence connected findings, the strongest remaining hypothesis chain, and the minimum-cut remediation that breaks the most paths.",
          allowedToolIds: [
            ...getSeededRoleDefinition("portfolio-evaluator")?.toolIds ?? []
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
    }
  ] as const;
}
