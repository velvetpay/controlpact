import Fastify from "fastify";

import {
  evaluatePolicy,
  type ActionRequest,
  type Policy,
} from "@controlpact/policy-engine";

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

      const result =
        evaluatePolicy(
          actionRequest,
          policy,
        );

      return {
        success: true,
        result,
      };
    },
  );

  return app;
};