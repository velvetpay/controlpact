import test from "node:test";
import assert from "node:assert/strict";

import {
  CONTROLPACT_PLAN_LIMITS,
} from "../dist/billing-storage.js";

test(
  "commercial plan limits are finite and match the published capacity",
  () => {
    assert.deepEqual(
      CONTROLPACT_PLAN_LIMITS
        .SANDBOX,
      {
        humanUsers: 2,
        testEnvironments: 1,
        productionEnvironments: 0,
        agents: 3,
        assignments: 5,
        apiKeys: 2,
        monthlyDecisions: 1000,
        approvers: 1,
        auditRetentionDays: 30,
      },
    );

    assert.equal(
      CONTROLPACT_PLAN_LIMITS
        .PRODUCTION
        .humanUsers,
      10,
    );

    assert.equal(
      CONTROLPACT_PLAN_LIMITS
        .BUSINESS
        .humanUsers,
      30,
    );

    assert.equal(
      CONTROLPACT_PLAN_LIMITS
        .ENTERPRISE
        .humanUsers,
      100,
    );

    assert.equal(
      CONTROLPACT_PLAN_LIMITS
        .ENTERPRISE
        .monthlyDecisions,
      1000000,
    );

    assert.ok(
      Number.isFinite(
        CONTROLPACT_PLAN_LIMITS
          .ENTERPRISE
          .humanUsers,
      ),
    );

    assert.ok(
      Number.isFinite(
        CONTROLPACT_PLAN_LIMITS
          .ENTERPRISE
          .monthlyDecisions,
      ),
    );
  },
);
