import type { ComponentType, ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AiAgentsPage } from "@/features/ai-agents/page";
import { AiProvidersPage } from "@/features/ai-providers/page";
import { AiToolsPage } from "@/features/ai-tools/page";
import { ApplicationsPage } from "@/features/applications/page";
import { AttackMapPage } from "@/features/attack-map/page";
import { LoginPage } from "@/features/auth/login-page";
import { DesignDiff } from "@/features/designs/design-diff";
import { DesignDocument } from "@/features/designs/design-document";
import { DesignDuplex } from "@/features/designs/design-duplex";
import { DesignStream } from "@/features/designs/design-stream";
import { RuntimesPage } from "@/features/runtimes/page";
import { WorkflowJournalPage } from "@/features/workflow-journal/page";
import { WorkflowLedgerPage } from "@/features/workflow-ledger/page";
import { WorkflowStepsPage } from "@/features/workflow-steps/page";
import { WorkflowThreadPage } from "@/features/workflow-thread/page";
import { WorkflowTracePage } from "@/features/workflow-trace/page";
import { WorkflowsPage } from "@/features/workflows/page";
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
  const detailId = params[options.paramName];
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

function ApplicationsRoute() {
  return (
    <CrudRouteAdapter
      id="applications"
      paramName={crudRouteConfigs.applications.paramName}
      detailIdProp="applicationId"
      detailLabelProp="applicationNameHint"
      component={ApplicationsPage as ComponentType<Record<string, unknown>>}
    />
  );
}

function RuntimesRoute() {
  return (
    <CrudRouteAdapter
      id="runtimes"
      paramName={crudRouteConfigs.runtimes.paramName}
      detailIdProp="runtimeId"
      detailLabelProp="runtimeNameHint"
      component={RuntimesPage as ComponentType<Record<string, unknown>>}
    />
  );
}

function AiProvidersRoute() {
  return (
    <CrudRouteAdapter
      id="ai-providers"
      paramName={crudRouteConfigs["ai-providers"].paramName}
      detailIdProp="providerId"
      detailLabelProp="providerNameHint"
      component={AiProvidersPage as ComponentType<Record<string, unknown>>}
    />
  );
}

function AiAgentsRoute() {
  return (
    <CrudRouteAdapter
      id="ai-agents"
      paramName={crudRouteConfigs["ai-agents"].paramName}
      detailIdProp="agentId"
      detailLabelProp="agentNameHint"
      component={AiAgentsPage as ComponentType<Record<string, unknown>>}
    />
  );
}

function AiToolsRoute() {
  return (
    <CrudRouteAdapter
      id="ai-tools"
      paramName={crudRouteConfigs["ai-tools"].paramName}
      detailIdProp="toolId"
      detailLabelProp="toolNameHint"
      component={AiToolsPage as ComponentType<Record<string, unknown>>}
    />
  );
}

function WorkflowsRoute() {
  return (
    <CrudRouteAdapter
      id="workflows"
      paramName={crudRouteConfigs.workflows.paramName}
      detailIdProp="workflowId"
      detailLabelProp="workflowNameHint"
      component={WorkflowsPage as ComponentType<Record<string, unknown>>}
      onNavigateToRelatedDetail={(navigate) => ({
        onNavigateToAgent: (id: string) => navigate(getDetailPath("ai-agents", id))
      })}
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
      <Route path={crudRouteConfigs.applications.listPath} element={protect(<ApplicationsRoute />)} />
      <Route path={crudRouteConfigs.applications.createPath} element={protect(<ApplicationsRoute />)} />
      <Route path={crudRouteConfigs.applications.detailPath} element={protect(<ApplicationsRoute />)} />

      <Route path={crudRouteConfigs.runtimes.listPath} element={protect(<RuntimesRoute />)} />
      <Route path={crudRouteConfigs.runtimes.createPath} element={protect(<RuntimesRoute />)} />
      <Route path={crudRouteConfigs.runtimes.detailPath} element={protect(<RuntimesRoute />)} />

      <Route path={crudRouteConfigs["ai-providers"].listPath} element={protect(<AiProvidersRoute />)} />
      <Route path={crudRouteConfigs["ai-providers"].createPath} element={protect(<AiProvidersRoute />)} />
      <Route path={crudRouteConfigs["ai-providers"].detailPath} element={protect(<AiProvidersRoute />)} />

      <Route path={crudRouteConfigs["ai-agents"].listPath} element={protect(<AiAgentsRoute />)} />
      <Route path={crudRouteConfigs["ai-agents"].createPath} element={protect(<AiAgentsRoute />)} />
      <Route path={crudRouteConfigs["ai-agents"].detailPath} element={protect(<AiAgentsRoute />)} />

      <Route path={crudRouteConfigs["ai-tools"].listPath} element={protect(<AiToolsRoute />)} />
      <Route path={crudRouteConfigs["ai-tools"].createPath} element={protect(<AiToolsRoute />)} />
      <Route path={crudRouteConfigs["ai-tools"].detailPath} element={protect(<AiToolsRoute />)} />

      <Route path={crudRouteConfigs.workflows.listPath} element={protect(<WorkflowsRoute />)} />
      <Route path={crudRouteConfigs.workflows.createPath} element={protect(<WorkflowsRoute />)} />
      <Route path={crudRouteConfigs.workflows.detailPath} element={protect(<WorkflowsRoute />)} />

      <Route path="/attack-map" element={protect(<AttackMapPage />)} />
      <Route path="/designs/stream" element={protect(<DesignStream />)} />
      <Route path="/designs/duplex" element={protect(<DesignDuplex />)} />
      <Route path="/designs/document" element={protect(<DesignDocument />)} />
      <Route path="/designs/diff" element={protect(<DesignDiff />)} />
      <Route path="/designs/workflow/thread" element={protect(<WorkflowThreadPage />)} />
      <Route path="/designs/workflow/trace" element={protect(<WorkflowTracePage />)} />
      <Route path="/designs/workflow/ledger" element={protect(<WorkflowLedgerPage />)} />
      <Route path="/designs/workflow/steps" element={protect(<WorkflowStepsPage />)} />
      <Route path="/designs/workflow/journal" element={protect(<WorkflowJournalPage />)} />

      <Route path="/ai-providers" element={protect(<Navigate to={crudRouteConfigs["ai-providers"].listPath} replace />)} />
      <Route path="/ai-providers/:providerId" element={protect(<LegacyDetailRedirect section="ai-providers" legacyParamName="providerId" />)} />
      <Route path="/ai-agents" element={protect(<Navigate to={crudRouteConfigs["ai-agents"].listPath} replace />)} />
      <Route path="/ai-agents/:agentId" element={protect(<LegacyDetailRedirect section="ai-agents" legacyParamName="agentId" />)} />
      <Route path="/ai-tools" element={protect(<Navigate to={crudRouteConfigs["ai-tools"].listPath} replace />)} />
      <Route path="/ai-tools/:toolId" element={protect(<LegacyDetailRedirect section="ai-tools" legacyParamName="toolId" />)} />
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
