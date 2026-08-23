import test from "node:test";
import assert from "node:assert/strict";

process.env.CONTROLPACT_STORAGE =
  "memory";

process.env.CONTROLPACT_REQUIRE_API_KEYS =
  "true";

process.env.CONTROLPACT_RECEIPT_SECRET =
  "controlpact-plan-quota-test-secret";

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
  "sandbox environment, agent and API-key quotas are enforced by the API",
  async () => {
    const app =
      await buildApp();

    const registration =
      await app.inject({
        method: "POST",
        url:
          "/v1/auth/register",
        payload: {
          email:
            "sandbox-quota-owner@controlpact.test",
          password:
            "ControlPact-Quota-2026!",
          organizationName:
            "Sandbox Quota Organisation",
        },
      });

    assert.equal(
      registration.statusCode,
      201,
    );

    const token =
      registration
        .json()
        .accessToken;

    const firstEnvironment =
      await app.inject({
        method: "POST",
        url:
          "/v1/environments",
        headers:
          authHeaders(token),
        payload: {
          name:
            "Sandbox Test",
          category:
            "SOFTWARE_DEVOPS",
          mode:
            "TEST",
        },
      });

    assert.equal(
      firstEnvironment.statusCode,
      201,
    );

    const environment =
      firstEnvironment
        .json()
        .environment;

    const secondEnvironment =
      await app.inject({
        method: "POST",
        url:
          "/v1/environments",
        headers:
          authHeaders(token),
        payload: {
          name:
            "Sandbox Test Two",
          category:
            "SOFTWARE_DEVOPS",
          mode:
            "TEST",
        },
      });

    assert.equal(
      secondEnvironment.statusCode,
      402,
    );

    assert.equal(
      secondEnvironment
        .json()
        .code,
      "PLAN_LIMIT_REACHED",
    );

    const productionEnvironment =
      await app.inject({
        method: "POST",
        url:
          "/v1/environments",
        headers:
          authHeaders(token),
        payload: {
          name:
            "Sandbox Production",
          category:
            "SOFTWARE_DEVOPS",
          mode:
            "PRODUCTION",
        },
      });

    assert.equal(
      productionEnvironment
        .statusCode,
      402,
    );

    assert.equal(
      productionEnvironment
        .json()
        .code,
      "PRODUCTION_ENTITLEMENT_REQUIRED",
    );

    for (
      let index = 1;
      index <= 3;
      index += 1
    ) {
      const agent =
        await app.inject({
          method: "POST",
          url:
            "/v1/agents",
          headers:
            authHeaders(token),
          payload: {
            environmentId:
              environment.id,
            name:
              `Agent ${index}`,
            externalAgentId:
              `quota-agent-${index}`,
          },
        });

      assert.equal(
        agent.statusCode,
        201,
      );
    }

    const fourthAgent =
      await app.inject({
        method: "POST",
        url:
          "/v1/agents",
        headers:
          authHeaders(token),
        payload: {
          environmentId:
            environment.id,
          name:
            "Agent Four",
          externalAgentId:
            "quota-agent-4",
        },
      });

    assert.equal(
      fourthAgent.statusCode,
      402,
    );

    assert.equal(
      fourthAgent
        .json()
        .resource,
      "agents",
    );

    for (
      let index = 1;
      index <= 2;
      index += 1
    ) {
      const key =
        await app.inject({
          method: "POST",
          url:
            "/v1/api-keys",
          headers:
            authHeaders(token),
          payload: {
            name:
              `Sandbox Key ${index}`,
          },
        });

      assert.equal(
        key.statusCode,
        201,
      );
    }

    const thirdKey =
      await app.inject({
        method: "POST",
        url:
          "/v1/api-keys",
        headers:
          authHeaders(token),
        payload: {
          name:
            "Sandbox Key Three",
        },
      });

    assert.equal(
      thirdKey.statusCode,
      402,
    );

    assert.equal(
      thirdKey
        .json()
        .resource,
      "apiKeys",
    );

    await app.close();
  },
);
