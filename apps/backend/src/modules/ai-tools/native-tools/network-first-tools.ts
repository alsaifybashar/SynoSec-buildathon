import { z } from "zod";
import type {
  AiTool,
  ConnectorAction,
  ConnectorActionBatch,
  ConnectorActionResult,
  InternalObservation,
  ToolConstraintProfile
} from "@synosec/contracts";
import type { NativeToolImplementation, NativeToolParseContext, NativeToolResult } from "./types.js";

const builtinTimestamp = "2026-05-01T00:00:00.000Z";
const DEFAULT_TIMEOUT_MS = 4000;
const DEFAULT_HTTP_BYTES = 32768;
const DEFAULT_PORTS = [80, 443, 8080, 8443] as const;
const DEFAULT_SUBDOMAIN_LABELS = ["www", "app", "api", "admin", "auth", "dev", "staging"] as const;
const DEFAULT_CONTENT_PATHS = ["/robots.txt", "/sitemap.xml", "/login", "/admin", "/api", "/health"] as const;
const SQLI_ERROR_PATTERNS = [
  /sql syntax/i,
  /mysql/i,
  /postgres/i,
  /sqlite/i,
  /odbc/i,
  /unterminated quoted string/i
];

function nonEmptyTrimmedString(max = 4096) {
  return z.string().transform((value) => value.trim()).pipe(z.string().min(1).max(max));
}

const optionalNonEmptyTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, nonEmptyTrimmedString().optional());

const urlLikeSchema = nonEmptyTrimmedString();
const httpMethodSchema = z.enum(["GET", "POST"]);
const requestEncodingSchema = z.enum(["query", "form", "json"]);

const simpleToolOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    statusReason: { type: "string" },
    observations: { type: "array" }
  },
  required: ["summary", "observations"]
} as const;

function createObservation(
  context: NativeToolParseContext,
  key: string,
  title: string,
  summary: string,
  severity: InternalObservation["severity"] = "info",
  confidence = 0.8
): InternalObservation {
  return {
    id: key,
    scanId: context.scanId,
    tacticId: context.tacticId,
    toolRunId: context.toolRun.id,
    ...(context.request.toolId ? { toolId: context.request.toolId } : {}),
    tool: context.request.tool,
    capabilities: context.request.capabilities,
    target: context.request.target,
    ...(context.request.port === undefined ? {} : { port: context.request.port }),
    key,
    title,
    summary,
    severity,
    confidence,
    evidence: summary,
    technique: "native-bounded-validation",
    relatedKeys: [],
    createdAt: context.toolRun.startedAt
  };
}

function buildNativeTool(input: {
  id: string;
  name: string;
  description: string;
  category: AiTool["category"];
  riskTier: AiTool["riskTier"];
  capabilities: string[];
  timeoutMs: number;
  inputSchema: Record<string, unknown>;
  constraintProfile: ToolConstraintProfile;
}): AiTool {
  return {
    id: input.id,
    name: input.name,
    kind: "raw-adapter",
    status: "active",
    source: "system",
    accessProfile: "standard",
    description: input.description,
    executorType: "native-ts",
    builtinActionKey: null,
    bashSource: null,
    capabilities: input.capabilities,
    category: input.category,
    riskTier: input.riskTier,
    timeoutMs: input.timeoutMs,
    constraintProfile: input.constraintProfile,
    coveredToolIds: [],
    candidateToolIds: [],
    inputSchema: input.inputSchema,
    outputSchema: simpleToolOutputSchema,
    createdAt: builtinTimestamp,
    updatedAt: builtinTimestamp
  };
}

function httpConstraintProfile(riskTier: AiTool["riskTier"], mutationClass: ToolConstraintProfile["mutationClass"]): ToolConstraintProfile {
  return {
    enforced: true,
    targetKinds: ["host", "domain", "url"],
    networkBehavior: riskTier === "passive" ? "outbound-read" : "outbound-active",
    mutationClass,
    supportsHostAllowlist: true,
    supportsPathExclusions: mutationClass !== "none",
    supportsRateLimit: true
  };
}

function networkConstraintProfile(riskTier: AiTool["riskTier"], targetKinds: ToolConstraintProfile["targetKinds"]): ToolConstraintProfile {
  return {
    enforced: true,
    targetKinds,
    networkBehavior: riskTier === "passive" ? "outbound-read" : "outbound-active",
    mutationClass: riskTier === "passive" ? "none" : "active-validation",
    supportsHostAllowlist: true,
    supportsPathExclusions: false,
    supportsRateLimit: true
  };
}

function ensureAbsoluteUrl(candidate: string, fallbackBase?: string) {
  if (/^https?:\/\//i.test(candidate)) {
    return new URL(candidate).toString();
  }

  if (!fallbackBase) {
    throw new Error(`Cannot resolve relative URL without a base URL: ${candidate}`);
  }

  return new URL(candidate, fallbackBase).toString();
}

function summarizeBody(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, 160);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function httpResultById(actionResults: ConnectorActionResult[]) {
  return new Map(
    actionResults
      .filter((result): result is Extract<ConnectorActionResult, { kind: "http_request" }> => result.kind === "http_request")
      .map((result) => [result.actionId, result] as const)
  );
}

function dnsResultById(actionResults: ConnectorActionResult[]) {
  return new Map(
    actionResults
      .filter((result): result is Extract<ConnectorActionResult, { kind: "dns_query" }> => result.kind === "dns_query")
      .map((result) => [result.actionId, result] as const)
  );
}

function tcpResultById(actionResults: ConnectorActionResult[]) {
  return new Map(
    actionResults
      .filter((result): result is Extract<ConnectorActionResult, { kind: "tcp_connect" }> => result.kind === "tcp_connect")
      .map((result) => [result.actionId, result] as const)
  );
}

function tlsResultById(actionResults: ConnectorActionResult[]) {
  return new Map(
    actionResults
      .filter((result): result is Extract<ConnectorActionResult, { kind: "tls_handshake" }> => result.kind === "tls_handshake")
      .map((result) => [result.actionId, result] as const)
  );
}

function assertResultCount(actionResults: ConnectorActionResult[], expected: number, toolName: string) {
  if (actionResults.length !== expected) {
    throw new Error(`${toolName} expected ${expected} action results but received ${actionResults.length}.`);
  }
}

