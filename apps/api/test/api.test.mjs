import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApp,
} from "../dist/app.js";

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
    }
  ]
};

test("health endpoint works", async () => {
  const app = buildApp();

  const response =
    await app.inject({
      method: "GET",
      url: "/health",
    });

  assert.equal(
    response.statusCode,
    200
  );

  assert.equal(
    response.json().success,
    true
  );

  await app.close();
});

test("API returns ALLOW", async () => {
  const app = buildApp();

  const response =
    await app.inject({
      method: "POST",
      url: "/v1/decisions",
      payload: {
        request: {
          agentId: "finance-agent",
          action: "refundCustomer",
          amount: 100,
          currency: "GBP"
        },
        policy
      }
    });

  assert.equal(
    response.json().result.decision,
    "ALLOW"
  );

  await app.close();
});

test("API returns APPROVE", async () => {
  const app = buildApp();

  const response =
    await app.inject({
      method: "POST",
      url: "/v1/decisions",
      payload: {
        request: {
          agentId: "finance-agent",
          action: "refundCustomer",
          amount: 750,
          currency: "GBP"
        },
        policy
      }
    });

  assert.equal(
    response.json().result.decision,
    "APPROVE"
  );

  await app.close();
});

test("API returns BLOCK", async () => {
  const app = buildApp();

  const response =
    await app.inject({
      method: "POST",
      url: "/v1/decisions",
      payload: {
        request: {
          agentId: "support-agent",
          action: "deleteAccount"
        },
        policy
      }
    });

  assert.equal(
    response.json().result.decision,
    "BLOCK"
  );

  await app.close();
});