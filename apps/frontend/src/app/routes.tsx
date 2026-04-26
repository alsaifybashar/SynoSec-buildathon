import type { ComponentType, ReactNode } from "react";
import { Navigate, Route, Routes, matchPath, useLocation, useNavigate, useParams } from "react-router-dom";
import { AttackMapPage } from "@/features/attack-map/page";
import { AttackMapPage as WorkflowAttackMapRoutePage } from "@/features/attack-map/workflow-route-page";
import { ExecutionReportsPage } from "@/features/execution-reports/page";
import { LoginPage } from "@/features/auth/login-page";
import { DesignDuplex } from "@/features/designs/design-duplex";
import { DesignStream } from "@/features/designs/design-stream";
import { DesignReportFindingMap } from "@/features/designs/design-report-finding-map";
import { DesignReportFindingList } from "@/features/designs/design-report-finding-list";
import { DesignReportFindingSplit } from "@/features/designs/design-report-finding-split";
import { DesignReportFindingZen } from "@/features/designs/design-report-finding-zen";
import { crudRouteRegistry, legacyCrudRedirects } from "@/app/crud-route-registry";
import {
  crudRouteConfigs,
  defaultRoutePath,
  getCreatePath,
  getDetailPath,
  getEditPath,
  getSectionPath,
  loginRoutePath,
  type CrudNavigationId,
  type NavigationState
} from "@/app/navigation";

type CrudRouteAdapterOptions = {
  id: CrudNavigationId;
  paramName: string;
  detailLabelProp: string;
  detailIdProp: string;
  component: ComponentType<Record<string, unknown>>;
  routeKind: "list" | "create" | "detail" | "edit";
  onNavigateToRelatedDetail?: (navigate: ReturnType<typeof useNavigate>) => Record<string, unknown>;
};

function CrudRouteAdapter(options: CrudRouteAdapterOptions) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const routeConfig = crudRouteConfigs[options.id];
  const state = location.state as NavigationState | null;
  const Page = options.component;
  const detailId = options.routeKind === "create"
    ? "new"
    : options.routeKind === "list"
    ? undefined
    : params[options.paramName];

  return (
    <Page
      {...(state?.detailLabel ? { [options.detailLabelProp]: state.detailLabel } : {})}
      {...(detailId ? { [options.detailIdProp]: detailId } : {})}
      {...(options.onNavigateToRelatedDetail ? options.onNavigateToRelatedDetail(navigate) : {})}
      onNavigateToList={() => navigate(getSectionPath(options.id))}
      onNavigateToCreate={() => navigate(getCreatePath(options.id))}
      onNavigateToEdit={(id: string, label?: string) => {
        navigate(getEditPath(options.id, id), { state: label ? { detailLabel: label } : undefined });
      }}
      onNavigateToDetail={(id: string, label?: string) => {
        navigate(getDetailPath(options.id, id), { state: label ? { detailLabel: label } : undefined });
      }}
    />
  );
}

export function LoginRoute({ googleClientId }: { googleClientId: string | null }) {
  return <LoginPage googleClientId={googleClientId} />;
}

export function ProtectedRoute({ redirectTo }: { redirectTo: string }) {
  return <Navigate to={`${loginRoutePath}?redirectTo=${encodeURIComponent(redirectTo)}`} replace />;
}

export function AuthenticatedLoginRedirect({ redirectTo }: { redirectTo: string }) {
  return <Navigate to={redirectTo || defaultRoutePath} replace />;
}

function LegacyDetailRedirect({
  section,
  legacyParamName
}: {
  section: CrudNavigationId;
  legacyParamName: string;
}) {
  const params = useParams();
  const detailId = params[legacyParamName];
  return <Navigate to={detailId ? getDetailPath(section, detailId) : getSectionPath(section)} replace />;
}

function CrudGeneratedRoute({ routeId }: { routeId: CrudNavigationId }) {
  const definition = crudRouteRegistry.find((entry) => entry.id === routeId);
  if (!definition) {
    throw new Error(`Missing CRUD route definition for ${routeId}.`);
  }

  const location = useLocation();
  const routeConfig = crudRouteConfigs[definition.id];
  const routeKind = matchPath({ path: routeConfig.createPath, end: true }, location.pathname)
    ? "create"
    : routeConfig.editPath && matchPath({ path: routeConfig.editPath, end: true }, location.pathname)
    ? "edit"
    : routeConfig.detailPath === location.pathname || matchPath({ path: routeConfig.detailPath, end: true }, location.pathname)
    ? "detail"
    : "list";

  const component = routeKind === "detail" && definition.detailComponent
    ? definition.detailComponent
    : definition.component;

  return (
    <CrudRouteAdapter
      id={definition.id}
      paramName={routeConfig.paramName}
      detailIdProp={definition.detailIdProp}
      detailLabelProp={definition.detailLabelProp}
      component={component}
      routeKind={routeKind}
      {...(definition.onNavigateToRelatedDetail
        ? {
            onNavigateToRelatedDetail: (navigate: ReturnType<typeof useNavigate>) => ({
              onNavigateToAgent: (id: string) => navigate(getDetailPath("ai-agents", id))
            })
          }
        : {})}
    />
  );
}

