import type { AgentNote, Observation, ToolRun } from "@synosec/contracts";

class EvidenceStore {
  private toolRunsByScan = new Map<string, ToolRun[]>();
  private observationsByScan = new Map<string, Observation[]>();
  private agentNotesByScan = new Map<string, AgentNote[]>();

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

  getToolRunsForScan(scanId: string): ToolRun[] {
    return [...(this.toolRunsByScan.get(scanId) ?? [])];
  }

  getObservationsForScan(scanId: string): Observation[] {
    return [...(this.observationsByScan.get(scanId) ?? [])];
  }

  getObservationsForNode(scanId: string, nodeId: string): Observation[] {
    return this.getObservationsForScan(scanId).filter((observation) => observation.nodeId === nodeId);
  }

  getAgentNotesForScan(scanId: string): AgentNote[] {
    return [...(this.agentNotesByScan.get(scanId) ?? [])];
  }

  clear(): void {
    this.toolRunsByScan.clear();
    this.observationsByScan.clear();
    this.agentNotesByScan.clear();
  }
}

export const evidenceStore = new EvidenceStore();
