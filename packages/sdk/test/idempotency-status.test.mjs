import test from "node:test";
import assert from "node:assert/strict";

import {
  ControlPactClient,
} from "../dist/index.js";

test(
  "SDK sends Idempotency-Key and fetches decision status",
  async () => {
    const calls = [];

    const client =
      new ControlPactClient({
        baseUrl:
          "https://controlpact.test",
        apiKey:
          "cpk_idempotency_test",
        fetch:
          async (
            url,
            options = {},
          ) => {
            calls.push({
              url:
                String(url),
              options,
            });

            if (
              String(url).endsWith(
                "/v1/decisions",
              )
            ) {
              return new Response(
                JSON.stringify({
                  success: true,
                  result: {
                    decision:
                      "ALLOW",
                    policyId:
                      "policy-1",
                    reason:
                      "Allowed",
                    matchedRuleIds:
                      [],
                  },
                  receipt: {
                    payload: {
                      receiptId:
                        "receipt-1",
                      agentId:
                        "agent-1",
                      action:
                        "deploy",
                      decision:
                        "ALLOW",
                      policyId:
                        "policy-1",
                      referenceId:
                        "ref-1",
                      matchedRuleIds:
                        [],
                      issuedAt:
                        new Date()
                          .toISOString(),
                    },
                    signature:
                      "signature",
                  },
                  approval:
                    null,
                }),
                {
                  status: 200,
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                },
              );
            }

            return new Response(
              JSON.stringify({
                success: true,
                decision: {
                  id:
                    "receipt-1",
                  receiptId:
                    "receipt-1",
                  agentId:
                    "agent-1",
                  action:
                    "deploy",
                  decision:
                    "ALLOW",
                  policyId:
                    "policy-1",
                  referenceId:
                    "ref-1",
                  reason:
                    "Allowed",
                  matchedRuleIds:
                    [],
                  createdAt:
                    new Date()
                      .toISOString(),
                },
                approval:
                  null,
              }),
              {
                status: 200,
                headers: {
                  "Content-Type":
                    "application/json",
                },
              },
            );
          },
      });

    await client.decide({
      idempotencyKey:
        "deploy-ref-1",
      request: {
        action:
          "deploy",
      },
    });

    const headers =
      calls[0]
        .options
        .headers;

    assert.equal(
      headers[
        "Idempotency-Key"
      ],
      "deploy-ref-1",
    );

    const status =
      await client
        .getDecision(
          "receipt-1",
        );

    assert.equal(
      status.decision.id,
      "receipt-1",
    );

    assert.equal(
      calls[1].url,
      "https://controlpact.test/v1/decisions/receipt-1",
    );
  },
);