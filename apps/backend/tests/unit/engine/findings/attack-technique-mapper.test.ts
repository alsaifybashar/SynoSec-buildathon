import { describe, expect, it } from "vitest";
import { enrichAttackTechnique } from "@/engine/findings/attack-technique-mapper.js";

describe("enrichAttackTechnique", () => {
  it("maps JWT findings to CWE and MITRE tags", () => {
    const result = enrichAttackTechnique({
      technique: "JWT weak secret validation",
      title: "JWT signed with weak secret",
      tags: ["auth"]
    });

    expect(result.cwe).toBe("CWE-347");
    expect(result.mitreId).toBe("T1550");
    expect(result.tags).toContain("auth");
    expect(result.tags).toContain("mitre:T1550");
  });

  it("preserves explicit CWE and MITRE values", () => {
    const result = enrichAttackTechnique({
      technique: "SQL injection",
      existingCwe: "CWE-564",
      existingMitreId: "T9999",
      tags: []
    });

    expect(result.cwe).toBe("CWE-564");
    expect(result.mitreId).toBe("T9999");
    expect(result.tags).toContain("attack:initial-access");
  });
});
