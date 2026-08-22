export type ControlPactDecision =
  | "ALLOW"
  | "APPROVE"
  | "BLOCK";

export type ActionContext =
  Record<string, unknown>;

export type ActionRequest = {
  agentId: string;
  action: string;
  resource?: string;
  amount?: number;
  currency?: string;
  context?: ActionContext;
  [key: string]: unknown;
};

export type PolicyConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "notIn"
  | "exists"
  | "contains"
  | "startsWith";

export type PolicyCondition = {
  field: string;
  operator: PolicyConditionOperator;
  value?: unknown;
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
  conditions?: PolicyCondition[];
  requiredApproverRoles?: string[];
};

export type PolicyStatus =
  | "DRAFT"
  | "TEST"
  | "ACTIVE"
  | "RETIRED";

export type Policy = {
  id: string;
  name?: string;
  description?: string;
  templateId?: string;
  version?: number;
  status?: PolicyStatus;
  defaultDecision: ControlPactDecision;
  rules: PolicyRule[];
};

export type PolicyDecision = {
  policyId: string;
  policyVersion?: number;
  decision: ControlPactDecision;
  reason: string;
  matchedRuleIds: string[];
  requiredApproverRoles: string[];
};

const priority: Record<ControlPactDecision, number> = {
  ALLOW: 1,
  APPROVE: 2,
  BLOCK: 3,
};

const resolveField = (
  request: ActionRequest,
  field: string,
): unknown => {
  const clean = String(field || "").trim();

  if (!clean) {
    return undefined;
  }

  const parts = clean.split(".").filter(Boolean);
  let current: unknown = request;

  for (const part of parts) {
    if (
      current === null ||
      typeof current !== "object"
    ) {
      return undefined;
    }

    current = (
      current as Record<string, unknown>
    )[part];
  }

  return current;
};

const asNumber = (
  value: unknown,
): number | null => {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
};

const conditionMatches = (
  request: ActionRequest,
  condition: PolicyCondition,
): boolean => {
  const actual = resolveField(
    request,
    condition.field,
  );

  switch (condition.operator) {
    case "exists":
      return (
        actual !== undefined &&
        actual !== null
      );

    case "eq":
      return actual === condition.value;

    case "neq":
      return actual !== condition.value;

    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const left = asNumber(actual);
      const right = asNumber(
        condition.value,
      );

      if (
        left === null ||
        right === null
      ) {
        return false;
      }

      if (condition.operator === "gt") {
        return left > right;
      }

      if (condition.operator === "gte") {
        return left >= right;
      }

      if (condition.operator === "lt") {
        return left < right;
      }

      return left <= right;
    }

    case "in":
    case "notIn": {
      const values = Array.isArray(
        condition.value,
      )
        ? condition.value
        : [];

      const found = values.includes(actual);

      return condition.operator === "in"
        ? found
        : !found;
    }

    case "contains":
      if (Array.isArray(actual)) {
        return actual.includes(
          condition.value,
        );
      }

      if (
        typeof actual === "string" &&
        typeof condition.value === "string"
      ) {
        return actual.includes(
          condition.value,
        );
      }

      return false;

    case "startsWith":
      return (
        typeof actual === "string" &&
        typeof condition.value === "string" &&
        actual.startsWith(
          condition.value,
        )
      );
  }
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
    !rule.resources.includes(
      request.resource || "",
    )
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

  if (
    rule.conditions?.length &&
    !rule.conditions.every(
      (condition) =>
        conditionMatches(
          request,
          condition,
        ),
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
  const matched = policy.rules.filter(
    (rule) =>
      matchesRule(request, rule),
  );

  if (!matched.length) {
    return {
      policyId: policy.id,
      policyVersion: policy.version,
      decision: policy.defaultDecision,
      reason:
        "No rule matched. Default policy decision applied.",
      matchedRuleIds: [],
      requiredApproverRoles: [],
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

  const winningRules = matched.filter(
    (rule) =>
      rule.decision === winningDecision,
  );

  const requiredApproverRoles =
    Array.from(
      new Set(
        winningRules
          .flatMap(
            (rule) =>
              rule.requiredApproverRoles || [],
          )
          .map(
            (role) =>
              String(role).trim(),
          )
          .filter(Boolean),
      ),
    );

  return {
    policyId: policy.id,
    policyVersion: policy.version,
    decision: winningDecision,
    reason:
      winningDecision === "BLOCK"
        ? "Action blocked by policy."
        : winningDecision === "APPROVE"
          ? "Human approval required by policy."
          : "Action allowed by policy.",
    matchedRuleIds:
      winningRules.map(
        (rule) => rule.id,
      ),
    requiredApproverRoles,
  };
};
