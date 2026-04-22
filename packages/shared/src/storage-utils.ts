import type { SiteRule } from "./rule-utils";

export function dedupeRulesByDomain(rules: SiteRule[]): SiteRule[] {
  const byDomain = new Map<string, SiteRule>();
  rules.forEach((rule) => {
    byDomain.set(rule.domain, rule);
  });
  return Array.from(byDomain.values());
}

export function upsertRuleByDomain(rules: SiteRule[], nextRule: SiteRule): SiteRule[] {
  const filtered = rules.filter((rule) => rule.domain !== nextRule.domain);
  filtered.push(nextRule);
  return dedupeRulesByDomain(filtered);
}
