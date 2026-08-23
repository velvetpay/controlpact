import test from "node:test";
import assert from "node:assert/strict";

process.env.CONTROLPACT_STORAGE =
  "memory";

const {
  buildApp,
} =
  await import(
    "../dist/app.js"
  );

const payload = {
  email:
    "owner@controlpact.test",

  password:
    "ControlPact-Test-Password-2026!",

  organizationName:
    "ControlPact Test Organisation",
};

test(
  "registers owner and authenticates me",
  async () => {
    const app =
      await buildApp();

    const response =
      await app.inject({
        method:
          "POST",

        url:
          "/v1/auth/register",

        payload,
      });

    assert.equal(
      response.statusCode,
      201,
    );

    const body =
      response.json();

    assert.equal(
      body.success,
      true,
    );

    assert.equal(
      body.user.email,
      payload.email,
    );

    assert.equal(
      body.user.role,
      "OWNER",
    );

    assert.equal(
      body.user.organizationName,
      payload.organizationName,
    );

    assert.equal(
      body.user.passwordHash,
      undefined,
    );

    assert.equal(
      typeof body.accessToken,
      "string",
    );

    const me =
      await app.inject({
        method:
          "GET",

        url:
          "/v1/auth/me",

        headers: {
          authorization:
            `Bearer ${body.accessToken}`,
        },
      });

    assert.equal(
      me.statusCode,
      200,
    );

    assert.equal(
      me.json().user.email,
      payload.email,
    );

    await app.close();
  },
);

test(
  "rejects duplicate registration",
  async () => {
    const app =
      await buildApp();

    const first =
      await app.inject({
        method:
          "POST",

        url:
          "/v1/auth/register",

        payload,
      });

    assert.equal(
      first.statusCode,
      201,
    );

    const duplicate =
      await app.inject({
        method:
          "POST",

        url:
          "/v1/auth/register",

        payload,
      });

    assert.equal(
      duplicate.statusCode,
      409,
    );

    await app.close();
  },
);

test(
  "login works and wrong password fails",
  async () => {
    const app =
      await buildApp();

    const registration =
      await app.inject({
        method:
          "POST",

        url:
          "/v1/auth/register",

        payload,
      });

    assert.equal(
      registration.statusCode,
      201,
    );

    const wrong =
      await app.inject({
        method:
          "POST",

        url:
          "/v1/auth/login",

        payload: {
          email:
            payload.email,

          password:
            "Wrong-Password-12345",
        },
      });

    assert.equal(
      wrong.statusCode,
      401,
    );

    const login =
      await app.inject({
        method:
          "POST",

        url:
          "/v1/auth/login",

        payload: {
          email:
            payload.email,

          password:
            payload.password,
        },
      });

    assert.equal(
      login.statusCode,
      200,
    );

    assert.equal(
      typeof login
        .json()
        .accessToken,
      "string",
    );

    await app.close();
  },
);

test(
  "logout revokes access token",
  async () => {
    const app =
      await buildApp();

    const registration =
      await app.inject({
        method:
          "POST",

        url:
          "/v1/auth/register",

        payload,
      });

    assert.equal(
      registration.statusCode,
      201,
    );

    const body =
      registration.json();

    const logout =
      await app.inject({
        method:
          "POST",

        url:
          "/v1/auth/logout",

        headers: {
          authorization:
            `Bearer ${body.accessToken}`,
        },
      });

    assert.equal(
      logout.statusCode,
      200,
    );

    const me =
      await app.inject({
        method:
          "GET",

        url:
          "/v1/auth/me",

        headers: {
          authorization:
            `Bearer ${body.accessToken}`,
        },
      });

    assert.equal(
      me.statusCode,
      401,
    );

    await app.close();
  },
);
