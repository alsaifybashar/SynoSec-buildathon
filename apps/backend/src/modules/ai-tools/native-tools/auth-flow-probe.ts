import { z } from "zod";
import type {
  AiTool,
  ConnectorActionBatch,
  ConnectorActionResult,
  ConnectorHttpRequestAction,
  ConnectorHttpResponseBinding,
  InternalObservation
} from "@synosec/contracts";
import type { NativeToolImplementation, NativeToolParseContext, NativeToolResult } from "./types.js";

const builtinTimestamp = "2026-04-30T00:00:00.000Z";
const MAX_RESPONSE_BYTES = 32768;
const DEFAULT_TIMEOUT_MS = 2500;
const DEFAULT_RATE_LIMIT_ATTEMPTS = 6;
const DEFAULT_ORACLE_SAMPLES = 3;
const DEFAULT_BASELINE_REPEATS = 2;
const authFlowProbeModeSchema = z.enum(["login-probe", "artifact-validation"]);
const loginProbeTargetKindSchema = z.enum(["login-endpoint", "app-base"]);
const httpMethodSchema = z.enum(["GET", "POST"]);
const requestEncodingSchema = z.enum(["form", "json"]);
const csrfSourceSchema = z.enum(["body_regex", "header"]);
const csrfTransportSchema = z.enum(["field", "header"]);
const defaultWeakPasswordCandidates = [
  "password",
  "Password123",
  "12345678"
] as const;

const nonEmptyTrimmedString = z.string().transform((value) => value.trim()).pipe(z.string().min(1));
const optionalNonEmptyTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, nonEmptyTrimmedString.optional());

const optionalStringArraySchema = z.preprocess((value) => {
  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}, z.array(nonEmptyTrimmedString).max(3).optional());

const successHintsSchema = z.object({
  successRedirectPath: optionalNonEmptyTrimmedString,
  successBodyStrings: z.array(nonEmptyTrimmedString).default([]),
  successHeaderKeys: z.array(nonEmptyTrimmedString).default([])
});

const preflightRequestSchema = z.object({
  url: optionalNonEmptyTrimmedString,
  path: optionalNonEmptyTrimmedString,
  headers: z.record(z.string(), z.string()).default({}),
  query: z.record(z.string(), z.string()).default({}),
  cookieNames: z.array(nonEmptyTrimmedString).default([])
}).superRefine((value, ctx) => {
  if (value.url && value.path) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Preflight request must not provide both url and path.",
      path: ["url"]
    });
  }
});

const csrfSchema = z.object({
  source: csrfSourceSchema,
  transport: csrfTransportSchema,
  name: nonEmptyTrimmedString,
  pattern: optionalNonEmptyTrimmedString,
  responseHeaderName: optionalNonEmptyTrimmedString
}).superRefine((value, ctx) => {
  if (value.source === "body_regex" && !value.pattern) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "pattern is required when csrf.source=body_regex.",
      path: ["pattern"]
    });
  }

  if (value.source === "header" && !value.responseHeaderName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "responseHeaderName is required when csrf.source=header.",
      path: ["responseHeaderName"]
    });
  }
});

const artifactValidationTargetItemSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    url: { type: "string" },
    path: { type: "string" },
    method: { type: "string", enum: ["GET", "POST"] },
    headers: { type: "object", additionalProperties: { type: "string" } },
    query: { type: "object", additionalProperties: { type: "string" } },
    body: { type: "object", additionalProperties: { type: "string" } },
    requestEncoding: { type: "string", enum: ["form", "json"] },
    expectedEvidenceStrings: { type: "array", items: { type: "string" } },
    expectedEvidenceFields: { type: "array", items: { type: "string" } },
    expectedAuthBehavior: { type: "string" },
    successRedirectPath: { type: "string" },
    successBodyStrings: { type: "array", items: { type: "string" } },
    successHeaderKeys: { type: "array", items: { type: "string" } }
  }
} as const;

const validationTargetSchema = successHintsSchema.extend({
  url: optionalNonEmptyTrimmedString,
  path: optionalNonEmptyTrimmedString,
  method: httpMethodSchema.default("GET"),
  headers: z.record(z.string(), z.string()).default({}),
  query: z.record(z.string(), z.string()).default({}),
  body: z.record(z.string(), z.string()).default({}),
  requestEncoding: requestEncodingSchema.default("form"),
  expectedEvidenceStrings: z.array(z.string()).default([]),
  expectedEvidenceFields: z.array(z.string()).default([]),
  expectedAuthBehavior: optionalNonEmptyTrimmedString
}).superRefine((value, ctx) => {
  if (!value.url && !value.path) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Validation target must provide either url or path."
    });
  }

  if (value.url && value.path) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Validation target must not provide both url and path.",
      path: ["url"]
    });
  }

  if (value.method === "GET" && Object.keys(value.body).length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "GET validation targets must not provide body data.",
      path: ["body"]
    });
  }
});

const loginProbeInputSchema = successHintsSchema.extend({
  targetUrl: nonEmptyTrimmedString,
  targetKind: loginProbeTargetKindSchema,
  usernameField: optionalNonEmptyTrimmedString.default("username"),
  passwordField: optionalNonEmptyTrimmedString.default("password"),
  requestEncoding: requestEncodingSchema.default("form"),
  requestHeaders: z.record(z.string(), z.string()).default({}),
  preflightRequest: preflightRequestSchema.optional(),
  csrf: csrfSchema.optional(),
  knownUser: optionalNonEmptyTrimmedString,
  unknownUser: optionalNonEmptyTrimmedString.default("synosec-nonexistent-user"),
  weakPasswordCandidates: optionalStringArraySchema,
  rateLimitAttemptCount: z.number().int().min(1).max(12).default(DEFAULT_RATE_LIMIT_ATTEMPTS),
  oracleSampleCount: z.number().int().min(1).max(6).default(DEFAULT_ORACLE_SAMPLES),
  paceMs: z.number().int().min(0).max(5000).default(0)
}).superRefine((value, ctx) => {
  if (!value.preflightRequest && value.csrf) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "csrf configuration requires preflightRequest.",
      path: ["csrf"]
    });
  }
});

const artifactValidationInputSchema = z.object({
  targetUrl: optionalNonEmptyTrimmedString,
  artifactValidationTargets: z.array(validationTargetSchema).min(1),
  baselineRepeats: z.number().int().min(1).max(4).default(DEFAULT_BASELINE_REPEATS)
});

