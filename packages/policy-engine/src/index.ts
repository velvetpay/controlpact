export type ControlPactDecision =
  | "ALLOW"
  | "APPROVE"
  | "BLOCK";

export type ActionRequest = {
  agentId: string;
  action: string;
  resource?: string;
  amount?: number;
  currency?: string;
};

export type PolicyRule = {
  id: string;
  description?: string;
  decision: ControlPactDecision;
  actions?: string[];
  agentIds?: string[];
  resources?: string[];
  minAmount?: number;
  maxAmount?: number;
};

export type Policy = {
  id: string;
  defaultDecision: ControlPactDecision;
  rules: PolicyRule[];
};

export type PolicyDecision = {
  policyId: string;
  decision: ControlPactDecision;
  reason: string;
  matchedRuleIds: string[];
};

const priority: Record<ControlPactDecision, number> = {
  ALLOW: 1,
  APPROVE: 2,
  BLOCK: 3,
};

const matchesRule = (
  request: ActionRequest,
  rule: PolicyRule,
): boolean => {
  if (
    rule.actions?.length &&
    !rule.actions.includes(request.action)
  ) {
    return false;
  }

  if (
    rule.agentIds?.length &&
    !rule.agentIds.includes(request.agentId)
  ) {
    return false;
  }

  if (
    rule.resources?.length &&
    !rule.resources.includes(request.resource || "")
  ) {
    return false;
  }

  if (
    rule.minAmount !== undefined &&
    (
      request.amount === undefined ||
      request.amount < rule.minAmount
    )
  ) {
    return false;
  }

  if (
    rule.maxAmount !== undefined &&
    (
      request.amount === undefined ||
      request.amount > rule.maxAmount
    )
  ) {
    return false;
  }

  return true;
};

export const evaluatePolicy = (
  request: ActionRequest,
  policy: Policy,
): PolicyDecision => {
  const matched =
    policy.rules.filter((rule) =>
      matchesRule(request, rule)
    );

  if (!matched.length) {
    return {
      policyId: policy.id,
      decision: policy.defaultDecision,
      reason: "No rule matched. Default policy decision applied.",
      matchedRuleIds: [],
    };
  }

  const winningDecision =
    matched.reduce<ControlPactDecision>(
      (current, rule) =>
        priority[rule.decision] >
        priority[current]
          ? rule.decision
          : current,
      "ALLOW",
    );

  const winningRules =
    matched.filter(
      (rule) =>
        rule.decision === winningDecision
    );

  return {
    policyId: policy.id,
    decision: winningDecision,
    reason:
      winningDecision === "BLOCK"
        ? "Action blocked by policy."
        : winningDecision === "APPROVE"
          ? "Human approval required by policy."
          : "Action allowed by policy.",
    matchedRuleIds:
      winningRules.map((rule) => rule.id),
  };
};