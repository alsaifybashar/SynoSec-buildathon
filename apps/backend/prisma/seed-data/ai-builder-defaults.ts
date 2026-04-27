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
export const portfolioApplicationId = "1f92a3d7-4f70-4950-b750-9bf74c6f3591";
export const securePentApplicationId = "4d8e9e0a-bfd4-4b24-8fb9-8656b511a2b8";
export const osiSingleAgentWorkflowId = "8b57f0e7-1dd7-4d6a-8db5-c4ff7be80a21";
export const attackVectorPlanningWorkflowId = "9b59b237-c956-44db-aab0-a46b9f4bf8b3";
export const bashSingleToolWorkflowId = "6b8d087e-43bc-48d8-8e66-a167f8d9f5cb";
export const broadScriptToolWorkflowId = "4c62c117-1826-4c91-81cb-f66b4a28b880";
export const portfolioEvidenceGraphWorkflowId = "5edb1601-27cf-4a87-b7d4-a50873f5d985";

const defaultWorkflowStagePrompts = {
  stageSystemPrompt: defaultWorkflowStageSystemPrompt
} as const;

function buildCanonicalPrompt(sections: {
  roleAndGoal: string[];
  scopeAndSafety: string[];
  evidenceAndReporting: string[];
  blockedOrFailed: string[];
  examples?: string[];
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
    ...sections.blockedOrFailed,
    ...(sections.examples
      ? [
          "",
          "Examples:",
          ...sections.examples
        ]
      : [])
  ].join("\n");
}

function buildExamplesSection(examples: Array<{ input: string[]; expectedBehavior: string[] }>) {
  return [
    "<examples>",
    ...examples.flatMap((example) => [
      "<example>",
      "<input>",
      ...example.input,
      "</input>",
      "<expected_behavior>",
      ...example.expectedBehavior,
      "</expected_behavior>",
      "</example>"
    ]),
    "</examples>"
  ];
}

const planningAttackPathExamples = buildExamplesSection([
  {
    input: [
      "Observed artifacts: leaked `caseRef=cs-4821` and `workspace=acme-support` on a support listing page."
    ],
    expectedBehavior: [
      "Prioritize the derived case-detail transition next: test `GET /api/support/cases/cs-4821?workspace=acme-support` before repeating generic crawl or audit steps.",
      "Treat the path as confirmed only if the follow-on request succeeds with evidence."
    ]
  },
  {
    input: [
      "Observed artifacts: leaked `email=analyst@target.test` and `nonce=884211` from a client-side auth response."
    ],
    expectedBehavior: [
      "Prioritize the exact recovery transition next: test the magic-link flow with those values at `/api/auth/magic-link` instead of inventing a different login route.",
      "Record the path as plausible until the request proves the nonce is accepted."
    ]
  },
  {
    input: [
      "Observed artifacts: leaked `buildId=rel-202`, approval token, or session token tied to a release flow."
    ],
    expectedBehavior: [
      "Prioritize the adjacent release-secrets transition next: test whether those prerequisites unlock `/api/release/secrets`.",
      "Do not claim secret access or production impact unless that transition is validated."
    ]
  },
  {
    input: [
      "No discovered route, script, form, or response mentions `/login`, `/approve`, or `/promote`."
    ],
    expectedBehavior: [
      "Do not invent those auth or approval surfaces as the next step.",
      "If a route-not-found response already rejected a guessed endpoint, stop expanding that unsupported route family without new evidence."
    ]
  },
  {
    input: [
      "A page and its linked assets were already fetched, and they exposed a candidate artifact for a follow-on request."
    ],
    expectedBehavior: [
      "Prefer one derived transition request using the observed artifact over repeating the same audit, crawl, or fetch with no new hypothesis."
    ]
  }
]);

