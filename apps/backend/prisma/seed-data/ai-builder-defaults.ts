import { authFlowProbeTool } from "./tools/auth/auth-flow-probe.js";
import { jwtAnalyzerTool } from "./tools/auth/jwt-analyzer.js";
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
import {
  defaultWorkflowStageSystemPrompt,
  type AiTool
} from "@synosec/contracts";

export const localApplicationId = "5ecf4a8e-df5f-4945-a7e1-230ef43eac80";
export const portfolioApplicationId = "1f92a3d7-4f70-4950-b750-9bf74c6f3591";
export const securePentApplicationId = "4d8e9e0a-bfd4-4b24-8fb9-8656b511a2b8";
export const osiSingleAgentWorkflowId = "8b57f0e7-1dd7-4d6a-8db5-c4ff7be80a21";
export const osiCompactFamilyWorkflowId = "0e8e3912-c48f-4c34-9ac0-c54ec70df3f6";
export const attackVectorPlanningWorkflowId = "9b59b237-c956-44db-aab0-a46b9f4bf8b3";
export const portfolioEvidenceGraphWorkflowId = "5edb1601-27cf-4a87-b7d4-a50873f5d985";

const defaultWorkflowStagePrompts = {
  stageSystemPrompt: defaultWorkflowStageSystemPrompt
} as const;

const attackVectorPlanningStagePrompt = [
  "Role and goal:",
  "Complete the current workflow stage for SynoSec by mapping plausible attack vectors and attack venues across the approved target surface.",
  "",
  "Working style:",
  "Keep progress updates concise and action-oriented.",
  "Do not expose private chain-of-thought.",
  "",
  "Evidence expectations:",
  "Prefer concrete, evidence-backed findings over unsupported narrative.",
  "Distinguish confirmed findings from weaker hypotheses when the evidence is incomplete.",
  "Link related weaknesses explicitly and capture what each venue exposes, what each vector requires, and which findings support the path.",
  "",
  "Stage result expectations:",
  "Use the handoff to summarize attackVenues, attackVectors, and prioritized attackPaths that reference finding ids."
].join("\n");

const attackVectorPlanningHandoffSchema = {
  type: "object",
  properties: {
    attackVenues: {
      type: "array",
      description: "Observed entrypoints or reachable surfaces that matter to the attack map.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          venueType: { type: "string" },
          targetLabel: { type: "string" },
          summary: { type: "string" },
          findingIds: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["id", "label", "venueType", "targetLabel", "summary", "findingIds"]
      }
    },
    attackVectors: {
      type: "array",
      description: "Potential exploit or abuse routes derived from linked findings.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          sourceVenueId: { type: "string" },
          destinationVenueId: { type: "string" },
          preconditions: {
            type: "array",
            items: { type: "string" }
          },
          impact: { type: "string" },
          confidence: { type: "number" },
          findingIds: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["id", "label", "preconditions", "impact", "confidence", "findingIds"]
      }
    },
    attackPaths: {
      type: "array",
      description: "Prioritized end-to-end routes through the observed attack map.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          severity: { type: "string" },
          venueIds: {
            type: "array",
            items: { type: "string" }
          },
          vectorIds: {
            type: "array",
            items: { type: "string" }
          },
          findingIds: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["id", "title", "summary", "severity", "venueIds", "vectorIds", "findingIds"]
      }
    }
  },
  required: ["attackVenues", "attackVectors", "attackPaths"]
} as const;

