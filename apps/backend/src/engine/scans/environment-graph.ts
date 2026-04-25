import type { AssetEdge, AssetNode, EnvironmentGraph, ScanScope } from "@synosec/contracts";

function normalizeHost(value: string) {
  if (value.includes("/") && !/^https?:\/\//.test(value)) {
    return value.trim();
  }

  try {
    return new URL(value).hostname;
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
  }
}

function nodeId(type: AssetNode["type"], host: string) {
  return `${type}:${host}`.toLowerCase().replace(/[^a-z0-9:._/-]+/g, "-");
}

export function buildEnvironmentGraphFromScope(scanId: string, scope: ScanScope, discoveredAt = new Date().toISOString()): EnvironmentGraph {
  const nodes = new Map<string, AssetNode>();
  const edges: AssetEdge[] = [];

  const addNode = (type: AssetNode["type"], rawHost: string, metadata: Record<string, unknown> = {}) => {
    const host = normalizeHost(rawHost);
    const id = nodeId(type, host);
    const current = nodes.get(id);
    nodes.set(id, {
      id,
      host,
      type,
      discoveredAt: current?.discoveredAt ?? discoveredAt,
      metadata: {
        ...(current?.metadata ?? {}),
        ...metadata
      }
    });
    return id;
  };

  for (const target of scope.targets) {
    const type: AssetNode["type"] = target.includes("/") ? "subnet" : "host";
    addNode(type, target, { source: "scan-scope" });
  }

  for (const zone of scope.trustZones) {
    for (const host of zone.hosts) {
      addNode(host.includes("/") ? "subnet" : "host", host, {
        trustZone: zone.id,
        trustZoneName: zone.name,
        source: "declared-trust-zone"
      });
    }
  }

  for (const assertion of scope.connectivity) {
    const from = addNode(assertion.from.includes("/") ? "subnet" : "host", assertion.from, { source: "connectivity-assertion" });
    const toHost = assertion.port ? `${normalizeHost(assertion.to)}:${assertion.port}/${assertion.protocol}` : normalizeHost(assertion.to);
    const to = addNode(assertion.port ? "service" : assertion.to.includes("/") ? "subnet" : "host", toHost, {
      source: "connectivity-assertion",
      ...(assertion.port ? { port: assertion.port, protocol: assertion.protocol } : {})
    });
    edges.push({
      from,
      to,
      edgeType: "reaches",
      evidence: assertion.evidence ?? `${assertion.from} can reach ${assertion.to}${assertion.port ? `:${assertion.port}/${assertion.protocol}` : ""}.`,
      metadata: {
        ...(assertion.port ? { port: assertion.port } : {}),
        protocol: assertion.protocol,
        ...(assertion.trustZone ? { trustZone: assertion.trustZone } : {})
      }
    });
  }

  for (const node of [...nodes.values()].filter((candidate) => candidate.type === "service")) {
    const host = node.host.split(":")[0] ?? node.host;
    const hostNodeId = addNode("host", host, { source: "service-parent" });
    edges.push({
      from: hostNodeId,
      to: node.id,
      edgeType: "hosts",
      evidence: `${host} hosts service ${node.host}.`,
      metadata: {}
    });
  }

  return {
    scanId,
    ...(scope.environmentName ? { environmentName: scope.environmentName } : {}),
    nodes: [...nodes.values()],
    edges,
    generatedAt: discoveredAt
  };
}

export function buildScopeFromTargetAssets(input: {
  environmentName: string;
  defaultHost: string;
  targetAssets: Array<{
    label: string;
    hostname: string | null;
    baseUrl: string | null;
    ipAddress: string | null;
    cidr: string | null;
    metadata: Record<string, unknown> | null;
  }>;
  exclusions: string[];
  rateLimitRps: number;
  allowActiveExploit: boolean;
}): ScanScope {
  const targets = input.targetAssets
    .map((asset) => asset.baseUrl ?? asset.hostname ?? asset.ipAddress ?? asset.cidr)
    .filter((target): target is string => Boolean(target));
  const uniqueTargets = [...new Set(targets.length > 0 ? targets : [input.defaultHost])];

  return {
    environmentName: input.environmentName,
    targets: uniqueTargets,
    exclusions: input.exclusions,
    trustZones: input.targetAssets.flatMap((asset) => {
      const zone = asset.metadata?.["trustZone"];
      const locator = asset.baseUrl ?? asset.hostname ?? asset.ipAddress ?? asset.cidr;
      return typeof zone === "string" && locator
        ? [{ id: zone, name: zone, hosts: [locator], description: `${asset.label} declared trust zone.` }]
        : [];
    }),
    connectivity: input.targetAssets.flatMap((asset) => {
      const connectivity = asset.metadata?.["connectivity"];
      if (!Array.isArray(connectivity)) {
        return [];
      }
      return connectivity.filter((item): item is ScanScope["connectivity"][number] => (
        item
        && typeof item === "object"
        && typeof (item as Record<string, unknown>)["from"] === "string"
        && typeof (item as Record<string, unknown>)["to"] === "string"
      ));
    }),
    layers: ["L3", "L4", "L5", "L6", "L7"],
    maxDepth: 3,
    maxDurationMinutes: 15,
    rateLimitRps: input.rateLimitRps,
    allowActiveExploits: input.allowActiveExploit,
    graceEnabled: true,
    graceRoundInterval: 3,
    cyberRangeMode: "live"
  };
}
