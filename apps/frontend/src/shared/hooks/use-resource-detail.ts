import { useEffect, useState } from "react";
import type { ListQueryState, ResourceClient } from "@/shared/lib/resource-client";

const MINIMUM_LOADING_MS = 300;

type ResourceDetailState<T> =
  | { state: "idle"; item: null }
  | { state: "loading"; item: null }
  | { state: "loaded"; item: T }
  | { state: "error"; item: null; message: string };

export function useResourceDetail<TItem, TQuery extends ListQueryState>(
  client: ResourceClient<TItem, TQuery>,
  id: string | null,
  reloadToken = 0
) {
  const [state, setState] = useState<ResourceDetailState<TItem>>({ state: "idle", item: null });

  useEffect(() => {
    if (!id) {
      setState({ state: "idle", item: null });
      return;
    }

    let active = true;
    setState({ state: "loading", item: null });

    Promise.all([
      client.detail(id),
      new Promise((resolve) => window.setTimeout(resolve, MINIMUM_LOADING_MS))
    ])
      .then(([item]) => {
        if (active) {
          setState({ state: "loaded", item });
        }
      })
      .catch((error) => {
        if (active) {
          setState({
            state: "error",
            item: null,
            message: error instanceof Error ? error.message : "Failed to load record."
          });
        }
      });

    return () => {
      active = false;
    };
  }, [client, id, reloadToken]);

  return state;
}
