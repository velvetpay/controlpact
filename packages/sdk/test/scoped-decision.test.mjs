import test from "node:test";
import assert from "node:assert/strict";

import {
  ControlPactClient,
} from "../dist/index.js";

test(
  "scoped decision can omit caller agentId and policyId",
  async () => {
    let sentBody;

    const client =
      new ControlPactClient({
        baseUrl:
          "https://controlpact.test",
        apiKey:
          "cpk_scoped_test_key",
        fetch:
          async (
            _url,
            options,
          ) => {
            sentBody =
              JSON.parse(
                String(
                  options?.body ||
                  "{}",
                ),
              );

            return new Response(
              JSON.stringify({
                success: true,
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
      request: {
        action:
          "deploy",
        context: {
          environment:
            "production",
        },
      },
    });

    assert.equal(
      sentBody.request.action,
      "deploy",
    );

    assert.equal(
      "agentId" in
        sentBody.request,
      false,
    );

    assert.equal(
      "policyId" in sentBody,
      false,
    );
  },
);