const authFlowProbeInputSchema = z.object({
  mode: authFlowProbeModeSchema,
  targetUrl: optionalNonEmptyTrimmedString,
  targetKind: loginProbeTargetKindSchema.optional(),
  usernameField: optionalNonEmptyTrimmedString.default("username"),
  passwordField: optionalNonEmptyTrimmedString.default("password"),
  requestEncoding: requestEncodingSchema.default("form"),
  requestHeaders: z.record(z.string(), z.string()).default({}),
  preflightRequest: preflightRequestSchema.optional(),
  csrf: csrfSchema.optional(),
  artifactValidationTargets: z.array(validationTargetSchema).default([]),
  knownUser: optionalNonEmptyTrimmedString,
  unknownUser: optionalNonEmptyTrimmedString.default("synosec-nonexistent-user"),
  weakPasswordCandidates: optionalStringArraySchema,
  successRedirectPath: optionalNonEmptyTrimmedString,
  successBodyStrings: z.array(nonEmptyTrimmedString).default([]),
  successHeaderKeys: z.array(nonEmptyTrimmedString).default([]),
  rateLimitAttemptCount: z.number().int().min(1).max(12).default(DEFAULT_RATE_LIMIT_ATTEMPTS),
  oracleSampleCount: z.number().int().min(1).max(6).default(DEFAULT_ORACLE_SAMPLES),
  paceMs: z.number().int().min(0).max(5000).default(0),
  baselineRepeats: z.number().int().min(1).max(4).default(DEFAULT_BASELINE_REPEATS)
}).superRefine((value, ctx) => {
  if (value.mode === "login-probe" && !value.targetUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "targetUrl is required in login-probe mode.",
      path: ["targetUrl"]
    });
  }

  if (value.mode === "login-probe" && !value.targetKind) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "targetKind is required in login-probe mode.",
      path: ["targetKind"]
    });
  }

  if (value.mode === "artifact-validation" && value.artifactValidationTargets.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "artifactValidationTargets must be non-empty in artifact-validation mode.",
      path: ["artifactValidationTargets"]
    });
  }
});

type SuccessHints = z.infer<typeof successHintsSchema>;
type LoginProbeInput = z.infer<typeof loginProbeInputSchema>;
type ArtifactValidationInput = z.infer<typeof artifactValidationInputSchema>;
type AuthFlowProbeInput = z.infer<typeof authFlowProbeInputSchema>;
type ValidationTarget = ArtifactValidationInput["artifactValidationTargets"][number];
type HttpActionResult = Extract<ConnectorActionResult, { kind: "http_request" }>;

