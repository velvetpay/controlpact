import test from "node:test";
import assert from "node:assert/strict";

process.env.CONTROLPACT_STORAGE =
  "memory";

process.env.CONTROLPACT_REQUIRE_API_KEYS =
  "true";

process.env.CONTROLPACT_RECEIPT_SECRET =
  "controlpact-scoped-key-test-secret";

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
  "scoped API key derives agent and organisation policy authority",
  async () => {
    const app =
      await buildApp();

    const registrationResponse =
      await app.inject({
        method: "POST",
        url: "/v1/auth/register",
        payload: {
          email:
            "scoped-owner@controlpact.test",
          password:
            "ControlPact-Scoped-2026!",
          organizationName:
            "Scoped Key Organisation",
        },
      });

    assert.equal(
      registrationResponse.statusCode,
      201,
    );

    const registration =
      registrationResponse.json();

    const environmentResponse =
      await app.inject({
        method: "POST",
        url: "/v1/environments",
        headers:
          authHeaders(
            registration.accessToken,
          ),
        payload: {
          name:
            "Production Deployment",
          category:
            "SOFTWARE_DEVOPS",
          mode:
            "TEST",
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
            registration.accessToken,
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
            registration.accessToken,
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
            registration.accessToken,
          ),
      });

    assert.equal(
      publishResponse.statusCode,
      200,
    );

    const agentResponse =
      await app.inject({
        method: "POST",
        url: "/v1/agents",
        headers:
          authHeaders(
            registration.accessToken,
          ),
        payload: {
          environmentId:
            environment.id,
          name:
            "Deployment Agent",
          externalAgentId:
            "deployment-agent",
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
            registration.accessToken,
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
        url: "/v1/api-keys",
        headers:
          authHeaders(
            registration.accessToken,
          ),
        payload: {
          name:
            "Production Deployment Key",
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
      201,
    );

    const keyBody =
      keyResponse.json();

    assert.equal(
      keyBody.apiKey.environmentId,
      environment.id,
    );

    assert.equal(
      keyBody.apiKey.agentId,
      agent.id,
    );

    assert.equal(
      keyBody.apiKey.policyId,
      policy.id,
    );

    assert.deepEqual(
      keyBody.apiKey.scopes,
      [
        "decisions:execute",
      ],
    );

    const decisionResponse =
      await app.inject({
        method: "POST",
        url: "/v1/decisions",
        headers: {
          authorization:
            `Bearer ${keyBody.secret}`,
        },
        payload: {
          policyId:
            "finance-policy",
          referenceId:
            "release-v9.1.0",
          request: {
            agentId:
              "forged-agent",
            action:
              "deploy",
            resource:
              "service:payments-api",
            context: {
              environment:
                "production",
              testsPassed:
                false,
            },
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
      decision.result.policyId,
      policy.id,
    );

    assert.equal(
      decision.receipt.payload.agentId,
      "deployment-agent",
    );

    assert.notEqual(
      decision.receipt.payload.agentId,
      "forged-agent",
    );

    assert.notEqual(
      decision.result.policyId,
      "finance-policy",
    );

    await app.close();
  },
);