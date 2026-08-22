import type {
  Policy,
} from "@controlpact/policy-engine";

export type PolicyTemplateCategory =
  | "SOFTWARE_DEVOPS"
  | "FINANCE_PAYMENTS"
  | "DATA_SECURITY"
  | "CUSTOMER_OPERATIONS"
  | "COMMUNICATIONS"
  | "IT_ADMINISTRATION"
  | "CUSTOM";

export type PolicyTemplate = {
  id: string;
  category: PolicyTemplateCategory;
  name: string;
  description: string;
  policy: Policy;
};

export type PolicySummary = {
  id: string;
  name?: string;
  defaultDecision: Policy["defaultDecision"];
  ruleCount: number;
  version?: number;
  status?: Policy["status"];
  templateId?: string;
};

export const policyTemplates: PolicyTemplate[] = [
  {
    id: "software-devops",
    category: "SOFTWARE_DEVOPS",
    name: "Software & DevOps",
    description:
      "Govern deployments, infrastructure changes, database operations and security-sensitive engineering actions.",
    policy: {
      id: "software-devops-template",
      name: "Software & DevOps",
      templateId: "software-devops",
      version: 1,
      status: "DRAFT",
      defaultDecision: "BLOCK",
      rules: [
        {
          id: "allow-non-production-deploy",
          description:
            "Allow deployments outside production.",
          decision: "ALLOW",
          actions: ["deploy"],
          conditions: [
            {
              field: "context.environment",
              operator: "notIn",
              value: ["production", "prod"],
            },
          ],
        },
        {
          id:
            "block-production-deploy-with-failed-tests",
          description:
            "Block production deployment when tests have not passed.",
          decision: "BLOCK",
          actions: [
            "deploy",
            "deployProduction",
          ],
          conditions: [
            {
              field: "context.environment",
              operator: "in",
              value: ["production", "prod"],
            },
            {
              field: "context.testsPassed",
              operator: "eq",
              value: false,
            },
          ],
        },
        {
          id: "approve-production-deploy",
          description:
            "Require engineering approval for production deployment.",
          decision: "APPROVE",
          actions: [
            "deploy",
            "deployProduction",
          ],
          conditions: [
            {
              field: "context.environment",
              operator: "in",
              value: ["production", "prod"],
            },
            {
              field: "context.testsPassed",
              operator: "eq",
              value: true,
            },
          ],
          requiredApproverRoles: [
            "APPROVER",
          ],
        },
        {
          id:
            "block-production-data-destruction",
          description:
            "Block destructive production database operations.",
          decision: "BLOCK",
          actions: [
            "dropDatabase",
            "deleteProductionDatabase",
          ],
        },
      ],
    },
  },
  {
    id: "finance-payments",
    category: "FINANCE_PAYMENTS",
    name: "Finance & Payments",
    description:
      "Govern payments, refunds, transfers and high-risk beneficiary changes.",
    policy: {
      id: "finance-payments-template",
      name: "Finance & Payments",
      templateId: "finance-payments",
      version: 1,
      status: "DRAFT",
      defaultDecision: "BLOCK",
      rules: [
        {
          id: "allow-routine-payment",
          decision: "ALLOW",
          actions: [
            "transferFunds",
            "refundCustomer",
          ],
          maxAmount: 499.99,
        },
        {
          id: "approve-medium-payment",
          decision: "APPROVE",
          actions: [
            "transferFunds",
            "refundCustomer",
          ],
          minAmount: 500,
          maxAmount: 4999.99,
          requiredApproverRoles: [
            "APPROVER",
          ],
        },
        {
          id: "approve-large-payment",
          decision: "APPROVE",
          actions: [
            "transferFunds",
            "refundCustomer",
          ],
          minAmount: 5000,
          requiredApproverRoles: [
            "ADMIN",
            "OWNER",
          ],
        },
        {
          id:
            "block-autonomous-beneficiary-change",
          decision: "BLOCK",
          actions: [
            "changeBeneficiary",
            "changeBankDetails",
          ],
        },
      ],
    },
  },
  {
    id: "data-security",
    category: "DATA_SECURITY",
    name: "Data & Security",
    description:
      "Govern exports, deletion, sensitive-data access and security control changes.",
    policy: {
      id: "data-security-template",
      name: "Data & Security",
      templateId: "data-security",
      version: 1,
      status: "DRAFT",
      defaultDecision: "BLOCK",
      rules: [
        {
          id: "approve-confidential-export",
          decision: "APPROVE",
          actions: [
            "exportData",
            "exportCustomerData",
          ],
          conditions: [
            {
              field:
                "context.classification",
              operator: "in",
              value: [
                "confidential",
                "restricted",
              ],
            },
          ],
          requiredApproverRoles: [
            "APPROVER",
          ],
        },
        {
          id:
            "block-security-control-disable",
          decision: "BLOCK",
          actions: [
            "disableSecurityControl",
            "disableMfa",
          ],
        },
      ],
    },
  },
  {
    id: "customer-operations",
    category: "CUSTOMER_OPERATIONS",
    name: "Customer Operations",
    description:
      "Govern account changes, credits, cancellations and destructive customer-record actions.",
    policy: {
      id:
        "customer-operations-template",
      name: "Customer Operations",
      templateId:
        "customer-operations",
      version: 1,
      status: "DRAFT",
      defaultDecision: "BLOCK",
      rules: [
        {
          id:
            "allow-routine-crm-update",
          decision: "ALLOW",
          actions: [
            "updateCRM",
            "updateCustomerRecord",
          ],
        },
        {
          id:
            "approve-account-closure",
          decision: "APPROVE",
          actions: [
            "closeAccount",
            "cancelCustomerAccount",
          ],
          requiredApproverRoles: [
            "APPROVER",
          ],
        },
        {
          id:
            "block-account-deletion",
          decision: "BLOCK",
          actions: [
            "deleteAccount",
            "deleteCustomerRecord",
          ],
        },
      ],
    },
  },
  {
    id: "communications",
    category: "COMMUNICATIONS",
    name: "Communications",
    description:
      "Govern mass messaging, publishing and transmission of sensitive information.",
    policy: {
      id: "communications-template",
      name: "Communications",
      templateId: "communications",
      version: 1,
      status: "DRAFT",
      defaultDecision: "BLOCK",
      rules: [
        {
          id: "allow-draft-content",
          decision: "ALLOW",
          actions: ["createDraft"],
        },
        {
          id: "approve-mass-send",
          decision: "APPROVE",
          actions: [
            "sendCampaign",
            "massEmail",
            "publishPublicContent",
          ],
          requiredApproverRoles: [
            "APPROVER",
          ],
        },
        {
          id:
            "block-secret-transmission",
          decision: "BLOCK",
          actions: [
            "sendSecret",
            "publishCredential",
          ],
        },
      ],
    },
  },
  {
    id: "it-administration",
    category: "IT_ADMINISTRATION",
    name: "IT Administration",
    description:
      "Govern users, permissions, credentials and sensitive system configuration.",
    policy: {
      id:
        "it-administration-template",
      name: "IT Administration",
      templateId:
        "it-administration",
      version: 1,
      status: "DRAFT",
      defaultDecision: "BLOCK",
      rules: [
        {
          id:
            "allow-standard-user-provisioning",
          decision: "ALLOW",
          actions: [
            "createStandardUser",
          ],
        },
        {
          id:
            "approve-privilege-change",
          decision: "APPROVE",
          actions: [
            "grantAdmin",
            "changePermissions",
            "rotateProductionCredential",
          ],
          requiredApproverRoles: [
            "ADMIN",
          ],
        },
        {
          id:
            "block-agent-self-elevation",
          decision: "BLOCK",
          actions: [
            "grantSelfAdmin",
            "disableControlPact",
          ],
        },
      ],
    },
  },
  {
    id: "custom",
    category: "CUSTOM",
    name: "Blank / Custom",
    description:
      "Start with a deny-by-default policy and define organisation-specific actions and rules.",
    policy: {
      id: "custom-template",
      name: "Custom Policy",
      templateId: "custom",
      version: 1,
      status: "DRAFT",
      defaultDecision: "BLOCK",
      rules: [],
    },
  },
];