function summarizeBody(body: string) {
  return body.replace(/\s+/g, " ").slice(0, 140);
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function httpResultById(actionResults: ConnectorActionResult[]) {
  return new Map(actionResults.map((result) => [result.actionId, result]));
}

function ensureAbsoluteUrl(candidate: string, fallbackBase?: string) {
  if (/^https?:\/\//i.test(candidate)) {
    return new URL(candidate).toString();
  }

  if (!fallbackBase) {
    throw new Error(`Cannot resolve relative URL without a base: ${candidate}`);
  }

  return new URL(candidate, fallbackBase).toString();
}

function baseUrlFromInput(input: { targetUrl?: string | undefined }) {
  if (input.targetUrl) {
    return ensureAbsoluteUrl(input.targetUrl);
  }

  return undefined;
}

function resolveLoginUrl(input: LoginProbeInput) {
  const baseUrl = baseUrlFromInput(input);
  if (!baseUrl) {
    throw new Error("Auth login probe requires targetUrl to resolve the login URL.");
  }

  if (input.targetKind === "login-endpoint") {
    return baseUrl;
  }

  const parsedBase = new URL(baseUrl);
  return parsedBase.pathname === "/login"
    ? parsedBase.toString()
    : new URL("/login", parsedBase).toString();
}

function resolvePreflightUrl(input: LoginProbeInput, loginUrl: string) {
  if (!input.preflightRequest) {
    return loginUrl;
  }

  const explicit = input.preflightRequest.url ?? input.preflightRequest.path;
  return explicit ? ensureAbsoluteUrl(explicit, baseUrlFromInput(input)) : loginUrl;
}

function resolveValidationUrl(target: ValidationTarget, input: ArtifactValidationInput) {
  const raw = target.url ?? target.path;
  if (!raw) {
    throw new Error("Validation target is missing a url or path.");
  }

  return ensureAbsoluteUrl(raw, baseUrlFromInput(input));
}

function createHttpAction(input: Omit<ConnectorHttpRequestAction, "kind">): ConnectorHttpRequestAction {
  return {
    kind: "http_request",
    ...input
  };
}

function baselineValues(target: ValidationTarget, method: "GET" | "POST") {
  const values = method === "POST"
    ? { ...target.body }
    : { ...target.query };

  for (const key of Object.keys(values)) {
    values[key] = `synosec-baseline-${key}`;
  }

  return values;
}

function expectedFieldsPresent(body: string, fields: string[]) {
  return fields.filter((field) => body.includes(String(field)));
}

function normalizedHeaderValue(headers: Record<string, string | string[]>, key: string) {
  const value = headers[key];
  if (value === undefined) {
    return "";
  }

  return Array.isArray(value) ? value.join(",") : value;
}

function authResponseFingerprint(result: HttpActionResult) {
  return {
    location: normalizedHeaderValue(result.headers, "location"),
    setCookie: normalizedHeaderValue(result.headers, "set-cookie"),
    wwwAuthenticate: normalizedHeaderValue(result.headers, "www-authenticate")
  };
}

function authSuccessSignal(body: string) {
  const normalized = body.toLowerCase();
  const negativeSignal = /error|invalid|denied|failed|failure|required|missing|unauthorized|forbidden/.test(normalized);
  const positiveSignal = /success|authenticated|welcome|sessiontoken|access_token|id_token|refresh_token|dashboard/.test(normalized);
  return positiveSignal && !negativeSignal;
}

function successHintsPresent(hints: SuccessHints) {
  return Boolean(
    hints.successRedirectPath
    || hints.successBodyStrings.length > 0
    || hints.successHeaderKeys.length > 0
  );
}

function matchesSuccessHints(result: HttpActionResult, hints: SuccessHints) {
  if (!successHintsPresent(hints)) {
    return false;
  }

  const location = normalizedHeaderValue(result.headers, "location");
  const redirectMatched = hints.successRedirectPath
    ? (() => {
        try {
          return new URL(location, "https://synosec.local").pathname === hints.successRedirectPath;
        } catch {
          return false;
        }
      })()
    : true;
  const bodyMatched = hints.successBodyStrings.length > 0
    ? hints.successBodyStrings.every((value) => result.body.includes(value))
    : true;
  const headersMatched = hints.successHeaderKeys.length > 0
    ? hints.successHeaderKeys.every((key) => normalizedHeaderValue(result.headers, key.toLowerCase()).length > 0)
    : true;

  return redirectMatched && bodyMatched && headersMatched;
}

function bodyFingerprint(body: string) {
  return summarizeBody(body);
}

function stableBaseline(baselines: HttpActionResult[]) {
  if (baselines.length <= 1) {
    return true;
  }

  const statuses = new Set(baselines.map((result) => result.statusCode));
  const locations = new Set(baselines.map((result) => authResponseFingerprint(result).location));
  const cookies = new Set(baselines.map((result) => authResponseFingerprint(result).setCookie));
  const bodies = new Set(baselines.map((result) => bodyFingerprint(result.body)));
  return statuses.size === 1 && locations.size <= 1 && cookies.size <= 1 && bodies.size <= 1;
}

function buildCookiePattern(cookieName: string) {
  return `${cookieName}=([^;\\s,]+)`;
}

function buildCookieHeaderTemplate(cookieNames: string[]) {
  return cookieNames.map((cookieName) => `${cookieName}={{cookie.${cookieName}}}`).join("; ");
}

function createResponseBinding(input: ConnectorHttpResponseBinding): ConnectorHttpResponseBinding {
  return input;
}

function createRequestHeaders(
  inputHeaders: Record<string, string>,
  extraHeaders: Record<string, string>
) {
  return {
    ...inputHeaders,
    ...extraHeaders
  };
}

function createLoginRequestPayload(
  input: LoginProbeInput,
  username: string,
  password: string
) {
  const payload: Record<string, string> = {
    [input.usernameField]: username,
    [input.passwordField]: password
  };

  if (input.csrf && input.csrf.transport === "field") {
    payload[input.csrf.name] = "{{csrf.token}}";
  }

  return payload;
}

function createPreflightAction(input: LoginProbeInput, loginUrl: string) {
  if (!input.preflightRequest) {
    return null;
  }

  const cookieNames = input.preflightRequest.cookieNames;
  const responseBindings: ConnectorHttpResponseBinding[] = [
    ...cookieNames.map((cookieName) => createResponseBinding({
      name: `cookie.${cookieName}`,
      source: "header",
      headerName: "set-cookie",
      pattern: buildCookiePattern(cookieName),
      groupIndex: 1,
      required: true
    })),
    ...(input.csrf
      ? [createResponseBinding({
          name: "csrf.token",
          source: input.csrf.source === "header" ? "header" : "body_regex",
          ...(input.csrf.source === "header"
            ? { headerName: input.csrf.responseHeaderName, pattern: input.csrf.pattern }
            : { pattern: input.csrf.pattern }),
          groupIndex: 1,
          required: true
        })]
      : [])
  ];

  return createHttpAction({
    id: "preflight-1",
    url: resolvePreflightUrl(input, loginUrl),
    method: "GET",
    headers: input.preflightRequest.headers,
    query: input.preflightRequest.query,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxResponseBytes: MAX_RESPONSE_BYTES,
    followRedirects: true,
    captureBody: true,
    captureHeaders: true,
    delayMs: 0,
    responseBindings
  });
}

function createLoginAction(
  input: LoginProbeInput,
  loginUrl: string,
  id: string,
  username: string,
  password: string,
  delayMs: number
) {
  const extraHeaders: Record<string, string> = {};
  if (input.preflightRequest?.cookieNames.length) {
    extraHeaders["cookie"] = buildCookieHeaderTemplate(input.preflightRequest.cookieNames);
  }
  if (input.csrf?.transport === "header") {
    extraHeaders[input.csrf.name] = "{{csrf.token}}";
  }

  const headers = createRequestHeaders(input.requestHeaders, extraHeaders);
  const payload = createLoginRequestPayload(input, username, password);

  return createHttpAction({
    id,
    url: loginUrl,
    method: "POST",
    headers,
    query: {},
    ...(input.requestEncoding === "json" ? { jsonBody: payload } : { formBody: payload }),
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxResponseBytes: MAX_RESPONSE_BYTES,
    followRedirects: true,
    captureBody: true,
    captureHeaders: true,
    delayMs,
    responseBindings: []
  });
}

function normalObservation(
  context: NativeToolParseContext,
  index: number,
  input: {
    key: string;
    title: string;
    summary: string;
    severity: InternalObservation["severity"];
    confidence: number;
    evidence: string;
    technique: string;
    relatedKeys?: string[];
  }
): InternalObservation {
  return {
    id: `${context.toolRun.id}-obs-${index + 1}`,
    scanId: context.scanId,
    tacticId: context.tacticId,
    toolRunId: context.toolRun.id,
    ...(context.request.toolId ? { toolId: context.request.toolId } : {}),
    tool: context.request.tool,
    capabilities: context.request.capabilities,
    target: context.request.target,
    createdAt: new Date().toISOString(),
    relatedKeys: input.relatedKeys ?? [],
    ...input
  };
}

function requestFailureMessage(url: string, result: ConnectorActionResult | undefined) {
  const reason = result?.kind === "http_request"
    ? result.networkError || result.body || "request failed"
    : "request failed";
  return `Auth flow probe could not reach ${url}: ${reason}`;
}

function summarizeObservations(observations: InternalObservation[]) {
  return observations.map((observation) => `${observation.severity.toUpperCase()} ${observation.summary}`);
}

function requireRelativeTargetsToHaveBase(input: ArtifactValidationInput) {
  const fallbackBase = baseUrlFromInput(input);
  for (const target of input.artifactValidationTargets) {
    const raw = target.url ?? target.path;
    if (!raw) {
      continue;
    }
    if (!/^https?:\/\//i.test(raw) && !fallbackBase) {
      throw new Error(`Validation target ${raw} requires targetUrl.`);
    }
  }
}

function parseArtifactValidationMode(
  actionResults: ConnectorActionResult[],
  input: ArtifactValidationInput,
  context: NativeToolParseContext
): NativeToolResult {
  const byId = httpResultById(actionResults);
  const observations: InternalObservation[] = [];
  const parserNotes: string[] = [];
  const summaryLines: string[] = [];

  for (const [targetIndex, target] of input.artifactValidationTargets.entries()) {
    const url = resolveValidationUrl(target, input);
    const baselines = Array.from({ length: input.baselineRepeats }, (_, repeatIndex) => byId.get(`validation-baseline-${targetIndex + 1}-${repeatIndex + 1}`));
    const artifact = byId.get(`validation-artifact-${targetIndex + 1}`);

    if (
      baselines.some((baseline) => baseline?.kind !== "http_request" || baseline.statusCode === 0 || Boolean(baseline.networkError))
      || artifact?.kind !== "http_request"
      || artifact.statusCode === 0
      || artifact.networkError
    ) {
      const failedBaseline = baselines.find((baseline) => baseline?.kind !== "http_request" || baseline?.statusCode === 0 || Boolean(baseline?.networkError));
      return {
        summary: requestFailureMessage(url, failedBaseline ?? artifact),
        statusReason: "Auth validation target was unreachable during auth flow probe",
        observations: [],
        debug: {
          attempts: actionResults.length,
          actionIds: actionResults.map((result) => result.actionId),
          parserNotes: ["validation target unreachable"]
        },
        exitCode: 64
      };
    }

    const baselineResults = baselines as HttpActionResult[];
    const explicitSuccessConfigured = successHintsPresent(target);
    const explicitSuccessMatched = matchesSuccessHints(artifact, target);
    const matchedStrings = target.expectedEvidenceStrings.filter((value) => artifact.body.includes(String(value)));
    const matchedFields = expectedFieldsPresent(artifact.body, target.expectedEvidenceFields);
    const baselineStatusStable = stableBaseline(baselineResults);
    const baselineStatuses = baselineResults.map((result) => result.statusCode);
    const baselineSignalsDeny = baselineResults.every((result) => result.statusCode >= 400);
    const authChanged = baselineResults.some((baseline) => (
      baseline.statusCode !== artifact.statusCode
      || authResponseFingerprint(baseline).location !== authResponseFingerprint(artifact).location
      || authResponseFingerprint(baseline).setCookie !== authResponseFingerprint(artifact).setCookie
      || authResponseFingerprint(baseline).wwwAuthenticate !== authResponseFingerprint(artifact).wwwAuthenticate
      || bodyFingerprint(baseline.body) !== bodyFingerprint(artifact.body)
    ));
    const artifactImproved = baselineSignalsDeny
      ? artifact.statusCode >= 200 && artifact.statusCode < 400
      : matchedStrings.length > 0 || matchedFields.length > 0 || authChanged;
    const accepted = explicitSuccessConfigured
      ? explicitSuccessMatched
      : baselineStatusStable && authChanged && artifactImproved;

    if (!baselineStatusStable && !explicitSuccessConfigured) {
      parserNotes.push(`target ${targetIndex + 1} stability_inconclusive`);
      summaryLines.push(`${target.method} ${new URL(url).pathname}: baseline behavior was unstable, so heuristic acceptance was not inferred.`);
      continue;
    }

    if (!accepted) {
      summaryLines.push(`${target.method} ${new URL(url).pathname}: no auth artifact acceptance signal confirmed.`);
      if (explicitSuccessConfigured) {
        parserNotes.push(`target ${targetIndex + 1} explicit success hints did not match`);
      }
      continue;
    }

    const path = new URL(url).pathname;
    observations.push(normalObservation(context, observations.length, {
      key: `auth-flow:${path}`,
      title: `Auth artifact changed behavior at ${path}`,
      summary: explicitSuccessConfigured
        ? `${target.method} ${path} matched explicit artifact-acceptance success indicators.`
        : `${target.method} ${path} accepted supplied auth artifacts after stable baseline comparison.`,
      severity: artifact.statusCode >= 200 && artifact.statusCode < 300 ? "high" : "medium",
      confidence: explicitSuccessConfigured ? 0.93 : 0.89,
      evidence: [
        `Request target: ${url}`,
        `Method: ${target.method}`,
        `Baseline repeats: ${input.baselineRepeats}`,
        `Baseline statuses: ${baselineStatuses.join(",")}`,
        `Artifact status: ${artifact.statusCode}`,
        `Artifact query: ${JSON.stringify(target.query)}`,
        `Artifact body: ${JSON.stringify(target.body)}`,
        `Expected behavior: ${target.expectedAuthBehavior || "not specified"}`,
        `Matched strings: ${matchedStrings.join(", ") || "none"}`,
        `Matched fields: ${matchedFields.join(", ") || "none"}`,
        `Explicit success hints configured: ${explicitSuccessConfigured ? "yes" : "no"}`,
        `Explicit success hints matched: ${explicitSuccessConfigured ? String(explicitSuccessMatched) : "n/a"}`,
        `Stable baseline: ${String(baselineStatusStable)}`,
        `Artifact improved versus baseline: ${String(artifactImproved)}`,
        `Baseline location: ${authResponseFingerprint(baselineResults[0]!).location || "-"}`,
        `Artifact location: ${authResponseFingerprint(artifact).location || "-"}`,
        `Baseline set-cookie: ${authResponseFingerprint(baselineResults[0]!).setCookie || "-"}`,
        `Artifact set-cookie: ${authResponseFingerprint(artifact).setCookie || "-"}`,
        `Proof: ${artifact.body.replace(/\s+/g, " ").slice(0, 360)}`
      ].join("\n"),
      technique: explicitSuccessConfigured ? "explicit authentication artifact acceptance validation" : "heuristic authentication artifact acceptance validation"
    }));
    summaryLines.push(`${target.method} ${path}: accepted supplied auth artifacts.`);
    parserNotes.push(explicitSuccessConfigured ? `target ${targetIndex + 1} explicit_acceptance` : `target ${targetIndex + 1} heuristic_acceptance`);
  }

  return {
    summary: [
      ...summarizeObservations(observations),
      ...summaryLines,
      ...(observations.length === 0
        ? [`No auth artifact acceptance signal was confirmed across ${input.artifactValidationTargets.length} target(s).`]
        : [])
    ].join("\n"),
    observations,
    debug: {
      attempts: actionResults.length,
      actionIds: actionResults.map((result) => result.actionId),
      ...(parserNotes.length > 0 ? { parserNotes } : {})
    },
    exitCode: 0
  };
}

function parseLoginMode(
  actionResults: ConnectorActionResult[],
  input: LoginProbeInput,
  context: NativeToolParseContext
): NativeToolResult {
  const loginUrl = resolveLoginUrl(input);
  const byId = httpResultById(actionResults);
  const preflightResult = input.preflightRequest ? byId.get("preflight-1") : undefined;
  const invalidAttempts = Array.from({ length: input.rateLimitAttemptCount }, (_, index) => byId.get(`rate-limit-${index + 1}`));
  const oracleEnabled = typeof input.knownUser === "string" && input.knownUser.length > 0;
  const knownAttempts = oracleEnabled
    ? Array.from({ length: input.oracleSampleCount }, (_, index) => byId.get(`known-user-${index + 1}`))
    : [];
  const unknownAttempts = oracleEnabled
    ? Array.from({ length: input.oracleSampleCount }, (_, index) => byId.get(`unknown-user-${index + 1}`))
    : [];
  const weakPasswordList = input.weakPasswordCandidates ?? defaultWeakPasswordCandidates;
  const weakPasswordAttempts = weakPasswordList.map((_, index) => byId.get(`weak-password-${index + 1}`));

  if (
    preflightResult
    && (preflightResult.kind !== "http_request" || preflightResult.statusCode === 0 || Boolean(preflightResult.networkError))
  ) {
    return {
      summary: requestFailureMessage(resolvePreflightUrl(input, loginUrl), preflightResult),
      statusReason: "Login endpoint preflight was unreachable during auth flow probe",
      observations: [],
      debug: {
        attempts: actionResults.length,
        actionIds: actionResults.map((result) => result.actionId),
        parserNotes: ["preflight_failed"]
      },
      exitCode: 64
    };
  }

  const firstProbeFailure = [
    ...invalidAttempts,
    ...knownAttempts,
    ...unknownAttempts,
    ...weakPasswordAttempts
  ].find((attempt) => (
    attempt?.kind !== "http_request"
    || attempt.statusCode === 0
    || Boolean(attempt.networkError)
  ));
  if (firstProbeFailure) {
    return {
      summary: requestFailureMessage(loginUrl, firstProbeFailure),
      statusReason: "Login endpoint was unreachable during auth flow probe",
      observations: [],
      debug: {
        attempts: actionResults.length,
        actionIds: actionResults.map((result) => result.actionId),
        parserNotes: ["login endpoint unreachable or probe sequence incomplete"]
      },
      exitCode: 64
    };
  }

  const observations: InternalObservation[] = [];
  const parserNotes: string[] = [];
  const summaryLines: string[] = [
    input.preflightRequest
      ? `Ran one preflight request before login attempts to collect session state.`
      : `No preflight request was configured.`,
    `Tested ${invalidAttempts.length} bounded invalid-login attempts against ${loginUrl}.`,
    `Tested ${weakPasswordAttempts.length} weak-password candidate(s) using ${input.requestEncoding} encoding.`
  ];
  const invalidHttpAttempts = invalidAttempts.filter((attempt): attempt is HttpActionResult => attempt?.kind === "http_request");
  const rateLimited = invalidHttpAttempts.some((attempt) => attempt.statusCode === 429 || /rate limit|too many|try again/i.test(attempt.body));
  if (!rateLimited) {
    observations.push(normalObservation(context, observations.length, {
      key: `auth-flow:${loginUrl}:rate-limit`,
      title: "Login flow did not rate-limit repeated failures",
      summary: `${invalidAttempts.length} consecutive invalid login attempts completed without a rate-limit signal.`,
      severity: "medium",
      confidence: 0.82,
      evidence: [
        `URL: ${loginUrl}`,
        `paceMs=${input.paceMs}`,
        ...invalidHttpAttempts.map((attempt, index) => `attempt ${index + 1}: status=${attempt.statusCode} durationMs=${attempt.durationMs.toFixed(1)} bodyMarker=${JSON.stringify(summarizeBody(attempt.body))}`)
      ].join("\n"),
      technique: "authentication rate-limit probe"
    }));
    summaryLines.push("Rate-limit check: no throttling signal observed.");
  } else {
    summaryLines.push("Rate-limit check: throttling signal observed, so no missing-rate-limit finding was raised.");
  }

  if (oracleEnabled) {
    const knownSamples = knownAttempts.filter((attempt): attempt is HttpActionResult => attempt?.kind === "http_request");
    const unknownSamples = unknownAttempts.filter((attempt): attempt is HttpActionResult => attempt?.kind === "http_request");

    const knownAvg = average(knownSamples.map((item) => item.durationMs));
    const unknownAvg = average(unknownSamples.map((item) => item.durationMs));
    const timingDelta = Math.abs(knownAvg - unknownAvg);
    const statusDiffers = new Set([...knownSamples, ...unknownSamples].map((item) => item.statusCode)).size > 1;
    const bodyLengthDelta = Math.abs(
      average(knownSamples.map((item) => item.body.length))
      - average(unknownSamples.map((item) => item.body.length))
    );
    const redirectDiffers = new Set([...knownSamples, ...unknownSamples].map((item) => authResponseFingerprint(item).location)).size > 1;
    const headerDiffers = new Set(
      [...knownSamples, ...unknownSamples]
        .map((item) => {
          const fingerprint = authResponseFingerprint(item);
          return `${fingerprint.setCookie}|${fingerprint.wwwAuthenticate}`;
        })
    ).size > 1;

    if (statusDiffers || bodyLengthDelta > 80 || timingDelta > 150 || redirectDiffers || headerDiffers) {
      observations.push(normalObservation(context, observations.length, {
        key: `auth-flow:${loginUrl}:oracle`,
        title: "Login flow leaks user validity signals",
        summary: "Known-user and unknown-user login attempts produced materially different responses.",
        severity: "medium",
        confidence: timingDelta > 150 ? 0.78 : 0.84,
        evidence: [
          `URL: ${loginUrl}`,
          `knownAvgMs=${knownAvg.toFixed(1)}`,
          `unknownAvgMs=${unknownAvg.toFixed(1)}`,
          `timingDeltaMs=${timingDelta.toFixed(1)}`,
          `bodyLengthDelta=${bodyLengthDelta.toFixed(1)}`,
          `knownStatuses=${knownSamples.map((item) => item.statusCode).join(",")}`,
          `unknownStatuses=${unknownSamples.map((item) => item.statusCode).join(",")}`,
          `knownLocations=${knownSamples.map((item) => authResponseFingerprint(item).location || "-").join(",")}`,
          `unknownLocations=${unknownSamples.map((item) => authResponseFingerprint(item).location || "-").join(",")}`,
          `knownSetCookie=${knownSamples.map((item) => authResponseFingerprint(item).setCookie || "-").join(",")}`,
          `unknownSetCookie=${unknownSamples.map((item) => authResponseFingerprint(item).setCookie || "-").join(",")}`,
          `knownWwwAuthenticate=${knownSamples.map((item) => authResponseFingerprint(item).wwwAuthenticate || "-").join(",")}`,
          `unknownWwwAuthenticate=${unknownSamples.map((item) => authResponseFingerprint(item).wwwAuthenticate || "-").join(",")}`,
          ...knownSamples.map((item, index) => `known attempt ${index + 1}: status=${item.statusCode} durationMs=${item.durationMs.toFixed(1)} bodyMarker=${JSON.stringify(summarizeBody(item.body))}`),
          ...unknownSamples.map((item, index) => `unknown attempt ${index + 1}: status=${item.statusCode} durationMs=${item.durationMs.toFixed(1)} bodyMarker=${JSON.stringify(summarizeBody(item.body))}`)
        ].join("\n"),
        technique: "authentication user-enumeration timing oracle probe"
      }));
      summaryLines.push("Oracle check: response differences suggested user enumeration or timing leakage.");
    } else {
      summaryLines.push("Oracle check: known-user versus unknown-user responses stayed materially similar.");
    }
  } else {
    const note = "oracle detection skipped because knownUser was not supplied";
    parserNotes.push("oracle_skipped");
    parserNotes.push(note);
    summaryLines.push("Oracle check skipped because knownUser was not supplied.");
  }

  const explicitSuccessConfigured = successHintsPresent(input);
  const successfulWeakPasswordAttempt = weakPasswordAttempts.find((attempt): attempt is HttpActionResult => (
    attempt?.kind === "http_request"
    && (explicitSuccessConfigured
      ? matchesSuccessHints(attempt, input)
      : (attempt.statusCode >= 200 && attempt.statusCode < 300 && authSuccessSignal(attempt.body)))
  ));
  const successfulWeakPasswordIndex = successfulWeakPasswordAttempt
    ? weakPasswordAttempts.findIndex((attempt) => attempt?.actionId === successfulWeakPasswordAttempt.actionId)
    : -1;

  if (successfulWeakPasswordAttempt && successfulWeakPasswordIndex >= 0) {
    const successfulCandidate = weakPasswordList[successfulWeakPasswordIndex] ?? "unknown";
    observations.push(normalObservation(context, observations.length, {
      key: `auth-flow:${loginUrl}:weak-password`,
      title: "Login flow accepted a weak password candidate",
      summary: `The login endpoint returned an authentication success signal for a weak password candidate (${successfulCandidate}).`,
      severity: "high",
      confidence: explicitSuccessConfigured ? 0.93 : 0.88,
      evidence: [
        `URL: ${loginUrl}`,
        `Candidate: ${successfulCandidate}`,
        `Status: ${successfulWeakPasswordAttempt.statusCode}`,
        `Request encoding: ${input.requestEncoding}`,
        `Explicit success hints configured: ${explicitSuccessConfigured ? "yes" : "no"}`,
        `Snippet: ${successfulWeakPasswordAttempt.body.slice(0, 400)}`
      ].join("\n"),
      technique: explicitSuccessConfigured ? "explicit login success validation" : "authentication weak password policy probe"
    }));
    summaryLines.push(`Weak-password check: accepted candidate ${successfulCandidate}.`);
  } else {
    summaryLines.push(explicitSuccessConfigured
      ? "Weak-password check: explicit success hints were configured and none matched."
      : "Weak-password check: no candidate produced the generic login-success signal.");
  }

  return {
    summary: [
      ...summarizeObservations(observations),
      ...summaryLines,
      ...(observations.length === 0 ? [`No bounded auth-flow weakness signal was confirmed at ${loginUrl}.`] : [])
    ].join("\n"),
    observations,
    debug: {
      attempts: actionResults.length,
      actionIds: actionResults.map((result) => result.actionId),
      ...(parserNotes.length > 0 ? { parserNotes } : {})
    },
    exitCode: 0
  };
}

function parseAuthFlowWrapperInput(rawInput: unknown) {
  const parsed = authFlowProbeInputSchema.parse(rawInput);

  if (parsed.mode === "login-probe") {
    return {
      mode: parsed.mode,
      delegatedInput: loginProbeInputSchema.parse(parsed)
    } as const;
  }

  const delegatedInput = artifactValidationInputSchema.parse({
    targetUrl: parsed.targetUrl,
    artifactValidationTargets: parsed.artifactValidationTargets,
    baselineRepeats: parsed.baselineRepeats
  });
  requireRelativeTargetsToHaveBase(delegatedInput);

  return {
    mode: parsed.mode,
    delegatedInput
  } as const;
}

function buildTool(input: {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
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
    capabilities: ["auth", "session", "login", "rate-limit", "timing-oracle"],
    category: "auth",
    riskTier: "active",
    timeoutMs: 60000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["host", "domain", "url"],
      networkBehavior: "outbound-active",
      mutationClass: "active-validation",
      supportsHostAllowlist: true,
      supportsPathExclusions: false,
      supportsRateLimit: true
    },
    coveredToolIds: [],
    candidateToolIds: [],
    inputSchema: input.inputSchema,
    outputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        statusReason: { type: "string" },
        observations: { type: "array" }
      },
      required: ["summary", "observations"]
    },
    createdAt: builtinTimestamp,
    updatedAt: builtinTimestamp
  };
}

