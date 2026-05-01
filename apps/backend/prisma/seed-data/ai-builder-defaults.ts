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
export const localFullStackApplicationId = "b21f6edc-6524-4d67-9f3a-8b5dfef6f6f7";
export const localJuiceShopApplicationId = "f6a6fe9c-853f-4f4e-8c81-91bb1de31755";
export const portfolioApplicationId = "1f92a3d7-4f70-4950-b750-9bf74c6f3591";
export const securePentApplicationId = "4d8e9e0a-bfd4-4b24-8fb9-8656b511a2b8";
export const osiSingleAgentWorkflowId = "8b57f0e7-1dd7-4d6a-8db5-c4ff7be80a21";
export const attackVectorPlanningWorkflowId = "9b59b237-c956-44db-aab0-a46b9f4bf8b3";
export const portfolioEvidenceGraphWorkflowId = "5edb1601-27cf-4a87-b7d4-a50873f5d985";

const defaultWorkflowStagePrompts = {
  stageSystemPrompt: defaultWorkflowStageSystemPrompt
} as const;

function buildCanonicalPrompt(sections: {
  roleAndGoal: string[];
  scopeAndSafety: string[];
  evidenceAndReporting: string[];
  blockedOrFailed: string[];
}) {
  return [
    "Role and goal:",
    ...sections.roleAndGoal,
    "",
    "Scope and safety boundaries:",
    ...sections.scopeAndSafety,
    "",
    "Evidence and reporting requirements:",
    ...sections.evidenceAndReporting,
    "",
    "Blocked or failed behavior:",
    ...sections.blockedOrFailed
  ].join("\n");
}

const attackVectorPlanningStagePrompt = [
  "Role and goal:",
  "Map plausible attack venues, attack vectors, and prioritized attack paths across the approved target surface.",
  "",
  "Evidence expectations:",
  "Keep findings and path claims grounded in evidence.",
  "Separate confirmed findings from unverified attack-path outcomes.",
  "",
  "Stage result expectations:",
  "Produce attackVenues, attackVectors, and attackPaths in the handoff.",
  "Use returned finding ids when linking findings, reporting attack vectors, and building handoff paths.",
  "Present next steps as validation work unless end-to-end impact was directly observed.",
  "",
  "Blocked or failed behavior:",
  "If evidence is incomplete, state what was proven, what remains unverified, and why."
].join("\n");

const bashAttackPathStagePrompt = buildCanonicalPrompt({
  roleAndGoal: [
    "Assess the target and complete the stage through the approved workflow surface.",
    "Focus on evidence-backed findings and any supported attack-path relationships between them."
  ],
  scopeAndSafety: [
    "Stay within the approved workflow surface for this run.",
    "Use bash to gather or validate evidence that is directly relevant to the current task."
  ],
  evidenceAndReporting: [
    "Report only findings that were validated with concrete evidence.",
    "Separate confirmed findings from unverified attack-path hypotheses.",
    "When findings connect, record explicit attack-vector relationships between reported findings."
  ],
  blockedOrFailed: [
    "Preserve original tool failures and state what prevented further validation."
  ]
});

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
  "builtin-report-attack-vectors",
  "builtin-complete-run"
] as const;

export type SeededRoleKey = "generic-pentester";

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

const rawSeededToolDefinitions: Array<typeof authFlowProbeTool> = [];

export const seededToolDefinitions = rawSeededToolDefinitions.map((tool) => withConstraintProfile(tool));

export const directScriptToolIds: string[] = [];

export function validateSeededToolDefinitions() {
  return;
}

export const seededRoleDefinitions = [
  {
    key: "generic-pentester" as const,
    name: "Wrapped Tool Family",
    description: "Default pentesting agent for capability-level workflow execution and attack-path reasoning.",
    toolAccessMode: "system" as const,
    systemPrompt: buildCanonicalPrompt({
      roleAndGoal: [
        "Map plausible attack paths and keep linked vulnerabilities grounded in evidence or clearly qualified uncertainty."
      ],
      scopeAndSafety: [
        "Stay within the workflow surface exposed for the run."
      ],
      evidenceAndReporting: [
        "Prefer evidence-backed findings over unsupported narrative.",
        "Separate confirmed findings from suspected or unverified conclusions.",
        "When findings connect, capture the relationship with explicit attack-vector records."
      ],
      blockedOrFailed: [
        "If evidence does not support a claim, keep it out of findings and preserve the uncertainty."
      ]
    }),
  }
] as const;

export const seededAgentIds = {
  "anthropic:generic-pentester": "4c526f02-d11c-4e01-aeb4-a84f271ec3bc"
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
          handoffSchema: attackPathHandoffJsonSchema,
          tasks: [
            {
              id: "map-reachable-surface",
              title: "Map reachable surface",
              objective: "Confirm at least one externally reachable HTTP entry point and capture grounded evidence.",
              suggestedCapabilities: ["http-surface"],
              suggestedToolIds: [],
              completionCriteria: "report_resource accepts at least one resource backed by tool evidence."
            },
            {
              id: "chain-finding-paths",
              title: "Chain plausible attack paths",
              objective: "Identify two or more findings whose evidence supports a chained attack vector and persist the relationships.",
              suggestedCapabilities: ["auth", "injection-detection"],
              suggestedToolIds: [],
              completionCriteria: "report_relationship and report_attack_path accept entries that reference prior finding IDs."
            }
          ]
        }
      ]
    }
  ] as const;
}
