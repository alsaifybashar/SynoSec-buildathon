import { useState } from "react";
import { Shield, AlertTriangle, Zap } from "lucide-react";
import { toast } from "sonner";
import type { OsiLayer } from "@synosec/contracts";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface ScanConfigProps {
  onScanStarted: (scanId: string) => void;
}

const LAYER_OPTIONS: { id: OsiLayer; label: string; disabled?: boolean; disabledReason?: string }[] = [
  { id: "L3", label: "L3 Network" },
  { id: "L4", label: "L4 Transport" },
  { id: "L5", label: "L5 Session" },
  { id: "L6", label: "L6 Presentation" },
  { id: "L7", label: "L7 Application" },
  { id: "L2", label: "L2 Data Link", disabled: true, disabledReason: "Requires hardware access" },
];

const DEPTH_OPTIONS = [1, 2, 3, 4, 5];
const DURATION_OPTIONS = [5, 10, 15, 30];

export function ScanConfig({ onScanStarted }: ScanConfigProps) {
  const [targetsText, setTargetsText] = useState("synosec-target");
  const [layers, setLayers] = useState<Set<OsiLayer>>(new Set(["L3", "L4", "L5", "L6", "L7"]));
  const [maxDepth, setMaxDepth] = useState(3);
  const [maxDuration, setMaxDuration] = useState(10);
  const [allowActiveExploits, setAllowActiveExploits] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isStarting, setIsStarting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const QUICK_TARGETS = [
    { label: "Local Demo", value: "synosec-target" },
    { label: "Localhost:3000", value: "host.docker.internal:3000" },
    { label: "Localhost", value: "host.docker.internal" },
    { label: "192.168.1.0/24", value: "192.168.1.0/24" },
  ];

  function toggleLayer(layer: OsiLayer) {
    setLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const targets = targetsText
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    if (targets.length === 0) {
      newErrors.targets = "At least one target is required";
    }
    if (layers.size === 0) {
      newErrors.layers = "Select at least one layer";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleStartScan() {
    if (!validate()) return;
    setIsStarting(true);
    const targets = targetsText
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: {
            targets,
            exclusions: [],
            layers: Array.from(layers),
            maxDepth,
            maxDurationMinutes: maxDuration,
            rateLimitRps: 5,
            allowActiveExploits,
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { scanId?: string; id?: string };
      const scanId = data.scanId ?? data.id ?? "";
      if (!scanId) throw new Error("No scan ID in response");
      toast.success("Scan started", { description: `Scan ID: ${scanId}` });
      onScanStarted(scanId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to start scan", { description: msg });
    } finally {
      setIsStarting(false);
    }
  }

  async function handleLoadDemo() {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/scan/seed", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { scanId?: string; id?: string };
      const scanId = data.scanId ?? data.id ?? "";
      if (!scanId) throw new Error("No scan ID in response");
      toast.success("Demo scan loaded", { description: `Scan ID: ${scanId}` });
      onScanStarted(scanId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to load demo", { description: msg });
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10">
          <Shield className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">New Scan</h2>
          <p className="text-sm text-gray-400">Configure targets and scan parameters</p>
        </div>
      </div>

      {/* Targets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">
            Targets <span className="text-green-400">*</span>
          </label>
          <div className="flex gap-1">
            {QUICK_TARGETS.map((qt) => (
              <button
                key={qt.label}
                type="button"
                onClick={() => setTargetsText(qt.value)}
                className="rounded border border-gray-700 bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400 hover:border-green-500/50 hover:text-green-400 transition-colors"
              >
                {qt.label}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          value={targetsText}
          onChange={(e) => setTargetsText(e.target.value)}
          placeholder={"synosec-target\n192.168.1.0/24\napp.example.com"}
          rows={4}
          className="resize-none border-gray-700 bg-gray-900 font-mono text-sm text-gray-200 placeholder:text-gray-600 focus:border-green-500 focus:ring-green-500/20"
        />
        <p className="text-xs text-gray-500">One target per line — IPv4, CIDR ranges, hostnames, or <span className="text-green-500/70">synosec-target</span> for local demo</p>
        {errors.targets && (
          <p className="text-xs text-red-400">{errors.targets}</p>
        )}
      </div>

      {/* OSI Layers */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-300">OSI Layers</label>
        <TooltipProvider>
        <div className="flex flex-wrap gap-2">
          {LAYER_OPTIONS.map((opt) =>
            opt.disabled ? (
              <Tooltip key={opt.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-600 opacity-50"
                  >
                    {opt.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{opt.disabledReason}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleLayer(opt.id)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  layers.has(opt.id)
                    ? "border-green-500 bg-green-500/10 text-green-400"
                    : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500"
                }`}
              >
                {opt.label}
              </button>
            )
          )}
        </div>
        </TooltipProvider>
        {errors.layers && <p className="text-xs text-red-400">{errors.layers}</p>}
      </div>

      {/* Depth + Duration */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Max Depth</label>
          <select
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-green-500 focus:outline-none"
          >
            {DEPTH_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} {d === 3 ? "(default)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Max Duration</label>
          <select
            value={maxDuration}
            onChange={(e) => setMaxDuration(Number(e.target.value))}
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-green-500 focus:outline-none"
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} min{d === 10 ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Exploits Toggle */}
      <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
            <div>
              <p className="text-sm font-medium text-orange-300">Allow Active Exploits</p>
              <p className="mt-0.5 text-xs text-orange-400/70">
                NOT for production systems — may cause service disruption
              </p>
            </div>
          </div>
          <Switch
            checked={allowActiveExploits}
            onCheckedChange={setAllowActiveExploits}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => void handleStartScan()}
          disabled={isStarting || isSeeding}
          className="flex-1 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          <Zap className="mr-2 h-4 w-4" />
          {isStarting ? "Starting..." : "Start Scan"}
        </Button>
        <Button
          variant="outline"
          onClick={() => void handleLoadDemo()}
          disabled={isStarting || isSeeding}
          className="border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          {isSeeding ? "Loading..." : "Load Demo"}
        </Button>
      </div>
    </div>
  );
}