export const nativeAuthLoginProbeTool: AiTool = buildTool({
  id: "native-auth-login-probe",
  name: "Login Security Probe",
  description: "Probe a known login surface for missing rate limits, user-enumeration signals, timing-oracle leakage, and bounded weak-password acceptance. Use this when you have a specific login endpoint or app base URL and need grounded validation of login-control weaknesses rather than broad discovery. Provide the target URL, login target kind, and any request encoding, preflight, CSRF, known-user, or explicit success indicators needed for the flow. Returns grounded auth findings and clear summaries of what was tested, skipped, and confirmed. Do not use this for crawling, large-scale account discovery, or unbounded credential attacks.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      targetUrl: {
        type: "string",
        description: "Single auth target. Used directly when `targetKind=login-endpoint` or as the application base URL when `targetKind=app-base`."
      },
      targetKind: {
        type: "string",
        enum: ["login-endpoint", "app-base"],
        description: "Use `login-endpoint` when targetUrl is the exact login endpoint. Use `app-base` when targetUrl is an application base URL and the tool should probe `/login` on that origin."
      },
      usernameField: {
        type: "string",
        default: "username",
        description: "The form or JSON field name used for the username, email, or account identifier."
      },
      passwordField: {
        type: "string",
        default: "password",
        description: "The form or JSON field name used for the password."
      },
      requestEncoding: {
        type: "string",
        enum: ["form", "json"],
        default: "form",
        description: "Encode login attempts as form-urlencoded or JSON."
      },
      requestHeaders: {
        type: "object",
        additionalProperties: { type: "string" },
        description: "Optional static headers applied to each login request."
      },
      preflightRequest: {
        type: "object",
        additionalProperties: false,
        properties: {
          url: { type: "string" },
          path: { type: "string" },
          headers: { type: "object", additionalProperties: { type: "string" } },
          query: { type: "object", additionalProperties: { type: "string" } },
          cookieNames: { type: "array", items: { type: "string" } }
        },
        description: "Optional one-shot GET request used to collect cookies or response data before login attempts."
      },
      csrf: {
        type: "object",
        additionalProperties: false,
        properties: {
          source: { type: "string", enum: ["body_regex", "header"] },
          transport: { type: "string", enum: ["field", "header"] },
          name: { type: "string" },
          pattern: { type: "string" },
          responseHeaderName: { type: "string" }
        },
        description: "Optional CSRF extraction from the preflight response. Example: `{ \"source\": \"body_regex\", \"transport\": \"field\", \"name\": \"csrf\", \"pattern\": \"name=\\\"csrf\\\" value=\\\"([^\\\"]+)\\\"\" }`."
      },
      knownUser: {
        type: "string",
        description: "Optional known or likely real account used for response-difference comparisons. If omitted, oracle detection is skipped."
      },
      unknownUser: {
        type: "string",
        default: "synosec-nonexistent-user",
        description: "A deliberately invalid account used to detect user-enumeration signals."
      },
      weakPasswordCandidates: {
        type: "array",
        maxItems: 3,
        items: { type: "string" },
        description: "Optional bounded weak password candidate list. If omitted, the tool uses a small curated default set."
      },
      rateLimitAttemptCount: {
        type: "number",
        default: DEFAULT_RATE_LIMIT_ATTEMPTS,
        description: "Number of invalid-login attempts used for rate-limit detection."
      },
      oracleSampleCount: {
        type: "number",
        default: DEFAULT_ORACLE_SAMPLES,
        description: "Number of known-user and unknown-user samples used when oracle detection is enabled."
      },
      paceMs: {
        type: "number",
        default: 0,
        description: "Delay in milliseconds inserted before each login request after the first."
      },
      successRedirectPath: {
        type: "string",
        description: "Optional explicit success indicator. When provided, weak-password success is only confirmed if the response redirects to this path."
      },
      successBodyStrings: {
        type: "array",
        items: { type: "string" },
        description: "Optional explicit success indicator strings that must all appear in a successful weak-password response body."
      },
      successHeaderKeys: {
        type: "array",
        items: { type: "string" },
        description: "Optional explicit success indicator header keys that must all be present in a successful weak-password response."
      }
    },
    required: ["targetUrl", "targetKind"]
  }
});