const fullSemanticFamilyToolIds = [
  "builtin-http-surface-assessment",
  "builtin-web-crawl-mapping",
  "builtin-content-discovery",
  "builtin-parameter-discovery",
  "builtin-web-vulnerability-audit",
  "builtin-sql-injection-validation",
  "builtin-xss-validation",
  "builtin-wordpress-assessment",
  "builtin-auth-flow-assessment",
  "builtin-token-analysis",
  "builtin-network-host-discovery",
  "builtin-network-service-enumeration",
  "builtin-tls-posture-audit",
  "builtin-network-topology-mapping",
  "builtin-subdomain-discovery",
  "builtin-dns-enumeration",
  "builtin-credential-format-identification",
  "builtin-online-credential-attack",
  "builtin-offline-password-cracking",
  "builtin-windows-enumeration",
  "builtin-windows-remote-access-validation",
  "builtin-windows-poisoning-and-capture",
  "builtin-controlled-exploitation",
  "builtin-cloud-posture-audit",
  "builtin-kubernetes-posture-audit",
  "builtin-binary-triage",
  "builtin-interactive-reverse-engineering",
  "builtin-artifact-metadata-extraction",
  "builtin-file-carving-and-bulk-extraction",
  "builtin-memory-forensics",
  "builtin-steganography-analysis",
  "builtin-local-shell-probe"
] as const;

const webSemanticFamilyToolIds = [
  "builtin-http-surface-assessment",
  "builtin-web-crawl-mapping",
  "builtin-content-discovery",
  "builtin-parameter-discovery",
  "builtin-web-vulnerability-audit",
  "builtin-sql-injection-validation",
  "builtin-xss-validation",
  "builtin-wordpress-assessment",
  "builtin-auth-flow-assessment",
  "builtin-token-analysis",
  "builtin-network-host-discovery",
  "builtin-network-service-enumeration",
  "builtin-tls-posture-audit",
  "builtin-subdomain-discovery",
  "builtin-dns-enumeration"
] as const;

