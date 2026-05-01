import { useQuery } from "@tanstack/react-query";
import type { ListQueryState, ResourceClient } from "@/shared/lib/resource-client";

type ResourceDetailState<T> =
  | { state: "idle"; item: null }
  | { state: "loading"; item: null }
  | { state: "loaded"; item: T }
  | { state: "error"; item: null; message: string };

function createDetailQueryKey(client: object, id: string | null) {
  return ["resource-detail", client, id] as const;
}

export function useResourceDetail<TItem, TQuery extends ListQueryState>(
  client: ResourceClient<TItem, TQuery>,
  id: string | null,
  reloadToken = 0
) {
  const query = useQuery({
    queryKey: [...createDetailQueryKey(client, id), reloadToken] as const,
    queryFn: () => {
      if (!id) {
        throw new Error("Missing record id.");
      }

      return client.detail(id);
    },
    enabled: id !== null
  });

  if (!id) {
    return { state: "idle", item: null } satisfies ResourceDetailState<TItem>;
  }

  if (query.isPending) {
    return { state: "loading", item: null } satisfies ResourceDetailState<TItem>;
  }

  if (query.isError) {
    return {
      state: "error",
      item: null,
      message: query.error instanceof Error ? query.error.message : "Failed to load record."
    } satisfies ResourceDetailState<TItem>;
  }

  return { state: "loaded", item: query.data } satisfies ResourceDetailState<TItem>;
}