export const nativeAuthArtifactValidationTool: AiTool = buildTool({
  id: "native-auth-artifact-validation",
  name: "Auth Artifact Validator",
  description: "Validate already-obtained authentication artifacts against specific endpoints by comparing repeated baseline requests with an artifact-bearing request. Use this when you already have a session cookie, token, refresh artifact, or similar auth material and need to confirm whether it changes access behavior on concrete targets. Provide concrete URLs or paths, any required POST encoding, and explicit success indicators when acceptance would otherwise be ambiguous. Returns grounded auth findings and per-target summaries showing what changed, what stayed stable, and why artifact acceptance was or was not confirmed. Do not use this as a crawler or to obtain the auth artifacts themselves.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      targetUrl: {
        type: "string",
        description: "Optional base origin used only to resolve relative `path` entries in artifactValidationTargets."
      },
      baselineRepeats: {
        type: "number",
        default: DEFAULT_BASELINE_REPEATS,
        description: "Repeat baseline requests this many times before the artifact request so unstable endpoints do not create false positives."
      },
      artifactValidationTargets: {
        type: "array",
        minItems: 1,
        description: "Concrete endpoints where the tool compares repeated baseline requests against a request containing supplied auth artifacts.",
        items: artifactValidationTargetItemSchema
      }
    },
    required: ["artifactValidationTargets"]
  }
});

