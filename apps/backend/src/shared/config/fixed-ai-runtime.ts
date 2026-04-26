import { fixedAiModel, fixedAiProviderName } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";

export type FixedAnthropicRuntime = {
  providerName: typeof fixedAiProviderName;
  model: typeof fixedAiModel;
  apiKey: string;
};

export function loadFixedAnthropicRuntime(): FixedAnthropicRuntime {
  const apiKey = process.env["ANTHROPIC_API_KEY"];

  if (!apiKey) {
    throw new RequestError(400, "Anthropic execution requires ANTHROPIC_API_KEY.");
  }

  return {
    providerName: fixedAiProviderName,
    model: fixedAiModel,
    apiKey
  };
}
