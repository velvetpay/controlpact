import type {
  Policy,
} from "@controlpact/policy-engine";

export type PolicySummary = {
  id: string;
  defaultDecision:
    Policy["defaultDecision"];
  ruleCount: number;
};

export const defaultPolicies: Policy[] = [
  {
    id: "finance-policy",
    defaultDecision: "BLOCK",
    rules: [
      {
        id: "allow-normal-refund",
        description:
          "Allow routine customer refunds below the approval threshold.",
        decision: "ALLOW",
        actions: [
          "refundCustomer",
        ],
      },
      {
        id: "approve-large-refund",
        description:
          "Require human approval for refunds of 500 or more.",
        decision: "APPROVE",
        actions: [
          "refundCustomer",
        ],
        minAmount: 500,
      },
    ],
  },
  {
    id: "production-policy",
    defaultDecision: "BLOCK",
    rules: [
      {
        id: "block-account-deletion",
        description:
          "Agents may not delete customer accounts.",
        decision: "BLOCK",
        actions: [
          "deleteAccount",
        ],
      },
      {
        id: "approve-production-deploy",
        description:
          "Production deployment requires human approval.",
        decision: "APPROVE",
        actions: [
          "deployProduction",
        ],
      },
    ],
  },
  {
    id: "sales-policy",
    defaultDecision: "BLOCK",
    rules: [
      {
        id: "allow-crm-update",
        description:
          "Allow the sales agent to update CRM records.",
        decision: "ALLOW",
        actions: [
          "updateCRM",
        ],
        agentIds: [
          "sales-agent",
        ],
      },
    ],
  },
];

export class PolicyRegistry {
  private readonly policies:
    Map<string, Policy>;

  constructor(
    policies: Policy[] =
      defaultPolicies,
  ) {
    this.policies =
      new Map(
        policies.map(
          (policy) => [
            policy.id,
            policy,
          ],
        ),
      );
  }

  get(
    policyId: string,
  ): Policy | null {
    return (
      this.policies.get(
        String(policyId || "")
          .trim(),
      ) || null
    );
  }

  list(): PolicySummary[] {
    return Array.from(
      this.policies.values(),
    ).map(
      (policy) => ({
        id: policy.id,
        defaultDecision:
          policy.defaultDecision,
        ruleCount:
          policy.rules.length,
      }),
    );
  }
}