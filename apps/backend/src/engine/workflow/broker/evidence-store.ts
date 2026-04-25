import type { AgentNote, Finding, Observation, ToolRun, ValidationStatus } from "@synosec/contracts";

class EvidenceStore {
  private toolRunsByScan = new Map<string, ToolRun[]>();
  private observationsByScan = new Map<string, Observation[]>();
  private agentNotesByScan = new Map<string, AgentNote[]>();
  private findingsByScan = new Map<string, Finding[]>();

  addToolRun(toolRun: ToolRun): void {
    const existing = this.toolRunsByScan.get(toolRun.scanId) ?? [];
    existing.push(toolRun);
    this.toolRunsByScan.set(toolRun.scanId, existing);
  }

  updateToolRun(toolRun: ToolRun): void {
    const existing = this.toolRunsByScan.get(toolRun.scanId) ?? [];
    const next = existing.map((candidate) => (candidate.id === toolRun.id ? toolRun : candidate));
    this.toolRunsByScan.set(toolRun.scanId, next);
  }

  addObservation(observation: Observation): void {
    const existing = this.observationsByScan.get(observation.scanId) ?? [];
    existing.push(observation);
    this.observationsByScan.set(observation.scanId, existing);
  }

  addAgentNote(agentNote: AgentNote): void {
    const existing = this.agentNotesByScan.get(agentNote.scanId) ?? [];
    existing.push(agentNote);
    this.agentNotesByScan.set(agentNote.scanId, existing);
  }

  addFinding(finding: Finding): void {
    const existing = this.findingsByScan.get(finding.scanId) ?? [];
    existing.push(finding);
    this.findingsByScan.set(finding.scanId, existing);
  }

  updateFindingValidationStatus(scanId: string, findingId: string, status: ValidationStatus): void {
    const existing = this.findingsByScan.get(scanId) ?? [];
    const next = existing.map((f) => f.id === findingId ? { ...f, validationStatus: status } : f);
    this.findingsByScan.set(scanId, next);
  }

  getFindingsForScan(scanId: string): Finding[] {
    return [...(this.findingsByScan.get(scanId) ?? [])];
  }

  getToolRunsForScan(scanId: string): ToolRun[] {
    return [...(this.toolRunsByScan.get(scanId) ?? [])];
  }

  getObservationsForScan(scanId: string): Observation[] {
    return [...(this.observationsByScan.get(scanId) ?? [])];
  }

  getObservationsForNode(scanId: string, tacticId: string): Observation[] {
    return this.getObservationsForScan(scanId).filter((observation) => observation.tacticId === tacticId);
  }

  getAgentNotesForScan(scanId: string): AgentNote[] {
    return [...(this.agentNotesByScan.get(scanId) ?? [])];
  }

  clear(): void {
    this.toolRunsByScan.clear();
    this.observationsByScan.clear();
    this.agentNotesByScan.clear();
    this.findingsByScan.clear();
  }
}

export const evidenceStore = new EvidenceStore();
