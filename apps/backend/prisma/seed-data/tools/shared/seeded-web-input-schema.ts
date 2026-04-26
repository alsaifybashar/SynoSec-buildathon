const scalarValueSchema = {
  type: ["string", "number", "boolean"]
} as const;

const recordValueSchema = {
  type: "object",
  additionalProperties: scalarValueSchema
} as const;

const validationTargetSchema = {
  type: "object",
  properties: {
    label: { type: "string" },
    endpoint: { type: "string" },
    path: { type: "string" },
    url: { type: "string" },
    method: { type: "string" },
    expectedAuthBehavior: { type: "string" },
    expectedEvidenceStrings: {
      type: "array",
      items: { type: "string" }
    },
    expectedEvidenceFields: {
      type: "array",
      items: { type: "string" }
    },
    query: recordValueSchema,
    body: recordValueSchema,
    headers: recordValueSchema,
    notes: { type: "string" }
  }
} as const;

export const seededWebSteeringProperties = {
  target: { type: "string" },
  baseUrl: { type: "string" },
  candidatePaths: {
    type: "array",
    items: { type: "string" }
  },
  candidateEndpoints: {
    type: "array",
    items: { type: "string" }
  },
  candidateParameters: {
    type: "array",
    items: { type: "string" }
  },
  validationTargets: {
    type: "array",
    items: validationTargetSchema
  },
  maxPaths: { type: "number" },
  maxPages: { type: "number" },
  maxEndpoints: { type: "number" },
  maxRequests: { type: "number" },
  notes: { type: "string" },
  hypotheses: { type: "string" }
} as const;

export const seededPassiveHttpSteeringProperties = {
  target: { type: "string" },
  baseUrl: { type: "string" },
  url: { type: "string" },
  startUrl: { type: "string" },
  candidateEndpoints: {
    type: "array",
    items: { type: "string" }
  },
  maxEndpoints: { type: "number" },
  notes: { type: "string" },
  hypotheses: { type: "string" }
} as const;

export const seededPortSteeringProperties = {
  target: { type: "string" },
  baseUrl: { type: "string" },
  url: { type: "string" },
  startUrl: { type: "string" },
  port: { type: "number" },
  candidatePorts: {
    type: "array",
    items: { type: "number" }
  },
  maxPorts: { type: "number" },
  notes: { type: "string" },
  hypotheses: { type: "string" }
} as const;

export const seededCredentialSteeringProperties = {
  target: { type: "string" },
  baseUrl: { type: "string" },
  url: { type: "string" },
  port: { type: "number" },
  service: { type: "string" },
  protocol: { type: "string" },
  username: { type: "string" },
  password: { type: "string" },
  candidateUsernames: {
    type: "array",
    items: { type: "string" }
  },
  candidatePasswords: {
    type: "array",
    items: { type: "string" }
  },
  credentialCandidates: {
    type: "array",
    items: {
      type: "object",
      properties: {
        username: { type: "string" },
        password: { type: "string" },
        domain: { type: "string" },
        notes: { type: "string" }
      }
    }
  },
  candidatePorts: {
    type: "array",
    items: { type: "number" }
  },
  maxAttempts: { type: "number" },
  notes: { type: "string" },
  hypotheses: { type: "string" }
} as const;

export const seededSubdomainSteeringProperties = {
  domain: { type: "string" },
  target: { type: "string" },
  baseUrl: { type: "string" },
  candidateDomains: {
    type: "array",
    items: { type: "string" }
  },
  knownSubdomains: {
    type: "array",
    items: { type: "string" }
  },
  maxResults: { type: "number" },
  notes: { type: "string" },
  hypotheses: { type: "string" }
} as const;

export const seededContextSteeringProperties = {
  target: { type: "string" },
  baseUrl: { type: "string" },
  url: { type: "string" },
  filePath: { type: "string" },
  provider: { type: "string" },
  account: { type: "string" },
  profile: { type: "string" },
  cluster: { type: "string" },
  namespace: { type: "string" },
  module: { type: "string" },
  options: {
    type: "object",
    additionalProperties: scalarValueSchema
  },
  notes: { type: "string" },
  hypotheses: { type: "string" }
} as const;

export const seededWebSteeringInputSchema = {
  type: "object",
  properties: seededWebSteeringProperties,
  required: ["target", "baseUrl"]
} as const;
