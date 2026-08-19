import {
  randomUUID,
} from "node:crypto";

import Fastify from "fastify";

import {
  evaluatePolicy,
  type ActionRequest,
  type Policy,
} from "@controlpact/policy-engine";

import {
  signDecisionReceipt,
} from "@controlpact/receipts";

type DecisionBody = {
  request?: ActionRequest;
  policy?: Policy;
};

export const buildApp = () => {
  const app = Fastify({
    logger: false,
  });

  app.get("/health", async () => ({
    success: true,
    service: "controlpact-api",
  }));

  app.post<{ Body: DecisionBody }>(
    "/v1/decisions",
    async (request, reply) => {
      const actionRequest =
        request.body?.request;

      const policy =
        request.body?.policy;

      if (
        !actionRequest?.agentId ||
        !actionRequest?.action
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "request.agentId and request.action are required.",
          });
      }

      if (
        !policy?.id ||
        !policy?.defaultDecision ||
        !Array.isArray(policy.rules)
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "A valid policy is required.",
          });
      }

      const receiptSecret =
        process.env
          .CONTROLPACT_RECEIPT_SECRET;

      if (!receiptSecret) {
        return reply
          .code(500)
          .send({
            success: false,
            message:
              "ControlPact receipt signing is not configured.",
          });
      }

      const result =
        evaluatePolicy(
          actionRequest,
          policy,
        );

      const receipt =
        signDecisionReceipt(
          {
            receiptId:
              randomUUID(),

            agentId:
              actionRequest.agentId,

            action:
              actionRequest.action,

            decision:
              result.decision,

            policyId:
              result.policyId,

            matchedRuleIds:
              result.matchedRuleIds,

            issuedAt:
              new Date().toISOString(),
          },
          receiptSecret,
        );

      return {
        success: true,
        result,
        receipt,
      };
    },
  );

  return app;
};