function finish(summary: string, observations: InternalObservation[], statusReason?: string): NativeToolResult {
  return {
    summary,
    observations,
    ...(statusReason ? { statusReason } : {}),
    exitCode: statusReason ? 1 : 0,
    debug: {
      attempts: 1,
      actionIds: observations.map((entry) => entry.key)
    }
  };
}

const httpSurfaceInputSchema = z.object({
  targetUrl: optionalNonEmptyTrimmedString,
  baseUrl: optionalNonEmptyTrimmedString,
  url: optionalNonEmptyTrimmedString,
  followRedirects: z.boolean().default(true)
}).superRefine((value, ctx) => {
  const candidates = [value.targetUrl, value.baseUrl, value.url].filter(Boolean);
  if (candidates.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide targetUrl, baseUrl, or url." });
  }
});
type HttpSurfaceInput = z.infer<typeof httpSurfaceInputSchema>;

const webCrawlInputSchema = z.object({
  startUrl: optionalNonEmptyTrimmedString,
  baseUrl: optionalNonEmptyTrimmedString,
  includeRobots: z.boolean().default(true)
}).superRefine((value, ctx) => {
  if (!value.startUrl && !value.baseUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide startUrl or baseUrl." });
  }
});
type WebCrawlInput = z.infer<typeof webCrawlInputSchema>;

const contentDiscoveryInputSchema = z.object({
  baseUrl: urlLikeSchema,
  candidatePaths: z.array(nonEmptyTrimmedString(256)).max(12).default([...DEFAULT_CONTENT_PATHS]),
  method: z.enum(["GET", "HEAD"]).default("GET")
});
type ContentDiscoveryInput = z.infer<typeof contentDiscoveryInputSchema>;

const endpointParameterTargetSchema = z.object({
  url: urlLikeSchema,
  method: httpMethodSchema.default("GET"),
  candidateParameters: z.array(nonEmptyTrimmedString(128)).min(1).max(8),
  baseQuery: z.record(z.string(), z.string()).default({}),
  baseBody: z.record(z.string(), z.string()).default({}),
  encoding: requestEncodingSchema.default("query")
});
const parameterDiscoveryInputSchema = z.object({
  endpoints: z.array(endpointParameterTargetSchema).min(1).max(4)
});
type ParameterDiscoveryInput = z.infer<typeof parameterDiscoveryInputSchema>;

const activeValidationTargetSchema = z.object({
  url: urlLikeSchema,
  method: httpMethodSchema.default("GET"),
  parameter: nonEmptyTrimmedString(128),
  baseQuery: z.record(z.string(), z.string()).default({}),
  baseBody: z.record(z.string(), z.string()).default({}),
  encoding: requestEncodingSchema.default("query")
});
const sqlValidationInputSchema = z.object({
  targets: z.array(activeValidationTargetSchema).min(1).max(4)
});
type SqlValidationInput = z.infer<typeof sqlValidationInputSchema>;

const xssValidationInputSchema = z.object({
  targets: z.array(activeValidationTargetSchema).min(1).max(4)
});
type XssValidationInput = z.infer<typeof xssValidationInputSchema>;

const hostDiscoveryInputSchema = z.object({
  host: nonEmptyTrimmedString(256),
  candidatePorts: z.array(z.number().int().min(1).max(65535)).min(1).max(20).default([...DEFAULT_PORTS]),
  timeoutMs: z.number().int().min(1).max(10000).default(DEFAULT_TIMEOUT_MS)
});
type HostDiscoveryInput = z.infer<typeof hostDiscoveryInputSchema>;

const serviceEnumerationInputSchema = z.object({
  host: nonEmptyTrimmedString(256),
  ports: z.array(z.number().int().min(1).max(65535)).min(1).max(12),
  send: optionalNonEmptyTrimmedString,
  timeoutMs: z.number().int().min(1).max(10000).default(DEFAULT_TIMEOUT_MS)
});
type ServiceEnumerationInput = z.infer<typeof serviceEnumerationInputSchema>;

const tlsAuditInputSchema = z.object({
  host: nonEmptyTrimmedString(256),
  port: z.number().int().min(1).max(65535).default(443),
  serverName: optionalNonEmptyTrimmedString,
  timeoutMs: z.number().int().min(1).max(15000).default(8000)
});
type TlsAuditInput = z.infer<typeof tlsAuditInputSchema>;

const subdomainDiscoveryInputSchema = z.object({
  domain: nonEmptyTrimmedString(253),
  candidateLabels: z.array(nonEmptyTrimmedString(63)).max(10).default([...DEFAULT_SUBDOMAIN_LABELS]),
  includeHttpChecks: z.boolean().default(true)
});
type SubdomainDiscoveryInput = z.infer<typeof subdomainDiscoveryInputSchema>;

const dnsEnumerationInputSchema = z.object({
  domain: nonEmptyTrimmedString(253),
  recordTypes: z.array(z.enum(["A", "AAAA", "CNAME", "MX", "NS", "SOA", "TXT", "CAA"])).min(1).max(8).default(["A", "AAAA", "MX", "NS", "SOA", "TXT"])
});
type DnsEnumerationInput = z.infer<typeof dnsEnumerationInputSchema>;

function buildHttpAction(action: {
  id: string;
  url: string;
  method?: "GET" | "POST" | "HEAD";
  query?: Record<string, string>;
  formBody?: Record<string, string>;
  jsonBody?: Record<string, unknown>;
  followRedirects?: boolean;
}): ConnectorAction {
  return {
    kind: "http_request",
    id: action.id,
    url: action.url,
    method: action.method ?? "GET",
    headers: {},
    query: action.query ?? {},
    ...(action.formBody ? { formBody: action.formBody } : {}),
    ...(action.jsonBody ? { jsonBody: action.jsonBody } : {}),
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxResponseBytes: DEFAULT_HTTP_BYTES,
    followRedirects: action.followRedirects ?? true,
    captureBody: true,
    captureHeaders: true,
    delayMs: 0,
    responseBindings: []
  };
}

