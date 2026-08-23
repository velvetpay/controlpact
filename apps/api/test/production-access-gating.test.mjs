import test from "node:test";
import assert from "node:assert/strict";

process.env.CONTROLPACT_STORAGE =
  "memory";

process.env.CONTROLPACT_REQUIRE_API_KEYS =
  "true";

process.env.CONTROLPACT_RECEIPT_SECRET =
  "controlpact-production-gating-test-secret";

const {
  buildApp,
} =
  await import(
    "../dist/app.js"
  );

const authHeaders = (
  token,
) => ({
  authorization:
    `Bearer ${token}`,
});

test(
  "sandbox organisation cannot create a production execution key",
  async () => {
    const app =
      buildApp();

    const registration =
      await app.inject({
        method: "POST",
        url:
          "/v1/auth/register",
        payload: {
          email:
            "sandbox-gating-owner@controlpact.test",
          password:
            "ControlPact-Gating-2026!",
          organizationName:
            "Sandbox Gating Organisation",
        },
      });

    assert.equal(
      registration.statusCode,
      201,
    );

    const session =
      registration.json();

    const environmentResponse =
      await app.inject({
        method: "POST",
        url:
          "/v1/environments",
        headers:
          authHeaders(
            session.accessToken,
          ),
        payload: {
          name:
            "Production Deployment",
          category:
            "SOFTWARE_DEVOPS",
          mode:
            "PRODUCTION",
        },
      });

    assert.equal(
      environmentResponse.statusCode,
      201,
    );

    const environment =
      environmentResponse
        .json()
        .environment;

    const activateEnvironment =
      await app.inject({
        method: "PATCH",
        url:
          `/v1/environments/${environment.id}`,
        headers:
          authHeaders(
            session.accessToken,
          ),
        payload: {
          status:
            "ACTIVE",
        },
      });

    assert.equal(
      activateEnvironment.statusCode,
      200,
    );

    const policyResponse =
      await app.inject({
        method: "POST",
        url:
          "/v1/organization-policies/from-template",
        headers:
          authHeaders(
            session.accessToken,
          ),
        payload: {
          templateId:
            "software-devops",
          environmentId:
            environment.id,
          name:
            "Production Release Policy",
        },
      });

    assert.equal(
      policyResponse.statusCode,
      201,
    );

    const policy =
      policyResponse
        .json()
        .policy;

    const publishResponse =
      await app.inject({
        method: "POST",
        url:
          `/v1/organization-policies/${policy.id}/publish`,
        headers:
          authHeaders(
            session.accessToken,
          ),
      });

    assert.equal(
      publishResponse.statusCode,
      200,
    );

    const agentResponse =
      await app.inject({
        method: "POST",
        url:
          "/v1/agents",
        headers:
          authHeaders(
            session.accessToken,
          ),
        payload: {
          environmentId:
            environment.id,
          name:
            "Production Deployment Agent",
          externalAgentId:
            "production-deployment-agent",
        },
      });

    assert.equal(
      agentResponse.statusCode,
      201,
    );

    const agent =
      agentResponse
        .json()
        .agent;

    const assignmentResponse =
      await app.inject({
        method: "POST",
        url:
          "/v1/agent-assignments",
        headers:
          authHeaders(
            session.accessToken,
          ),
        payload: {
          environmentId:
            environment.id,
          agentId:
            agent.id,
          policyId:
            policy.id,
          responsibleRole:
            "OWNER",
        },
      });

    assert.equal(
      assignmentResponse.statusCode,
      201,
    );

    const keyResponse =
      await app.inject({
        method: "POST",
        url:
          "/v1/api-keys",
        headers:
          authHeaders(
            session.accessToken,
          ),
        payload: {
          name:
            "Blocked Production Key",
          environmentId:
            environment.id,
          agentId:
            agent.id,
          policyId:
            policy.id,
          scopes: [
            "decisions:execute",
          ],
        },
      });

    assert.equal(
      keyResponse.statusCode,
      402,
    );

    const blockedKeyBody =
      keyResponse.json();

    assert.equal(
      blockedKeyBody.code,
      "PRODUCTION_ENTITLEMENT_REQUIRED",
    );

    assert.match(
      blockedKeyBody.message,
      /entitlement is required/i,
    );

    const billingStatus =
      await app.inject({
        method: "GET",
        url:
          "/v1/billing/status",
        headers:
          authHeaders(
            session.accessToken,
          ),
      });

    assert.equal(
      billingStatus.statusCode,
      200,
    );

    const billing =
      billingStatus.json();

    assert.equal(
      billing
        .entitlements
        .productionPlatformAccess,
      false,
    );

    assert.equal(
      billing
        .entitlements
        .standaloneProductionSdkAccess,
      false,
    );

    await app.close();
  },
);
