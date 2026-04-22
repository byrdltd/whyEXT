export type SiteRuleAction =
  | { type: "hideSelector"; selector: string }
  | { type: "injectCss"; css: string };

export type SiteRule = {
  id: string;
  domain: string;
  enabled: boolean;
  actions: SiteRuleAction[];
  updatedAt: string;
};

export function normalizeDomain(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }

  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  return withoutProtocol.split("/")[0].replace(/\.$/, "");
}

export function isValidDomain(domain: string): boolean {
  if (domain === "localhost") {
    return true;
  }
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain);
}

export function isValidAction(action: unknown): action is SiteRuleAction {
  if (!action || typeof action !== "object" || !("type" in action)) {
    return false;
  }

  const typedAction = action as Record<string, unknown>;
  if (typedAction.type === "hideSelector") {
    return typeof typedAction.selector === "string" && typedAction.selector.trim().length > 0;
  }

  if (typedAction.type === "injectCss") {
    return typeof typedAction.css === "string" && typedAction.css.trim().length > 0;
  }

  return false;
}

export function validateRuleShape(rule: unknown): rule is SiteRule {
  if (!rule || typeof rule !== "object") {
    return false;
  }

  const typedRule = rule as Partial<SiteRule>;
  const normalizedDomain = normalizeDomain(typedRule.domain);

  if (!isValidDomain(normalizedDomain)) {
    return false;
  }

  if (typeof typedRule.id !== "string" || typedRule.id.trim().length === 0) {
    return false;
  }

  if (typeof typedRule.enabled !== "boolean") {
    return false;
  }

  if (!Array.isArray(typedRule.actions) || !typedRule.actions.every(isValidAction)) {
    return false;
  }

  if (typeof typedRule.updatedAt !== "string" || typedRule.updatedAt.trim().length === 0) {
    return false;
  }

  return true;
}
