import { describe, expect, it } from "vitest";

import { dedupeRulesByDomain, upsertRuleByDomain } from "../src/storage-utils";

const baseRule = {
  id: "rule_a",
  domain: "example.com",
  enabled: true,
  actions: [{ type: "hideSelector" as const, selector: ".ad" }],
  updatedAt: new Date().toISOString()
};

describe("storage-utils", () => {
  it("dedupes rules by domain", () => {
    const deduped = dedupeRulesByDomain([
      baseRule,
      { ...baseRule, id: "rule_b", enabled: false }
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe("rule_b");
  });

  it("upserts by domain", () => {
    const updated = upsertRuleByDomain([baseRule], {
      ...baseRule,
      enabled: false
    });

    expect(updated).toHaveLength(1);
    expect(updated[0].enabled).toBe(false);
  });
});