const clonePolicy = (
  policy: Policy,
): Policy =>
  JSON.parse(
    JSON.stringify(policy),
  ) as Policy;

export const defaultPolicies: Policy[] = [
  {
    id: "finance-policy",
    name: "Finance Policy",
    version: 1,
    status: "ACTIVE",
    defaultDecision: "BLOCK",
    rules: [
      {
        id: "allow-normal-refund",
        description:
          "Allow routine customer refunds below the approval threshold.",
        decision: "ALLOW",
        actions: ["refundCustomer"],
      },
      {
        id: "approve-large-refund",
        description:
          "Require human approval for refunds of 500 or more.",
        decision: "APPROVE",
        actions: ["refundCustomer"],
        minAmount: 500,
        requiredApproverRoles: [
          "APPROVER",
        ],
      },
    ],
  },
  {
    id: "production-policy",
    name: "Production Policy",
    version: 1,
    status: "ACTIVE",
    defaultDecision: "BLOCK",
    rules: [
      {
        id: "block-account-deletion",
        description:
          "Agents may not delete customer accounts.",
        decision: "BLOCK",
        actions: ["deleteAccount"],
      },
      {
        id:
          "approve-production-deploy",
        description:
          "Production deployment requires human approval.",
        decision: "APPROVE",
        actions: [
          "deployProduction",
        ],
        requiredApproverRoles: [
          "APPROVER",
        ],
      },
    ],
  },
  {
    id: "sales-policy",
    name: "Sales Policy",
    version: 1,
    status: "ACTIVE",
    defaultDecision: "BLOCK",
    rules: [
      {
        id: "allow-crm-update",
        description:
          "Allow the sales agent to update CRM records.",
        decision: "ALLOW",
        actions: ["updateCRM"],
        agentIds: ["sales-agent"],
      },
    ],
  },
];

