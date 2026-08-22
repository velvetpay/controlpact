import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluatePolicy,
} from "../dist/index.js";

test(
  "dynamic context blocks failed production deploy",
  () => {
    const result =
      evaluatePolicy(
        {
          agentId: "deploy-agent",
          action: "deploy",
          context: {
            environment: "production",
            testsPassed: false,
          },
        },
        {
          id: "deploy-policy",
          version: 4,
          defaultDecision: "BLOCK",
          rules: [
            {
              id: "block-failed-tests",
              decision: "BLOCK",
              actions: ["deploy"],
              conditions: [
                {
                  field:
                    "context.testsPassed",
                  operator: "eq",
                  value: false,
                },
              ],
            },
          ],
        },
      );

    assert.equal(
      result.decision,
      "BLOCK",
    );

    assert.equal(
      result.policyVersion,
      4,
    );
  },
);

test(
  "dynamic context carries approver role",
  () => {
    const result =
      evaluatePolicy(
        {
          agentId: "data-agent",
          action: "exportData",
          context: {
            classification:
              "confidential",
          },
        },
        {
          id: "data-policy",
          defaultDecision: "BLOCK",
          rules: [
            {
              id:
                "approve-confidential",
              decision: "APPROVE",
              actions: ["exportData"],
              conditions: [
                {
                  field:
                    "context.classification",
                  operator: "eq",
                  value:
                    "confidential",
                },
              ],
              requiredApproverRoles: [
                "APPROVER",
              ],
            },
          ],
        },
      );

    assert.equal(
      result.decision,
      "APPROVE",
    );

    assert.deepEqual(
      result.requiredApproverRoles,
      ["APPROVER"],
    );
  },
);