export const nativeAuthFlowProbeTool: AiTool = buildTool({
  id: "native-auth-flow-probe",
  name: "Legacy Auth Probe",
  description: "Backward-compatibility wrapper for older callers that still use the legacy mode-based auth probe input shape. Use this only when an existing caller still depends on `mode=login-probe` or `mode=artifact-validation`, which delegate to Login Security Probe and Auth Artifact Validator respectively. Provide the same inputs expected by the delegated flow, and the tool returns the same grounded findings and summaries as the canonical tool. Deprecated for user-facing selection and retained only for compatibility while older callers are migrated. Do not use this for new agent-facing guidance or new tool selection logic.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      mode: {
        type: "string",
        enum: ["login-probe", "artifact-validation"],
        description: "Deprecated. Use `native-auth-login-probe` or `native-auth-artifact-validation` directly instead."
      },
      targetUrl: { type: "string" },
      targetKind: { type: "string", enum: ["login-endpoint", "app-base"] },
      usernameField: { type: "string", default: "username" },
      passwordField: { type: "string", default: "password" },
      requestEncoding: { type: "string", enum: ["form", "json"], default: "form" },
      requestHeaders: { type: "object", additionalProperties: { type: "string" } },
      preflightRequest: {
        type: "object",
        additionalProperties: false,
        properties: {
          url: { type: "string" },
          path: { type: "string" },
          headers: { type: "object", additionalProperties: { type: "string" } },
          query: { type: "object", additionalProperties: { type: "string" } },
          cookieNames: { type: "array", items: { type: "string" } }
        }
      },
      csrf: {
        type: "object",
        additionalProperties: false,
        properties: {
          source: { type: "string", enum: ["body_regex", "header"] },
          transport: { type: "string", enum: ["field", "header"] },
          name: { type: "string" },
          pattern: { type: "string" },
          responseHeaderName: { type: "string" }
        }
      },
      artifactValidationTargets: {
        type: "array",
        items: artifactValidationTargetItemSchema
      },
      knownUser: { type: "string" },
      unknownUser: { type: "string", default: "synosec-nonexistent-user" },
      weakPasswordCandidates: {
        type: "array",
        maxItems: 3,
        items: { type: "string" }
      },
      successRedirectPath: { type: "string" },
      successBodyStrings: { type: "array", items: { type: "string" } },
      successHeaderKeys: { type: "array", items: { type: "string" } },
      rateLimitAttemptCount: { type: "number", default: DEFAULT_RATE_LIMIT_ATTEMPTS },
      oracleSampleCount: { type: "number", default: DEFAULT_ORACLE_SAMPLES },
      paceMs: { type: "number", default: 0 },
      baselineRepeats: { type: "number", default: DEFAULT_BASELINE_REPEATS }
    },
    required: ["mode"]
  }
});