export type SeededRoleKey = "compact-evaluator" | "attack-vector-planner";

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
    "seed-paramspider",
    "seed-family-http-surface",
    "seed-family-web-crawl",
    "seed-family-content-discovery",
    "seed-family-vulnerability-validation"
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
    "seed-paramspider",
    "seed-family-web-crawl",
    "seed-family-content-discovery"
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
    key: "compact-evaluator" as const,
    name: "Compact Evaluator",
    description: "Evaluates the semantic-family tool surface as a compact alternative to the raw pentest catalog.",
    systemPrompt:
      [
        "Role and goal:",
        "You are the compact evaluation agent for SynoSec. Evaluate a target through semantic tool families rather than raw tool brands and keep the evidence chain explicit.",
        "",
        "Scope and safety boundaries:",
        "Use only the available semantic family tools and built-in workflow actions for this run.",
        "Do not ask for raw tool access or brand-specific substitutions outside the exposed family surface.",
        "",
        "Evidence and reporting requirements:",
        "Prefer structured evidence-backed findings over free-form narrative.",
        "Distinguish confirmed findings, plausible hypotheses, and rejected leads in your reporting.",
        "When findings connect, capture the relationship explicitly with derivedFromFindingIds, relatedFindingIds, or enablesFindingIds instead of implying the connection only in prose.",
        "Each finding should describe the affected asset or URL, the preconditions that make the issue matter, the observed impact, and the most direct remediation.",
        "Call log_progress for short operator-visible updates before tool calls and after meaningful results, but treat log_progress as secondary to high-quality report_finding calls.",
        "Do not expose private chain-of-thought; provide concise action-oriented progress notes instead.",
        "",
        "Completion requirements:",
        "Use report_finding for concrete supported findings and use complete_run to end the workflow.",
        "",
        "Blocked or failed behavior:",
        "If evidence is incomplete or conflicting, keep unsupported claims out of findings, mark weaker leads as hypotheses, and close with the remaining uncertainty."
      ].join("\n"),
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
    key: "attack-vector-planner" as const,
    name: "Attack Vector Planner",
    description: "Maps plausible attack vectors across the semantic-family surface and links potential vulnerabilities into explicit finding chains.",
    systemPrompt:
      [
        "Role and goal:",
        "You are the attack vector planning agent for SynoSec. Use semantic tool families to map how weaknesses may connect, identify plausible attack paths, and keep every linked vulnerability grounded in evidence or explicitly qualified uncertainty.",
        "",
        "Scope and safety boundaries:",
        "Use only the available semantic family tools and built-in workflow actions for this run.",
        "Do not ask for raw tool access, brand-specific substitutions, or alternate execution paths outside the exposed family surface.",
        "",
        "Evidence and reporting requirements:",
        "Prefer structured evidence-backed findings over free-form narrative.",
        "Focus on linking potential vulnerabilities, preconditions, and follow-on impact rather than reporting isolated observations with no attack-path context.",
        "Distinguish confirmed findings, plausible hypotheses, and rejected leads in your reporting.",
        "Use report_finding for concrete supported findings and for plausible linked vulnerabilities when the evidence is partial, but mark those with lower confidence and validationStatus such as suspected or unverified.",
        "When findings connect, capture the relationship explicitly with derivedFromFindingIds, relatedFindingIds, or enablesFindingIds instead of implying the connection only in prose.",
        "Use relationshipExplanations, chain, explanationSummary, and confidenceReason to explain why a finding belongs in an attack path and what uncertainty remains.",
        "Each finding should describe the affected asset or URL, the preconditions that make the issue matter, the observed or plausible impact, and the most direct remediation.",
        "Call log_progress for short operator-visible updates before tool calls and after meaningful results, but treat log_progress as secondary to high-quality report_finding calls.",
        "Do not expose private chain-of-thought; provide concise action-oriented progress notes instead.",
        "",
        "Completion requirements:",
        "Use report_finding for concrete supported findings and plausible linked vulnerabilities, and use complete_run to end the workflow.",
        "",
        "Blocked or failed behavior:",
        "If evidence does not support a vulnerability link or attack path, keep it out of findings, preserve the original uncertainty, and close with a qualified summary of the remaining hypotheses."
      ].join("\n"),
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
  "anthropic:compact-evaluator": "3d9992c0-a20b-4527-86d3-9479e86d6c3b",
  "anthropic:attack-vector-planner": "4c526f02-d11c-4e01-aeb4-a84f271ec3bc"
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
      id: osiCompactFamilyWorkflowId,
      name: "Compact Family Evaluation",
      status: "active" as const,
      executionKind: "workflow" as const,
      description: "Seeded Anthropic workflow for evaluating a compact semantic-family tool surface against the same local target and evidence pipeline.",
      stages: [
        {
          id: "d6be6af5-fc56-42fa-a802-702d002b4bf6",
          label: "Compact Evaluation",
          agentId: seededAgentId("compact-evaluator"),
          objective:
            "Run one evidence-backed compact-family evaluation across the configured target. Use only the semantic family tools for collection and validation, think in terms of family capabilities rather than tool brands, register concrete findings through report_finding, and end only through complete_run.",
          ...defaultWorkflowStagePrompts,
          allowedToolIds: [
            ...fullSemanticFamilyToolIds
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
      id: attackVectorPlanningWorkflowId,
      name: "Attack Vector Planning",
      status: "active" as const,
      executionKind: "workflow" as const,
      description: "Seeded Anthropic workflow for mapping attack vectors across the semantic-family tool surface and linking plausible vulnerabilities through the evidence graph.",
      stages: [
        {
          id: "05a7fec4-548b-4857-a09f-7e4d81bb3f35",
          label: "Attack Vector Planning",
          agentId: seededAgentId("attack-vector-planner"),
          objective:
            "Run one evidence-backed attack-vector planning pass across the configured target. Use only the semantic family tools for discovery and validation, link plausible vulnerabilities into explicit attack paths, register supported and clearly qualified suspected findings through report_finding, and end only through complete_run.",
          stageSystemPrompt: attackVectorPlanningStagePrompt,
          allowedToolIds: [
            ...fullSemanticFamilyToolIds
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
          handoffSchema: attackVectorPlanningHandoffSchema
        }
      ]
    }
  ] as const;
}
