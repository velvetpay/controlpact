import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApp,
} from "../dist/app.js";

process.env
  .CONTROLPACT_RECEIPT_SECRET =
  "approval-api-test-secret";

const createApproval =
  async (app) => {
    const response =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        payload: {
          policyId:
            "finance-policy",

          request: {
            agentId:
              "finance-agent",

            action:
              "refundCustomer",

            amount: 750,
            currency: "GBP",
          },
        },
      });

    return response.json();
  };

test(
  "APPROVE decision creates pending approval",
  async () => {
    const app = buildApp();

    const body =
      await createApproval(
        app,
      );

    assert.equal(
      body.result.decision,
      "APPROVE",
    );

    assert.equal(
      body.approval.status,
      "PENDING",
    );

    await app.close();
  },
);

test(
  "lists pending approvals",
  async () => {
    const app = buildApp();

    await createApproval(app);

    const response =
      await app.inject({
        method: "GET",
        url: "/v1/approvals",
      });

    const body =
      response.json();

    assert.equal(
      body.approvals.length,
      1,
    );

    assert.equal(
      body.approvals[0]
        .status,
      "PENDING",
    );

    await app.close();
  },
);

test(
  "human can approve pending action",
  async () => {
    const app = buildApp();

    const created =
      await createApproval(
        app,
      );

    const response =
      await app.inject({
        method: "POST",
        url:
          `/v1/approvals/${created.approval.id}/approve`,
        payload: {
          decidedBy:
            "finance-manager",
          reason:
            "Refund verified",
        },
      });

    assert.equal(
      response
        .json()
        .approval
        .status,
      "APPROVED",
    );

    await app.close();
  },
);

test(
  "human can reject pending action",
  async () => {
    const app = buildApp();

    const created =
      await createApproval(
        app,
      );

    const response =
      await app.inject({
        method: "POST",
        url:
          `/v1/approvals/${created.approval.id}/reject`,
        payload: {
          decidedBy:
            "risk-manager",
          reason:
            "Not authorised",
        },
      });

    assert.equal(
      response
        .json()
        .approval
        .status,
      "REJECTED",
    );

    await app.close();
  },
);