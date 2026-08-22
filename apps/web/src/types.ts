export type ControlEnvironment = {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category:
    | "SOFTWARE_DEVOPS"
    | "FINANCE_PAYMENTS"
    | "DATA_SECURITY"
    | "CUSTOMER_OPERATIONS"
    | "COMMUNICATIONS"
    | "IT_ADMINISTRATION"
    | "CUSTOM";
  mode: "TEST" | "PRODUCTION";
  status: "DRAFT" | "ACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
};

export type RegisteredAgent = {
  id: string;
  organizationId: string;
  environmentId: string;
  name: string;
  externalAgentId: string;
  description?: string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  createdAt: string;
  updatedAt: string;
};

export type PolicyTemplate = {
  id: string;
  name?: string;
  description?: string;
  category?: string;
};

export type OrganizationPolicy = {
  id: string;
  organizationId: string;
  environmentId?: string;
  name: string;
  description?: string;
  templateId?: string;
  version: number;
  status: "DRAFT" | "TEST" | "ACTIVE" | "RETIRED";
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type AgentAssignment = {
  id: string;
  organizationId: string;
  environmentId: string;
  agentId: string;
  policyId: string;
  responsibleUserId?: string;
  responsibleRole?: "OWNER" | "ADMIN" | "APPROVER" | "AUDITOR" | "VIEWER";
  createdAt: string;
  updatedAt: string;
};

export type TeamMember = {
  id: string;
  organizationId: string;
  userId?: string;
  email: string;
  displayName?: string;
  role: "OWNER" | "ADMIN" | "APPROVER" | "AUDITOR" | "VIEWER";
  status: "ACTIVE" | "INVITED" | "DISABLED";
  createdAt: string;
  updatedAt: string;
};

export type ApiKeyItem = {
  id: string;
  organizationId: string;
  name: string;
  keyPrefix: string;
  environmentId?: string;
  agentId?: string;
  policyId?: string;
  scopes?: string[];
  createdAt: string;
  revokedAt?: string;
  lastUsedAt?: string;
};

export type ControlPactDecision = {
  id: string;
  receiptId: string;
  receiptSignature?: string;
  receiptIssuedAt?: string;
  agentId: string;
  action: string;
  decision: "ALLOW" | "APPROVE" | "BLOCK";
  policyId: string;
  policyVersion?: number;
  referenceId: string;
  resource?: string;
  reason?: string;
  matchedRuleIds?: string[];
  requiredApproverRoles?: string[];
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  decidedAt?: string;
  decidedBy?: string;
  approvalReason?: string;
  createdAt: string;
};

export type ControlPactApproval = {
  id: string;
  receiptId: string;
  agentId: string;
  action: string;
  referenceId?: string;
  resource?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  reason?: string;
};