const operationalAttackPathExamples = buildExamplesSection([
  {
    input: [
      "Observed artifacts: leaked `caseRef=cs-4821` and `workspace=acme-support` on a support listing page."
    ],
    expectedBehavior: [
      "Make the derived request next: `GET /api/support/cases/cs-4821?workspace=acme-support`.",
      "Do not loop back to the same support list, crawl, or generic audit unless the follow-on request changes method, parameters, headers, or body in a way that tests a new hypothesis."
    ]
  },
  {
    input: [
      "Observed artifacts: leaked `email=analyst@target.test` and `nonce=884211` from a client-side auth response."
    ],
    expectedBehavior: [
      "Test the exact adjacent endpoint next: `POST /api/auth/magic-link` with that `email` and `nonce`.",
      "Do not switch to invented `/login` or password-reset routes when the application has already exposed the magic-link flow."
    ]
  },
  {
    input: [
      "Observed artifacts: leaked `buildId=rel-202` plus an approval token or session token tied to a release workflow."
    ],
    expectedBehavior: [
      "Use those exact prerequisites to test `GET /api/release/secrets?buildId=rel-202` or the same endpoint with the observed approval or session artifact in the expected header or cookie position.",
      "Only report a confirmed critical chain if the release-secrets transition is actually accepted."
    ]
  },
  {
    input: [
      "No discovered route, script, form, or response mentions `/login`, `/approve`, or `/promote`."
    ],
    expectedBehavior: [
      "Do not invent those auth or approval surfaces.",
      "After route-not-found style failures, stop probing unsupported route families unless new source evidence exposes them."
    ]
  },
  {
    input: [
      "A page and its linked assets were already fetched, and they exposed a candidate artifact for a follow-on request."
    ],
    expectedBehavior: [
      "Prefer one derived transition request using the observed artifact over repeating the same audit, crawl, or fetch on already-seen pages."
    ]
  }
]);

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
  "When one finding enables or supports another, submit explicit attack-vector records after both findings exist.",
  "Each linked path must state what the venue exposes, what the vector requires, which finding ids support it, and what uncertainty remains.",
  "",
  "Stage result expectations:",
  "Use the handoff to summarize attackVenues, attackVectors, and prioritized attackPaths.",
  "Every handoff attack path must reference returned finding ids.",
  "Separate confirmed findings from unproven attack-path outcomes.",
  "Present recommended next steps as validation work unless compromise was directly observed.",
  "",
  "Examples:",
  ...planningAttackPathExamples
].join("\n");

