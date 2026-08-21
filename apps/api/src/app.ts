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
  type StoredSessionRecord,
  type StoredUserRecord,
} from "./storage.js";

import {
  createAccessToken,
  hashAccessToken,
  hashPassword,
  isAcceptablePassword,
  isValidEmail,
  normalizeEmail,
  toPublicUser,
  verifyPassword,
} from "./auth.js";

type DecisionBody = {
  request?: ActionRequest;
  policyId?: string;
  referenceId?: string;
};

type ApprovalDecisionBody = {
  decidedBy?: string;
  reason?: string;
};

type RegisterBody = {
  email?: string;
  password?: string;
  organizationName?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

const AUTH_SESSION_TTL_MS =
  30 * 24 * 60 * 60 * 1000;

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

  const issueSession =
    async (
      userId: string,
    ) => {
      const accessToken =
        createAccessToken();

      const now =
        new Date();

      const expiresAt =
        new Date(
          now.getTime() +
          AUTH_SESSION_TTL_MS,
        ).toISOString();

      const session:
        StoredSessionRecord = {
          id:
            randomUUID(),

          userId,

          tokenHash:
            hashAccessToken(
              accessToken,
            ),

          createdAt:
            now.toISOString(),

          expiresAt,
        };

      await storage
        .saveSession(
          session,
        );

      return {
        accessToken,
        expiresAt,
      };
    };

  const getBearerToken =
    (
      authorization:
        string | undefined,
    ): string | undefined => {
      const match =
        String(
          authorization || "",
        )
          .trim()
          .match(
            /^Bearer\s+(.+)$/i,
          );

      return match?.[1]
        ?.trim() ||
        undefined;
    };

  const resolveAuthenticatedUser =
    async (
      authorization:
        string | undefined,
    ): Promise<
      StoredUserRecord | undefined
    > => {
      const token =
        getBearerToken(
          authorization,
        );

      if (!token) {
        return undefined;
      }

      const tokenHash =
        hashAccessToken(
          token,
        );

      const session =
        await storage
          .getSessionByTokenHash(
            tokenHash,
          );

      if (!session) {
        return undefined;
      }

      const expiry =
        Date.parse(
          session.expiresAt,
        );

      if (
        !Number.isFinite(expiry) ||
        expiry <= Date.now()
      ) {
        await storage
          .deleteSessionByTokenHash(
            tokenHash,
          );

        return undefined;
      }

      return storage
        .getUserById(
          session.userId,
        );
    };

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

  app.post<{
    Body: RegisterBody;
  }>(
    "/v1/auth/register",
    async (
      request,
      reply,
    ) => {
      const email =
        normalizeEmail(
          request.body?.email,
        );

      const password =
        String(
          request.body?.password ||
          "",
        );

      const organizationName =
        String(
          request.body
            ?.organizationName ||
          "",
        ).trim();

      if (!isValidEmail(email)) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "A valid email address is required.",
          });
      }

      if (
        !isAcceptablePassword(
          password,
        )
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Password must be between 12 and 256 characters.",
          });
      }

      if (
        organizationName.length < 2 ||
        organizationName.length > 120
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Organization name must be between 2 and 120 characters.",
          });
      }

      const existing =
        await storage
          .getUserByEmail(
            email,
          );

      if (existing) {
        return reply
          .code(409)
          .send({
            success: false,
            message:
              "An account already exists for this email address.",
          });
      }

      const now =
        new Date()
          .toISOString();

      const user:
        StoredUserRecord = {
          id:
            randomUUID(),

          email,

          passwordHash:
            await hashPassword(
              password,
            ),

          organizationId:
            randomUUID(),

          organizationName,

          role:
            "OWNER",

          createdAt:
            now,

          updatedAt:
            now,
        };

      try {
        await storage
          .saveUser(
            user,
          );
      } catch (error) {
        const code =
          typeof error === "object" &&
          error !== null &&
          "code" in error
            ? Number(
                (
                  error as {
                    code?: unknown;
                  }
                ).code,
              )
            : undefined;

        if (code === 11000) {
          return reply
            .code(409)
            .send({
              success: false,
              message:
                "An account already exists for this email address.",
            });
        }

        throw error;
      }

      const session =
        await issueSession(
          user.id,
        );

      return reply
        .code(201)
        .send({
          success: true,

          user:
            toPublicUser(
              user,
            ),

          accessToken:
            session.accessToken,

          tokenType:
            "Bearer",

          expiresAt:
            session.expiresAt,
        });
    },
  );

  app.post<{
    Body: LoginBody;
  }>(
    "/v1/auth/login",
    async (
      request,
      reply,
    ) => {
      const email =
        normalizeEmail(
          request.body?.email,
        );

      const password =
        String(
          request.body?.password ||
          "",
        );

      const user =
        await storage
          .getUserByEmail(
            email,
          );

      const validPassword =
        user
          ? await verifyPassword(
              password,
              user.passwordHash,
            )
          : false;

      if (
        !user ||
        !validPassword
      ) {
        return reply
          .code(401)
          .send({
            success: false,
            message:
              "Invalid email or password.",
          });
      }

      const session =
        await issueSession(
          user.id,
        );

      return {
        success: true,

        user:
          toPublicUser(
            user,
          ),

        accessToken:
          session.accessToken,

        tokenType:
          "Bearer",

        expiresAt:
          session.expiresAt,
      };
    },
  );

  app.get(
    "/v1/auth/me",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers
            .authorization,
        );

      if (!user) {
        return reply
          .code(401)
          .send({
            success: false,
            message:
              "Authentication is required.",
          });
      }

      return {
        success: true,
        user:
          toPublicUser(
            user,
          ),
      };
    },
  );

  app.post(
    "/v1/auth/logout",
    async (
      request,
      reply,
    ) => {
      const token =
        getBearerToken(
          request.headers
            .authorization,
        );

      if (!token) {
        return reply
          .code(401)
          .send({
            success: false,
            message:
              "Authentication is required.",
          });
      }

      await storage
        .deleteSessionByTokenHash(
          hashAccessToken(
            token,
          ),
        );

      return {
        success: true,
      };
    },
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