import test from "node:test";
import assert from "node:assert/strict";

process.env.CONTROLPACT_STORAGE =
  "memory";

process.env.CONTROLPACT_REQUIRE_API_KEYS =
  "true";

process.env.CONTROLPACT_RECEIPT_SECRET =
  "controlpact-api-key-test-receipt-secret";

const {
  buildApp,
} =
  await import(
    "../dist/app.js"
  );

const owner = {
  email:
    "apikey-owner@controlpact.test",

  password:
    "ControlPact-Api-Key-Test-2026!",

  organizationName:
    "ControlPact API Key Test",
};

const registerOwner =
  async (
    app,
  ) => {
    const response =
      await app.inject({
        method:
          "POST",

        url:
          "/v1/auth/register",

        payload:
          owner,
      });

    assert.equal(
      response.statusCode,
      201,
    );

    return response.json();
  };

const createKey =
  async (
    app,
    ownerToken,
  ) => {
    const response =
      await app.inject({
        method:
          "POST",

        url:
          "/v1/api-keys",

        headers: {
          authorization:
            `Bearer ${ownerToken}`,
        },

        payload: {
          name:
            "Primary Agent",
        },
      });

    assert.equal(
      response.statusCode,
      201,
    );

    return response.json();
  };

test(
  "owner creates and lists API key without exposing stored secret",
  async () => {
    const app =
      await buildApp();

    const registration =
      await registerOwner(
        app,
      );

    const created =
      await createKey(
        app,
        registration.accessToken,
      );

    assert.match(
      created.secret,
      /^cpk_/,
    );

    assert.equal(
      created.apiKey.name,
      "Primary Agent",
    );

    assert.equal(
      created.apiKey.keyHash,
      undefined,
    );

    const listed =
      await app.inject({
        method:
          "GET",

        url:
          "/v1/api-keys",

        headers: {
          authorization:
            `Bearer ${registration.accessToken}`,
        },
      });

    assert.equal(
      listed.statusCode,
      200,
    );

    const body =
      listed.json();

    assert.equal(
      body.apiKeys.length,
      1,
    );

    assert.equal(
      body.apiKeys[0].keyHash,
      undefined,
    );

    assert.equal(
      body.apiKeys[0].secret,
      undefined,
    );

    await app.close();
  },
);

test(
  "decision execution requires an API key when enforcement is enabled",
  async () => {
    const app =
      await buildApp();

    const response =
      await app.inject({
        method:
          "POST",

        url:
          "/v1/decisions",

        payload: {
          policyId:
            "production-policy",

          request: {
            agentId:
              "no-key-agent",

            action:
              "deleteAccount",

            resource:
              "user:test",
          },
        },
      });

    assert.equal(
      response.statusCode,
      401,
    );

    await app.close();
  },
);

test(
  "valid organisation API key executes a decision",
  async () => {
    const app =
      await buildApp();

    const registration =
      await registerOwner(
        app,
      );

    const created =
      await createKey(
        app,
        registration.accessToken,
      );

    const response =
      await app.inject({
        method:
          "POST",

        url:
          "/v1/decisions",

        headers: {
          authorization:
            `Bearer ${created.secret}`,
        },

        payload: {
          policyId:
            "production-policy",

          referenceId:
            "api-key-decision-test",

          request: {
            agentId:
              "primary-agent",

            action:
              "deleteAccount",

            resource:
              "user:123",
          },
        },
      });

    assert.equal(
      response.statusCode,
      200,
    );

    assert.equal(
      response.json()
        .success,
      true,
    );

    await app.close();
  },
);

test(
  "revoked API key can no longer execute decisions",
  async () => {
    const app =
      await buildApp();

    const registration =
      await registerOwner(
        app,
      );

    const created =
      await createKey(
        app,
        registration.accessToken,
      );

    const revoke =
      await app.inject({
        method:
          "POST",

        url:
          `/v1/api-keys/${created.apiKey.id}/revoke`,

        headers: {
          authorization:
            `Bearer ${registration.accessToken}`,
        },
      });

    assert.equal(
      revoke.statusCode,
      200,
    );

    const decision =
      await app.inject({
        method:
          "POST",

        url:
          "/v1/decisions",

        headers: {
          authorization:
            `Bearer ${created.secret}`,
        },

        payload: {
          policyId:
            "production-policy",

          request: {
            agentId:
              "revoked-agent",

            action:
              "deleteAccount",
          },
        },
      });

    assert.equal(
      decision.statusCode,
      401,
    );

    await app.close();
  },
);
