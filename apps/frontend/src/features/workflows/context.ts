import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AiTool, Target } from "@synosec/contracts";
import { aiToolsResource } from "@/features/ai-tools/resource";
import { targetsResource } from "@/features/targets/resource";

export type WorkflowDefinitionContext = {
  targets: Target[];
  tools: AiTool[];
  targetLookup: Record<string, string>;
  toolLookup: Record<string, string>;
};

export function useWorkflowDefinitionContext(): WorkflowDefinitionContext {
  const [targets, setTargets] = useState<Target[]>([]);
  const [tools, setTools] = useState<AiTool[]>([]);

  useEffect(() => {
    let active = true;

    void Promise.all([
      targetsResource.list({ ...targetsResource.defaultQuery, pageSize: 100 }),
      aiToolsResource.list({ ...aiToolsResource.defaultQuery, pageSize: 100 })
    ])
      .then(([targetsResult, toolsResult]) => {
        if (!active) {
          return;
        }

        setTargets(targetsResult.items);
        setTools(toolsResult.items);
      })
      .catch((error) => {
        toast.error("Failed to load workflow dependencies", {
          description: error instanceof Error ? error.message : "Unknown error"
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const targetLookup = useMemo(
    () => Object.fromEntries(targets.map((item) => [item.id, item.name])),
    [targets]
  );
  const toolLookup = useMemo(
    () => Object.fromEntries(tools.map((item) => [item.id, item.name])),
    [tools]
  );

  return useMemo(
    () => ({
      targets,
      tools,
      targetLookup,
      toolLookup
    }),
    [targetLookup, targets, toolLookup, tools]
  );
}
