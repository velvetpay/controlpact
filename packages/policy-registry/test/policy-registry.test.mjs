import test from "node:test";
import assert from "node:assert/strict";

import {
  PolicyRegistry,
} from "../dist/index.js";

test(
  "loads server-owned policies",
  () => {
    const registry =
      new PolicyRegistry();

    assert.equal(
      registry.get(
        "finance-policy",
      )?.id,
      "finance-policy",
    );
  },
);

test(
  "returns null for an unknown policy",
  () => {
    const registry =
      new PolicyRegistry();

    assert.equal(
      registry.get(
        "attacker-policy",
      ),
      null,
    );
  },
);

test(
  "lists available policy summaries",
  () => {
    const registry =
      new PolicyRegistry();

    const policies =
      registry.list();

    assert.equal(
      policies.length,
      3,
    );

    assert.equal(
      policies.some(
        (item) =>
          item.id ===
          "production-policy",
      ),
      true,
    );
  },
);