function buildParameterizedHttpAction(action: {
  id: string;
  target: z.infer<typeof activeValidationTargetSchema> & { parameter: string };
  markerValue: string;
}): ConnectorAction {
  const { target } = action;
  const query = { ...target.baseQuery };
  const formBody = { ...target.baseBody };

  if (target.encoding === "query") {
    query[target.parameter] = action.markerValue;
    return buildHttpAction({
      id: action.id,
      url: target.url,
      method: target.method,
      query
    });
  }

  if (target.encoding === "form") {
    formBody[target.parameter] = action.markerValue;
    return buildHttpAction({
      id: action.id,
      url: target.url,
      method: target.method,
      formBody
    });
  }

  return buildHttpAction({
    id: action.id,
    url: target.url,
    method: target.method,
    jsonBody: {
      ...formBody,
      [target.parameter]: action.markerValue
    }
  });
}

function detectHtmlTitle(body: string) {
  const match = body.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

function reflectsMarker(body: string, marker: string) {
  return body.includes(marker);
}

export const nativeHttpSurfaceAssessmentTool = buildNativeTool({
  id: "native-http-surface-assessment",
  name: "HTTP Surface Assessment",
  description: "Assess one explicit HTTP or HTTPS target for reachability, redirect behavior, response headers, cookies, title text, and light fingerprint hints. Use this when you need a bounded first look at a known web surface before deeper crawling or validation. Provide `targetUrl`, `baseUrl`, or `url`, and optionally disable redirects if the redirect chain itself is the evidence you need. Returns grounded observations from the fetched response and any redirect destination that was actually observed. It does not prove hidden routes, authenticated behavior, or broader application coverage.",
  category: "web",
  riskTier: "passive",
  capabilities: ["http-surface", "web", "passive", "fingerprinting"],
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      targetUrl: { type: "string", description: "Preferred explicit URL to fetch." },
      baseUrl: { type: "string", description: "Application base URL when targetUrl is not provided." },
      url: { type: "string", description: "Alias for an explicit URL to fetch." },
      followRedirects: { type: "boolean", description: "Follow redirects before returning the final response." }
    },
    required: []
  },
  constraintProfile: httpConstraintProfile("passive", "none")
});

export const nativeWebCrawlMappingTool = buildNativeTool({
  id: "native-web-crawl-mapping",
  name: "Web Crawl Mapping",
  description: "Map one explicit start page with a tight request budget by collecting the page itself and, optionally, its `robots.txt` file. Use this when you need bounded discovery of links, forms, scripts, and crawl hints from a known entrypoint instead of broad site traversal. Provide `startUrl` or `baseUrl`, and optionally disable `includeRobots` when only the entrypoint matters. Returns only the links, form actions, and robots entries actually observed in fetched content. It does not prove full site coverage, deep crawl completeness, or access-controlled paths.",
  category: "web",
  riskTier: "passive",
  capabilities: ["web-crawl", "web", "passive", "mapping"],
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      startUrl: { type: "string", description: "Known entrypoint URL to fetch and parse." },
      baseUrl: { type: "string", description: "Application base URL when startUrl is omitted." },
      includeRobots: { type: "boolean", description: "Also request `/robots.txt` from the same origin." }
    },
    required: []
  },
  constraintProfile: httpConstraintProfile("passive", "none")
});

export const nativeContentDiscoveryTool = buildNativeTool({
  id: "native-content-discovery",
  name: "Content Discovery",
  description: "Validate a bounded list of candidate paths against one explicit base URL. Use this when you already have concrete candidate routes or are comfortable with a small strict default list and need grounded confirmation of which paths respond. Provide `baseUrl` and optionally `candidatePaths` or `method`. Returns only the candidate paths that produced a non-404 response and preserves failures as observed evidence. It does not brute-force large wordlists, infer hidden content beyond the supplied list, or prove authorization bypass.",
  category: "content",
  riskTier: "active",
  capabilities: ["content-discovery", "web", "active-recon"],
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      baseUrl: { type: "string", description: "Origin or application base URL used to resolve candidate paths." },
      candidatePaths: { type: "array", items: { type: "string" }, description: "Explicit bounded candidate path list." },
      method: { type: "string", enum: ["GET", "HEAD"], description: "Use GET when body snippets matter; HEAD when reachability alone is enough." }
    },
    required: ["baseUrl"]
  },
  constraintProfile: httpConstraintProfile("active", "content-enumeration")
});

export const nativeParameterDiscoveryTool = buildNativeTool({
  id: "native-parameter-discovery",
  name: "Parameter Discovery",
  description: "Probe explicit endpoints for candidate parameter acceptance or reflection by sending one bounded test value per named parameter. Use this when you already know the endpoints and candidate parameter names and need grounded evidence of reflection or response changes. Provide `endpoints` with the exact URL, method, candidate parameters, and any baseline query or body fields needed for the request shape. Returns only observed reflection or notable response deltas for the tested parameters. It does not crawl for new endpoints, fuzz arbitrary parameter names, or prove exploitability.",
  category: "web",
  riskTier: "active",
  capabilities: ["param-discovery", "web", "active-recon"],
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      endpoints: { type: "array", items: { type: "object" }, description: "Bounded explicit endpoint definitions with candidate parameter names." }
    },
    required: ["endpoints"]
  },
  constraintProfile: httpConstraintProfile("active", "active-validation")
});

export const nativeSqlInjectionValidationTool = buildNativeTool({
  id: "native-sql-injection-validation",
  name: "SQL Injection Validation",
  description: "Validate explicit parameters for likely SQL-injection behavior using deterministic baseline and quote-based test payloads. Use this when you have a concrete endpoint and parameter and need bounded confirmation of SQL error leakage or materially different responses, not general exploitation. Provide `targets` with the exact URL, method, parameter name, and any baseline query or body fields required by the request. Returns grounded evidence such as SQL error strings or significant baseline-versus-test response divergence. It does not dump data, bypass authentication, or prove full exploitability.",
  category: "web",
  riskTier: "active",
  capabilities: ["sqli", "web", "active-validation"],
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      targets: { type: "array", items: { type: "object" }, description: "Explicit endpoint and parameter targets to validate." }
    },
    required: ["targets"]
  },
  constraintProfile: httpConstraintProfile("active", "active-validation")
});

