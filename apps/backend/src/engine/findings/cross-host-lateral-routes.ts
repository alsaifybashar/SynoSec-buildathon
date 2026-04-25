import { randomUUID } from "node:crypto";
import type { EscalationRoute, WorkflowReportedFinding } from "@synosec/contracts";

function hasCredentialSignal(finding: WorkflowReportedFinding) {
  const text = `${finding.title} ${finding.type} ${finding.impact} ${finding.tags.join(" ")}`.toLowerCase();
  return /(credential|session|token|jwt|password|auth|login)/.test(text);
}

function hasCompatibleAuthSurface(finding: WorkflowReportedFinding) {
  const text = `${finding.title} ${finding.type} ${finding.impact} ${finding.tags.join(" ")}`.toLowerCase();
  return /(auth|login|session|jwt|sso|same authentication|identity provider)/.test(text);
}

export function inferCrossHostLateralRoutes(scanId: string, findings: WorkflowReportedFinding[]): EscalationRoute[] {
  const routes: EscalationRoute[] = [];
  const credentialFindings = findings.filter(hasCredentialSignal);
  const authSurfaces = findings.filter(hasCompatibleAuthSurface);

  for (const source of credentialFindings) {
    for (const destination of authSurfaces) {
      if (source.id === destination.id || source.target.host === destination.target.host) {
        continue;
      }
      routes.push({
        id: randomUUID(),
        scanId,
        title: `Potential lateral movement from ${source.target.host} to ${destination.target.host}`,
        compositeRisk: Math.min(1, ((source.confidence + destination.confidence) / 2) * 0.9),
        technique: "cross-host credential or session reuse",
        findingIds: [source.id, destination.id],
        links: [{
          fromFindingId: source.id,
          toFindingId: destination.id,
          probability: Math.min(0.9, (source.confidence + destination.confidence) / 2),
          order: 0,
          edgeType: "lateral_movement",
          fromHost: source.target.host,
          toHost: destination.target.host
        }],
        startTarget: source.target.host,
        endTarget: destination.target.host,
        chainLength: 2,
        crossHost: true,
        confidence: Math.min(0.9, (source.confidence + destination.confidence) / 2),
        narrative: `A credential/session finding on ${source.target.host} may apply to a compatible authentication surface on ${destination.target.host}.`,
        createdAt: new Date().toISOString()
      });
    }
  }

  return routes.slice(0, 10);
}
