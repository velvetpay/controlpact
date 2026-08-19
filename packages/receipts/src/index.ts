import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export type ReceiptDecision =
  | "ALLOW"
  | "APPROVE"
  | "BLOCK";

export type DecisionReceiptPayload = {
  receiptId: string;
  agentId: string;
  action: string;
  decision: ReceiptDecision;
  policyId: string;
  referenceId: string;
  resource?: string;
  matchedRuleIds: string[];
  issuedAt: string;
};

export type SignedDecisionReceipt = {
  payload: DecisionReceiptPayload;
  signature: string;
};

const canonicalize = (
  payload: DecisionReceiptPayload,
): string =>
  JSON.stringify({
    receiptId: payload.receiptId,
    agentId: payload.agentId,
    action: payload.action,
    decision: payload.decision,
    policyId: payload.policyId,
    referenceId:
      payload.referenceId,
    resource:
      payload.resource ?? null,
    matchedRuleIds:
      [...payload.matchedRuleIds].sort(),
    issuedAt: payload.issuedAt,
  });

export const signDecisionReceipt = (
  payload: DecisionReceiptPayload,
  secret: string,
): SignedDecisionReceipt => {
  if (!secret) {
    throw new Error(
      "ControlPact receipt secret is required.",
    );
  }

  const signature =
    createHmac("sha256", secret)
      .update(canonicalize(payload))
      .digest("hex");

  return {
    payload,
    signature,
  };
};

export const verifyDecisionReceipt = (
  receipt: SignedDecisionReceipt,
  secret: string,
): boolean => {
  if (!secret) {
    return false;
  }

  const expected =
    createHmac("sha256", secret)
      .update(
        canonicalize(receipt.payload),
      )
      .digest("hex");

  const actualBuffer =
    Buffer.from(
      receipt.signature,
      "hex",
    );

  const expectedBuffer =
    Buffer.from(
      expected,
      "hex",
    );

  if (
    actualBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    actualBuffer,
    expectedBuffer,
  );
};