import type { ComponentType, ReactNode } from "react";
import { Navigate, Route, Routes, matchPath, useLocation, useNavigate, useParams } from "react-router-dom";
import { AttackMapPage } from "@/features/attack-map/page";
import { ExecutionReportsPage } from "@/features/execution-reports/page";
import { LoginPage } from "@/features/auth/login-page";
import { DesignDiff } from "@/features/designs/design-diff";
import { DesignDocument } from "@/features/designs/design-document";
import { DesignDuplex } from "@/features/designs/design-duplex";
import { DesignStream } from "@/features/designs/design-stream";
import { WorkflowJournalPage } from "@/features/workflow-journal/page";
import { WorkflowLedgerPage } from "@/features/workflow-ledger/page";
import { WorkflowStepsPage } from "@/features/workflow-steps/page";
import { WorkflowThreadPage } from "@/features/workflow-thread/page";
import { WorkflowTracePage } from "@/features/workflow-trace/page";
import { crudRouteRegistry, legacyCrudRedirects } from "@/app/crud-route-registry";
import {
  crudRouteConfigs,
  defaultRoutePath,
  getCreatePath,
  getDetailPath,
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
  onNavigateToRelatedDetail?: (navigate: ReturnType<typeof useNavigate>) => Record<string, unknown>;
};

function CrudRouteAdapter(options: CrudRouteAdapterOptions) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const routeConfig = crudRouteConfigs[options.id];
  const detailId = matchPath({ path: routeConfig.createPath, end: true }, location.pathname)
    ? "new"
    : params[options.paramName];
  const state = location.state as NavigationState | null;
  const Page = options.component;

  return (
    <Page
      {...(state?.detailLabel ? { [options.detailLabelProp]: state.detailLabel } : {})}
      {...(detailId ? { [options.detailIdProp]: detailId } : {})}
      {...(options.onNavigateToRelatedDetail ? options.onNavigateToRelatedDetail(navigate) : {})}
      onNavigateToList={() => navigate(getSectionPath(options.id))}
      onNavigateToCreate={() => navigate(getCreatePath(options.id))}
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

  return (
    <CrudRouteAdapter
      id={definition.id}
      paramName={crudRouteConfigs[definition.id].paramName}
      detailIdProp={definition.detailIdProp}
      detailLabelProp={definition.detailLabelProp}
      component={definition.component}
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
        <Route key={`${definition.id}-detail`} path={crudRouteConfigs[definition.id].detailPath} element={protect(<CrudGeneratedRoute routeId={definition.id} />)} />
      ]))}

      <Route path="/attack-map" element={protect(<AttackMapPage />)} />
      <Route path="/execution-reports" element={protect(<ExecutionReportsRouteAdapter />)} />
      <Route path="/execution-reports/:reportId" element={protect(<ExecutionReportsRouteAdapter />)} />
      <Route path="/designs/stream" element={protect(<DesignStream />)} />
      <Route path="/designs/duplex" element={protect(<DesignDuplex />)} />
      <Route path="/designs/document" element={protect(<DesignDocument />)} />
      <Route path="/designs/diff" element={protect(<DesignDiff />)} />
      <Route path="/designs/workflow/thread" element={protect(<WorkflowThreadPage />)} />
      <Route path="/designs/workflow/trace" element={protect(<WorkflowTracePage />)} />
      <Route path="/designs/workflow/ledger" element={protect(<WorkflowLedgerPage />)} />
      <Route path="/designs/workflow/steps" element={protect(<WorkflowStepsPage />)} />
      <Route path="/designs/workflow/journal" element={protect(<WorkflowJournalPage />)} />

      {legacyCrudRedirects.map((redirect) => (
        "redirectTo" in redirect
          ? <Route key={redirect.path} path={redirect.path} element={protect(<Navigate to={redirect.redirectTo} replace />)} />
          : <Route key={redirect.path} path={redirect.path} element={protect(<LegacyDetailRedirect section={redirect.section} legacyParamName={redirect.legacyParamName} />)} />
      ))}
      <Route path="/designs-stream" element={protect(<Navigate to="/designs/stream" replace />)} />
      <Route path="/designs-duplex" element={protect(<Navigate to="/designs/duplex" replace />)} />
      <Route path="/designs-document" element={protect(<Navigate to="/designs/document" replace />)} />
      <Route path="/designs-diff" element={protect(<Navigate to="/designs/diff" replace />)} />
      <Route path="/workflow-thread" element={protect(<Navigate to="/designs/workflow/thread" replace />)} />
      <Route path="/workflow-trace" element={protect(<Navigate to="/designs/workflow/trace" replace />)} />
      <Route path="/workflow-ledger" element={protect(<Navigate to="/designs/workflow/ledger" replace />)} />
      <Route path="/workflow-steps" element={protect(<Navigate to="/designs/workflow/steps" replace />)} />
      <Route path="/workflow-journal" element={protect(<Navigate to="/designs/workflow/journal" replace />)} />

      <Route path="*" element={protect(<Navigate to={defaultRoutePath} replace />)} />
    </Routes>
  );
}
