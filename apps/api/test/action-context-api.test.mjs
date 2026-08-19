import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApp,
} from "../dist/app.js";

process.env
  .CONTROLPACT_RECEIPT_SECRET =
  "action-context-test-secret";

test(
  "stores caller reference and target",
  async () => {
    const app = buildApp();

    await app.inject({
      method: "POST",
      url: "/v1/decisions",
      payload: {
        policyId:
          "sales-policy",

        referenceId:
          "CRM-ACME-104",

        request: {
          agentId:
            "sales-agent",

          action:
            "updateCRM",

          resource:
            "customer:ACME-104",
        },
      },
    });

    const history =
      (
        await app.inject({
          method: "GET",
          url: "/v1/decisions",
        })
      ).json();

    assert.equal(
      history.decisions[0]
        .decision,
      "ALLOW",
    );

    assert.equal(
      history.decisions[0]
        .referenceId,
      "CRM-ACME-104",
    );

    assert.equal(
      history.decisions[0]
        .resource,
      "customer:ACME-104",
    );

    await app.close();
  },
);

test(
  "generates reference when caller omits one",
  async () => {
    const app = buildApp();

    await app.inject({
      method: "POST",
      url: "/v1/decisions",
      payload: {
        policyId:
          "production-policy",

        request: {
          agentId:
            "support-agent",

          action:
            "deleteAccount",

          resource:
            "user:48291",
        },
      },
    });

    const history =
      (
        await app.inject({
          method: "GET",
          url: "/v1/decisions",
        })
      ).json();

    assert.match(
      history.decisions[0]
        .referenceId,
      /^action_/,
    );

    await app.close();
  },
);

test(
  "approval queue carries action context",
  async () => {
    const app = buildApp();

    await app.inject({
      method: "POST",
      url: "/v1/decisions",
      payload: {
        policyId:
          "production-policy",

        referenceId:
          "DEPLOY-4.7.2",

        request: {
          agentId:
            "devops-agent",

          action:
            "deployProduction",

          resource:
            "release:v4.7.2",
        },
      },
    });

    const approvals =
      (
        await app.inject({
          method: "GET",
          url: "/v1/approvals",
        })
      ).json();

    assert.equal(
      approvals.approvals[0]
        .status,
      "PENDING",
    );

    assert.equal(
      approvals.approvals[0]
        .referenceId,
      "DEPLOY-4.7.2",
    );

    assert.equal(
      approvals.approvals[0]
        .resource,
      "release:v4.7.2",
    );

    await app.close();
  },
);