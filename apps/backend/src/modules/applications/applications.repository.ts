import type { Application, CreateApplicationBody, UpdateApplicationBody } from "@synosec/contracts";

export interface ApplicationsRepository {
  list(): Promise<Application[]>;
  getById(id: string): Promise<Application | null>;
  create(input: CreateApplicationBody): Promise<Application>;
  update(id: string, input: UpdateApplicationBody): Promise<Application | null>;
  remove(id: string): Promise<boolean>;
}
