import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApp,
} from "../dist/app.js";

import {
  verifyDecisionReceipt,
} from "@controlpact/receipts";

const secret =
  "controlpact-api-test-secret";

process.env
  .CONTROLPACT_RECEIPT_SECRET =
  secret;

const policy = {
  id: "finance-policy",
  defaultDecision: "BLOCK",
  rules: [
    {
      id: "allow-refund",
      decision: "ALLOW",
      actions: ["refundCustomer"],
    },
    {
      id: "approve-large-refund",
      decision: "APPROVE",
      actions: ["refundCustomer"],
      minAmount: 500,
    },
    {
      id: "block-delete",
      decision: "BLOCK",
      actions: ["deleteAccount"],
    },
  ],
};

test(
  "health endpoint works",
  async () => {
    const app = buildApp();

    const response =
      await app.inject({
        method: "GET",
        url: "/health",
      });

    assert.equal(
      response.statusCode,
      200,
    );

    assert.equal(
      response.json().success,
      true,
    );

    await app.close();
  },
);

test(
  "ALLOW decision includes valid receipt",
  async () => {
    const app = buildApp();

    const response =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        payload: {
          request: {
            agentId:
              "finance-agent",
            action:
              "refundCustomer",
            amount: 100,
            currency: "GBP",
          },
          policy,
        },
      });

    const body =
      response.json();

    assert.equal(
      body.result.decision,
      "ALLOW",
    );

    assert.equal(
      verifyDecisionReceipt(
        body.receipt,
        secret,
      ),
      true,
    );

    await app.close();
  },
);

test(
  "APPROVE decision includes valid receipt",
  async () => {
    const app = buildApp();

    const response =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        payload: {
          request: {
            agentId:
              "finance-agent",
            action:
              "refundCustomer",
            amount: 750,
            currency: "GBP",
          },
          policy,
        },
      });

    const body =
      response.json();

    assert.equal(
      body.result.decision,
      "APPROVE",
    );

    assert.equal(
      verifyDecisionReceipt(
        body.receipt,
        secret,
      ),
      true,
    );

    await app.close();
  },
);

test(
  "BLOCK decision includes valid receipt",
  async () => {
    const app = buildApp();

    const response =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        payload: {
          request: {
            agentId:
              "support-agent",
            action:
              "deleteAccount",
          },
          policy,
        },
      });

    const body =
      response.json();

    assert.equal(
      body.result.decision,
      "BLOCK",
    );

    assert.equal(
      verifyDecisionReceipt(
        body.receipt,
        secret,
      ),
      true,
    );

    await app.close();
  },
);

test(
  "API refuses unsigned operation",
  async () => {
    const previous =
      process.env
        .CONTROLPACT_RECEIPT_SECRET;

    delete process.env
      .CONTROLPACT_RECEIPT_SECRET;

    const app = buildApp();

    const response =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        payload: {
          request: {
            agentId: "agent",
            action: "test",
          },
          policy,
        },
      });

    assert.equal(
      response.statusCode,
      500,
    );

    process.env
      .CONTROLPACT_RECEIPT_SECRET =
      previous;

    await app.close();
  },
);