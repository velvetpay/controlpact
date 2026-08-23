import test from "node:test";
import assert from "node:assert/strict";

import {
  buildControlPactEntitlements,
  createControlPactBillingStorage,
} from "../dist/billing-storage.js";

test(
  "billing foundation creates sandbox and aggregates production entitlements",
  async () => {
    const previousStorage =
      process.env.CONTROLPACT_STORAGE;

    process.env.CONTROLPACT_STORAGE =
      "memory";

    try {
      const storage =
        createControlPactBillingStorage();

      const sandbox =
        await storage
          .ensureSandboxPlatform(
            "org-1",
          );

      assert.equal(
        sandbox.plan,
        "SANDBOX",
      );

      let records =
        await storage
          .listByOrganization(
            "org-1",
          );

      let entitlements =
        buildControlPactEntitlements(
          records,
        );

      assert.equal(
        entitlements
          .productionPlatformAccess,
        false,
      );

      assert.equal(
        entitlements
          .subscribedAccountSdkAccess,
        false,
      );

      const now =
        new Date()
          .toISOString();

      await storage.save({
        id:
          "billing_platform_org-1",
        organizationId:
          "org-1",
        product:
          "PLATFORM",
        plan:
          "PRODUCTION",
        status:
          "ACTIVE",
        interval:
          "MONTHLY",
        currency:
          "GBP",
        amountMinor:
          14900,
        source:
          "STRIPE",
        createdAt:
          now,
        updatedAt:
          now,
      });

      records =
        await storage
          .listByOrganization(
            "org-1",
          );

      entitlements =
        buildControlPactEntitlements(
          records,
        );

      assert.equal(
        entitlements
          .productionPlatformAccess,
        true,
      );

      assert.equal(
        entitlements
          .subscribedAccountSdkAccess,
        true,
      );

      assert.equal(
        entitlements
          .standaloneProductionSdkAccess,
        false,
      );

      await storage.save({
        id:
          "billing_sdk_org-1",
        organizationId:
          "org-1",
        product:
          "SDK",
        plan:
          "SDK",
        status:
          "ACTIVE",
        interval:
          "ANNUAL",
        currency:
          "GBP",
        amountMinor:
          149500,
        source:
          "STRIPE",
        createdAt:
          now,
        updatedAt:
          now,
      });

      records =
        await storage
          .listByOrganization(
            "org-1",
          );

      entitlements =
        buildControlPactEntitlements(
          records,
        );

      assert.equal(
        entitlements
          .standaloneProductionSdkAccess,
        true,
      );

      assert.equal(
        entitlements
          .standaloneSdkApplicationLimit,
        1,
      );

      await storage.close();
    } finally {
      if (
        previousStorage ===
        undefined
      ) {
        delete process.env
          .CONTROLPACT_STORAGE;
      } else {
        process.env
          .CONTROLPACT_STORAGE =
            previousStorage;
      }
    }
  },
);