const bashAttackPathStagePrompt = buildCanonicalPrompt({
  roleAndGoal: [
    "Evaluate the target’s cybersecurity with an attack-path-first approach.",
    "Identify whether multiple lower-severity weaknesses can be chained to reach a protected asset, privileged action, sensitive secret, account or session, internal service, or production-impacting capability."
  ],
  scopeAndSafety: [
    "Use only the approved workflow tools exposed for this run.",
    "Choose the narrowest approved tool that fits the current hypothesis and do not ask for raw tool access, alternate execution paths, or brand-specific substitutions.",
    "When the approved tool is `bash`, you may invoke installed binaries available in the execution environment through shell commands when they materially help validate the current hypothesis.",
    "Map exposed pages, APIs, parameters, forms, linked resources, and leaked operational artifacts before escalating to higher-impact claims.",
    "When public data exposes identifiers, tokens, emails, nonces, workspace names, case references, or build ids, derive the exact next request those artifacts are most likely to unlock before broad guessing.",
    "Do not invent unsupported endpoint families such as `/promote` or `/validate` unless the application exposed them directly through routes, hints, forms, links, scripts, or observed responses.",
    "Do not treat scanner-friendly issues such as missing headers, reflected input, version disclosure, or health metadata as primary findings unless you prove concrete downstream impact."
  ],
  evidenceAndReporting: [
    "Validate each reported finding with concrete request and response evidence.",
    "Validate attack vectors by proving that output from one step is accepted by the next step.",
    "Prefer completed chains over isolated findings, but do not invent missing transitions.",
    "Prioritize findings that act as attack-path steps, such as prerequisite leaks, weak object lookup, weak recovery or session creation flows, client-supplied authorization controls, or endpoints that unlock secrets or privileged state after chained prerequisites.",
    "Prefer one concrete transition validation over repeated fetches of already-seen pages, and only repeat a request when a changed method, parameter, body, header, or artifact meaningfully tests the hypothesis.",
    "For each strong finding, state the role it plays in the attack path and include attack vectors between existing finding ids when one finding enables another.",
    "Prefer at most four strong findings and avoid inflating severity when the evidence only proves a lower-impact condition."
  ],
  blockedOrFailed: [
    "If a suspected chain cannot be completed, report what was proven, what blocked completion, and what uncertainty remains without inventing missing steps.",
    "Stop probing unsupported routes after route-not-found style errors if no source evidence points there.",
    "Preserve original tool failures and keep unsupported vulnerability links or attack paths out of findings."
  ],
  examples: operationalAttackPathExamples
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

export type SeededRoleKey = "generic-pentester" | "bash-poc-agent" | "broad-script-agent";

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

export const directScriptToolIds = seededToolDefinitions
  .filter((tool) => tool.executorType === "bash" && tool.bashSource.trim().length > 0)
  .map((tool) => tool.id);

export const broadScriptToolIds = directScriptToolIds.filter((toolId) => toolId !== "seed-agent-bash-command");

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
    name: "Wrapped Tool Family",
    description: "Default pentesting agent for capability-level workflow execution and attack-path reasoning.",
    systemPrompt: buildCanonicalPrompt({
      roleAndGoal: [
        "Map how weaknesses may connect, identify plausible attack paths, and keep every linked vulnerability grounded in evidence or explicitly qualified uncertainty."
      ],
      scopeAndSafety: [
        "Do not ask for raw tool access, brand-specific substitutions, or alternate execution paths outside the exposed workflow surface."
      ],
      evidenceAndReporting: [
        "Prefer structured evidence-backed findings over free-form narrative.",
        "Focus on linking potential vulnerabilities, preconditions, and follow-on impact rather than reporting isolated observations with no attack-path context.",
        "Distinguish confirmed findings, plausible hypotheses, and rejected leads in your reporting.",
        "For concrete supported findings and plausible linked vulnerabilities with partial evidence, use lower confidence and validationStatus such as suspected or unverified.",
        "When findings connect, report the findings first and then capture the relationship with explicit attack-vector records instead of implying the connection only in prose.",
        "Use finding summaries and explicit attack vectors to explain why a weakness matters in an attack path and what uncertainty remains.",
        "Each finding should describe the affected asset or URL, the preconditions that make the issue matter, the observed or plausible impact, and the most direct remediation.",
        "Keep operator-visible progress updates short and action-oriented, and treat them as secondary to evidence quality."
      ],
      blockedOrFailed: [
        "If evidence does not support a vulnerability link or attack path, keep it out of findings, preserve the original uncertainty, and close with a qualified summary of the remaining hypotheses."
      ]
    }),
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
    name: "Just Bash",
    description: "Proof-of-concept agent with a single seeded bash execution tool.",
    systemPrompt: buildCanonicalPrompt({
      roleAndGoal: [
        "Evaluate the target’s cybersecurity with an attack-path-first approach.",
        "Identify whether multiple lower-severity weaknesses can be chained to reach a protected asset, privileged action, sensitive secret, account or session, internal service, or production-impacting capability."
      ],
      scopeAndSafety: [
        "Use only the approved workflow tool surface and do not ask for raw tool access, alternate execution paths, or brand-specific substitutions.",
        "Choose the narrowest approved tool that fits the current hypothesis.",
        "When the approved tool is `bash`, you may invoke installed binaries available in the execution environment through shell commands when they materially help validate the current hypothesis.",
        "When public data exposes identifiers, tokens, emails, nonces, workspace names, case references, or build ids, derive the exact next request those artifacts are most likely to unlock before broad guessing.",
        "Do not invent unsupported endpoint families such as `/promote` or `/validate` unless the application exposed them directly through routes, hints, forms, links, scripts, or observed responses.",
        "Do not treat scanner-friendly issues as the main result unless you prove concrete downstream impact."
      ],
      evidenceAndReporting: [
        "Validate each reported finding with concrete request and response evidence.",
        "Validate attack vectors by proving that output from one step is accepted by the next step.",
        "Prefer completed chains over isolated findings, but do not invent missing transitions.",
        "Prioritize findings that act as attack-path steps, such as prerequisite leaks, weak object lookup, weak recovery or session creation flows, client-supplied authorization controls, or endpoints that unlock secrets or privileged state after chained prerequisites.",
        "Prefer one concrete transition validation over repeated fetches of already-seen pages, and only repeat a request when a changed method, parameter, body, header, or artifact meaningfully tests the hypothesis.",
        "For each strong finding, include the role it plays in the attack path and include attack vectors between existing finding ids when one finding enables another.",
        "Prefer at most four strong findings and do not inflate severity when the evidence only proves a lower-impact condition."
      ],
      blockedOrFailed: [
        "If a suspected chain cannot be completed, report what was proven, what blocked completion, and what uncertainty remains without inventing missing steps.",
        "Stop probing unsupported routes after route-not-found style errors if no source evidence points there."
      ],
      examples: operationalAttackPathExamples
    }),
    toolIds: [
      "seed-agent-bash-command"
    ] as const
  },
  {
    key: "broad-script-agent" as const,
    name: "Individual Tools",
    description: "Broad seeded bash-tool agent for workflows that need direct script-backed tool coverage.",
    systemPrompt: buildCanonicalPrompt({
      roleAndGoal: [
        "Evaluate the target’s cybersecurity with an attack-path-first approach using the approved direct script-backed tools exposed in this workflow.",
        "Identify whether multiple lower-severity weaknesses can be chained to reach a protected asset, privileged action, sensitive secret, account or session, internal service, or production-impacting capability."
      ],
      scopeAndSafety: [
        "Use only the approved direct script-backed tools exposed in this workflow.",
        "Choose the narrowest approved tool that fits the current hypothesis and do not ask for raw tool access, alternate execution paths, or brand-specific substitutions.",
        "When the approved tool is `bash`, you may invoke installed binaries available in the execution environment through shell commands when they materially help validate the current hypothesis.",
        "When public data exposes identifiers, tokens, emails, nonces, workspace names, case references, or build ids, derive the exact next request those artifacts are most likely to unlock before broad guessing.",
        "Do not invent unsupported endpoint families such as `/promote` or `/validate` unless the application exposed them directly through routes, hints, forms, links, scripts, or observed responses.",
        "Do not treat a failed tool call as successful by switching paths silently.",
        "Do not treat scanner-friendly issues as the main result unless you prove concrete downstream impact."
      ],
      evidenceAndReporting: [
        "Validate each reported finding with concrete request and response evidence.",
        "Validate attack vectors by proving that output from one step is accepted by the next step.",
        "Prefer completed chains over isolated findings, but do not invent missing transitions.",
        "Prefer one concrete transition validation over repeated fetches of already-seen pages, and only repeat a request when a changed method, parameter, body, header, or artifact meaningfully tests the hypothesis.",
        "For each strong finding, include the role it plays in the attack path and include attack vectors between existing finding ids when one finding enables another.",
        "Report meaningful progress, evidence-backed findings, and final completion through the workflow management tools."
      ],
      blockedOrFailed: [
        "If a suspected chain cannot be completed, report what was proven, what blocked completion, and what uncertainty remains without inventing missing steps.",
        "Stop probing unsupported routes after route-not-found style errors if no source evidence points there.",
        "Preserve original tool failures."
      ],
      examples: operationalAttackPathExamples
    }),
    toolIds: broadScriptToolIds
  }
] as const;

export const seededAgentIds = {
  "anthropic:generic-pentester": "4c526f02-d11c-4e01-aeb4-a84f271ec3bc",
  "anthropic:bash-poc-agent": "56e647a5-3fa2-4c52-a937-61b17f88bc9d",
  "anthropic:broad-script-agent": "4f0af3e7-2057-403f-b938-b33dce55e5a3"
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
    },
    {
      id: broadScriptToolWorkflowId,
      name: "Broad Script Tool Workflow",
      status: "active" as const,
      executionKind: "workflow" as const,
      description: "Workflow with broad direct script-backed tool access plus built-in workflow reporting and completion actions.",
      stages: [
        {
          id: "9a4ad0d1-4f62-40ef-8655-a74b93d58b17",
          label: "Broad Script Execution",
          agentId: seededAgentId("broad-script-agent"),
          objective:
            "Complete the task using the approved direct script-backed tools. Prefer purpose-built seeded tools, preserve failures with their original context, and use workflow management tools for progress, findings, and completion.",
          ...defaultWorkflowStagePrompts,
          stageSystemPrompt: bashAttackPathStagePrompt,
          allowedToolIds: [
            ...workflowBuiltinActionToolIds,
            ...broadScriptToolIds
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
