import test from "node:test";
import assert from "node:assert/strict";
import {
  execSync,
} from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  tmpdir,
} from "node:os";
import {
  join,
} from "node:path";
import {
  pathToFileURL,
} from "node:url";
import Stripe from "stripe";

process.env.CONTROLPACT_STORAGE =
  "memory";

process.env.CONTROLPACT_RECEIPT_SECRET =
  "controlpact-sdk-download-test-secret";

process.env.STRIPE_SECRET_KEY =
  "sk_test_controlpact_sdk_download";

process.env.STRIPE_WEBHOOK_SECRET =
  "whsec_controlpact_sdk_download_test";

const {
  buildApp,
} =
  await import(
    "../dist/app.js"
  );

const stripe =
  new Stripe(
    process.env
      .STRIPE_SECRET_KEY,
  );

const authHeaders = (
  token,
) => ({
  authorization:
    `Bearer ${token}`,
});

const signEvent = (
  event,
) => {
  const payload =
    Buffer.from(
      JSON.stringify(
        event,
      ),
      "utf8",
    );

  const signature =
    stripe.webhooks
      .generateTestHeaderString({
        payload,
        secret:
          process.env
            .STRIPE_WEBHOOK_SECRET,
      });

  return {
    payload,
    signature,
  };
};

const postStripeEvent =
  async (
    app,
    event,
  ) => {
    const {
      payload,
      signature,
    } =
      signEvent(event);

    const response =
      await app.inject({
        method: "POST",
        url:
          "/v1/billing/stripe/webhook",
        headers: {
          "content-type":
            "application/json",
          "content-length":
            String(
              payload.length,
            ),
          "stripe-signature":
            signature,
        },
        payload,
      });

    assert.equal(
      response.statusCode,
      200,
      response.body,
    );

    return response;
  };

const register =
  async (
    app,
    email,
    organizationName,
  ) => {
    const response =
      await app.inject({
        method: "POST",
        url:
          "/v1/auth/register",
        payload: {
          email,
          password:
            "ControlPact-Sdk-Download-2026!",
          organizationName,
        },
      });

    assert.equal(
      response.statusCode,
      201,
    );

    const session =
      response.json();

    const me =
      await app.inject({
        method: "GET",
        url:
          "/v1/auth/me",
        headers:
          authHeaders(
            session.accessToken,
          ),
      });

    assert.equal(
      me.statusCode,
      200,
    );

    return {
      token:
        session.accessToken,
      organizationId:
        me.json()
          .user
          .organizationId,
    };
  };

const paidCheckoutEvent = ({
  organizationId,
  planId,
  suffix,
}) => ({
  id:
    `evt_${suffix}`,
  object:
    "event",
  created:
    Math.floor(
      Date.now() /
        1000,
    ),
  data: {
    object: {
      id:
        `cs_${suffix}`,
      object:
        "checkout.session",
      payment_status:
        "paid",
      customer:
        `cus_${suffix}`,
      subscription:
        `sub_${suffix}`,
      client_reference_id:
        organizationId,
      metadata: {
        organizationId,
        planId,
      },
    },
  },
  livemode:
    false,
  pending_webhooks:
    1,
  request: {
    id: null,
    idempotency_key:
      null,
  },
  type:
    "checkout.session.completed",
});

const cancelledSubscriptionEvent = ({
  organizationId,
  planId,
  suffix,
}) => ({
  id:
    `evt_cancel_${suffix}`,
  object:
    "event",
  created:
    Math.floor(
      Date.now() /
        1000,
    ),
  data: {
    object: {
      id:
        `sub_${suffix}`,
      object:
        "subscription",
      status:
        "canceled",
      customer:
        `cus_${suffix}`,
      metadata: {
        organizationId,
        planId,
      },
    },
  },
  livemode:
    false,
  pending_webhooks:
    1,
  request: {
    id: null,
    idempotency_key:
      null,
  },
  type:
    "customer.subscription.deleted",
});

