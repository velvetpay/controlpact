import test from "node:test";
import assert from "node:assert/strict";

process.env.CONTROLPACT_STORAGE =
  "memory";

process.env.CONTROLPACT_REQUIRE_API_KEYS =
  "true";

process.env.CONTROLPACT_RECEIPT_SECRET =
  "controlpact-idempotency-test-secret";

const {
  buildApp,
} =
  await import(
    "../dist/app.js"
  );

const humanHeaders = (
  token,
) => ({
  authorization:
    `Bearer ${token}`,
});

test(
  "replays the same decision for the same Idempotency-Key and exposes decision status",
  async () => {
    const app =
      buildApp();

    const register =
      await app.inject({
        method: "POST",
        url: "/v1/auth/register",
        payload: {
          email:
            "idempotency-owner@controlpact.test",
          password:
            "ControlPact-Idempotency-2026!",
          organizationName:
            "Idempotency Organisation",
        },
      });

    assert.equal(
      register.statusCode,
      201,
    );

    const session =
      register.json();

    const keyResponse =
      await app.inject({
        method: "POST",
        url: "/v1/api-keys",
        headers:
          humanHeaders(
            session.accessToken,
          ),
        payload: {
          name:
            "Idempotency Test Key",
        },
      });

    assert.equal(
      keyResponse.statusCode,
      201,
    );

    const apiKey =
      keyResponse.json().secret;

    const payload = {
      policyId:
        "finance-policy",
      referenceId:
        "refund-order-1001",
      request: {
        agentId:
          "billing-agent",
        action:
          "refund",
        amount:
          50,
        currency:
          "USD",
      },
    };

    const first =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        headers: {
          authorization:
            `Bearer ${apiKey}`,
          "idempotency-key":
            "refund-order-1001",
        },
        payload,
      });

    assert.equal(
      first.statusCode,
      200,
    );

    const firstBody =
      first.json();

    const second =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        headers: {
          authorization:
            `Bearer ${apiKey}`,
          "idempotency-key":
            "refund-order-1001",
        },
        payload,
      });

    assert.equal(
      second.statusCode,
      200,
    );

    const secondBody =
      second.json();

    assert.equal(
      secondBody
        .receipt
        .payload
        .receiptId,
      firstBody
        .receipt
        .payload
        .receiptId,
    );

    assert.equal(
      secondBody.idempotentReplay,
      true,
    );

    const conflict =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        headers: {
          authorization:
            `Bearer ${apiKey}`,
          "idempotency-key":
            "refund-order-1001",
        },
        payload: {
          ...payload,
          request: {
            ...payload.request,
            amount:
              75,
          },
        },
      });

    assert.equal(
      conflict.statusCode,
      409,
    );

    const status =
      await app.inject({
        method: "GET",
        url:
          `/v1/decisions/${firstBody.receipt.payload.receiptId}`,
        headers: {
          authorization:
            `Bearer ${apiKey}`,
        },
      });

    assert.equal(
      status.statusCode,
      200,
    );

    const statusBody =
      status.json();

    assert.equal(
      statusBody.decision.id,
      firstBody
        .receipt
        .payload
        .receiptId,
    );

    assert.equal(
      statusBody
        .decision
        .referenceId,
      "refund-order-1001",
    );

    await app.close();
  },
);