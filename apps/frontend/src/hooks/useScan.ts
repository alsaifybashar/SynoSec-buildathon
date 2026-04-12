import { useCallback, useEffect, useRef, useState } from "react";
import type {
  EvidenceResponse,
  Finding,
  GraphResponse,
  Observation,
  Report,
  Scan,
  ToolRun,
  VulnerabilityChain,
  WsEvent
} from "@synosec/contracts";

interface UseScanResult {
  scan: Scan | null;
  findings: Finding[];
  graph: GraphResponse | null;
  report: Report | null;
  chains: VulnerabilityChain[];
  prioritizedTargets: string[];
  toolRuns: ToolRun[];
  observations: Observation[];
  isLoading: boolean;
  refetch: () => void;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function useScan(scanId: string | null, lastEvent: WsEvent | null = null): UseScanResult {
  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [chains, setChains] = useState<VulnerabilityChain[]>([]);
  const [prioritizedTargets, setPrioritizedTargets] = useState<string[]>([]);
  const [toolRuns, setToolRuns] = useState<ToolRun[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const fetchAll = useCallback(async (id: string) => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    try {
      const [scanData, findingsData, graphData, chainsData, evidenceData] = await Promise.all([
        fetchJson<Scan>(`/api/scan/${id}`),
        fetchJson<Finding[]>(`/api/scan/${id}/findings`),
        fetchJson<GraphResponse>(`/api/scan/${id}/graph`),
        fetchJson<VulnerabilityChain[]>(`/api/scan/${id}/chains`),
        fetchJson<EvidenceResponse>(`/api/scan/${id}/evidence`)
      ]);
      if (!mountedRef.current) return;
      setScan(scanData);
      setFindings(findingsData);
      setGraph(graphData);
      setChains(chainsData);
      setToolRuns(evidenceData.toolRuns);
      setObservations(evidenceData.observations);

      if (scanData.status === "complete") {
        const reportData = await fetchJson<Report>(`/api/scan/${id}/report`);
        if (mountedRef.current) {
          setReport(reportData);
          setChains(reportData.attackChains.length > 0 ? reportData.attackChains : chainsData);
        }
      }
    } catch {
      // silently keep old data on error
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (scanId) void fetchAll(scanId);
  }, [scanId, fetchAll]);

  // Initial fetch + polling while running
  useEffect(() => {
    mountedRef.current = true;
    if (!scanId) {
      setScan(null);
      setFindings([]);
      setGraph(null);
      setReport(null);
      setChains([]);
      setPrioritizedTargets([]);
      setToolRuns([]);
      setObservations([]);
      return;
    }

    void fetchAll(scanId);

    function schedulePoll() {
      pollTimerRef.current = setTimeout(async () => {
        if (!mountedRef.current || !scanId) return;
        try {
          const s = await fetchJson<Scan>(`/api/scan/${scanId}`);
          if (!mountedRef.current) return;
          setScan(s);
          if (s.status === "running") schedulePoll();
        } catch {
          if (mountedRef.current) schedulePoll();
        }
      }, 2000);
    }

    schedulePoll();

    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [scanId, fetchAll]);

  // Apply WebSocket events incrementally
  useEffect(() => {
    if (!lastEvent || !scanId) return;

    if (lastEvent.type === "node_updated") {
      setGraph((prev) => {
        if (!prev) return prev;
        const exists = prev.nodes.find((n) => n.id === lastEvent.node.id);
        const nodes = exists
          ? prev.nodes.map((n) => (n.id === lastEvent.node.id ? lastEvent.node : n))
          : [...prev.nodes, lastEvent.node];
        return { ...prev, nodes };
      });
    } else if (lastEvent.type === "finding_added") {
      setFindings((prev) => {
        if (prev.find((f) => f.id === lastEvent.finding.id)) return prev;
        return [...prev, lastEvent.finding];
      });
    } else if (lastEvent.type === "chain_detected") {
      setChains((prev) => {
        if (prev.find((chain) => chain.id === lastEvent.chain.id)) return prev;
        return [lastEvent.chain, ...prev];
      });
    } else if (lastEvent.type === "tool_run_started" || lastEvent.type === "tool_run_completed") {
      setToolRuns((prev) => {
        const existingIndex = prev.findIndex((toolRun) => toolRun.id === lastEvent.toolRun.id);
        if (existingIndex === -1) return [lastEvent.toolRun, ...prev];
        const next = [...prev];
        next[existingIndex] = lastEvent.toolRun;
        return next;
      });
    } else if (lastEvent.type === "observation_added") {
      setObservations((prev) => {
        if (prev.find((observation) => observation.id === lastEvent.observation.id)) return prev;
        return [lastEvent.observation, ...prev];
      });
    } else if (lastEvent.type === "grace_analysis_complete") {
      setPrioritizedTargets(lastEvent.prioritizedTargets);
    } else if (lastEvent.type === "scan_status") {
      setScan(lastEvent.scan);
    } else if (lastEvent.type === "report_ready") {
      setReport(lastEvent.report);
      setChains(lastEvent.report.attackChains);
    }
  }, [lastEvent, scanId]);

  return {
    scan,
    findings,
    graph,
    report,
    chains,
    prioritizedTargets,
    toolRuns,
    observations,
    isLoading,
    refetch
  };
}
