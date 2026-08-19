import test from "node:test";
import assert from "node:assert/strict";

import {
  createApprovalRequest,
  approveRequest,
  rejectRequest,
} from "../dist/index.js";

const createPending = () =>
  createApprovalRequest({
    id: "approval-001",
    receiptId: "receipt-001",
    agentId: "finance-agent",
    action: "refundCustomer",
    requestedAt:
      "2026-08-19T09:00:00.000Z",
  });

test(
  "creates a pending approval",
  () => {
    const approval =
      createPending();

    assert.equal(
      approval.status,
      "PENDING",
    );
  },
);

test(
  "approves a pending request",
  () => {
    const result =
      approveRequest(
        createPending(),
        "finance-manager",
        "Refund verified",
        "2026-08-19T09:05:00.000Z",
      );

    assert.equal(
      result.status,
      "APPROVED",
    );

    assert.equal(
      result.decidedBy,
      "finance-manager",
    );
  },
);

test(
  "rejects a pending request",
  () => {
    const result =
      rejectRequest(
        createPending(),
        "risk-manager",
        "Transaction not authorised",
      );

    assert.equal(
      result.status,
      "REJECTED",
    );
  },
);

test(
  "prevents an approval being decided twice",
  () => {
    const approved =
      approveRequest(
        createPending(),
        "finance-manager",
      );

    assert.throws(
      () =>
        rejectRequest(
          approved,
          "risk-manager",
        ),
      /already been decided/,
    );
  },
);