export const nativeXssValidationTool = buildNativeTool({
  id: "native-xss-validation",
  name: "XSS Validation",
  description: "Validate explicit parameters for simple reflected-input exposure using a bounded marker payload. Use this when you have a concrete endpoint and parameter and need to confirm whether untrusted input is reflected into the response body. Provide `targets` with the exact URL, method, parameter name, and any baseline query or body fields required by the request. Returns grounded evidence only when the marker string is actually reflected in the observed response. It does not execute JavaScript, prove stored or DOM-based XSS, or perform general fuzzing.",
  category: "web",
  riskTier: "active",
  capabilities: ["xss", "web", "active-validation"],
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      targets: { type: "array", items: { type: "object" }, description: "Explicit endpoint and parameter targets to validate." }
    },
    required: ["targets"]
  },
  constraintProfile: httpConstraintProfile("active", "active-validation")
});

export const nativeNetworkHostDiscoveryTool = buildNativeTool({
  id: "native-network-host-discovery",
  name: "Network Host Discovery",
  description: "Check an explicit host and bounded candidate port list for basic reachability using direct TCP connection attempts. Use this when you need grounded evidence of which common ports accept connections on a known host before deeper service probing. Provide `host`, and optionally narrow `candidatePorts` or change `timeoutMs` when the network is known to be slow. Returns only the connection outcomes that were actually observed for the tested ports. It does not identify services beyond coarse reachability or prove application-layer behavior.",
  category: "network",
  riskTier: "passive",
  capabilities: ["network", "port-scan", "passive"],
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      host: { type: "string", description: "Explicit host or IP address to test." },
      candidatePorts: { type: "array", items: { type: "number" }, description: "Bounded explicit port list." },
      timeoutMs: { type: "number", description: "Per-port connection timeout in milliseconds." }
    },
    required: ["host"]
  },
  constraintProfile: networkConstraintProfile("passive", ["host", "domain"])
});

export const nativeNetworkServiceEnumerationTool = buildNativeTool({
  id: "native-network-service-enumeration",
  name: "Network Service Enumeration",
  description: "Enumerate explicit TCP services on a known host by connecting to bounded ports and capturing any immediate banner or protocol hint. Use this after host discovery when you already know the ports worth examining and need grounded evidence of likely service identity. Provide `host` and explicit `ports`, and optionally `send` when the service requires a small probe string to return a banner. Returns only the banners and port-based protocol hints that were actually observed. It does not perform full protocol negotiation, vulnerability exploitation, or broad scanning.",
  category: "network",
  riskTier: "active",
  capabilities: ["service-enum", "network", "active-recon"],
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      host: { type: "string", description: "Explicit host or IP address to test." },
      ports: { type: "array", items: { type: "number" }, description: "Bounded explicit port list." },
      send: { type: "string", description: "Optional probe string to send after connect." },
      timeoutMs: { type: "number", description: "Per-port timeout in milliseconds." }
    },
    required: ["host", "ports"]
  },
  constraintProfile: networkConstraintProfile("active", ["host", "domain"])
});

export const nativeTlsPostureAuditTool = buildNativeTool({
  id: "native-tls-posture-audit",
  name: "TLS Posture Audit",
  description: "Audit the TLS handshake posture of one explicit host and port by collecting the negotiated protocol, cipher, and peer certificate metadata. Use this when you need grounded evidence about transport security on a known TLS listener before interpreting higher-level web findings. Provide `host`, and optionally `port`, `serverName`, or `timeoutMs` when SNI or non-default ports are required. Returns only handshake metadata that was actually negotiated with the target. It does not grade compliance exhaustively, test every cipher suite, or prove hostname validation by clients.",
  category: "network",
  riskTier: "passive",
  capabilities: ["tls", "network", "passive"],
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      host: { type: "string", description: "Explicit host or IP address for the TLS listener." },
      port: { type: "number", description: "TLS port, defaulting to 443." },
      serverName: { type: "string", description: "Optional SNI value when different from `host`." },
      timeoutMs: { type: "number", description: "Handshake timeout in milliseconds." }
    },
    required: ["host"]
  },
  constraintProfile: networkConstraintProfile("passive", ["host", "domain"])
});

export const nativeSubdomainDiscoveryTool = buildNativeTool({
  id: "native-subdomain-discovery",
  name: "Subdomain Discovery",
  description: "Discover bounded subdomain candidates for one explicit parent domain using DNS lookups and optional direct HTTP reachability checks. Use this when you need grounded confirmation of likely subdomains from a strict candidate set rather than passive OSINT collection or brute force. Provide `domain`, and optionally customize `candidateLabels` or disable `includeHttpChecks` when DNS-only evidence is sufficient. Returns only subdomains that actually resolved or responded to HTTP(S) during the run. It does not enumerate the full namespace or prove ownership of every discovered hostname.",
  category: "subdomain",
  riskTier: "active",
  capabilities: ["subdomain-discovery", "dns", "web", "active-recon"],
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      domain: { type: "string", description: "Parent domain such as `example.com`." },
      candidateLabels: { type: "array", items: { type: "string" }, description: "Bounded explicit left-hand labels such as `api` or `auth`." },
      includeHttpChecks: { type: "boolean", description: "Attempt HTTPS then HTTP reachability checks for resolved subdomains." }
    },
    required: ["domain"]
  },
  constraintProfile: networkConstraintProfile("active", ["domain"])
});

export const nativeDnsEnumerationTool = buildNativeTool({
  id: "native-dns-enumeration",
  name: "DNS Enumeration",
  description: "Enumerate deterministic DNS record sets for one explicit domain. Use this when you need grounded A, AAAA, MX, NS, SOA, TXT, or CAA evidence for a known domain without relying on external passive data sources. Provide `domain`, and optionally narrow or expand `recordTypes` within the supported bounded set. Returns only the record answers and response codes actually observed from DNS resolution. It does not brute-force names, derive hidden zones, or prove service reachability on the returned hosts.",
  category: "dns",
  riskTier: "passive",
  capabilities: ["dns", "passive", "enum"],
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      domain: { type: "string", description: "Explicit domain to query." },
      recordTypes: { type: "array", items: { type: "string" }, description: "Bounded supported record types to collect." }
    },
    required: ["domain"]
  },
  constraintProfile: networkConstraintProfile("passive", ["domain"])
});

