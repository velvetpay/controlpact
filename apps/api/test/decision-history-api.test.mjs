import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApp,
} from "../dist/app.js";

process.env
  .CONTROLPACT_RECEIPT_SECRET =
  "decision-history-test-secret";

test(
  "decision history starts empty",
  async () => {
    const app = buildApp();

    const response =
      await app.inject({
        method: "GET",
        url: "/v1/decisions",
      });

    assert.equal(
      response.statusCode,
      200,
    );

    assert.deepEqual(
      response.json().decisions,
      [],
    );

    await app.close();
  },
);

test(
  "records a real policy decision",
  async () => {
    const app = buildApp();

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

    const response =
      await app.inject({
        method: "GET",
        url: "/v1/decisions",
      });

    const body =
      response.json();

    assert.equal(
      body.decisions.length,
      1,
    );

    assert.equal(
      body.decisions[0]
        .agentId,
      "finance-agent",
    );

    assert.equal(
      body.decisions[0]
        .action,
      "refundCustomer",
    );

    assert.equal(
      body.decisions[0]
        .decision,
      "ALLOW",
    );

    assert.equal(
      body.decisions[0]
        .policyId,
      "finance-policy",
    );

    assert.ok(
      body.decisions[0]
        .receiptId,
    );

    await app.close();
  },
);

test(
  "newest decisions appear first",
  async () => {
    const app = buildApp();

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

    const response =
      await app.inject({
        method: "GET",
        url: "/v1/decisions",
      });

    const body =
      response.json();

    assert.equal(
      body.decisions.length,
      2,
    );

    assert.equal(
      body.decisions[0]
        .action,
      "deleteAccount",
    );

    assert.equal(
      body.decisions[0]
        .decision,
      "BLOCK",
    );

    assert.equal(
      body.decisions[1]
        .decision,
      "ALLOW",
    );

    await app.close();
  },
);