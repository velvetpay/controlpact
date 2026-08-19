import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluatePolicy,
} from "../dist/index.js";

const policy = {
  id: "production-agent-policy",
  defaultDecision: "BLOCK",
  rules: [
    {
      id: "allow-refunds",
      decision: "ALLOW",
      actions: ["refundCustomer"],
    },
    {
      id: "approve-large-refunds",
      decision: "APPROVE",
      actions: ["refundCustomer"],
      minAmount: 500,
    },
    {
      id: "block-account-deletion",
      decision: "BLOCK",
      actions: ["deleteAccount"],
    },
  ],
};

test("allows a normal refund", () => {
  const result = evaluatePolicy(
    {
      agentId: "finance-agent",
      action: "refundCustomer",
      amount: 100,
      currency: "GBP",
    },
    policy,
  );

  assert.equal(result.decision, "ALLOW");
});

test("requires approval for a large refund", () => {
  const result = evaluatePolicy(
    {
      agentId: "finance-agent",
      action: "refundCustomer",
      amount: 750,
      currency: "GBP",
    },
    policy,
  );

  assert.equal(result.decision, "APPROVE");
});

test("blocks destructive actions", () => {
  const result = evaluatePolicy(
    {
      agentId: "support-agent",
      action: "deleteAccount",
    },
    policy,
  );

  assert.equal(result.decision, "BLOCK");
});

test("defaults to block for unknown actions", () => {
  const result = evaluatePolicy(
    {
      agentId: "unknown-agent",
      action: "unknownAction",
    },
    policy,
  );

  assert.equal(result.decision, "BLOCK");
});