export const nativeHttpSurfaceAssessmentImplementation: NativeToolImplementation<HttpSurfaceInput> = {
  tool: nativeHttpSurfaceAssessmentTool,
  parseInput(rawInput) {
    return httpSurfaceInputSchema.parse(rawInput);
  },
  plan(input) {
    const resolvedUrl = input.targetUrl ?? input.baseUrl ?? input.url;
    if (!resolvedUrl) {
      throw new Error("HTTP Surface Assessment requires a target URL.");
    }

    return {
      actions: [buildHttpAction({
        id: "http-surface-1",
        url: ensureAbsoluteUrl(resolvedUrl),
        followRedirects: input.followRedirects
      })]
    };
  },
  parse(actionResults, _input, context) {
    assertResultCount(actionResults, 1, this.tool.name);
    const result = actionResults[0];
    if (!result || result.kind !== "http_request") {
      throw new Error("HTTP Surface Assessment requires one HTTP action result.");
    }

    const observations: InternalObservation[] = [];
    if (result.networkError) {
      observations.push(createObservation(context, "http-surface-error", "HTTP request failed", result.networkError, "medium", 0.9));
      return finish(`HTTP surface request failed: ${result.networkError}`, observations, result.networkError);
    }

    const title = detectHtmlTitle(result.body);
    const locationHeader = result.headers["location"];
    const location = Array.isArray(locationHeader) ? locationHeader[0] : locationHeader;
    const serverHeader = result.headers["server"];
    const server = Array.isArray(serverHeader) ? serverHeader[0] : serverHeader;
    const setCookieHeader = result.headers["set-cookie"];
    const cookieCount = Array.isArray(setCookieHeader) ? setCookieHeader.length : (setCookieHeader ? 1 : 0);
    observations.push(createObservation(context, "http-surface-status", "HTTP response received", `Status ${result.statusCode} reached in ${result.durationMs}ms with ${cookieCount} cookie header${cookieCount === 1 ? "" : "s"}.`));
    if (title) {
      observations.push(createObservation(context, "http-surface-title", "HTML title observed", `Page title: ${title}`));
    }
    if (location) {
      observations.push(createObservation(context, "http-surface-location", "Redirect location observed", `Location header: ${location}`));
    }
    if (server) {
      observations.push(createObservation(context, "http-surface-server", "Server header observed", `Server header: ${server}`));
    }

    return finish(`HTTP surface assessment observed status ${result.statusCode}${title ? ` and title "${title}"` : ""}.`, observations);
  }
};

export const nativeWebCrawlMappingImplementation: NativeToolImplementation<WebCrawlInput> = {
  tool: nativeWebCrawlMappingTool,
  parseInput(rawInput) {
    return webCrawlInputSchema.parse(rawInput);
  },
  plan(input) {
    const startUrl = ensureAbsoluteUrl(input.startUrl ?? input.baseUrl!);
    const actions: ConnectorAction[] = [buildHttpAction({ id: "crawl-start-1", url: startUrl })];
    if (input.includeRobots) {
      actions.push(buildHttpAction({ id: "crawl-robots-1", url: new URL("/robots.txt", startUrl).toString() }));
    }
    return { actions };
  },
  parse(actionResults, _input, context) {
    const resultById = httpResultById(actionResults);
    const start = resultById.get("crawl-start-1");
    if (!start) {
      throw new Error("Web Crawl Mapping missing start-page result.");
    }

    const observations: InternalObservation[] = [];
    if (start.networkError) {
      observations.push(createObservation(context, "crawl-start-error", "Start page request failed", start.networkError, "medium", 0.9));
      return finish(`Crawl mapping failed on the start page: ${start.networkError}`, observations, start.networkError);
    }

    const links = [...new Set([...start.body.matchAll(/href=["']([^"'#]+)["']/gi)].map((match) => match[1]).filter(Boolean))].slice(0, 12);
    const forms = [...new Set([...start.body.matchAll(/<form[^>]+action=["']([^"']+)["']/gi)].map((match) => match[1]).filter(Boolean))].slice(0, 8);
    const scripts = [...new Set([...start.body.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1]).filter(Boolean))].slice(0, 8);
    observations.push(createObservation(context, "crawl-start-summary", "Start page parsed", `Observed ${links.length} links, ${forms.length} forms, and ${scripts.length} scripts on the start page.`));
    if (links.length > 0) {
      observations.push(createObservation(context, "crawl-links", "Links observed", `Sample links: ${links.join(", ")}`));
    }
    if (forms.length > 0) {
      observations.push(createObservation(context, "crawl-forms", "Forms observed", `Form actions: ${forms.join(", ")}`));
    }
    const robots = resultById.get("crawl-robots-1");
    if (robots && !robots.networkError && robots.statusCode < 400 && robots.body.trim().length > 0) {
      observations.push(createObservation(context, "crawl-robots", "robots.txt observed", summarizeBody(robots.body)));
    }

    return finish(`Crawl mapping parsed ${links.length} link${links.length === 1 ? "" : "s"} and ${forms.length} form${forms.length === 1 ? "" : "s"} from the entrypoint.`, observations);
  }
};

export const nativeContentDiscoveryImplementation: NativeToolImplementation<ContentDiscoveryInput> = {
  tool: nativeContentDiscoveryTool,
  parseInput(rawInput) {
    return contentDiscoveryInputSchema.parse(rawInput);
  },
  plan(input) {
    return {
      actions: input.candidatePaths.map((path, index) => buildHttpAction({
        id: `content-${index + 1}`,
        url: ensureAbsoluteUrl(path, input.baseUrl),
        method: input.method === "HEAD" ? "HEAD" : "GET",
        followRedirects: false
      }))
    };
  },
  parse(actionResults, input, context) {
    assertResultCount(actionResults, input.candidatePaths.length, this.tool.name);
    const observations: InternalObservation[] = [];
    const found = actionResults
      .filter((result): result is Extract<ConnectorActionResult, { kind: "http_request" }> => result.kind === "http_request")
      .map((result, index) => ({ result, path: input.candidatePaths[index] }))
      .filter(({ result }) => !result.networkError && result.statusCode !== 404);

    for (const entry of found.slice(0, 8)) {
      observations.push(createObservation(context, `content-${entry.path}`, "Candidate path responded", `${entry.path} returned status ${entry.result.statusCode}.`));
    }

    return finish(
      found.length > 0
        ? `Validated ${found.length} responding candidate path${found.length === 1 ? "" : "s"} from ${input.candidatePaths.length} tested.`
        : `No candidate paths responded outside 404 from ${input.candidatePaths.length} tested.`,
      observations
    );
  }
};

