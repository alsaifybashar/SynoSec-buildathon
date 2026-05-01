import request from "supertest";
import { describe, expect, it } from "vitest";
import { apiRoutes } from "@synosec/contracts";
import { buildTarget } from "../../fixtures/builders/target.js";
import { createTestApp } from "../../fixtures/http/create-test-app.js";

describe("targets routes", () => {
  it("serves seeded targets through the full app harness", async () => {
    const app = createTestApp({
      dependencies: {
        targets: [buildTarget({
          id: "20000000-0000-0000-0000-000000000009",
          name: "Target Bravo"
        })]
      }
    });

    const response = await request(app)
      .get(`${apiRoutes.targets}?page=1&pageSize=10&sortBy=name&sortDirection=asc`)
      .expect(200);

    expect(response.body).toMatchObject({
      total: 1,
      targets: [{
        id: "20000000-0000-0000-0000-000000000009",
        name: "Target Bravo"
      }]
    });
  });
});
