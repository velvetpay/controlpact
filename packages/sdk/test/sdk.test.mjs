import test from "node:test";
import assert from "node:assert/strict";

import {
  ControlPactApiError,
  ControlPactClient,
} from "../dist/index.js";

const apiKey =
  "cpk_test_123456789";

test("requires base URL", () => {
  assert.throws(
    () =>
      new ControlPactClient({
        baseUrl: "",
        apiKey,
      }),
    /baseUrl is required/,
  );
});

test("requires API key", () => {
  assert.throws(
    () =>
      new ControlPactClient({
        baseUrl:
          "https://controlpact.test",
        apiKey: "",
      }),
    /apiKey is required/,
  );
});

test(
  "sends authenticated decision request",
  async () => {
    let authorization;

    const client =
      new ControlPactClient({
        baseUrl:
          "https://controlpact.test/",
        apiKey,
        fetch:
          async (
            _url,
            options,
          ) => {
            authorization =
              options.headers.Authorization;

            return new Response(
              JSON.stringify({
                success: true,
                result: {
                  decision: "BLOCK",
                  policyId:
                    "production-policy",
                  reason: "Blocked",
                  matchedRuleIds: [],
                },
                receipt: {
                  payload: {
                    receiptId: "r1",
                    agentId: "a1",
                    action:
                      "deleteAccount",
                    decision: "BLOCK",
                    policyId:
                      "production-policy",
                    referenceId: "x1",
                    matchedRuleIds: [],
                    issuedAt:
                      "2026-08-21T00:00:00.000Z",
                  },
                  signature: "sig",
                },
                approval: null,
              }),
              { status: 200 },
            );
          },
      });

    const result =
      await client.decide({
        policyId:
          "production-policy",
        request: {
          agentId: "a1",
          action: "deleteAccount",
        },
      });

    assert.equal(
      authorization,
      `Bearer ${apiKey}`,
    );

    assert.equal(
      result.result.decision,
      "BLOCK",
    );
  },
);

test(
  "preserves extra action fields",
  async () => {
    let sentBody;

    const client =
      new ControlPactClient({
        baseUrl:
          "https://controlpact.test",
        apiKey,
        fetch:
          async (
            _url,
            options,
          ) => {
            sentBody =
              JSON.parse(
                options.body,
              );

            return new Response(
              JSON.stringify({
                success: true,
                result: {
                  decision:
                    "APPROVE",
                  policyId:
                    "finance-policy",
                  reason:
                    "Human approval required.",
                  matchedRuleIds: [],
                },
                receipt: {
                  payload: {
                    receiptId: "r2",
                    agentId:
                      "finance-agent",
                    action:
                      "refundCustomer",
                    decision:
                      "APPROVE",
                    policyId:
                      "finance-policy",
                    referenceId:
                      "refund-001",
                    matchedRuleIds: [],
                    issuedAt:
                      "2026-08-21T00:00:00.000Z",
                  },
                  signature: "sig",
                },
                approval: {
                  id: "approval-1",
                },
              }),
              { status: 200 },
            );
          },
      });

    await client.decide({
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
    });

    assert.equal(
      sentBody.request.amount,
      750,
    );

    assert.equal(
      sentBody.request.currency,
      "GBP",
    );
  },
);

test(
  "throws typed API error",
  async () => {
    const client =
      new ControlPactClient({
        baseUrl:
          "https://controlpact.test",
        apiKey,
        fetch:
          async () =>
            new Response(
              JSON.stringify({
                success: false,
                message:
                  "Invalid key",
              }),
              { status: 401 },
            ),
      });

    await assert.rejects(
      () =>
        client.decide({
          policyId:
            "production-policy",
          request: {
            agentId: "a1",
            action: "deploy",
          },
        }),
      (error) => {
        assert.equal(
          error instanceof
            ControlPactApiError,
          true,
        );

        assert.equal(
          error.status,
          401,
        );

        return true;
      },
    );
  },
);