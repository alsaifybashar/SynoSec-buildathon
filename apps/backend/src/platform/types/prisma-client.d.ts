declare module "@prisma/client" {
  export type ApplicationEnvironment = "production" | "staging" | "development";
  export type ApplicationStatus = "active" | "investigating" | "archived";

  export interface Application {
    id: string;
    name: string;
    baseUrl: string | null;
    environment: ApplicationEnvironment;
    status: ApplicationStatus;
    lastScannedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export class PrismaClient {
    application: {
      findMany(args?: unknown): Promise<Application[]>;
      findUnique(args: unknown): Promise<Application | null>;
      create(args: unknown): Promise<Application>;
      update(args: unknown): Promise<Application>;
      delete(args: unknown): Promise<Application>;
    };

    constructor(args?: unknown);
  }
}