test(
  "signed Stripe SDK payment unlocks a real installable SDK download and cancellation removes access",
  async () => {
    const app =
      await buildApp();

    const account =
      await register(
        app,
        "sdk-buyer@controlpact.test",
        "SDK Buyer",
      );

    const blocked =
      await app.inject({
        method: "GET",
        url:
          "/v1/billing/sdk/download",
        headers:
          authHeaders(
            account.token,
          ),
      });

    assert.equal(
      blocked.statusCode,
      402,
    );

    assert.equal(
      blocked
        .json()
        .code,
      "SDK_ENTITLEMENT_REQUIRED",
    );

    await postStripeEvent(
        app,
        paidCheckoutEvent({
          organizationId:
            account.organizationId,
          planId:
            "sdk-annual",
          suffix:
            "sdk_paid",
        }),
      );

    const billing =
      await app.inject({
        method: "GET",
        url:
          "/v1/billing/status",
        headers:
          authHeaders(
            account.token,
          ),
      });

    assert.equal(
      billing.statusCode,
      200,
    );

    assert.equal(
      billing
        .json()
        .entitlements
        .standaloneProductionSdkAccess,
      true,
    );

    const download =
      await app.inject({
        method: "GET",
        url:
          "/v1/billing/sdk/download",
        headers:
          authHeaders(
            account.token,
          ),
      });

    assert.equal(
      download.statusCode,
      200,
    );

    assert.match(
      String(
        download.headers[
          "content-type"
        ] || "",
      ),
      /application\/gzip/i,
    );

    assert.match(
      String(
        download.headers[
          "content-disposition"
        ] || "",
      ),
      /controlpact-sdk-0\.1\.0\.tgz/,
    );

    const archive =
      download.rawPayload;

    assert.ok(
      Buffer.isBuffer(
        archive,
      ),
    );

    assert.ok(
      archive.length >
        1000,
    );

    assert.equal(
      archive[0],
      0x1f,
    );

    assert.equal(
      archive[1],
      0x8b,
    );

    const temporaryRoot =
      mkdtempSync(
        join(
          tmpdir(),
          "controlpact-sdk-install-",
        ),
      );

    try {
      const archivePath =
        join(
          temporaryRoot,
          "controlpact-sdk-0.1.0.tgz",
        );

      const installRoot =
        join(
          temporaryRoot,
          "install",
        );

      mkdirSync(
        installRoot,
        {
          recursive: true,
        },
      );

      writeFileSync(
        archivePath,
        archive,
      );

      writeFileSync(
        join(
          installRoot,
          "package.json",
        ),
        JSON.stringify({
          name:
            "controlpact-sdk-install-test",
          private:
            true,
          type:
            "module",
        }),
      );

      const npmCommand =
        process.platform ===
          "win32"
          ? "npm.cmd"
          : "npm";

      execSync(
        `${npmCommand} install "${archivePath}" --ignore-scripts --no-audit --no-fund`,
        {
          cwd:
            installRoot,
          stdio:
            "pipe",
        },
      );

      const installedModule =
        await import(
          pathToFileURL(
            join(
              installRoot,
              "node_modules",
              "@controlpact",
              "sdk",
              "dist",
              "index.js",
            ),
          ).href
        );

      assert.equal(
        typeof installedModule
          .ControlPactClient,
        "function",
      );
    } finally {
      rmSync(
        temporaryRoot,
        {
          recursive: true,
          force: true,
        },
      );
    }

    await postStripeEvent(
        app,
        cancelledSubscriptionEvent({
          organizationId:
            account.organizationId,
          planId:
            "sdk-annual",
          suffix:
            "sdk_paid",
        }),
      );

    const blockedAfterCancellation =
      await app.inject({
        method: "GET",
        url:
          "/v1/billing/sdk/download",
        headers:
          authHeaders(
            account.token,
          ),
      });

    assert.equal(
      blockedAfterCancellation
        .statusCode,
      402,
    );

    await app.close();
  },
);

test(
  "paid Production Platform subscription includes SDK download access",
  async () => {
    const app =
      await buildApp();

    const account =
      await register(
        app,
        "production-sdk@controlpact.test",
        "Production SDK Access",
      );

    await postStripeEvent(
        app,
        paidCheckoutEvent({
          organizationId:
            account.organizationId,
          planId:
            "production-monthly",
          suffix:
            "production_paid",
        }),
      );

    const download =
      await app.inject({
        method: "GET",
        url:
          "/v1/billing/sdk/download",
        headers:
          authHeaders(
            account.token,
          ),
      });

    assert.equal(
      download.statusCode,
      200,
    );

    await app.close();
  },
);
