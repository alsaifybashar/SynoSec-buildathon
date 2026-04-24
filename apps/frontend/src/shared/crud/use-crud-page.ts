import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { fetchJson } from "@/shared/lib/api";
import { useResourceDetail } from "@/shared/hooks/use-resource-detail";
import { useResourceList } from "@/shared/hooks/use-resource-list";
import { exportResourceRecords, importResourceRecords, type ResourceTransferConfig } from "@/shared/lib/resource-transfer";
import type { ListQueryState, ResourceClient } from "@/shared/lib/resource-client";

type ValidationErrors<TFormValues> = Partial<Record<keyof TFormValues, string>> | Record<string, string>;

type ParseBodyResult<TFormValues, TRequestBody> = {
  body?: TRequestBody;
  errors: ValidationErrors<TFormValues>;
};

type UseCrudPageOptions<TItem extends { id: string }, TFormValues, TRequestBody, TQuery extends ListQueryState> = {
  recordLabel: string;
  titleLabel?: string;
  recordId: string | undefined;
  route: string;
  resource: ResourceClient<TItem, TQuery>;
  transfer: ResourceTransferConfig<TItem, TRequestBody>;
  createEmptyFormValues: () => TFormValues;
  toFormValues: (item: TItem) => TFormValues;
  parseRequestBody: (formValues: TFormValues) => ParseBodyResult<TFormValues, TRequestBody>;
  onNavigateToList: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
  getItemLabel?: (item: TItem) => string;
  isDirtyForm?: (formValues: TFormValues, initialValues: TFormValues) => boolean;
  refetchListOnSave?: boolean;
  validateNotFoundMessage?: string;
};

export function useCrudPage<
  TItem extends { id: string },
  TFormValues,
  TRequestBody,
  TQuery extends ListQueryState
>(options: UseCrudPageOptions<TItem, TFormValues, TRequestBody, TQuery>) {
  const {
    recordLabel,
    titleLabel = recordLabel,
    recordId,
    route,
    resource,
    transfer,
    createEmptyFormValues,
    toFormValues,
    parseRequestBody,
    onNavigateToList,
    onNavigateToDetail,
    getItemLabel = (item) => ("name" in item && typeof item.name === "string" ? item.name : item.id),
    isDirtyForm,
    refetchListOnSave = true
  } = options;

  const [item, setItem] = useState<TItem | null>(null);
  const [formValues, setFormValues] = useState<TFormValues>(createEmptyFormValues);
  const [initialValues, setInitialValues] = useState<TFormValues>(createEmptyFormValues);
  const [errors, setErrors] = useState<ValidationErrors<TFormValues>>({});
  const [saving, setSaving] = useState(false);
  const isCreateMode = recordId === "new";
  const list = useResourceList(resource);
  const detail = useResourceDetail(resource, recordId && recordId !== "new" ? recordId : null);

  useEffect(() => {
    if (!recordId) {
      return;
    }

    const empty = createEmptyFormValues();

    if (recordId === "new") {
      setItem(null);
      setFormValues(empty);
      setInitialValues(empty);
      setErrors({});
      return;
    }

    if (detail.state === "error") {
      toast.error(`${titleLabel} not found`, {
        description: detail.message
      });
      onNavigateToList();
      return;
    }

    if (detail.state !== "loaded") {
      setItem(null);
      setFormValues(empty);
      setInitialValues(empty);
      setErrors({});
      return;
    }

    const nextValues = toFormValues(detail.item);
    setItem(detail.item);
    setFormValues(nextValues);
    setInitialValues(nextValues);
    setErrors({});
  }, [createEmptyFormValues, detail, onNavigateToList, recordId, titleLabel, toFormValues]);

  const isDirty = useMemo(() => {
    if (isDirtyForm) {
      return isDirtyForm(formValues, initialValues);
    }

    return JSON.stringify(formValues) !== JSON.stringify(initialValues);
  }, [formValues, initialValues, isDirtyForm]);

  const handleFieldChange = useCallback(<Key extends keyof TFormValues>(field: Key, value: TFormValues[Key]) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current } as Record<string, string | undefined>;
      delete next[String(field)];
      return next as ValidationErrors<TFormValues>;
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormValues(initialValues);
    setErrors({});
  }, [initialValues]);

  const save = useCallback(async () => {
    const { body, errors: nextErrors } = parseRequestBody(formValues);
    if (!body) {
      setErrors(nextErrors);
      toast.error("Validation failed", {
        description: `Fix the highlighted ${recordLabel.toLowerCase()} fields before saving.`
      });
      return null;
    }

    setSaving(true);

    try {
      if (isCreateMode || !item) {
        const created = await fetchJson<TItem>(route, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (refetchListOnSave) {
          list.refetch();
        }
        toast.success(`${recordLabel} created`);
        onNavigateToDetail(created.id, getItemLabel(created));
        return created;
      }

      const updated = await fetchJson<TItem>(`${route}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const nextValues = toFormValues(updated);
      setItem(updated);
      setFormValues(nextValues);
      setInitialValues(nextValues);
      if (refetchListOnSave) {
        list.refetch();
      }
      toast.success(`${recordLabel} updated`);
      return updated;
    } catch (error) {
      toast.error(`${recordLabel} request failed`, {
        description: error instanceof Error ? error.message : "Unknown error"
      });
      return null;
    } finally {
      setSaving(false);
    }
  }, [formValues, getItemLabel, isCreateMode, item, list, onNavigateToDetail, parseRequestBody, recordLabel, refetchListOnSave, route, toFormValues]);

  const exportCurrent = useCallback(() => {
    if (!item) {
      return;
    }

    exportResourceRecords(transfer, [item], `${recordLabel.toLowerCase().replaceAll(" ", "-")}-${getItemLabel(item)}`);
  }, [getItemLabel, item, recordLabel, transfer]);

  const importJson = useCallback(async (file: File) => {
    try {
      const created = await importResourceRecords(transfer, file);
      toast.success(created.length === 1 ? `${recordLabel} imported` : `${created.length} ${recordLabel.toLowerCase()}s imported`);
      list.refetch();
    } catch (error) {
      toast.error(`${recordLabel} import failed`, {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }, [list, recordLabel, transfer]);

  const exportRowJson = useCallback((selected: TItem) => {
    exportResourceRecords(transfer, [selected], `${recordLabel.toLowerCase().replaceAll(" ", "-")}-${getItemLabel(selected)}`);
  }, [getItemLabel, recordLabel, transfer]);

  const deleteRow = useCallback(async (selected: TItem) => {
    await fetchJson<void>(`${route}/${selected.id}`, {
      method: "DELETE"
    });
    list.refetch();
  }, [list, route]);

  return {
    item,
    setItem,
    formValues,
    setFormValues,
    initialValues,
    setInitialValues,
    errors,
    setErrors,
    saving,
    isCreateMode,
    isDirty,
    list,
    detail,
    handleFieldChange,
    resetForm,
    save,
    exportCurrent,
    importJson,
    exportRowJson,
    deleteRow
  };
}
