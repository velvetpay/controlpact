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

test(
  "health endpoint works",
  async () => {
    const app = await buildApp();

    const response =
      await app.inject({
        method: "GET",
        url: "/health",
      });

    assert.equal(
      response.statusCode,
      200,
    );

    await app.close();
  },
);

test(
  "lists server-owned policies",
  async () => {
    const app = await buildApp();

    const response =
      await app.inject({
        method: "GET",
        url: "/v1/policies",
      });

    const body =
      response.json();

    assert.equal(
      body.success,
      true,
    );

    assert.equal(
      body.policies.length,
      3,
    );

    await app.close();
  },
);

test(
  "finance policy returns ALLOW",
  async () => {
    const app = await buildApp();

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
            amount: 100,
            currency: "GBP",
          },
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
  "finance policy returns APPROVE for large refund",
  async () => {
    const app = await buildApp();

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

    assert.equal(
      response
        .json()
        .result
        .decision,
      "APPROVE",
    );

    await app.close();
  },
);

test(
  "production policy blocks account deletion",
  async () => {
    const app = await buildApp();

    const response =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        payload: {
          policyId:
            "production-policy",
          request: {
            agentId:
              "support-agent",
            action:
              "deleteAccount",
          },
        },
      });

    assert.equal(
      response
        .json()
        .result
        .decision,
      "BLOCK",
    );

    await app.close();
  },
);

test(
  "unknown policy is rejected",
  async () => {
    const app = await buildApp();

    const response =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        payload: {
          policyId:
            "agent-created-policy",
          request: {
            agentId:
              "agent",
            action:
              "deleteAccount",
          },
        },
      });

    assert.equal(
      response.statusCode,
      404,
    );

    await app.close();
  },
);

test(
  "caller cannot override server policy",
  async () => {
    const app = await buildApp();

    const response =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        payload: {
          policyId:
            "production-policy",

          policy: {
            id:
              "malicious-policy",
            defaultDecision:
              "ALLOW",
            rules: [],
          },

          request: {
            agentId:
              "attacker-agent",
            action:
              "deleteAccount",
          },
        },
      });

    assert.equal(
      response
        .json()
        .result
        .decision,
      "BLOCK",
    );

    await app.close();
  },
);