export const nativeParameterDiscoveryImplementation: NativeToolImplementation<ParameterDiscoveryInput> = {
  tool: nativeParameterDiscoveryTool,
  parseInput(rawInput) {
    return parameterDiscoveryInputSchema.parse(rawInput);
  },
  plan(input) {
    const actions: ConnectorAction[] = [];
    input.endpoints.forEach((endpoint, endpointIndex) => {
      actions.push(buildHttpAction({
        id: `param-baseline-${endpointIndex + 1}`,
        url: endpoint.url,
        method: endpoint.method,
        query: endpoint.baseQuery,
        ...(endpoint.encoding === "form" ? { formBody: endpoint.baseBody } : {}),
        ...(endpoint.encoding === "json" ? { jsonBody: endpoint.baseBody } : {})
      }));
      endpoint.candidateParameters.forEach((parameter, parameterIndex) => {
        const marker = `synosec-param-${endpointIndex + 1}-${parameterIndex + 1}`;
        actions.push(buildParameterizedHttpAction({
          id: `param-test-${endpointIndex + 1}-${parameterIndex + 1}`,
          target: { ...endpoint, parameter },
          markerValue: marker
        }));
      });
    });
    return { actions };
  },
  parse(actionResults, input, context) {
    const resultById = httpResultById(actionResults);
    const observations: InternalObservation[] = [];
    let acceptedCount = 0;
    input.endpoints.forEach((endpoint, endpointIndex) => {
      const baseline = resultById.get(`param-baseline-${endpointIndex + 1}`);
      if (!baseline) {
        throw new Error(`Missing baseline result for endpoint ${endpoint.url}.`);
      }

      endpoint.candidateParameters.forEach((parameter, parameterIndex) => {
        const marker = `synosec-param-${endpointIndex + 1}-${parameterIndex + 1}`;
        const probe = resultById.get(`param-test-${endpointIndex + 1}-${parameterIndex + 1}`);
        if (!probe || probe.networkError) {
          return;
        }

        const reflected = reflectsMarker(probe.body, marker);
        const bodyLengthChanged = Math.abs(probe.body.length - baseline.body.length) >= 20;
        const statusChanged = probe.statusCode !== baseline.statusCode;
        if (reflected || bodyLengthChanged || statusChanged) {
          acceptedCount += 1;
          observations.push(createObservation(
            context,
            `parameter-${endpointIndex + 1}-${parameter}`,
            "Candidate parameter affected the response",
            `${parameter} on ${endpoint.url} produced${reflected ? " reflection" : ""}${statusChanged ? ` status ${baseline.statusCode}->${probe.statusCode}` : ""}${bodyLengthChanged ? ` body-length delta ${baseline.body.length}->${probe.body.length}` : ""}.`.trim(),
            reflected ? "medium" : "info",
            reflected ? 0.9 : 0.75
          ));
        }
      });
    });

    return finish(
      acceptedCount > 0
        ? `Observed ${acceptedCount} candidate parameter response effect${acceptedCount === 1 ? "" : "s"} across ${input.endpoints.length} endpoint${input.endpoints.length === 1 ? "" : "s"}.`
        : `No candidate parameters produced clear reflection or notable response deltas across ${input.endpoints.length} endpoint${input.endpoints.length === 1 ? "" : "s"}.`,
      observations
    );
  }
};

function buildSqlPayloads(target: z.infer<typeof activeValidationTargetSchema>) {
  return [
    { idSuffix: "quote", value: "'" },
    { idSuffix: "boolean", value: "' OR '1'='1" }
  ].map((entry) => ({
    id: entry.idSuffix,
    action: buildParameterizedHttpAction({
      id: `sqli-${entry.idSuffix}`,
      target,
      markerValue: entry.value
    })
  }));
}

export const nativeSqlInjectionValidationImplementation: NativeToolImplementation<SqlValidationInput> = {
  tool: nativeSqlInjectionValidationTool,
  parseInput(rawInput) {
    return sqlValidationInputSchema.parse(rawInput);
  },
  plan(input) {
    const actions: ConnectorAction[] = [];
    input.targets.forEach((target, index) => {
      actions.push(buildHttpAction({
        id: `sqli-baseline-${index + 1}`,
        url: target.url,
        method: target.method,
        query: target.baseQuery,
        ...(target.encoding === "form" ? { formBody: target.baseBody } : {}),
        ...(target.encoding === "json" ? { jsonBody: target.baseBody } : {})
      }));
      buildSqlPayloads(target).forEach((entry) => {
        actions.push({ ...entry.action, id: `${entry.action.id}-${index + 1}` });
      });
    });
    return { actions };
  },
  parse(actionResults, input, context) {
    const resultById = httpResultById(actionResults);
    const observations: InternalObservation[] = [];
    let findingCount = 0;

    input.targets.forEach((target, index) => {
      const baseline = resultById.get(`sqli-baseline-${index + 1}`);
      const quote = resultById.get(`sqli-quote-${index + 1}`);
      const booleanProbe = resultById.get(`sqli-boolean-${index + 1}`);
      if (!baseline || !quote || !booleanProbe) {
        throw new Error(`SQL Injection Validation missing action results for ${target.url}.`);
      }

      const probes = [quote, booleanProbe];
      const evidence = probes.find((probe) => SQLI_ERROR_PATTERNS.some((pattern) => pattern.test(probe.body)));
      const divergent = probes.find((probe) => probe.statusCode !== baseline.statusCode || Math.abs(probe.body.length - baseline.body.length) >= 40);
      if (evidence) {
        findingCount += 1;
        observations.push(createObservation(
          context,
          `sqli-${index + 1}`,
          "SQL error evidence observed",
          `${target.parameter} on ${target.url} produced database-error text: ${summarizeBody(evidence.body)}`,
          "high",
          0.95
        ));
        return;
      }

      if (divergent) {
        findingCount += 1;
        observations.push(createObservation(
          context,
          `sqli-divergent-${index + 1}`,
          "SQL injection probe changed the response",
          `${target.parameter} on ${target.url} changed from baseline status ${baseline.statusCode} to ${divergent.statusCode} or materially changed body length.`,
          "medium",
          0.75
        ));
      }
    });

    return finish(
      findingCount > 0
        ? `Observed ${findingCount} SQL injection validation signal${findingCount === 1 ? "" : "s"} across ${input.targets.length} tested parameter${input.targets.length === 1 ? "" : "s"}.`
        : `No SQL error leakage or strong deterministic response divergence was observed across ${input.targets.length} tested parameter${input.targets.length === 1 ? "" : "s"}.`,
      observations
    );
  }
};