function ExecutionReportsRouteAdapter() {
  const navigate = useNavigate();
  const params = useParams();
  return (
    <ExecutionReportsPage
      {...(params["reportId"] ? { reportId: params["reportId"] } : {})}
      onNavigateToList={() => navigate("/execution-reports")}
      onNavigateToDetail={(id: string) => navigate(`/execution-reports/${id}`)}
    />
  );
}

export function AppContentRoutes({
  authRequired,
  authenticated,
  googleClientId
}: {
  authRequired: boolean;
  authenticated: boolean;
  googleClientId: string | null;
}) {
  const location = useLocation();
  const currentPathWithQuery = `${location.pathname}${location.search}`;
  const loginRedirectTarget = new URLSearchParams(location.search).get("redirectTo") || defaultRoutePath;
  const protect = (element: ReactNode) =>
    authRequired && !authenticated
      ? <ProtectedRoute redirectTo={currentPathWithQuery} />
      : element;

  return (
    <Routes>
      <Route
        path={loginRoutePath}
        element={
          !authRequired
            ? <Navigate to={defaultRoutePath} replace />
            : authRequired && authenticated
            ? <AuthenticatedLoginRedirect redirectTo={loginRedirectTarget} />
            : <LoginRoute googleClientId={googleClientId} />
        }
      />
      <Route index element={protect(<Navigate to={defaultRoutePath} replace />)} />
      {crudRouteRegistry.flatMap((definition) => ([
        <Route key={`${definition.id}-list`} path={crudRouteConfigs[definition.id].listPath} element={protect(<CrudGeneratedRoute routeId={definition.id} />)} />,
        <Route key={`${definition.id}-create`} path={crudRouteConfigs[definition.id].createPath} element={protect(<CrudGeneratedRoute routeId={definition.id} />)} />,
        ...(crudRouteConfigs[definition.id].editPath
          ? [<Route key={`${definition.id}-edit`} path={crudRouteConfigs[definition.id].editPath!} element={protect(<CrudGeneratedRoute routeId={definition.id} />)} />]
          : []),
        <Route key={`${definition.id}-detail`} path={crudRouteConfigs[definition.id].detailPath} element={protect(<CrudGeneratedRoute routeId={definition.id} />)} />
      ]))}

      <Route path="/attack-map" element={protect(<AttackMapPage />)} />
      <Route path="/attack-map/copy" element={protect(<WorkflowAttackMapRoutePage />)} />
      <Route path="/attack-map/workflows/:workflowId" element={protect(<WorkflowAttackMapRoutePage />)} />
      <Route path="/execution-reports" element={protect(<ExecutionReportsRouteAdapter />)} />
      <Route path="/execution-reports/:reportId" element={protect(<ExecutionReportsRouteAdapter />)} />
      <Route path="/designs/stream" element={protect(<DesignStream />)} />
      <Route path="/designs/duplex" element={protect(<DesignDuplex />)} />
      <Route path="/designs/report-finding-map" element={protect(<DesignReportFindingMap />)} />
      <Route path="/designs/report-finding-list" element={protect(<DesignReportFindingList />)} />
      <Route path="/designs/report-finding-split" element={protect(<DesignReportFindingSplit />)} />
      <Route path="/designs/report-finding-zen" element={protect(<DesignReportFindingZen />)} />

      {legacyCrudRedirects.map((redirect) => (
        "redirectTo" in redirect
          ? <Route key={redirect.path} path={redirect.path} element={protect(<Navigate to={redirect.redirectTo} replace />)} />
          : <Route key={redirect.path} path={redirect.path} element={protect(<LegacyDetailRedirect section={redirect.section} legacyParamName={redirect.legacyParamName} />)} />
      ))}
      <Route path="/designs-stream" element={protect(<Navigate to="/designs/stream" replace />)} />
      <Route path="/designs-duplex" element={protect(<Navigate to="/designs/duplex" replace />)} />

      <Route path="*" element={protect(<Navigate to={defaultRoutePath} replace />)} />
    </Routes>
  );
}