export const nativeAuthLoginProbeImplementation: NativeToolImplementation<LoginProbeInput> = {
  tool: nativeAuthLoginProbeTool,
  parseInput(rawInput) {
    return loginProbeInputSchema.parse(rawInput);
  },
  plan(input): ConnectorActionBatch {
    const loginUrl = resolveLoginUrl(input);
    const preflightAction = createPreflightAction(input, loginUrl);
    const actionIds: ConnectorHttpRequestAction[] = [];
    let actionIndex = 0;
    const nextDelay = () => (actionIndex++ === 0 ? 0 : input.paceMs);

    for (let index = 0; index < input.rateLimitAttemptCount; index += 1) {
      actionIds.push(createLoginAction(
        input,
        loginUrl,
        `rate-limit-${index + 1}`,
        input.knownUser ?? input.unknownUser,
        `wrong-password-${index}`,
        nextDelay()
      ));
    }

    if (input.knownUser) {
      for (let index = 0; index < input.oracleSampleCount; index += 1) {
        actionIds.push(createLoginAction(
          input,
          loginUrl,
          `known-user-${index + 1}`,
          input.knownUser,
          `wrong-known-${index}`,
          nextDelay()
        ));
      }
      for (let index = 0; index < input.oracleSampleCount; index += 1) {
        actionIds.push(createLoginAction(
          input,
          loginUrl,
          `unknown-user-${index + 1}`,
          input.unknownUser,
          `wrong-unknown-${index}`,
          nextDelay()
        ));
      }
    }

    for (const [index, candidate] of (input.weakPasswordCandidates ?? defaultWeakPasswordCandidates).entries()) {
      actionIds.push(createLoginAction(
        input,
        loginUrl,
        `weak-password-${index + 1}`,
        input.knownUser ?? input.unknownUser,
        candidate,
        nextDelay()
      ));
    }

    return {
      actions: [
        ...(preflightAction ? [preflightAction] : []),
        ...actionIds
      ]
    };
  },
  parse(actionResults, input, context) {
    return parseLoginMode(actionResults, input, context);
  }
};