export const nativeXssValidationImplementation: NativeToolImplementation<XssValidationInput> = {
  tool: nativeXssValidationTool,
  parseInput(rawInput) {
    return xssValidationInputSchema.parse(rawInput);
  },
  plan(input) {
    const actions: ConnectorAction[] = [];
    input.targets.forEach((target, index) => {
      const marker = `<synosec-xss-${index + 1}>`;
      actions.push(buildParameterizedHttpAction({
        id: `xss-${index + 1}`,
        target,
        markerValue: marker
      }));
    });
    return { actions };
  },
  parse(actionResults, input, context) {
    const resultById = httpResultById(actionResults);
    const observations: InternalObservation[] = [];
    let findingCount = 0;
    input.targets.forEach((target, index) => {
      const marker = `<synosec-xss-${index + 1}>`;
      const result = resultById.get(`xss-${index + 1}`);
      if (!result) {
        throw new Error(`Missing XSS validation result for ${target.url}.`);
      }
      if (!result.networkError && reflectsMarker(result.body, marker)) {
        findingCount += 1;
        observations.push(createObservation(
          context,
          `xss-${index + 1}`,
          "Reflected marker observed",
          `${target.parameter} on ${target.url} reflected the exact marker string in the response body.`,
          "high",
          0.95
        ));
      }
    });
    return finish(
      findingCount > 0
        ? `Observed ${findingCount} reflected-input signal${findingCount === 1 ? "" : "s"} across ${input.targets.length} tested parameter${input.targets.length === 1 ? "" : "s"}.`
        : `No exact reflected-input marker was observed across ${input.targets.length} tested parameter${input.targets.length === 1 ? "" : "s"}.`,
      observations
    );
  }
};

export const nativeNetworkHostDiscoveryImplementation: NativeToolImplementation<HostDiscoveryInput> = {
  tool: nativeNetworkHostDiscoveryTool,
  parseInput(rawInput) {
    return hostDiscoveryInputSchema.parse(rawInput);
  },
  plan(input) {
    return {
      actions: input.candidatePorts.map((port, index) => ({
        kind: "tcp_connect" as const,
        id: `tcp-host-${index + 1}`,
        host: input.host,
        port,
        timeoutMs: input.timeoutMs,
        maxReadBytes: 256
      }))
    };
  },
  parse(actionResults, input, context) {
    assertResultCount(actionResults, input.candidatePorts.length, this.tool.name);
    const observations: InternalObservation[] = [];
    const openPorts = actionResults
      .filter((result): result is Extract<ConnectorActionResult, { kind: "tcp_connect" }> => result.kind === "tcp_connect")
      .filter((result) => result.status === "connected");
    for (const entry of openPorts) {
      observations.push(createObservation(context, `host-port-${entry.port}`, "Port accepted a TCP connection", `${input.host}:${entry.port} accepted a direct TCP connection.`));
    }
    return finish(
      openPorts.length > 0
        ? `Observed ${openPorts.length} reachable port${openPorts.length === 1 ? "" : "s"} on ${input.host}.`
        : `No tested ports accepted a TCP connection on ${input.host}.`,
      observations
    );
  }
};

function guessProtocol(port: number, banner: string) {
  const normalized = banner.toLowerCase();
  if (normalized.includes("ssh")) return "ssh";
  if (normalized.includes("smtp")) return "smtp";
  if (normalized.includes("ftp")) return "ftp";
  if (normalized.includes("http")) return "http";
  if (port === 22) return "ssh";
  if (port === 25) return "smtp";
  if (port === 80 || port === 8080 || port === 8000) return "http";
  if (port === 443 || port === 8443) return "https-or-tls";
  return "unknown";
}

export const nativeNetworkServiceEnumerationImplementation: NativeToolImplementation<ServiceEnumerationInput> = {
  tool: nativeNetworkServiceEnumerationTool,
  parseInput(rawInput) {
    return serviceEnumerationInputSchema.parse(rawInput);
  },
  plan(input) {
    return {
      actions: input.ports.map((port, index) => ({
        kind: "tcp_connect" as const,
        id: `tcp-service-${index + 1}`,
        host: input.host,
        port,
        timeoutMs: input.timeoutMs,
        ...(input.send ? { send: input.send } : {}),
        maxReadBytes: 1024
      }))
    };
  },
  parse(actionResults, input, context) {
    assertResultCount(actionResults, input.ports.length, this.tool.name);
    const observations: InternalObservation[] = [];
    const connected = actionResults
      .filter((result): result is Extract<ConnectorActionResult, { kind: "tcp_connect" }> => result.kind === "tcp_connect")
      .filter((result) => result.status === "connected");
    connected.forEach((result) => {
      observations.push(createObservation(
        context,
        `service-${result.port}`,
        "Service banner or protocol hint observed",
        `${input.host}:${result.port} connected with protocol hint ${guessProtocol(result.port, result.banner)}${result.banner ? ` and banner "${summarizeBody(result.banner)}"` : ""}.`
      ));
    });
    return finish(
      connected.length > 0
        ? `Enumerated ${connected.length} reachable service port${connected.length === 1 ? "" : "s"} on ${input.host}.`
        : `No tested service ports completed a TCP connection on ${input.host}.`,
      observations
    );
  }
};

