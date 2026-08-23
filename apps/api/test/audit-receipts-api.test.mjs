import test from "node:test";
import assert from "node:assert/strict";

process.env.CONTROLPACT_STORAGE =
  "memory";

process.env.CONTROLPACT_REQUIRE_API_KEYS =
  "true";

process.env.CONTROLPACT_RECEIPT_SECRET =
  "controlpact-audit-receipt-test-secret";

const {
  buildApp,
} =
  await import(
    "../dist/app.js"
  );

test(
  "persists and verifies signed audit receipt",
  async () => {
    const app =
      await buildApp();

    const registrationResponse =
      await app.inject({
        method: "POST",
        url: "/v1/auth/register",
        payload: {
          email:
            "audit-owner@controlpact.test",
          password:
            "ControlPact-Audit-Test-2026!",
          organizationName:
            "Audit Test Organisation",
        },
      });

    assert.equal(
      registrationResponse.statusCode,
      201,
    );

    const registration =
      registrationResponse.json();

    const keyResponse =
      await app.inject({
        method: "POST",
        url: "/v1/api-keys",
        headers: {
          authorization:
            `Bearer ${registration.accessToken}`,
        },
        payload: {
          name: "Audit Agent",
        },
      });

    assert.equal(
      keyResponse.statusCode,
      201,
    );

    const key =
      keyResponse.json();

    const decisionResponse =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        headers: {
          authorization:
            `Bearer ${key.secret}`,
        },
        payload: {
          policyId:
            "sales-policy",
          referenceId:
            "AUDIT-001",
          request: {
            agentId:
              "audit-agent",
            action:
              "updateCRM",
            resource:
              "customer:AUDIT-001",
          },
        },
      });

    assert.equal(
      decisionResponse.statusCode,
      200,
    );

    const receiptId =
      decisionResponse
        .json()
        .receipt
        .payload
        .receiptId;

    const history =
      await app.inject({
        method: "GET",
        url: "/v1/decisions",
      });

    assert.equal(
      history.statusCode,
      200,
    );

    const stored =
      history
        .json()
        .decisions
        .find(
          (item) =>
            item.receiptId ===
            receiptId,
        );

    assert.equal(
      typeof stored.receiptSignature,
      "string",
    );

    assert.equal(
      stored.receiptSignature.length,
      64,
    );

    const verification =
      await app.inject({
        method: "GET",
        url:
          `/v1/receipts/${receiptId}/verify`,
        headers: {
          authorization:
            `Bearer ${registration.accessToken}`,
        },
      });

    assert.equal(
      verification.statusCode,
      200,
    );

    assert.equal(
      verification.json().valid,
      true,
    );

    await app.close();
  },
);