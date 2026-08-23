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
  "sandbox organisation is blocked at the first production environment attempt",
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
            "sandbox-production-wall@controlpact.test",
          password:
            "ControlPact-Production-Wall-2026!",
          organizationName:
            "Sandbox Production Wall",
        },
      });

    assert.equal(
      registration.statusCode,
      201,
    );

    const session =
      registration.json();

    const response =
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
            "Blocked Production",
          category:
            "SOFTWARE_DEVOPS",
          mode:
            "PRODUCTION",
        },
      });

    assert.equal(
      response.statusCode,
      402,
    );

    const body =
      response.json();

    assert.equal(
      body.code,
      "PRODUCTION_ENTITLEMENT_REQUIRED",
    );

    assert.equal(
      body.upgradeUrl,
      "/pricing",
    );

    assert.match(
      body.message,
      /upgrade/i,
    );

    const environments =
      await app.inject({
        method: "GET",
        url:
          "/v1/environments",
        headers:
          authHeaders(
            session.accessToken,
          ),
      });

    assert.equal(
      environments.statusCode,
      200,
    );

    assert.equal(
      environments
        .json()
        .environments
        .length,
      0,
    );

    await app.close();
  },
);
