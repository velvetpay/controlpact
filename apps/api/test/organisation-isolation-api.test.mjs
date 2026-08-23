import test from "node:test";
import assert from "node:assert/strict";

process.env.CONTROLPACT_STORAGE =
  "memory";

process.env.CONTROLPACT_REQUIRE_API_KEYS =
  "true";

process.env.CONTROLPACT_REQUIRE_HUMAN_APPROVAL_AUTH =
  "true";

process.env.CONTROLPACT_RECEIPT_SECRET =
  "controlpact-organisation-isolation-secret";

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

const createOwnerAndKey =
  async (
    app,
    email,
    organizationName,
  ) => {
    const register =
      await app.inject({
        method: "POST",
        url: "/v1/auth/register",
        payload: {
          email,
          password:
            "ControlPact-Isolation-2026!",
          organizationName,
        },
      });

    assert.equal(
      register.statusCode,
      201,
    );

    const owner =
      register.json();

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
            `${organizationName} Key`,
        },
      });

    assert.equal(
      keyResponse.statusCode,
      201,
    );

    return {
      owner,
      apiKey:
        keyResponse
          .json()
          .secret,
    };
  };

const createApprovalDecision =
  async (
    app,
    apiKey,
    agentId,
    referenceId,
  ) => {
    const response =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        headers:
          bearer(apiKey),
        payload: {
          policyId:
            "finance-policy",
          referenceId,
          request: {
            agentId,
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
      response.statusCode,
      200,
    );

    const body =
      response.json();

    assert.equal(
      body.result.decision,
      "APPROVE",
    );

    return body;
  };

test(
  "decision and approval management reads are isolated by organisation",
  async () => {
    const app =
      await buildApp();

    const orgA =
      await createOwnerAndKey(
        app,
        "owner-a@controlpact.test",
        "Organisation A",
      );

    const orgB =
      await createOwnerAndKey(
        app,
        "owner-b@controlpact.test",
        "Organisation B",
      );

    const decisionA =
      await createApprovalDecision(
        app,
        orgA.apiKey,
        "agent-a",
        "org-a-ref",
      );

    const decisionB =
      await createApprovalDecision(
        app,
        orgB.apiKey,
        "agent-b",
        "org-b-ref",
      );

    const unauthenticatedDecisions =
      await app.inject({
        method: "GET",
        url: "/v1/decisions",
      });

    assert.equal(
      unauthenticatedDecisions
        .statusCode,
      401,
    );

    const decisionsA =
      await app.inject({
        method: "GET",
        url: "/v1/decisions",
        headers:
          bearer(
            orgA.owner
              .accessToken,
          ),
      });

    assert.equal(
      decisionsA.statusCode,
      200,
    );

    const decisionRowsA =
      decisionsA
        .json()
        .decisions;

    assert.equal(
      decisionRowsA.length,
      1,
    );

    assert.equal(
      decisionRowsA[0]
        .receiptId,
      decisionA
        .receipt
        .payload
        .receiptId,
    );

    assert.notEqual(
      decisionRowsA[0]
        .receiptId,
      decisionB
        .receipt
        .payload
        .receiptId,
    );

    const approvalsA =
      await app.inject({
        method: "GET",
        url: "/v1/approvals",
        headers:
          bearer(
            orgA.owner
              .accessToken,
          ),
      });

    assert.equal(
      approvalsA.statusCode,
      200,
    );

    const approvalRowsA =
      approvalsA
        .json()
        .approvals;

    assert.equal(
      approvalRowsA.length,
      1,
    );

    assert.equal(
      approvalRowsA[0]
        .receiptId,
      decisionA
        .receipt
        .payload
        .receiptId,
    );

    assert.equal(
      approvalRowsA[0]
        .organizationId,
      orgA.owner
        .user
        .organizationId,
    );

    await app.close();
  },
);