import test from "node:test";
import assert from "node:assert/strict";

process.env.CONTROLPACT_STORAGE =
  "memory";

process.env.CONTROLPACT_REQUIRE_API_KEYS =
  "true";

process.env.CONTROLPACT_REQUIRE_HUMAN_APPROVAL_AUTH =
  "true";

process.env.CONTROLPACT_RECEIPT_SECRET =
  "controlpact-approval-auth-test-secret";

const {
  buildApp,
} =
  await import(
    "../dist/app.js"
  );

const bearer = (
  token,
) => ({
  authorization:
    `Bearer ${token}`,
});

test(
  "human approval is authenticated and reviewer identity is server-derived",
  async () => {
    const app =
      await buildApp();

    const ownerResponse =
      await app.inject({
        method: "POST",
        url: "/v1/auth/register",
        payload: {
          email:
            "approval-owner@controlpact.test",
          password:
            "ControlPact-Approval-2026!",
          organizationName:
            "Secure Approval Org",
        },
      });

    assert.equal(
      ownerResponse.statusCode,
      201,
    );

    const owner =
      ownerResponse.json();

    const keyResponse =
      await app.inject({
        method: "POST",
        url: "/v1/api-keys",
        headers:
          bearer(
            owner.accessToken,
          ),
        payload: {
          name:
            "Approval Agent Key",
        },
      });

    assert.equal(
      keyResponse.statusCode,
      201,
    );

    const decisionResponse =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        headers:
          bearer(
            keyResponse
              .json()
              .secret,
          ),
        payload: {
          policyId:
            "finance-policy",
          request: {
            agentId:
              "refund-agent",
            action:
              "refundCustomer",
            amount:
              750,
            currency:
              "GBP",
          },
        },
      });

    assert.equal(
      decisionResponse.statusCode,
      200,
    );

    const decision =
      decisionResponse.json();

    assert.equal(
      decision.result.decision,
      "APPROVE",
    );

    const approvalId =
      decision.approval.id;

    const unauthenticated =
      await app.inject({
        method: "POST",
        url:
          `/v1/approvals/${approvalId}/approve`,
        payload: {
          decidedBy:
            "spoofed-reviewer",
        },
      });

    assert.equal(
      unauthenticated.statusCode,
      401,
    );

    const otherOwnerResponse =
      await app.inject({
        method: "POST",
        url: "/v1/auth/register",
        payload: {
          email:
            "other-owner@controlpact.test",
          password:
            "ControlPact-Other-2026!",
          organizationName:
            "Other Organisation",
        },
      });

    assert.equal(
      otherOwnerResponse.statusCode,
      201,
    );

    const crossOrganisation =
      await app.inject({
        method: "POST",
        url:
          `/v1/approvals/${approvalId}/approve`,
        headers:
          bearer(
            otherOwnerResponse
              .json()
              .accessToken,
          ),
        payload: {
          decidedBy:
            "spoofed-reviewer",
        },
      });

    assert.equal(
      crossOrganisation.statusCode,
      404,
    );

    const approved =
      await app.inject({
        method: "POST",
        url:
          `/v1/approvals/${approvalId}/approve`,
        headers:
          bearer(
            owner.accessToken,
          ),
        payload: {
          decidedBy:
            "spoofed-reviewer",
          reason:
            "Reviewed by owner.",
        },
      });

    assert.equal(
      approved.statusCode,
      200,
    );

    const approval =
      approved.json().approval;

    assert.equal(
      approval.status,
      "APPROVED",
    );

    assert.equal(
      approval.decidedBy,
      "Secure Approval Org Owner",
    );

    assert.notEqual(
      approval.decidedBy,
      "spoofed-reviewer",
    );

    await app.close();
  },
);