export const nativeTlsPostureAuditImplementation: NativeToolImplementation<TlsAuditInput> = {
  tool: nativeTlsPostureAuditTool,
  parseInput(rawInput) {
    return tlsAuditInputSchema.parse(rawInput);
  },
  plan(input) {
    return {
      actions: [{
        kind: "tls_handshake" as const,
        id: "tls-1",
        host: input.host,
        port: input.port,
        ...(input.serverName ? { serverName: input.serverName } : {}),
        timeoutMs: input.timeoutMs
      }]
    };
  },
  parse(actionResults, input, context) {
    assertResultCount(actionResults, 1, this.tool.name);
    const result = actionResults[0];
    if (!result || result.kind !== "tls_handshake") {
      throw new Error("TLS Posture Audit requires one TLS action result.");
    }

    const observations: InternalObservation[] = [];
    if (!result.ok) {
      const reason = result.handshakeError ?? result.networkError ?? "TLS handshake failed.";
      observations.push(createObservation(context, "tls-error", "TLS handshake failed", reason, "medium", 0.9));
      return finish(`TLS posture audit failed for ${input.host}:${input.port}: ${reason}`, observations, reason);
    }

    observations.push(createObservation(context, "tls-protocol", "TLS handshake negotiated", `Negotiated protocol ${result.protocol ?? "unknown"} with cipher ${result.cipher ?? "unknown"}.`));
    if (result.certSubject || result.certIssuer) {
      observations.push(createObservation(context, "tls-certificate", "Certificate metadata observed", `Certificate subject ${result.certSubject ?? "unknown"} issued by ${result.certIssuer ?? "unknown"}.`));
    }
    if (result.validTo) {
      observations.push(createObservation(context, "tls-validity", "Certificate validity window observed", `Certificate validity window: ${result.validFrom ?? "unknown"} to ${result.validTo}.`));
    }
    return finish(`TLS posture audit observed ${result.protocol ?? "an unknown TLS protocol"} on ${input.host}:${input.port}.`, observations);
  }
};

export const nativeSubdomainDiscoveryImplementation: NativeToolImplementation<SubdomainDiscoveryInput> = {
  tool: nativeSubdomainDiscoveryTool,
  parseInput(rawInput) {
    return subdomainDiscoveryInputSchema.parse(rawInput);
  },
  plan(input) {
    const actions: ConnectorAction[] = [];
    input.candidateLabels.forEach((label, index) => {
      const hostname = `${label}.${input.domain}`;
      actions.push({
        kind: "dns_query",
        id: `subdomain-dns-${index + 1}`,
        name: hostname,
        recordType: "A",
        timeoutMs: DEFAULT_TIMEOUT_MS
      });
      if (input.includeHttpChecks) {
        actions.push(buildHttpAction({
          id: `subdomain-https-${index + 1}`,
          url: `https://${hostname}/`,
          followRedirects: false
        }));
        actions.push(buildHttpAction({
          id: `subdomain-http-${index + 1}`,
          url: `http://${hostname}/`,
          followRedirects: false
        }));
      }
    });
    return { actions };
  },
  parse(actionResults, input, context) {
    const dnsById = dnsResultById(actionResults);
    const httpById = httpResultById(actionResults);
    const observations: InternalObservation[] = [];
    let discoveredCount = 0;
    input.candidateLabels.forEach((label, index) => {
      const hostname = `${label}.${input.domain}`;
      const dnsResult = dnsById.get(`subdomain-dns-${index + 1}`);
      const httpsResult = httpById.get(`subdomain-https-${index + 1}`);
      const httpResult = httpById.get(`subdomain-http-${index + 1}`);
      const resolved = dnsResult?.ok && dnsResult.answers.length > 0;
      const httpReachable = [httpsResult, httpResult].some((result) => result && !result.networkError && result.statusCode > 0);
      if (resolved || httpReachable) {
        discoveredCount += 1;
        observations.push(createObservation(
          context,
          `subdomain-${hostname}`,
          "Candidate subdomain responded",
          `${hostname} ${resolved ? `resolved to ${dnsResult?.answers.map((answer) => answer.data).join(", ")}` : "did not resolve"}${httpReachable ? " and answered HTTP(S)" : ""}.`
        ));
      }
    });
    return finish(
      discoveredCount > 0
        ? `Discovered ${discoveredCount} responsive or resolving subdomain candidate${discoveredCount === 1 ? "" : "s"} for ${input.domain}.`
        : `No bounded subdomain candidates resolved or answered HTTP(S) for ${input.domain}.`,
      observations
    );
  }
};

export const nativeDnsEnumerationImplementation: NativeToolImplementation<DnsEnumerationInput> = {
  tool: nativeDnsEnumerationTool,
  parseInput(rawInput) {
    return dnsEnumerationInputSchema.parse(rawInput);
  },
  plan(input) {
    return {
      actions: input.recordTypes.map((recordType, index) => ({
        kind: "dns_query" as const,
        id: `dns-${index + 1}`,
        name: input.domain,
        recordType,
        timeoutMs: DEFAULT_TIMEOUT_MS
      }))
    };
  },
  parse(actionResults, input, context) {
    assertResultCount(actionResults, input.recordTypes.length, this.tool.name);
    const observations: InternalObservation[] = [];
    let answerCount = 0;
    actionResults.forEach((result, index) => {
      if (result.kind !== "dns_query") {
        throw new Error("DNS Enumeration requires only DNS action results.");
      }
      if (result.answers.length > 0) {
        answerCount += result.answers.length;
        observations.push(createObservation(
          context,
          `dns-${index + 1}`,
          `${result.recordType} answers observed`,
          `${result.recordType} returned ${result.answers.map((answer) => answer.data).join(", ")}.`
        ));
      }
    });
    return finish(
      answerCount > 0
        ? `Collected ${answerCount} DNS answer${answerCount === 1 ? "" : "s"} across ${input.recordTypes.length} record type${input.recordTypes.length === 1 ? "" : "s"} for ${input.domain}.`
        : `No DNS answers were returned across ${input.recordTypes.length} requested record type${input.recordTypes.length === 1 ? "" : "s"} for ${input.domain}.`,
      observations
    );
  }
};

export const networkFirstNativeImplementations = [
  nativeHttpSurfaceAssessmentImplementation,
  nativeWebCrawlMappingImplementation,
  nativeContentDiscoveryImplementation,
  nativeParameterDiscoveryImplementation,
  nativeSqlInjectionValidationImplementation,
  nativeXssValidationImplementation,
  nativeNetworkHostDiscoveryImplementation,
  nativeNetworkServiceEnumerationImplementation,
  nativeTlsPostureAuditImplementation,
  nativeSubdomainDiscoveryImplementation,
  nativeDnsEnumerationImplementation
] as const;

export const networkFirstNativeTools = networkFirstNativeImplementations.map((implementation) => implementation.tool);
