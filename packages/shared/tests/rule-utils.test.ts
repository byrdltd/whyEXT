import { describe, expect, it } from "vitest";

import {
  isValidAction,
  isValidDomain,
  normalizeDomain,
  validateRuleShape
} from "../src/rule-utils";

describe("rule-utils", () => {
  it("normalizes domains from URLs", () => {
    expect(normalizeDomain("https://Example.COM/path")).toBe("example.com");
    expect(normalizeDomain(" sub.example.org ")).toBe("sub.example.org");
  });

  it("validates domain shapes", () => {
    expect(isValidDomain("example.com")).toBe(true);
    expect(isValidDomain("localhost")).toBe(true);
    expect(isValidDomain("not a domain")).toBe(false);
  });

  it("validates action payloads", () => {
    expect(isValidAction({ type: "hideSelector", selector: ".cookie" })).toBe(true);
    expect(isValidAction({ type: "injectCss", css: "body{display:none;}" })).toBe(true);
    expect(isValidAction({ type: "injectCss", css: "" })).toBe(false);
  });

  it("validates full rule shape", () => {
    const valid = {
      id: "rule_1",
      domain: "example.com",
      enabled: true,
      actions: [{ type: "hideSelector", selector: ".ad" }],
      updatedAt: new Date().toISOString()
    };

    expect(validateRuleShape(valid)).toBe(true);
    expect(validateRuleShape({ ...valid, domain: "bad domain" })).toBe(false);
  });
});
