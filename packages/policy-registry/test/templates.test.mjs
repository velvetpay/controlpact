import test from "node:test";
import assert from "node:assert/strict";
import {
  PolicyRegistry,
} from "../dist/index.js";

test(
  "lists multi-industry policy templates",
  () => {
    const registry =
      new PolicyRegistry();

    const templates =
      registry.listTemplates();

    assert.equal(
      templates.length,
      7,
    );

    assert.ok(
      templates.some(
        (item) =>
          item.id ===
          "software-devops",
      ),
    );

    assert.ok(
      templates.some(
        (item) =>
          item.id ===
          "finance-payments",
      ),
    );

    assert.ok(
      templates.some(
        (item) =>
          item.id === "custom",
      ),
    );
  },
);

test(
  "clones template as organisation draft policy",
  () => {
    const registry =
      new PolicyRegistry();

    const policy =
      registry.cloneTemplate(
        "software-devops",
        "acme-production",
        "ACME Production",
      );

    assert.equal(
      policy?.id,
      "acme-production",
    );

    assert.equal(
      policy?.status,
      "DRAFT",
    );

    assert.equal(
      policy?.templateId,
      "software-devops",
    );
  },
);
