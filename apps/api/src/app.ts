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

import {
  createApprovalRequest,
  approveRequest,
  rejectRequest,
  type ApprovalRequest,
} from "@controlpact/approvals";

import {
  createControlPactStorage,
} from "./storage.js";

type DecisionBody = {
  request?: ActionRequest;
  policyId?: string;
  referenceId?: string;
};

type ApprovalDecisionBody = {
  decidedBy?: string;
  reason?: string;
};

type DecisionRecord = {
  id: string;
  receiptId: string;
  agentId: string;
  action: string;
  decision: "ALLOW" | "APPROVE" | "BLOCK";
  policyId: string;
  referenceId: string;
  resource?: string;
  reason: string;
  matchedRuleIds: string[];
  createdAt: string;
  approvalStatus?:
    | "PENDING"
    | "APPROVED"
    | "REJECTED";
  decidedAt?: string;
  decidedBy?: string;
  approvalReason?: string;
};

export const buildApp = () => {
  const app = Fastify({
    logger: false,
    pluginTimeout: 30000,
  });

  const policyRegistry =
    new PolicyRegistry();

  const storage =
    createControlPactStorage();

  app.addHook(
    "onReady",
    async () => {
      await storage.ready();
    },
  );

  app.addHook(
    "onClose",
    async () => {
      await storage.close();
    },
  );

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

  app.get(
    "/v1/approvals",
    async () => {
      const approvals =
        await storage
          .listApprovals();

      const enriched =
        await Promise.all(
          approvals.map(
            async (approval) => {
              const relatedDecision =
                await storage
                  .findDecisionByReceiptId(
                    approval.receiptId,
                  );

              return {
                ...approval,
                referenceId:
                  relatedDecision
                    ?.referenceId,
                resource:
                  relatedDecision
                    ?.resource,
              };
            },
          ),
        );

      return {
        success: true,
        approvals: enriched,
      };
    },
  );

  app.get(
    "/v1/decisions",
    async () => ({
      success: true,
      decisions:
        await storage
          .listDecisions(50),
    }),
  );

  app.post<{
    Params: {
      approvalId: string;
    };
    Body:
      ApprovalDecisionBody;
  }>(
    "/v1/approvals/:approvalId/approve",
    async (
      request,
      reply,
    ) => {
      const approval =
        await storage
          .getApproval(
            request.params.approvalId,
          );

      if (!approval) {
        return reply
          .code(404)
          .send({
            success: false,
            message:
              "Approval was not found.",
          });
      }

      try {
        const updated =
          approveRequest(
            approval,
            String(
              request.body
                ?.decidedBy ||
                "",
            ).trim(),
            request.body
              ?.reason,
          );

        await storage
          .saveApproval(
            updated,
          );

        const relatedDecision =
          await storage
            .findDecisionByReceiptId(
              updated.receiptId,
            );

        if (relatedDecision) {
          await storage
            .updateDecisionByReceiptId(
              updated.receiptId,
              {
                approvalStatus:
                  updated.status,
                decidedAt:
                  updated.decidedAt,
                decidedBy:
                  updated.decidedBy,
                approvalReason:
                  updated.reason,
              },
            );
        }

        return {
          success: true,
          approval: updated,
        };
      } catch (error) {
        return reply
          .code(409)
          .send({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Approval failed.",
          });
      }
    },
  );

  app.post<{
    Params: {
      approvalId: string;
    };
    Body:
      ApprovalDecisionBody;
  }>(
    "/v1/approvals/:approvalId/reject",
    async (
      request,
      reply,
    ) => {
      const approval =
        await storage
          .getApproval(
            request.params.approvalId,
          );

      if (!approval) {
        return reply
          .code(404)
          .send({
            success: false,
            message:
              "Approval was not found.",
          });
      }

      try {
        const updated =
          rejectRequest(
            approval,
            String(
              request.body
                ?.decidedBy ||
                "",
            ).trim(),
            request.body
              ?.reason,
          );

        await storage
          .saveApproval(
            updated,
          );

        const relatedDecision =
          await storage
            .findDecisionByReceiptId(
              updated.receiptId,
            );

        if (relatedDecision) {
          await storage
            .updateDecisionByReceiptId(
              updated.receiptId,
              {
                approvalStatus:
                  updated.status,
                decidedAt:
                  updated.decidedAt,
                decidedBy:
                  updated.decidedBy,
                approvalReason:
                  updated.reason,
              },
            );
        }

        return {
          success: true,
          approval: updated,
        };
      } catch (error) {
        return reply
          .code(409)
          .send({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Rejection failed.",
          });
      }
    },
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

      const referenceId =
        String(
          request.body
            ?.referenceId ||
            ""
        ).trim() ||
        `action_${randomUUID()}`;

      const resource =
        String(
          actionRequest.resource ||
            ""
        ).trim() ||
        undefined;

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

            referenceId,

            resource,

            matchedRuleIds:
              result.matchedRuleIds,

            issuedAt:
              new Date()
                .toISOString(),
          },
          receiptSecret,
        );

      const decisionRecord:
        DecisionRecord = {
          id:
            receipt.payload.receiptId,

          receiptId:
            receipt.payload.receiptId,

          agentId:
            actionRequest.agentId,

          action:
            actionRequest.action,

          decision:
            result.decision,

          policyId:
            result.policyId,

          referenceId,

          resource,

          reason:
            result.reason,

          matchedRuleIds:
            result.matchedRuleIds,

          createdAt:
            receipt.payload.issuedAt,

          approvalStatus:
            result.decision === "APPROVE"
              ? "PENDING"
              : undefined,
        };

      await storage
        .saveDecision(
          decisionRecord,
        );

      let approval:
        ApprovalRequest |
        null =
        null;

      if (
        result.decision ===
        "APPROVE"
      ) {
        approval =
          createApprovalRequest({
            id:
              randomUUID(),

            receiptId:
              receipt.payload
                .receiptId,

            agentId:
              actionRequest
                .agentId,

            action:
              actionRequest
                .action,
          });

        await storage
          .saveApproval(
            approval,
          );
      }

      return {
        success: true,
        result,
        receipt,
        approval,
      };
    },
  );

  return app;
};