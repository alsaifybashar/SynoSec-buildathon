import { useSyncExternalStore } from "react";
import { getAuthStoreState, subscribeAuthStore } from "@/features/auth/auth-store";

export function useAuthStore() {
  return useSyncExternalStore(subscribeAuthStore, getAuthStoreState, getAuthStoreState);
}
