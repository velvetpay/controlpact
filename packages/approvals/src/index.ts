export type ApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type ApprovalRequest = {
  id: string;
  receiptId: string;
  agentId: string;
  action: string;
  status: ApprovalStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  reason?: string;
};

export type CreateApprovalInput = {
  id: string;
  receiptId: string;
  agentId: string;
  action: string;
  requestedAt?: string;
};

export const createApprovalRequest = (
  input: CreateApprovalInput,
): ApprovalRequest => {
  if (
    !input.id ||
    !input.receiptId ||
    !input.agentId ||
    !input.action
  ) {
    throw new Error(
      "Approval id, receiptId, agentId and action are required.",
    );
  }

  return {
    id: input.id,
    receiptId: input.receiptId,
    agentId: input.agentId,
    action: input.action,
    status: "PENDING",
    requestedAt:
      input.requestedAt ||
      new Date().toISOString(),
  };
};

const decideApproval = (
  approval: ApprovalRequest,
  status: "APPROVED" | "REJECTED",
  decidedBy: string,
  reason?: string,
  decidedAt?: string,
): ApprovalRequest => {
  if (
    approval.status !== "PENDING"
  ) {
    throw new Error(
      "Approval has already been decided.",
    );
  }

  if (!decidedBy) {
    throw new Error(
      "decidedBy is required.",
    );
  }

  return {
    ...approval,
    status,
    decidedBy,
    decidedAt:
      decidedAt ||
      new Date().toISOString(),
    reason:
      reason?.trim() || undefined,
  };
};

export const approveRequest = (
  approval: ApprovalRequest,
  decidedBy: string,
  reason?: string,
  decidedAt?: string,
): ApprovalRequest =>
  decideApproval(
    approval,
    "APPROVED",
    decidedBy,
    reason,
    decidedAt,
  );

export const rejectRequest = (
  approval: ApprovalRequest,
  decidedBy: string,
  reason?: string,
  decidedAt?: string,
): ApprovalRequest =>
  decideApproval(
    approval,
    "REJECTED",
    decidedBy,
    reason,
    decidedAt,
  );