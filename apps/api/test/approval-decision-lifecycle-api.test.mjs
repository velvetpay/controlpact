import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApp,
} from "../dist/app.js";

process.env
  .CONTROLPACT_RECEIPT_SECRET =
  "decision-lifecycle-test-secret";

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
  "approved request updates decision lifecycle",
  async () => {
    const app = buildApp();

    const created =
      await createApproval(app);

    await app.inject({
      method: "POST",
      url:
        `/v1/approvals/${created.approval.id}/approve`,
      payload: {
        decidedBy:
          "controlpact-admin",
        reason:
          "Refund verified",
      },
    });

    const history =
      (
        await app.inject({
          method: "GET",
          url: "/v1/decisions",
        })
      ).json();

    const decision =
      history.decisions[0];

    assert.equal(
      decision.decision,
      "APPROVE",
    );

    assert.equal(
      decision.approvalStatus,
      "APPROVED",
    );

    assert.equal(
      decision.decidedBy,
      "controlpact-admin",
    );

    assert.equal(
      decision.approvalReason,
      "Refund verified",
    );

    await app.close();
  },
);

test(
  "rejected request updates decision lifecycle",
  async () => {
    const app = buildApp();

    const created =
      await createApproval(app);

    await app.inject({
      method: "POST",
      url:
        `/v1/approvals/${created.approval.id}/reject`,
      payload: {
        decidedBy:
          "controlpact-admin",
        reason:
          "Refund not authorised",
      },
    });

    const history =
      (
        await app.inject({
          method: "GET",
          url: "/v1/decisions",
        })
      ).json();

    const decision =
      history.decisions[0];

    assert.equal(
      decision.decision,
      "APPROVE",
    );

    assert.equal(
      decision.approvalStatus,
      "REJECTED",
    );

    assert.equal(
      decision.decidedBy,
      "controlpact-admin",
    );

    assert.equal(
      decision.approvalReason,
      "Refund not authorised",
    );

    await app.close();
  },
);