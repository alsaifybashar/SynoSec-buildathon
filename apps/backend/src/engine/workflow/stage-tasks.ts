import type { AiTool, WorkflowStage, WorkflowStageTask } from "@synosec/contracts";

function exposedToolName(tool: AiTool): string {
  if (tool.executorType === "builtin" && tool.builtinActionKey) {
    return tool.builtinActionKey;
  }
  if (tool.executorType === "bash" && tool.id === "seed-agent-bash-command") {
    return "bash";
  }
  return tool.id;
}

function findToolsForCapabilities(capabilities: readonly string[], resolvedTools: readonly AiTool[]): AiTool[] {
  if (capabilities.length === 0) {
    return [];
  }
  const wanted = new Set(capabilities);
  return resolvedTools.filter((tool) => tool.capabilities.some((capability) => wanted.has(capability)));
}

function findToolsByIds(toolIds: readonly string[], resolvedTools: readonly AiTool[]): AiTool[] {
  if (toolIds.length === 0) {
    return [];
  }
  const byId = new Map(resolvedTools.map((tool) => [tool.id, tool] as const));
  return toolIds
    .map((id) => byId.get(id) ?? null)
    .filter((tool): tool is AiTool => Boolean(tool));
}

function renderTaskBlock(task: WorkflowStageTask, suggestedToolNames: readonly string[]): string {
  const lines: string[] = [`### ${task.title} (id=${task.id})`, task.objective];
  if (suggestedToolNames.length > 0) {
    lines.push(`Suggested tools: ${suggestedToolNames.join(", ")}`);
  }
  if (task.completionCriteria) {
    lines.push(`Completion criteria: ${task.completionCriteria}`);
  }
  return lines.join("\n");
}

export function expandStageTasks(
  stage: Pick<WorkflowStage, "tasks">,
  resolvedTools: readonly AiTool[]
): string | null {
  if (!Array.isArray(stage.tasks) || stage.tasks.length === 0) {
    return null;
  }

  const blocks: string[] = [];
  for (const task of stage.tasks) {
    const matchedTools = [
      ...findToolsByIds(task.suggestedToolIds, resolvedTools),
      ...findToolsForCapabilities(task.suggestedCapabilities, resolvedTools)
    ];
    const dedupedNames: string[] = [];
    const seen = new Set<string>();
    for (const tool of matchedTools) {
      const name = exposedToolName(tool);
      if (!seen.has(name)) {
        seen.add(name);
        dedupedNames.push(name);
      }
    }
    blocks.push(renderTaskBlock(task, dedupedNames));
  }

  return ["## Stage tasks", blocks.join("\n\n")].join("\n\n");
}