export class PolicyRegistry {
  private readonly policies:
    Map<string, Policy>;

  private readonly templates:
    Map<string, PolicyTemplate>;

  constructor(
    policies: Policy[] =
      defaultPolicies,
    templates: PolicyTemplate[] =
      policyTemplates,
  ) {
    this.policies = new Map(
      policies.map(
        (policy) => [
          policy.id,
          clonePolicy(policy),
        ],
      ),
    );

    this.templates = new Map(
      templates.map(
        (template) => [
          template.id,
          {
            ...template,
            policy: clonePolicy(
              template.policy,
            ),
          },
        ],
      ),
    );
  }

  get(
    policyId: string,
  ): Policy | null {
    const policy = this.policies.get(
      String(policyId || "").trim(),
    );

    return policy
      ? clonePolicy(policy)
      : null;
  }

  list(): PolicySummary[] {
    return Array.from(
      this.policies.values(),
    ).map(
      (policy) => ({
        id: policy.id,
        name: policy.name,
        defaultDecision:
          policy.defaultDecision,
        ruleCount:
          policy.rules.length,
        version: policy.version,
        status: policy.status,
        templateId:
          policy.templateId,
      }),
    );
  }

  listTemplates():
    Array<
      Omit<
        PolicyTemplate,
        "policy"
      > & {
        ruleCount: number;
        defaultDecision:
          Policy["defaultDecision"];
      }
    > {
    return Array.from(
      this.templates.values(),
    ).map(
      (template) => ({
        id: template.id,
        category:
          template.category,
        name: template.name,
        description:
          template.description,
        ruleCount:
          template.policy.rules.length,
        defaultDecision:
          template.policy.defaultDecision,
      }),
    );
  }

  getTemplate(
    templateId: string,
  ): PolicyTemplate | null {
    const template =
      this.templates.get(
        String(templateId || "").trim(),
      );

    if (!template) {
      return null;
    }

    return {
      ...template,
      policy:
        clonePolicy(
          template.policy,
        ),
    };
  }

  cloneTemplate(
    templateId: string,
    policyId: string,
    name?: string,
  ): Policy | null {
    const template =
      this.getTemplate(templateId);

    if (!template) {
      return null;
    }

    const cleanPolicyId =
      String(policyId || "").trim();

    if (!cleanPolicyId) {
      return null;
    }

    return {
      ...clonePolicy(
        template.policy,
      ),
      id: cleanPolicyId,
      name:
        String(
          name || template.name,
        ).trim(),
      templateId:
        template.id,
      version: 1,
      status: "DRAFT",
    };
  }
}