export const nativeAuthArtifactValidationImplementation: NativeToolImplementation<ArtifactValidationInput> = {
  tool: nativeAuthArtifactValidationTool,
  parseInput(rawInput) {
    const parsed = artifactValidationInputSchema.parse(rawInput);
    requireRelativeTargetsToHaveBase(parsed);
    return parsed;
  },
  plan(input): ConnectorActionBatch {
    return {
      actions: input.artifactValidationTargets.flatMap((target, index) => {
        const method = target.method;
        const url = resolveValidationUrl(target, input);
        const baselineActions = Array.from({ length: input.baselineRepeats }, (_, repeatIndex) => createHttpAction({
          id: `validation-baseline-${index + 1}-${repeatIndex + 1}`,
          url,
          method,
          headers: target.headers,
          query: method === "GET" ? baselineValues(target, method) : target.query,
          ...(method === "POST"
            ? (target.requestEncoding === "json"
              ? { jsonBody: baselineValues(target, method) }
              : { formBody: baselineValues(target, method) })
            : {}),
          timeoutMs: DEFAULT_TIMEOUT_MS,
          maxResponseBytes: MAX_RESPONSE_BYTES,
          followRedirects: true,
          captureBody: true,
          captureHeaders: true,
          delayMs: 0,
          responseBindings: []
        }));
        const artifactAction = createHttpAction({
          id: `validation-artifact-${index + 1}`,
          url,
          method,
          headers: target.headers,
          query: target.query,
          ...(method === "POST"
            ? (target.requestEncoding === "json"
              ? { jsonBody: target.body }
              : { formBody: target.body })
            : {}),
          timeoutMs: DEFAULT_TIMEOUT_MS,
          maxResponseBytes: MAX_RESPONSE_BYTES,
          followRedirects: true,
          captureBody: true,
          captureHeaders: true,
          delayMs: 0,
          responseBindings: []
        });
        return [...baselineActions, artifactAction];
      })
    };
  },
  parse(actionResults, input, context) {
    return parseArtifactValidationMode(actionResults, input, context);
  }
};

export const nativeAuthFlowProbeImplementation: NativeToolImplementation<AuthFlowProbeInput> = {
  tool: nativeAuthFlowProbeTool,
  parseInput(rawInput) {
    return authFlowProbeInputSchema.parse(rawInput);
  },
  plan(input): ConnectorActionBatch {
    const delegated = parseAuthFlowWrapperInput(input);
    return delegated.mode === "login-probe"
      ? nativeAuthLoginProbeImplementation.plan(delegated.delegatedInput, { tool: nativeAuthLoginProbeTool })
      : nativeAuthArtifactValidationImplementation.plan(delegated.delegatedInput, { tool: nativeAuthArtifactValidationTool });
  },
  parse(actionResults, input, context) {
    const delegated = parseAuthFlowWrapperInput(input);
    return delegated.mode === "login-probe"
      ? nativeAuthLoginProbeImplementation.parse(actionResults, delegated.delegatedInput, context)
      : nativeAuthArtifactValidationImplementation.parse(actionResults, delegated.delegatedInput, context);
  }
};
