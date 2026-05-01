import { useQuery } from "@tanstack/react-query";
import type { AuthStoreState } from "@/features/auth/auth-store";
import { authSessionQueryKey, fetchSessionPayload } from "@/features/auth/auth-store";

export function useAuthStore(): AuthStoreState {
  const query = useQuery({
    queryKey: authSessionQueryKey,
    queryFn: fetchSessionPayload,
    retry: false
  });

  if (query.isPending) {
    return {
      status: "loading",
      session: null,
      message: null
    };
  }

  if (query.isError) {
    return {
      status: "error",
      session: null,
      message: query.error instanceof Error ? query.error.message : "Unable to load session state."
    };
  }

  return {
    status: "ready",
    session: query.data,
    message: null
  };
}
