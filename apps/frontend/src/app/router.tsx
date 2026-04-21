import { useEffect, useState } from "react";
import {
  AppRoute,
  defaultSection,
  getDetailPath,
  getNavigationItem,
  getRouteFromPath,
  getSectionPath,
  type NavigationId,
  type NavigationState
} from "@/app/navigation";

export function useAppRouter() {
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromPath(window.location.pathname, window.history.state));

  useEffect(() => {
    const syncFromLocation = () => {
      if (window.location.pathname === "/") {
        window.history.replaceState({}, "", getSectionPath(defaultSection));
      }

      setRoute(getRouteFromPath(window.location.pathname, window.history.state));
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);

    return () => {
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, []);

  function navigateToPath(path: string, state?: NavigationState) {
    if (window.location.pathname !== path) {
      window.history.pushState(state ?? {}, "", path);
    }

    setRoute(getRouteFromPath(path, state));
  }

  function navigateToSection(section: NavigationId) {
    navigateToPath(getSectionPath(section));
  }

  function navigateToCreate(section: NavigationId) {
    navigateToPath(getDetailPath(section, "new"));
  }

  function navigateToDetail(section: NavigationId, id: string, label: string | undefined) {
    navigateToPath(getDetailPath(section, id), { detailLabel: label });
  }

  return {
    route,
    navigateToPath,
    navigateToSection,
    navigateToCreate,
    navigateToDetail
  };
}

type AppRouterProps = {
  route: AppRoute;
  navigateToPath: (path: string, state?: NavigationState) => void;
  navigateToSection: (section: NavigationId) => void;
  navigateToCreate: (section: NavigationId) => void;
  navigateToDetail: (section: NavigationId, id: string, label: string | undefined) => void;
};

export function AppRouter({
  route,
  navigateToPath,
  navigateToSection,
  navigateToCreate,
  navigateToDetail
}: AppRouterProps) {
  return getNavigationItem(route.section).render({
    route,
    navigateToPath,
    navigateToSection,
    navigateToCreate,
    navigateToDetail
  });
}
