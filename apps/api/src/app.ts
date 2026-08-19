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
  });

  const policyRegistry =
    new PolicyRegistry();

  const approvals =
    new Map<
      string,
      ApprovalRequest
    >();

  const decisions:
    DecisionRecord[] = [];

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
    async () => ({
      success: true,

      approvals:
        Array.from(
          approvals.values(),
        ).map(
          (approval) => {
            const relatedDecision =
              decisions.find(
                (decision) =>
                  decision.receiptId ===
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
          }
        ),
    }),
  );

  app.get(
    "/v1/decisions",
    async () => ({
      success: true,
      decisions:
        decisions.slice(0, 50),
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
        approvals.get(
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

        approvals.set(
          updated.id,
          updated,
        );

        const relatedDecision =
          decisions.find(
            (decision) =>
              decision.receiptId ===
              updated.receiptId,
          );

        if (relatedDecision) {
          relatedDecision.approvalStatus =
            updated.status;

          relatedDecision.decidedAt =
            updated.decidedAt;

          relatedDecision.decidedBy =
            updated.decidedBy;

          relatedDecision.approvalReason =
            updated.reason;
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
        approvals.get(
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

        approvals.set(
          updated.id,
          updated,
        );

        const relatedDecision =
          decisions.find(
            (decision) =>
              decision.receiptId ===
              updated.receiptId,
          );

        if (relatedDecision) {
          relatedDecision.approvalStatus =
            updated.status;

          relatedDecision.decidedAt =
            updated.decidedAt;

          relatedDecision.decidedBy =
            updated.decidedBy;

          relatedDecision.approvalReason =
            updated.reason;
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

      decisions.unshift(
        decisionRecord
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

        approvals.set(
          approval.id,
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