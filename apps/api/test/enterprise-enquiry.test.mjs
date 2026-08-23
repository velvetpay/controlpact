import test from "node:test";
import assert from "node:assert/strict";

process.env.CONTROLPACT_STORAGE =
  "memory";

process.env.RESEND_API_KEY =
  "";

process.env.CONTROLPACT_ENTERPRISE_FROM_EMAIL =
  "";

const {
  buildApp,
} =
  await import(
    "../dist/app.js"
  );

test(
  "enterprise enquiry validates email before attempting delivery",
  async () => {
    const app =
      buildApp();

    const response =
      await app.inject({
        method: "POST",
        url:
          "/v1/enterprise-enquiries",
        payload: {
          name:
            "Test Buyer",
          email:
            "not-an-email",
          company:
            "Example Ltd",
          requirements:
            "Private ControlPact deployment.",
          solutions: [
            "Private deployment",
          ],
        },
      });

    assert.equal(
      response.statusCode,
      400,
    );

    assert.match(
      response
        .json()
        .message,
      /email/i,
    );

    await app.close();
  },
);

test(
  "enterprise enquiry reports missing Resend configuration without external delivery",
  async () => {
    const app =
      buildApp();

    const response =
      await app.inject({
        method: "POST",
        url:
          "/v1/enterprise-enquiries",
        payload: {
          name:
            "Test Buyer",
          email:
            "buyer@example.com",
          company:
            "Example Ltd",
          requirements:
            "OEM deployment across several applications.",
          solutions: [
            "OEM / embedded ControlPact",
          ],
        },
      });

    assert.equal(
      response.statusCode,
      503,
    );

    assert.match(
      response
        .json()
        .message,
      /not configured/i,
    );

    await app.close();
  },
);
