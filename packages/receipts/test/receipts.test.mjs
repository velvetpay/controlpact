import test from "node:test";
import assert from "node:assert/strict";

import {
  signDecisionReceipt,
  verifyDecisionReceipt,
} from "../dist/index.js";

const secret =
  "controlpact-test-secret";

const payload = {
  receiptId: "receipt-001",
  agentId: "finance-agent",
  action: "refundCustomer",
  decision: "APPROVE",
  policyId: "finance-policy",
  referenceId: "REFUND-750-001",
  resource: "customer:CUST-001",
  matchedRuleIds: [
    "approve-large-refund"
  ],
  issuedAt:
    "2026-08-19T08:00:00.000Z"
};

test(
  "signs a decision receipt",
  () => {
    const receipt =
      signDecisionReceipt(
        payload,
        secret
      );

    assert.equal(
      receipt.signature.length,
      64
    );
  }
);

test(
  "verifies an unchanged receipt",
  () => {
    const receipt =
      signDecisionReceipt(
        payload,
        secret
      );

    assert.equal(
      verifyDecisionReceipt(
        receipt,
        secret
      ),
      true
    );
  }
);

test(
  "rejects a tampered decision",
  () => {
    const receipt =
      signDecisionReceipt(
        payload,
        secret
      );

    const tampered = {
      ...receipt,
      payload: {
        ...receipt.payload,
        decision: "ALLOW"
      }
    };

    assert.equal(
      verifyDecisionReceipt(
        tampered,
        secret
      ),
      false
    );
  }
);

test(
  "rejects the wrong secret",
  () => {
    const receipt =
      signDecisionReceipt(
        payload,
        secret
      );

    assert.equal(
      verifyDecisionReceipt(
        receipt,
        "wrong-secret"
      ),
      false
    );
  }
);

test(
  "rejects a tampered reference",
  () => {
    const receipt =
      signDecisionReceipt(
        payload,
        secret
      );

    const tampered = {
      ...receipt,
      payload: {
        ...receipt.payload,
        referenceId:
          "REFUND-750-999"
      }
    };

    assert.equal(
      verifyDecisionReceipt(
        tampered,
        secret
      ),
      false
    );
  }
);

test(
  "rejects a tampered resource",
  () => {
    const receipt =
      signDecisionReceipt(
        payload,
        secret
      );

    const tampered = {
      ...receipt,
      payload: {
        ...receipt.payload,
        resource:
          "customer:CUST-999"
      }
    };

    assert.equal(
      verifyDecisionReceipt(
        tampered,
        secret
      ),
      false
    );
  }
);
