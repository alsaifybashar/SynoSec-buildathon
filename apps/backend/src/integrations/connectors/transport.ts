import type { ConnectorExecutionResult, ToolRequest, ToolRun } from "@synosec/contracts";
import { executeScriptedTool, type ScriptExecutionResult } from "@/engine/tools/script-executor.js";
import { connectorControlPlane } from "@/integrations/connectors/control-plane.js";
import {
  executeConnectorActionBatch,
  summarizeConnectorActionResults
} from "./connector-actions.js";

export interface ToolExecutionInput {
  scanId: string;
  tacticId: string;
  agentId: string;
  toolRun: ToolRun;
  request: ToolRequest;
}

export interface ToolExecutionOutput extends ScriptExecutionResult {
  dispatchMode: ToolRun["dispatchMode"];
  connectorId?: string;
  leasedAt?: string;
  leaseExpiresAt?: string;
  statusReason?: string;
  actionResults?: ConnectorExecutionResult["actionResults"];
}

export interface ToolExecutionTransport {
  readonly dispatchMode: ToolRun["dispatchMode"];
  execute(input: ToolExecutionInput): Promise<ToolExecutionOutput>;
}

export class LocalToolExecutionTransport implements ToolExecutionTransport {
  readonly dispatchMode = "local" as const;

  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    if (input.request.executorType === "native-ts") {
      const batch = input.request.parameters["actionBatch"];
      if (!batch || typeof batch !== "object" || !("actions" in batch) || !Array.isArray(batch.actions)) {
        throw new Error(`Native tool ${input.request.toolId ?? input.request.tool} is missing an action batch.`);
      }

      const result = await executeConnectorActionBatch(batch.actions as never[]);
      return {
        observations: [],
        output: summarizeConnectorActionResults(result.actionResults),
        exitCode: 0,
        actionResults: result.actionResults,
        dispatchMode: this.dispatchMode
      };
    }

    const result = await executeScriptedTool({
      scanId: input.scanId,
      tacticId: input.tacticId,
      toolRun: input.toolRun,
      request: input.request
    });

    return {
      ...result,
      dispatchMode: this.dispatchMode
    };
  }
}

export class ConnectorToolExecutionTransport implements ToolExecutionTransport {
  readonly dispatchMode = "connector" as const;

  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const resolution = await connectorControlPlane.dispatch(input);
    return mapConnectorExecutionResult(resolution.result, {
      connectorId: resolution.connectorId,
      leasedAt: resolution.leasedAt,
      leaseExpiresAt: resolution.leaseExpiresAt
    });
  }
}

function mapConnectorExecutionResult(
  result: ConnectorExecutionResult,
  metadata: {
    connectorId: string;
    leasedAt: string;
    leaseExpiresAt: string;
  }
): ToolExecutionOutput {
  return {
    output: result.output,
    exitCode: result.exitCode,
    observations: result.observations,
    actionResults: result.actionResults,
    dispatchMode: "connector",
    connectorId: metadata.connectorId,
    leasedAt: metadata.leasedAt,
    leaseExpiresAt: metadata.leaseExpiresAt,
    ...(result.statusReason === undefined ? {} : { statusReason: result.statusReason })
  };
}

export function createToolExecutionTransport(): ToolExecutionTransport {
  if ((process.env["TOOL_EXECUTION_MODE"] ?? "local") === "connector") {
    return new ConnectorToolExecutionTransport();
  }

  return new LocalToolExecutionTransport();
}
