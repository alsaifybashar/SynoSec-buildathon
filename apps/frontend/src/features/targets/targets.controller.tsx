import type { CreateTargetBody, Target } from "@synosec/contracts";
import { targetsDefinition, createEmptyFormValues, toFormValues, toRequestBody, validateForm, type TargetFormValues } from "@/features/targets/definition";
import { targetsPort } from "@/features/targets/targets.port";
import { targetTransfer } from "@/features/targets/transfer";
import { createCrudFeatureController } from "@/shared/crud-controller/create-crud-feature-controller";
import type { TargetsQuery } from "@/shared/lib/resource-client";

export const targetsController = createCrudFeatureController<
  Target,
  TargetFormValues,
  TargetsQuery,
  never,
  CreateTargetBody
>({
  recordLabel: targetsDefinition.recordLabel,
  ...(targetsDefinition.titleLabel ? { titleLabel: targetsDefinition.titleLabel } : {}),
  port: targetsPort,
  transfer: targetTransfer,
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    status: undefined,
    environment: undefined
  },
  createEmptyFormValues: () => createEmptyFormValues(),
  toFormValues,
  parseRequestBody: ({ formValues }) => {
    const errors = validateForm(formValues);
    if (Object.keys(errors).length > 0) {
      return { errors };
    }

    return {
      body: toRequestBody(formValues),
      errors: {}
    };
  },
  getItemLabel: (target) => target.name
});
