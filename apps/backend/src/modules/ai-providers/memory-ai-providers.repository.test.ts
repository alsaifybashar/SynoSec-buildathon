import { describe, expect, it } from "vitest";
import { MemoryAiProvidersRepository } from "./memory-ai-providers.repository.js";

describe("MemoryAiProvidersRepository", () => {
  it("does not leak api keys through public read methods", async () => {
    const repository = new MemoryAiProvidersRepository([
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "Local Provider",
        kind: "local",
        status: "active",
        description: "Test provider",
        baseUrl: "http://127.0.0.1:11434",
        model: "qwen",
        apiKeyConfigured: true,
        apiKey: "secret-token",
        createdAt: "2026-04-21T00:00:00.000Z",
        updatedAt: "2026-04-21T00:00:00.000Z"
      }
    ]);

    const listed = await repository.list({ page: 1, pageSize: 10, sortDirection: "asc" });
    const item = await repository.getById("11111111-1111-1111-1111-111111111111");
    const stored = await repository.getStoredById("11111111-1111-1111-1111-111111111111");

    expect(listed.items[0]).not.toHaveProperty("apiKey");
    expect(item).not.toHaveProperty("apiKey");
    expect(stored?.apiKey).toBe("secret-token");
  });

  it("tracks apiKeyConfigured during create and update", async () => {
    const repository = new MemoryAiProvidersRepository();

    const created = await repository.create({
      name: "Anthropic",
      kind: "anthropic",
      status: "active",
      description: "Hosted provider",
      baseUrl: null,
      model: "claude",
      apiKey: "token-1"
    });
    const cleared = await repository.update(created.id, {});
    const removed = await repository.update(created.id, {
      apiKey: ""
    });

    expect(created.apiKeyConfigured).toBe(true);
    expect(cleared?.apiKeyConfigured).toBe(true);
    expect(removed?.apiKeyConfigured).toBe(false);
    expect(await repository.getStoredById(created.id)).toMatchObject({
      apiKey: "",
      apiKeyConfigured: false
    });
  });

  it("sorts by apiKey when some providers have no stored key", async () => {
    const repository = new MemoryAiProvidersRepository([
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "No Key",
        kind: "local",
        status: "active",
        description: null,
        baseUrl: "http://127.0.0.1:11434",
        model: "qwen",
        apiKeyConfigured: false,
        apiKey: null,
        createdAt: "2026-04-21T00:00:00.000Z",
        updatedAt: "2026-04-21T00:00:00.000Z"
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        name: "With Key",
        kind: "anthropic",
        status: "active",
        description: null,
        baseUrl: null,
        model: "claude",
        apiKeyConfigured: true,
        apiKey: "token-1",
        createdAt: "2026-04-21T00:00:00.000Z",
        updatedAt: "2026-04-21T00:00:00.000Z"
      }
    ]);

    const listed = await repository.list({
      page: 1,
      pageSize: 10,
      sortBy: "apiKey",
      sortDirection: "asc"
    });

    expect(listed.items.map((provider) => provider.name)).toEqual(["No Key", "With Key"]);
  });
});
