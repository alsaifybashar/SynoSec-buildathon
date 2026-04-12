import type { CreateRuntimeBody, Runtime, UpdateRuntimeBody } from "@synosec/contracts";

export interface RuntimesRepository {
  list(): Promise<Runtime[]>;
  getById(id: string): Promise<Runtime | null>;
  create(input: CreateRuntimeBody): Promise<Runtime>;
  update(id: string, input: UpdateRuntimeBody): Promise<Runtime | null>;
  remove(id: string): Promise<boolean>;
}
