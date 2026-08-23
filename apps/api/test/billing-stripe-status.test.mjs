import test from "node:test";
import assert from "node:assert/strict";

import {
  mapStripeSubscriptionStatus,
} from "../dist/billing-storage.js";

test(
  "maps Stripe subscription states to ControlPact billing states",
  () => {
    assert.equal(
      mapStripeSubscriptionStatus(
        "active",
      ),
      "ACTIVE",
    );

    assert.equal(
      mapStripeSubscriptionStatus(
        "trialing",
      ),
      "ACTIVE",
    );

    assert.equal(
      mapStripeSubscriptionStatus(
        "past_due",
      ),
      "PAST_DUE",
    );

    assert.equal(
      mapStripeSubscriptionStatus(
        "unpaid",
      ),
      "PAST_DUE",
    );

    assert.equal(
      mapStripeSubscriptionStatus(
        "canceled",
      ),
      "CANCELLED",
    );

    assert.equal(
      mapStripeSubscriptionStatus(
        "incomplete_expired",
      ),
      "EXPIRED",
    );

    assert.equal(
      mapStripeSubscriptionStatus(
        "incomplete",
      ),
      "PAST_DUE",
    );
  },
);
