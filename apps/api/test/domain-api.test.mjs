import test from "node:test";
import assert from "node:assert/strict";

process.env.CONTROLPACT_STORAGE =
  "memory";

process.env.CONTROLPACT_RECEIPT_SECRET =
  "controlpact-domain-test-secret";

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
  "organisation builds environment, policy, agent, team and assignment",
  async () => {
    const app =
      buildApp();

    const registerResponse =
      await app.inject({
        method: "POST",
        url: "/v1/auth/register",
        payload: {
          email:
            "owner@domain.test",
          password:
            "ControlPact-Domain-2026!",
          organizationName:
            "Domain Test Organisation",
        },
      });

    assert.equal(
      registerResponse.statusCode,
      201,
    );

    const registration =
      registerResponse.json();

    const templatesResponse =
      await app.inject({
        method: "GET",
        url:
          "/v1/policy-templates",
        headers:
          authHeaders(
            registration
              .accessToken,
          ),
      });

    assert.equal(
      templatesResponse.statusCode,
      200,
    );

    assert.equal(
      templatesResponse
        .json()
        .templates
        .length,
      7,
    );

    const environmentResponse =
      await app.inject({
        method: "POST",
        url:
          "/v1/environments",
        headers:
          authHeaders(
            registration
              .accessToken,
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

    const policyResponse =
      await app.inject({
        method: "POST",
        url:
          "/v1/organization-policies/from-template",
        headers:
          authHeaders(
            registration
              .accessToken,
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
            registration
              .accessToken,
          ),
      });

    assert.equal(
      publishResponse.statusCode,
      200,
    );

    assert.equal(
      publishResponse
        .json()
        .policy
        .status,
      "ACTIVE",
    );

    const agentResponse =
      await app.inject({
        method: "POST",
        url:
          "/v1/agents",
        headers:
          authHeaders(
            registration
              .accessToken,
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

    const teamResponse =
      await app.inject({
        method: "GET",
        url:
          "/v1/team-members",
        headers:
          authHeaders(
            registration
              .accessToken,
          ),
      });

    assert.equal(
      teamResponse.statusCode,
      200,
    );

    assert.equal(
      teamResponse
        .json()
        .members[0]
        .role,
      "OWNER",
    );

    const assignmentResponse =
      await app.inject({
        method: "POST",
        url:
          "/v1/agent-assignments",
        headers:
          authHeaders(
            registration
              .accessToken,
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

    const listResponse =
      await app.inject({
        method: "GET",
        url:
          "/v1/agent-assignments",
        headers:
          authHeaders(
            registration
              .accessToken,
          ),
      });

    assert.equal(
      listResponse.statusCode,
      200,
    );

    assert.equal(
      listResponse
        .json()
        .assignments
        .length,
      1,
    );

    await app.close();
  },
);