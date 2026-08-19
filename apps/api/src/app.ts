import {
  randomUUID,
} from "node:crypto";

import Fastify from "fastify";

import {
  evaluatePolicy,
  type ActionRequest,
} from "@controlpact/policy-engine";

import {
  PolicyRegistry,
} from "@controlpact/policy-registry";

import {
  signDecisionReceipt,
} from "@controlpact/receipts";

type DecisionBody = {
  request?: ActionRequest;
  policyId?: string;
};

export const buildApp = () => {
  const app = Fastify({
    logger: false,
  });

  const policyRegistry =
    new PolicyRegistry();

  app.get(
    "/health",
    async () => ({
      success: true,
      service:
        "controlpact-api",
    }),
  );

  app.get(
    "/v1/policies",
    async () => ({
      success: true,
      policies:
        policyRegistry.list(),
    }),
  );

  app.post<{
    Body: DecisionBody;
  }>(
    "/v1/decisions",
    async (
      request,
      reply,
    ) => {
      const actionRequest =
        request.body?.request;

      const policyId =
        String(
          request.body
            ?.policyId ||
            "",
        ).trim();

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

      if (!policyId) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "policyId is required.",
          });
      }

      const policy =
        policyRegistry.get(
          policyId,
        );

      if (!policy) {
        return reply
          .code(404)
          .send({
            success: false,
            message:
              "Requested ControlPact policy was not found.",
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
              new Date()
                .toISOString(),
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