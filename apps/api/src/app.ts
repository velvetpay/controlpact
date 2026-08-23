import {
  createHash,
  randomUUID,
} from "node:crypto";

import Fastify, {
  type FastifyReply,
} from "fastify";

import Stripe from "stripe";
import rawBody from "fastify-raw-body";

import {
  evaluatePolicy,
  type ActionRequest,
} from "@controlpact/policy-engine";

import {
  PolicyRegistry,
} from "@controlpact/policy-registry";

import {
  signDecisionReceipt,
  verifyDecisionReceipt,
} from "@controlpact/receipts";

import {
  createApprovalRequest,
  approveRequest,
  rejectRequest,
  type ApprovalRequest,
} from "@controlpact/approvals";

import {
  createControlPactStorage,
  type StoredApiKeyRecord,
  type StoredSessionRecord,
  type StoredUserRecord,
} from "./storage.js";

import {
  createControlPactDomainStorage,
  type AgentStatus,
  type ControlEnvironmentCategory,
  type ControlEnvironmentMode,
  type ControlEnvironmentStatus,
  type OrganizationPolicyStatus,
  type OrganizationRole,
  type TeamMemberStatus,
} from "./domain-storage.js";
import {
  createReviewWorkflowStorage,
  type ReviewEntityType,
  type ReviewEventType,
} from "./review-workflow-storage.js";


import {
  CONTROLPACT_BILLING_CATALOG,
  buildControlPactEntitlements,
  createControlPactBillingStorage,
  mapStripeSubscriptionStatus,
} from "./billing-storage.js";
import {
  createAccessToken,
  createApiKeySecret,
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
type BillingCheckoutBody = {
  planId?: string;
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

type AcceptInviteBody = {
  token?: string;
  password?: string;
};

type CreateApiKeyBody = {
  name?: string;
  environmentId?: string;
  agentId?: string;
  policyId?: string;
  scopes?: string[];
};

const AUTH_SESSION_TTL_MS =
  30 * 24 * 60 * 60 * 1000;

const TEAM_INVITE_TTL_MS =
  7 * 24 * 60 * 60 * 1000;

type DecisionRecord = {
  id: string;
  receiptId: string;
  receiptSignature?: string;
  receiptIssuedAt?: string;
  agentId: string;
  action: string;
  decision: "ALLOW" | "APPROVE" | "BLOCK";
  policyId: string;
  policyVersion?: number;
  requiredApproverRoles?: string[];
  organizationId?: string;
  apiKeyId?: string;
  idempotencyKey?: string;
  idempotencyRequestHash?: string;
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

  app.register(
    rawBody,
    {
      field:
        "rawBody",
      global:
        false,
      encoding:
        "utf8",
      runFirst:
        true,
    },
  );
  const policyRegistry =
    new PolicyRegistry();

  const storage =
    createControlPactStorage();

  const domainStorage =
    createControlPactDomainStorage();

  const billingStorage =
    createControlPactBillingStorage();
  const getOrganizationBillingEntitlements =
    async (
      organizationId: string,
    ) => {
      await billingStorage
        .ensureSandboxPlatform(
          organizationId,
        );

      const records =
        await billingStorage
          .listByOrganization(
            organizationId,
          );

      return buildControlPactEntitlements(
        records,
      );
    };

  const hasOrganizationProductionAccess =
    async (
      organizationId: string,
    ) => {
      const entitlements =
        await getOrganizationBillingEntitlements(
          organizationId,
        );

      return (
        entitlements
          .productionPlatformAccess ||
        entitlements
          .standaloneProductionSdkAccess
      );
    };

  const reviewStorage =
    createReviewWorkflowStorage();

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

  const storageMode =
    String(
      process.env
        .CONTROLPACT_STORAGE ||
        "memory",
    )
      .trim()
      .toLowerCase();

  const requireApiKeyAuth =
    storageMode === "mongodb" ||
    String(
      process.env
        .CONTROLPACT_REQUIRE_API_KEYS ||
        "",
    )
      .trim()
      .toLowerCase() ===
        "true";

  const requireHumanApprovalAuth =
    storageMode === "mongodb" ||
    String(
      process.env
        .CONTROLPACT_REQUIRE_HUMAN_APPROVAL_AUTH ||
        "",
    )
      .trim()
      .toLowerCase() ===
        "true";

  const toPublicApiKey =
    (
      apiKey: StoredApiKeyRecord,
    ) => ({
      id:
        apiKey.id,

      organizationId:
        apiKey.organizationId,

      name:
        apiKey.name,

      keyPrefix:
        apiKey.keyPrefix,

      environmentId:
        apiKey.environmentId,

      agentId:
        apiKey.agentId,

      policyId:
        apiKey.policyId,

      scopes:
        apiKey.scopes
          ? [...apiKey.scopes]
          : undefined,

      createdAt:
        apiKey.createdAt,

      revokedAt:
        apiKey.revokedAt,

      lastUsedAt:
        apiKey.lastUsedAt,
    });

  const resolveApiKey =
    async (
      authorization:
        string | undefined,
    ): Promise<
      StoredApiKeyRecord | undefined
    > => {
      const token =
        getBearerToken(
          authorization,
        );

      if (
        !token ||
        !token.startsWith(
          "cpk_",
        )
      ) {
        return undefined;
      }

      const apiKey =
        await storage
          .getApiKeyByHash(
            hashAccessToken(
              token,
            ),
          );

      if (
        !apiKey ||
        apiKey.revokedAt
      ) {
        return undefined;
      }

      await storage
        .markApiKeyUsed(
          apiKey.id,
          new Date()
            .toISOString(),
        );

      return apiKey;
    };

  const getIdempotencyKey =
    (
      value: unknown,
    ): string => {
      const first =
        Array.isArray(value)
          ? value[0]
          : value;

      return String(
        first || "",
      ).trim();
    };

  const hashDecisionRequest =
    (
      body: DecisionBody | undefined,
    ): string =>
      createHash("sha256")
        .update(
          JSON.stringify({
            policyId:
              body?.policyId ??
              null,
            referenceId:
              body?.referenceId ??
              null,
            request:
              body?.request ??
              null,
          }),
        )
        .digest("hex");

  const buildStoredDecisionResponse =
    async (
      decision: DecisionRecord,
      idempotentReplay = false,
    ) => {
      const approvals =
        await storage
          .listApprovals();

      const approval =
        approvals.find(
          (item) =>
            item.receiptId ===
            decision.receiptId,
        ) ||
        null;

      return {
        success: true,

        result: {
          decision:
            decision.decision,

          policyId:
            decision.policyId,

          policyVersion:
            decision.policyVersion,

          reason:
            decision.reason,

          matchedRuleIds: [
            ...decision
              .matchedRuleIds,
          ],

          requiredApproverRoles:
            decision
              .requiredApproverRoles
              ? [
                  ...decision
                    .requiredApproverRoles,
                ]
              : undefined,
        },

        receipt: {
          payload: {
            receiptId:
              decision.receiptId,

            agentId:
              decision.agentId,

            action:
              decision.action,

            decision:
              decision.decision,

            policyId:
              decision.policyId,

            referenceId:
              decision.referenceId,

            resource:
              decision.resource,

            matchedRuleIds: [
              ...decision
                .matchedRuleIds,
            ],

            issuedAt:
              decision
                .receiptIssuedAt ||
              decision.createdAt,
          },

          signature:
            decision
              .receiptSignature ||
            "",
        },

        approval,

        idempotentReplay,
      };
    };

  const getApprovalActor =
    async (
      authorization:
        string | undefined,
      decision:
        DecisionRecord | undefined,
      fallbackDecidedBy:
        unknown,
      reply:
        FastifyReply,
    ): Promise<
      {
        decidedBy: string;
      } |
      undefined
    > => {
      const user =
        await resolveAuthenticatedUser(
          authorization,
        );

      if (!user) {
        if (
          requireHumanApprovalAuth
        ) {
          reply
            .code(401)
            .send({
              success: false,
              message:
                "Authenticated human approval authority is required.",
            });

          return undefined;
        }

        const legacyDecidedBy =
          String(
            fallbackDecidedBy ||
            "",
          ).trim();

        return {
          decidedBy:
            legacyDecidedBy,
        };
      }

      if (
        decision
          ?.organizationId &&
        decision.organizationId !==
          user.organizationId
      ) {
        reply
          .code(404)
          .send({
            success: false,
            message:
              "Approval was not found.",
          });

        return undefined;
      }

      const role =
        String(
          user.role ||
          "",
        )
          .trim()
          .toUpperCase();

      const requiredRoles =
        (
          decision
            ?.requiredApproverRoles ||
          []
        )
          .map(
            (item) =>
              String(item || "")
                .trim()
                .toUpperCase(),
          )
          .filter(Boolean);

      const canApprove =
        role === "OWNER" ||
        (
          role === "APPROVER" &&
          (
            requiredRoles.length ===
              0 ||
            requiredRoles.includes(
              role,
            )
          )
        );

      if (!canApprove) {
        reply
          .code(403)
          .send({
            success: false,
            message:
              "Your organisation role is not authorised for this approval.",
          });

        return undefined;
      }

      const roleLabel =
        role.length > 0
          ? role.charAt(0) +
            role
              .slice(1)
              .toLowerCase()
          : "Reviewer";

      return {
        decidedBy:
          `${user.organizationName} ${roleLabel}`,
      };
    };

  app.addHook(
    "onReady",
    async () => {
      await Promise.all([
        storage.ready(),
        domainStorage.ready(),
        reviewStorage.ready(),
      ]);
    },
  );

  app.addHook(
    "onClose",
    async () => {
      await Promise.all([
        storage.close(),
        domainStorage.close(),
        reviewStorage.close(),
      ]);
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

  // CONTROLPACT_TEAM_INVITE_AUTH_V1
  app.post<{
    Body: AcceptInviteBody;
  }>(
    "/v1/auth/accept-invite",
    async (
      request,
      reply,
    ) => {
      const token =
        String(
          request.body?.token ||
          "",
        ).trim();

      const password =
        String(
          request.body?.password ||
          "",
        );

      if (!token) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Invitation token is required.",
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

      const member =
        await domainStorage
          .getTeamMemberByInviteTokenHash(
            hashAccessToken(
              token,
            ),
          );

      if (!member) {
        return reply
          .code(404)
          .send({
            success: false,
            message:
              "Invitation is invalid, expired or already used.",
          });
      }

      if (
        member.status !==
        "INVITED"
      ) {
        return reply
          .code(409)
          .send({
            success: false,
            message:
              "This invitation is no longer pending.",
          });
      }

      const invitationExpiry =
        Date.parse(
          String(
            member.inviteExpiresAt ||
            "",
          ),
        );

      if (
        !Number.isFinite(
          invitationExpiry,
        ) ||
        invitationExpiry <=
          Date.now()
      ) {
        return reply
          .code(410)
          .send({
            success: false,
            message:
              "This invitation has expired.",
          });
      }

      const organizationName =
        String(
          member.organizationName ||
          "",
        ).trim();

      if (!organizationName) {
        return reply
          .code(409)
          .send({
            success: false,
            message:
              "This invitation predates account activation support. Ask an Owner or Admin to issue a new invitation.",
          });
      }

      if (
        member.role ===
        "OWNER"
      ) {
        return reply
          .code(409)
          .send({
            success: false,
            message:
              "Owner authority cannot be activated through a team invitation.",
          });
      }

      const email =
        normalizeEmail(
          member.email,
        );

      const existingUser =
        await storage
          .getUserByEmail(
            email,
          );

      if (existingUser) {
        return reply
          .code(409)
          .send({
            success: false,
            message:
              "A ControlPact account already exists for this email address.",
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
            member.organizationId,

          organizationName,

          role:
            member.role,

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
          typeof error ===
            "object" &&
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
                "A ControlPact account already exists for this email address.",
            });
        }

        throw error;
      }

      await domainStorage
        .saveTeamMember({
          ...member,
          userId:
            user.id,
          status:
            "ACTIVE",
          inviteTokenHash:
            undefined,
          inviteExpiresAt:
            undefined,
          updatedAt:
            now,
        });

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

  // CONTROLPACT_NAMED_APPROVER_ENFORCEMENT_V1
  // CONTROLPACT_AUTHORITY_REVIEW_WORKFLOW_V1
  const getNamedApproverContext =
    async (
      relatedDecision: any,
    ) => {
      const organizationId =
        String(
          relatedDecision
            ?.organizationId ||
            "",
        ).trim();

      const agentId =
        String(
          relatedDecision
            ?.agentId ||
            "",
        ).trim();

      const policyId =
        String(
          relatedDecision
            ?.policyId ||
            "",
        ).trim();

      if (
        !organizationId ||
        !agentId ||
        !policyId
      ) {
        return {
          organizationId,
          assignment:
            undefined,
          member:
            undefined,
        };
      }

      const agent =
        await domainStorage
          .getAgent(
            agentId,
          );

      if (
        !agent ||
        agent.organizationId !==
          organizationId
      ) {
        return {
          organizationId,
          assignment:
            undefined,
          member:
            undefined,
        };
      }

      const assignments =
        await domainStorage
          .listAssignments(
            organizationId,
          );

      const assignment =
        assignments.find(
          (item) =>
            item.environmentId ===
              agent.environmentId &&
            item.agentId ===
              agentId &&
            item.policyId ===
              policyId,
        );

      const responsibleUserId =
        String(
          assignment
            ?.responsibleUserId ||
            "",
        ).trim();

      const member =
        responsibleUserId
          ? await domainStorage
              .getTeamMember(
                responsibleUserId,
              )
          : undefined;

      return {
        organizationId,
        assignment,
        member,
      };
    };

  const enforceNamedAssignmentApprover =
    async (
      authorization: unknown,
      relatedDecision: any,
    ): Promise<{
      ok: boolean;
      statusCode?: number;
      message?: string;
    }> => {
      const organizationId =
        String(
          relatedDecision
            ?.organizationId ||
            "",
        ).trim();

      if (!organizationId) {
        return {
          ok: true,
        };
      }

      const user =
        await resolveAuthenticatedUser(
          String(
            authorization ||
            "",
          ),
        );

      if (!user) {
        return {
          ok: false,
          statusCode: 401,
          message:
            "Authentication is required.",
        };
      }

      if (
        user.organizationId !==
          organizationId
      ) {
        return {
          ok: false,
          statusCode: 403,
          message:
            "This approval belongs to another organisation.",
        };
      }

      const role =
        String(
          user.role ||
          "",
        )
          .trim()
          .toUpperCase();

      /*
       * Owner is the ultimate authority.
       * Owner may override named approval authority.
       * UI requires an override reason and records it.
       */
      if (role === "OWNER") {
        return {
          ok: true,
        };
      }

      const context =
        await getNamedApproverContext(
          relatedDecision,
        );

      const responsibleUserId =
        String(
          context.assignment
            ?.responsibleUserId ||
            "",
        ).trim();

      /*
       * Legacy role-only assignments remain compatible.
       * Role gate below still prevents ADMIN from approving.
       */
      if (!responsibleUserId) {
        return {
          ok: true,
        };
      }

      const member =
        context.member;

      if (
        !member ||
        member.organizationId !==
          organizationId ||
        member.role !==
          "APPROVER"
      ) {
        return {
          ok: false,
          statusCode: 409,
          message:
            "The named Approver assignment is no longer valid. Owner or Admin must repair the assignment.",
        };
      }

      if (
        member.status !==
          "ACTIVE" ||
        !member.userId
      ) {
        return {
          ok: false,
          statusCode: 409,
          message:
            "The named Approver must activate their ControlPact account before deciding this action.",
        };
      }

      if (
        user.id !==
          member.userId ||
        role !==
          "APPROVER"
      ) {
        return {
          ok: false,
          statusCode: 403,
          message:
            "Only the named independent Approver may decide this action. Owner retains override authority.",
        };
      }

      const approvals =
        await storage
          .listApprovals();

      const approval =
        approvals.find(
          (item) =>
            item.receiptId ===
              relatedDecision
                ?.receiptId,
        );

      if (approval) {
        const reviewEvents =
          await reviewStorage
            .listByEntity(
              organizationId,
              "APPROVAL",
              approval.id,
            );

        const lifecycle =
          [...reviewEvents]
            .reverse()
            .find(
              (event) =>
                [
                  "AMENDMENT_REQUESTED",
                  "RESUBMITTED",
                ].includes(
                  event.eventType,
                ),
            )
            ?.eventType;

        if (
          lifecycle ===
            "AMENDMENT_REQUESTED"
        ) {
          return {
            ok: false,
            statusCode: 409,
            message:
              "An amendment is outstanding. Owner or Admin must amend and resubmit before the Approver can decide.",
          };
        }
      }

      return {
        ok: true,
      };
    };

  const isOrganizationAdministrator =
    (role: unknown) =>
      [
        "OWNER",
        "ADMIN",
      ].includes(
        String(role || "")
          .trim()
          .toUpperCase(),
      );

  const organizationRoles:
    OrganizationRole[] = [
      "OWNER",
      "ADMIN",
      "APPROVER",
      "AUDITOR",
      "VIEWER",
    ];

  app.get(
    "/v1/policy-templates",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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
        templates:
          policyRegistry
            .listTemplates(),
      };
    },
  );

  app.get(
    "/v1/environments",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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
        environments:
          await domainStorage
            .listEnvironments(
              user.organizationId,
            ),
      };
    },
  );

  app.post<{
    Body: {
      name?: string;
      description?: string;
      category?:
        ControlEnvironmentCategory;
      mode?:
        ControlEnvironmentMode;
      status?:
        ControlEnvironmentStatus;
    };
  }>(
    "/v1/environments",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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

      if (
        !isOrganizationAdministrator(
          user.role,
        )
      ) {
        return reply
          .code(403)
          .send({
            success: false,
            message:
              "Owner or Admin authority is required.",
          });
      }

      const name =
        String(
          request.body?.name ||
          "",
        ).trim();

      if (
        name.length < 2 ||
        name.length > 120
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Environment name must be between 2 and 120 characters.",
          });
      }

      const category =
        String(
          request.body?.category ||
          "CUSTOM",
        )
          .trim()
          .toUpperCase() as
            ControlEnvironmentCategory;

      const validCategories =
        [
          "SOFTWARE_DEVOPS",
          "FINANCE_PAYMENTS",
          "DATA_SECURITY",
          "CUSTOMER_OPERATIONS",
          "COMMUNICATIONS",
          "IT_ADMINISTRATION",
          "CUSTOM",
        ];

      if (
        !validCategories.includes(
          category,
        )
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Invalid environment category.",
          });
      }

      const mode =
        String(
          request.body?.mode ||
          "TEST",
        )
          .trim()
          .toUpperCase() as
            ControlEnvironmentMode;

      if (
        ![
          "TEST",
          "PRODUCTION",
        ].includes(mode)
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Environment mode must be TEST or PRODUCTION.",
          });
      }

      const now =
        new Date()
          .toISOString();

      const environment = {
        id:
          randomUUID(),
        organizationId:
          user.organizationId,
        name,
        description:
          String(
            request.body
              ?.description ||
            "",
          ).trim() ||
          undefined,
        category,
        mode,
        status:
          "DRAFT" as const,
        createdAt: now,
        updatedAt: now,
      };

      await domainStorage
        .saveEnvironment(
          environment,
        );

      return reply
        .code(201)
        .send({
          success: true,
          environment,
        });
    },
  );

  app.patch<{
    Params: {
      environmentId: string;
    };
    Body: {
      name?: string;
      description?: string;
      status?:
        ControlEnvironmentStatus;
    };
  }>(
    "/v1/environments/:environmentId",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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

      if (
        !isOrganizationAdministrator(
          user.role,
        )
      ) {
        return reply
          .code(403)
          .send({
            success: false,
            message:
              "Owner or Admin authority is required.",
          });
      }

      const environment =
        await domainStorage
          .getEnvironment(
            request.params
              .environmentId,
          );

      if (
        !environment ||
        environment.organizationId !==
          user.organizationId
      ) {
        return reply
          .code(404)
          .send({
            success: false,
            message:
              "Environment was not found.",
          });
      }

      const next = {
        ...environment,
        name:
          request.body?.name ===
          undefined
            ? environment.name
            : String(
                request.body.name,
              ).trim(),
        description:
          request.body
            ?.description ===
          undefined
            ? environment
                .description
            : String(
                request.body
                  .description,
              ).trim() ||
              undefined,
        status:
          request.body?.status ||
          environment.status,
        updatedAt:
          new Date()
            .toISOString(),
      };

      await domainStorage
        .saveEnvironment(next);

      return {
        success: true,
        environment: next,
      };
    },
  );

  app.get(
    "/v1/agents",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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
        agents:
          await domainStorage
            .listAgents(
              user.organizationId,
            ),
      };
    },
  );

  app.post<{
    Body: {
      environmentId?: string;
      name?: string;
      externalAgentId?: string;
      description?: string;
      status?: AgentStatus;
    };
  }>(
    "/v1/agents",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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

      if (
        !isOrganizationAdministrator(
          user.role,
        )
      ) {
        return reply
          .code(403)
          .send({
            success: false,
            message:
              "Owner or Admin authority is required.",
          });
      }

      const environmentId =
        String(
          request.body
            ?.environmentId ||
          "",
        ).trim();

      const environment =
        await domainStorage
          .getEnvironment(
            environmentId,
          );

      if (
        !environment ||
        environment.organizationId !==
          user.organizationId
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "A valid organisation environment is required.",
          });
      }

      const name =
        String(
          request.body?.name ||
          "",
        ).trim();

      const externalAgentId =
        String(
          request.body
            ?.externalAgentId ||
          "",
        ).trim();

      if (
        name.length < 2 ||
        externalAgentId.length < 2
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Agent name and externalAgentId are required.",
          });
      }

      const existing =
        await domainStorage
          .listAgents(
            user.organizationId,
          );

      if (
        existing.some(
          (item) =>
            item.externalAgentId ===
            externalAgentId,
        )
      ) {
        return reply
          .code(409)
          .send({
            success: false,
            message:
              "An agent with this externalAgentId already exists.",
          });
      }

      const now =
        new Date()
          .toISOString();

      const agent = {
        id:
          randomUUID(),
        organizationId:
          user.organizationId,
        environmentId,
        name,
        externalAgentId,
        description:
          String(
            request.body
              ?.description ||
            "",
          ).trim() ||
          undefined,
        status:
          "ACTIVE" as const,
        createdAt: now,
        updatedAt: now,
      };

      await domainStorage
        .saveAgent(agent);

      return reply
        .code(201)
        .send({
          success: true,
          agent,
        });
    },
  );

  app.get(
    "/v1/organization-policies",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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
        policies:
          await domainStorage
            .listOrganizationPolicies(
              user.organizationId,
            ),
      };
    },
  );

  app.post<{
    Body: {
      templateId?: string;
      environmentId?: string;
      name?: string;
      description?: string;
    };
  }>(
    "/v1/organization-policies/from-template",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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

      if (
        !isOrganizationAdministrator(
          user.role,
        )
      ) {
        return reply
          .code(403)
          .send({
            success: false,
            message:
              "Owner or Admin authority is required.",
          });
      }

      const templateId =
        String(
          request.body
            ?.templateId ||
          "",
        ).trim();

      const environmentId =
        String(
          request.body
            ?.environmentId ||
          "",
        ).trim();

      const environment =
        await domainStorage
          .getEnvironment(
            environmentId,
          );

      if (
        !environment ||
        environment.organizationId !==
          user.organizationId
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "A valid organisation environment is required.",
          });
      }

      const id =
        randomUUID();

      const cloned =
        policyRegistry
          .cloneTemplate(
            templateId,
            id,
            String(
              request.body?.name ||
              "",
            ).trim() ||
            undefined,
          );

      if (!cloned) {
        return reply
          .code(404)
          .send({
            success: false,
            message:
              "Policy template was not found.",
          });
      }

      const now =
        new Date()
          .toISOString();

      const organizationPolicy = {
        id,
        organizationId:
          user.organizationId,
        environmentId,
        name:
          cloned.name ||
          "Organisation Policy",
        description:
          String(
            request.body
              ?.description ||
            "",
          ).trim() ||
          undefined,
        templateId:
          cloned.templateId,
        version: 1,
        status:
          "DRAFT" as const,
        policy: {
          ...cloned,
          id,
          version: 1,
          status: "DRAFT" as const,
        },
        createdAt: now,
        updatedAt: now,
      };

      await domainStorage
        .saveOrganizationPolicy(
          organizationPolicy,
        );

      return reply
        .code(201)
        .send({
          success: true,
          policy:
            organizationPolicy,
        });
    },
  );

  app.post<{
    Params: {
      policyId: string;
    };
  }>(
    "/v1/organization-policies/:policyId/publish",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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

      if (
        !isOrganizationAdministrator(
          user.role,
        )
      ) {
        return reply
          .code(403)
          .send({
            success: false,
            message:
              "Owner or Admin authority is required.",
          });
      }

      const policy =
        await domainStorage
          .getOrganizationPolicy(
            request.params.policyId,
          );

      if (
        !policy ||
        policy.organizationId !==
          user.organizationId
      ) {
        return reply
          .code(404)
          .send({
            success: false,
            message:
              "Organisation policy was not found.",
          });
      }

      const now =
        new Date()
          .toISOString();

      const published = {
        ...policy,
        status:
          "ACTIVE" as
            OrganizationPolicyStatus,
        policy: {
          ...policy.policy,
          status:
            "ACTIVE" as const,
        },
        updatedAt: now,
        publishedAt: now,
      };

      await domainStorage
        .saveOrganizationPolicy(
          published,
        );

      return {
        success: true,
        policy: published,
      };
    },
  );

  app.get(
    "/v1/team-members",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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

      let members =
        await domainStorage
          .listTeamMembers(
            user.organizationId,
          );

      const ownerEmail =
        String(user.email)
          .trim()
          .toLowerCase();

      if (
        !members.some(
          (member) =>
            member.userId ===
              user.id ||
            member.email ===
              ownerEmail,
        )
      ) {
        const now =
          new Date()
            .toISOString();

        await domainStorage
          .saveTeamMember({
            id:
              user.id,
            organizationId:
              user.organizationId,
            userId:
              user.id,
            email:
              ownerEmail,
            role:
              "OWNER",
            status:
              "ACTIVE",
            createdAt:
              now,
            updatedAt:
              now,
          });

        members =
          await domainStorage
            .listTeamMembers(
              user.organizationId,
            );
      }

      return {
        success: true,
        members:
          members.map(
            (member) => ({
              id:
                member.id,
              organizationId:
                member.organizationId,
              userId:
                member.userId,
              email:
                member.email,
              displayName:
                member.displayName,
              role:
                member.role,
              status:
                member.status,
              inviteExpiresAt:
                member.inviteExpiresAt,
              createdAt:
                member.createdAt,
              updatedAt:
                member.updatedAt,
            }),
          ),
      };
    },
  );


  // CONTROLPACT_INVITE_REISSUE_V1
  app.post<{
    Params: {
      memberId: string;
    };
  }>(
    "/v1/team-members/:memberId/reinvite",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
        );

      if (!user) {
        return reply.code(401).send({
          success: false,
          message:
            "Authentication is required.",
        });
      }

      if (
        !isOrganizationAdministrator(
          user.role,
        )
      ) {
        return reply.code(403).send({
          success: false,
          message:
            "Owner or Admin authority is required.",
        });
      }

      const member =
        await domainStorage.getTeamMember(
          String(
            request.params.memberId ||
              "",
          ).trim(),
        );

      if (
        !member ||
        member.organizationId !==
          user.organizationId
      ) {
        return reply.code(404).send({
          success: false,
          message:
            "Team member was not found.",
        });
      }

      if (
        member.status !== "INVITED"
      ) {
        return reply.code(409).send({
          success: false,
          message:
            "Only pending invitations can be regenerated.",
        });
      }

      if (member.role === "OWNER") {
        return reply.code(409).send({
          success: false,
          message:
            "Owner accounts are not activated through team invitations.",
        });
      }

      const invitationToken =
        createAccessToken();

      const invitationExpiresAt =
        new Date(
          Date.now() +
            TEAM_INVITE_TTL_MS,
        ).toISOString();

      const updatedMember = {
        ...member,
        inviteTokenHash:
          hashAccessToken(
            invitationToken,
          ),
        inviteExpiresAt:
          invitationExpiresAt,
        updatedAt:
          new Date().toISOString(),
      };

      await domainStorage.saveTeamMember(
        updatedMember,
      );

      const {
        inviteTokenHash:
          _inviteTokenHash,
        ...safeMember
      } = updatedMember;

      return {
        success: true,
        member:
          safeMember,
        invitationToken,
        invitationExpiresAt,
      };
    },
  );


  // CONTROLPACT_INVITE_EMAIL_V1
  app.post<{
    Params: {
      memberId: string;
    };
  }>(
    "/v1/team-members/:memberId/send-invite-email",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
        );

      if (!user) {
        return reply.code(401).send({
          success: false,
          message:
            "Authentication is required.",
        });
      }

      if (
        !isOrganizationAdministrator(
          user.role,
        )
      ) {
        return reply.code(403).send({
          success: false,
          message:
            "Owner or Admin authority is required.",
        });
      }

      const member =
        await domainStorage.getTeamMember(
          String(
            request.params.memberId ||
              "",
          ).trim(),
        );

      if (
        !member ||
        member.organizationId !==
          user.organizationId
      ) {
        return reply.code(404).send({
          success: false,
          message:
            "Team member was not found.",
        });
      }

      if (
        member.status !== "INVITED"
      ) {
        return reply.code(409).send({
          success: false,
          message:
            "Only pending invitations can be emailed.",
        });
      }

      if (member.role === "OWNER") {
        return reply.code(409).send({
          success: false,
          message:
            "Owner accounts are not activated through team invitations.",
        });
      }

      const resendApiKey =
        String(
          process.env.RESEND_API_KEY ||
            "",
        ).trim();

      const fromEmail =
        String(
          process.env
            .CONTROLPACT_INVITE_FROM_EMAIL ||
          process.env.RESEND_FROM_EMAIL ||
          "",
        ).trim();

      const publicWebUrl =
        String(
          process.env
            .CONTROLPACT_PUBLIC_WEB_URL ||
          "",
        )
          .trim()
          .replace(/\/+$/, "");

      if (!resendApiKey) {
        return reply.code(503).send({
          success: false,
          message:
            "Invitation email is not configured. Add RESEND_API_KEY to the existing API .env.",
        });
      }

      if (!fromEmail) {
        return reply.code(503).send({
          success: false,
          message:
            "Invitation sender is not configured. Add CONTROLPACT_INVITE_FROM_EMAIL to the existing API .env.",
        });
      }

      if (!publicWebUrl) {
        return reply.code(503).send({
          success: false,
          message:
            "A public ControlPact web URL is required before invitation emails can be sent externally. Configure CONTROLPACT_PUBLIC_WEB_URL.",
        });
      }

      if (
        publicWebUrl.includes(
          "localhost",
        ) ||
        publicWebUrl.includes(
          "127.0.0.1",
        )
      ) {
        return reply.code(409).send({
          success: false,
          message:
            "Invitation email is blocked while CONTROLPACT_PUBLIC_WEB_URL points to localhost. A remote recipient cannot open your local computer.",
        });
      }

      const invitationToken =
        createAccessToken();

      const invitationExpiresAt =
        new Date(
          Date.now() +
            TEAM_INVITE_TTL_MS,
        ).toISOString();

      const updatedMember = {
        ...member,
        inviteTokenHash:
          hashAccessToken(
            invitationToken,
          ),
        inviteExpiresAt:
          invitationExpiresAt,
        updatedAt:
          new Date().toISOString(),
      };

      await domainStorage.saveTeamMember(
        updatedMember,
      );

      const activationUrl =
        `${publicWebUrl}/?invite=${encodeURIComponent(invitationToken)}`;

      const recipientName =
        String(
          member.displayName ||
            member.email,
        ).trim();

      const organisationName =
        String(
          user.organizationName ||
            "your organisation",
        ).trim();

      const subject =
        `You're invited to ${organisationName} on ControlPact`;

      const text =
        [
          `Hello ${recipientName},`,
          "",
          `You have been invited to join ${organisationName} on ControlPact as ${member.role}.`,
          "",
          "Activate your access:",
          activationUrl,
          "",
          `This invitation expires on ${new Date(invitationExpiresAt).toUTCString()}.`,
          "",
          "If you were not expecting this invitation, you can ignore this email.",
          "",
          "ControlPact",
          "Authority Layer",
        ].join("\n");

      const html =
        `<!doctype html>
<html>
  <body style="margin:0;background:#07111f;color:#e5edf8;font-family:Arial,sans-serif">
    <div style="max-width:620px;margin:0 auto;padding:32px">
      <div style="background:#0d1728;border:1px solid #26344a;border-radius:14px;padding:30px">
        <div style="font-size:12px;letter-spacing:.14em;color:#60a5fa;font-weight:700">CONTROLPACT · AUTHORITY LAYER</div>
        <h1 style="font-size:28px;margin:14px 0 8px;color:#fff">Organisation invitation</h1>
        <p style="line-height:1.6;color:#cbd5e1">Hello ${recipientName},</p>
        <p style="line-height:1.6;color:#cbd5e1">You have been invited to join <strong>${organisationName}</strong> on ControlPact with the role <strong>${member.role}</strong>.</p>
        <p style="margin:28px 0">
          <a href="${activationUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:9px">Activate ControlPact Access</a>
        </p>
        <p style="font-size:13px;line-height:1.6;color:#94a3b8">This one-time invitation expires on ${new Date(invitationExpiresAt).toUTCString()}.</p>
        <p style="font-size:13px;line-height:1.6;color:#94a3b8">If you were not expecting this invitation, you can ignore this email.</p>
      </div>
    </div>
  </body>
</html>`;

      let emailResponse;

      try {
        emailResponse =
          await fetch(
            "https://api.resend.com/emails",
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${resendApiKey}`,
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  from:
                    fromEmail,
                  to: [
                    member.email,
                  ],
                  subject,
                  html,
                  text,
                }),
            },
          );
      } catch {
        return reply.code(502).send({
          success: false,
          message:
            "ControlPact could not reach the email provider. The invitation was regenerated but not sent.",
          activationUrl,
          invitationExpiresAt,
        });
      }

      const emailData =
        await emailResponse
          .json()
          .catch(() => null);

      if (!emailResponse.ok) {
        return reply.code(502).send({
          success: false,
          message:
            emailData?.message ||
            "The email provider rejected the invitation email.",
          activationUrl,
          invitationExpiresAt,
        });
      }

      return {
        success: true,
        message:
          `Invitation email sent to ${member.email}.`,
        emailId:
          emailData?.id,
        member: {
          id:
            updatedMember.id,
          email:
            updatedMember.email,
          displayName:
            updatedMember.displayName,
          role:
            updatedMember.role,
          status:
            updatedMember.status,
        },
        invitationExpiresAt,
      };
    },
  );

  app.post<{
    Body: {
      email?: string;
      displayName?: string;
      role?: OrganizationRole;
      status?: TeamMemberStatus;
    };
  }>(
    "/v1/team-members",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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

      if (
        !isOrganizationAdministrator(
          user.role,
        )
      ) {
        return reply
          .code(403)
          .send({
            success: false,
            message:
              "Owner or Admin authority is required.",
          });
      }

      const email =
        normalizeEmail(
          request.body?.email,
        );

      if (
        !isValidEmail(email)
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "A valid team member email is required.",
          });
      }

      const role =
        String(
          request.body?.role ||
          "VIEWER",
        )
          .trim()
          .toUpperCase() as
            OrganizationRole;

      if (
        !organizationRoles.includes(
          role,
        )
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Invalid organisation role.",
          });
      }

      const existing =
        await domainStorage
          .listTeamMembers(
            user.organizationId,
          );

      if (
        existing.some(
          (item) =>
            item.email ===
            email,
        )
      ) {
        return reply
          .code(409)
          .send({
            success: false,
            message:
              "This team member already exists.",
          });
      }

      const invitationToken =
        createAccessToken();

      const invitationExpiresAt =
        new Date(
          Date.now() +
          TEAM_INVITE_TTL_MS,
        ).toISOString();

      const now =
        new Date()
          .toISOString();

      const member = {
        id:
          randomUUID(),
        organizationId:
          user.organizationId,
        organizationName:
          user.organizationName,
        email,
        displayName:
          String(
            request.body
              ?.displayName ||
            "",
          ).trim() ||
          undefined,
        role,
        status:
          "INVITED" as const,
        inviteTokenHash:
          hashAccessToken(
            invitationToken,
          ),
        inviteExpiresAt:
          invitationExpiresAt,
        createdAt: now,
        updatedAt: now,
      };

      await domainStorage
        .saveTeamMember(member);

      return reply
        .code(201)
        .send({
          success: true,
          member: {
            id:
              member.id,
            organizationId:
              member.organizationId,
            email:
              member.email,
            displayName:
              member.displayName,
            role:
              member.role,
            status:
              member.status,
            inviteExpiresAt:
              member.inviteExpiresAt,
            createdAt:
              member.createdAt,
            updatedAt:
              member.updatedAt,
          },
          invitationToken,
          invitationExpiresAt,
        });
    },
  );

  app.get(
    "/v1/agent-assignments",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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
        assignments:
          await domainStorage
            .listAssignments(
              user.organizationId,
            ),
      };
    },
  );

  app.post<{
    Body: {
      environmentId?: string;
      agentId?: string;
      policyId?: string;
      responsibleUserId?: string;
      responsibleRole?: OrganizationRole;
    };
  }>(
    "/v1/agent-assignments",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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

      if (
        !isOrganizationAdministrator(
          user.role,
        )
      ) {
        return reply
          .code(403)
          .send({
            success: false,
            message:
              "Owner or Admin authority is required.",
          });
      }

      const environmentId =
        String(
          request.body
            ?.environmentId ||
          "",
        ).trim();

      const agentId =
        String(
          request.body
            ?.agentId ||
          "",
        ).trim();

      const policyId =
        String(
          request.body
            ?.policyId ||
          "",
        ).trim();

      const [
        environment,
        agent,
        policy,
      ] =
        await Promise.all([
          domainStorage
            .getEnvironment(
              environmentId,
            ),
          domainStorage
            .getAgent(
              agentId,
            ),
          domainStorage
            .getOrganizationPolicy(
              policyId,
            ),
        ]);

      if (
        !environment ||
        !agent ||
        !policy ||
        environment.organizationId !==
          user.organizationId ||
        agent.organizationId !==
          user.organizationId ||
        policy.organizationId !==
          user.organizationId ||
        agent.environmentId !==
          environment.id ||
        policy.environmentId !==
          environment.id
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Environment, agent and policy must belong to the same organisation environment.",
          });
      }

      // CONTROLPACT_ASSIGNMENT_APPROVER_AUTHORITY_V1
      const requestedResponsibleUserId =
        String(
          request.body
            ?.responsibleUserId ||
          "",
        ).trim();

      let responsibleUserId:
        string | undefined =
          requestedResponsibleUserId ||
          undefined;

      let responsibleRole:
        OrganizationRole | undefined =
          request.body
            ?.responsibleRole
            ? String(
                request.body
                  .responsibleRole,
              )
                .trim()
                .toUpperCase() as
                  OrganizationRole
            : undefined;

      if (responsibleUserId) {
        const approverMember =
          await domainStorage
            .getTeamMember(
              responsibleUserId,
            );

        if (
          !approverMember ||
          approverMember
            .organizationId !==
              user.organizationId ||
          approverMember.role !==
            "APPROVER" ||
          approverMember.status ===
            "DISABLED"
        ) {
          return reply
            .code(400)
            .send({
              success: false,
              message:
                "The selected independent Approver must be a valid non-disabled Approver in this organisation.",
            });
        }

        const creatorEmail =
          String(user.email)
            .trim()
            .toLowerCase();

        const approverEmail =
          String(
            approverMember.email,
          )
            .trim()
            .toLowerCase();

        if (
          approverMember.userId ===
            user.id ||
          approverEmail ===
            creatorEmail
        ) {
          return reply
            .code(400)
            .send({
              success: false,
              message:
                "The assignment Approver must be independent from the Owner or Admin creating the assignment.",
            });
        }

        responsibleRole =
          "APPROVER";
      } else if (
        responsibleRole &&
        !organizationRoles.includes(
          responsibleRole,
        )
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Invalid responsible role.",
          });
      }

      const now =
        new Date()
          .toISOString();

      const assignment = {
        id:
          randomUUID(),
        organizationId:
          user.organizationId,
        environmentId,
        agentId,
        policyId,
        responsibleUserId,
        responsibleRole,
        createdAt: now,
        updatedAt: now,
      };

      await domainStorage
        .saveAssignment(
          assignment,
        );

      return reply
        .code(201)
        .send({
          success: true,
          assignment,
        });
    },
  );
  app.get(
    "/v1/api-keys",
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

      const apiKeys =
        await storage
          .listApiKeysByOrganization(
            user.organizationId,
          );

      return {
        success: true,

        apiKeys:
          apiKeys.map(
            toPublicApiKey,
          ),
      };
    },
  );

  app.post<{
    Body: CreateApiKeyBody;
  }>(
    "/v1/api-keys",
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

      const name =
        String(
          request.body?.name ||
          "",
        ).trim();

      if (
        name.length < 2 ||
        name.length > 80
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "API key name must be between 2 and 80 characters.",
          });
      }

      const environmentId =
        String(
          request.body
            ?.environmentId ||
          "",
        ).trim();

      const agentId =
        String(
          request.body
            ?.agentId ||
          "",
        ).trim();

      const policyId =
        String(
          request.body
            ?.policyId ||
          "",
        ).trim();

      if (
        request.body?.scopes !==
          undefined &&
        !Array.isArray(
          request.body.scopes,
        )
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "API key scopes must be an array.",
          });
      }

      const requestedScopes =
        Array.from(
          new Set(
            (
              request.body?.scopes ||
              []
            )
              .map(
                (scope) =>
                  String(scope || "")
                    .trim(),
              )
              .filter(Boolean),
          ),
        );

      const validScopes = [
        "decisions:execute",
      ];

      if (
        requestedScopes.some(
          (scope) =>
            !validScopes.includes(
              scope,
            ),
        )
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Unsupported API key scope.",
          });
      }

      const bindingCount =
        [
          environmentId,
          agentId,
          policyId,
        ].filter(Boolean).length;

      if (
        bindingCount !== 0 &&
        bindingCount !== 3
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Scoped API keys must bind environmentId, agentId and policyId together.",
          });
      }

      if (
        bindingCount === 0 &&
        requestedScopes.length > 0
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "API key scopes require environment, agent and policy bindings.",
          });
      }

      let scopes:
        string[] |
        undefined;

      if (bindingCount === 3) {
        const [
          environment,
          agent,
          policy,
          assignments,
        ] =
          await Promise.all([
            domainStorage
              .getEnvironment(
                environmentId,
              ),
            domainStorage
              .getAgent(
                agentId,
              ),
            domainStorage
              .getOrganizationPolicy(
                policyId,
              ),
            domainStorage
              .listAssignments(
                user.organizationId,
              ),
          ]);

        const assignment =
          assignments.find(
            (item) =>
              item.environmentId ===
                environmentId &&
              item.agentId ===
                agentId &&
              item.policyId ===
                policyId,
          );

        if (
          !environment ||
          !agent ||
          !policy ||
          !assignment ||
          environment.organizationId !==
            user.organizationId ||
          agent.organizationId !==
            user.organizationId ||
          policy.organizationId !==
            user.organizationId ||
          agent.environmentId !==
            environment.id ||
          policy.environmentId !==
            environment.id
        ) {
          return reply
            .code(400)
            .send({
              success: false,
              message:
                "Scoped API key bindings must match an existing organisation agent assignment.",
            });
        }

        if (
          environment.status !==
            "ACTIVE" ||
          agent.status !==
            "ACTIVE" ||
          policy.status !==
            "ACTIVE"
        ) {
          return reply
            .code(409)
            .send({
              success: false,
              message:
                "Scoped API keys require an ACTIVE environment, agent and organisation policy.",
            });
        }

        if (
          environment.mode ===
            "PRODUCTION" &&
          !(
            await hasOrganizationProductionAccess(
              user.organizationId,
            )
          )
        ) {
          return reply
            .code(402)
            .send({
              success: false,
              code:
                "PRODUCTION_ENTITLEMENT_REQUIRED",
              message:
                "A Production Platform, Business Platform, Enterprise, or standalone Production SDK entitlement is required for a production execution key.",
            });
        }
        scopes =
          requestedScopes.length > 0
            ? requestedScopes
            : [
                "decisions:execute",
              ];
      }

      const secret =
        createApiKeySecret();

      const apiKey:
        StoredApiKeyRecord = {
          id:
            randomUUID(),

          organizationId:
            user.organizationId,

          createdByUserId:
            user.id,

          name,

          keyPrefix:
            secret.slice(
              0,
              12,
            ),

          keyHash:
            hashAccessToken(
              secret,
            ),

          environmentId:
            bindingCount === 3
              ? environmentId
              : undefined,

          agentId:
            bindingCount === 3
              ? agentId
              : undefined,

          policyId:
            bindingCount === 3
              ? policyId
              : undefined,

          scopes,

          createdAt:
            new Date()
              .toISOString(),
        };

      await storage
        .saveApiKey(
          apiKey,
        );

      return reply
        .code(201)
        .send({
          success: true,

          apiKey:
            toPublicApiKey(
              apiKey,
            ),

          secret,

          message:
            "Store this API key securely. It will not be shown again.",
        });
    },
  );

  app.get<{
    Params: {
      receiptId: string;
    };
  }>(
    "/v1/receipts/:receiptId/verify",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers.authorization,
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

      const decision =
        await storage
          .findDecisionByReceiptId(
            request.params.receiptId,
          );

      if (
        !decision ||
        (
          decision.organizationId &&
          decision.organizationId !==
            user.organizationId
        )
      ) {
        return reply
          .code(404)
          .send({
            success: false,
            message:
              "Receipt was not found.",
          });
      }

      if (
        !decision.receiptSignature ||
        !decision.receiptIssuedAt
      ) {
        return reply
          .code(409)
          .send({
            success: false,
            message:
              "This earlier decision does not contain persisted signature proof.",
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

      const valid =
        verifyDecisionReceipt(
          {
            payload: {
              receiptId:
                decision.receiptId,
              agentId:
                decision.agentId,
              action:
                decision.action,
              decision:
                decision.decision,
              policyId:
                decision.policyId,
              referenceId:
                decision.referenceId,
              resource:
                decision.resource,
              matchedRuleIds:
                decision.matchedRuleIds,
              issuedAt:
                decision.receiptIssuedAt,
            },
            signature:
              decision.receiptSignature,
          },
          receiptSecret,
        );

      return {
        success: true,
        valid,
        receiptId:
          decision.receiptId,
      };
    },
  );
  app.post<{
    Params: {
      apiKeyId: string;
    };
  }>(
    "/v1/api-keys/:apiKeyId/revoke",
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

      const apiKey =
        await storage
          .getApiKeyById(
            request.params
              .apiKeyId,
          );

      if (
        !apiKey ||
        apiKey.organizationId !==
          user.organizationId
      ) {
        return reply
          .code(404)
          .send({
            success: false,
            message:
              "API key was not found.",
          });
      }

      if (!apiKey.revokedAt) {
        await storage
          .revokeApiKey(
            apiKey.id,
            new Date()
              .toISOString(),
          );
      }

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

  app.get<{
    Querystring: {
      entityType?: string;
      entityId?: string;
    };
  }>(
    "/v1/review-events",
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

      const entityTypeRaw =
        String(
          request.query
            ?.entityType ||
            "",
        )
          .trim()
          .toUpperCase();

      const entityType:
        ReviewEntityType |
        undefined =
          entityTypeRaw ===
            "APPROVAL" ||
          entityTypeRaw ===
            "AUDIT"
            ? entityTypeRaw as
                ReviewEntityType
            : undefined;

      const entityId =
        String(
          request.query
            ?.entityId ||
            "",
        ).trim() ||
        undefined;

      return {
        success: true,
        events:
          await reviewStorage
            .listByOrganization(
              user.organizationId,
              entityType,
              entityId,
            ),
      };
    },
  );

  app.post<{
    Body: {
      entityType?: string;
      entityId?: string;
      decisionId?: string;
      eventType?: string;
      comment?: string;
    };
  }>(
    "/v1/review-events",
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

      const role =
        String(
          user.role ||
          "",
        )
          .trim()
          .toUpperCase();

      const entityTypeRaw =
        String(
          request.body
            ?.entityType ||
            "",
        )
          .trim()
          .toUpperCase();

      const entityType:
        ReviewEntityType |
        undefined =
          entityTypeRaw ===
            "APPROVAL" ||
          entityTypeRaw ===
            "AUDIT"
            ? entityTypeRaw as
                ReviewEntityType
            : undefined;

      const entityId =
        String(
          request.body
            ?.entityId ||
            "",
        ).trim();

      const eventTypeRaw =
        String(
          request.body
            ?.eventType ||
            "",
        )
          .trim()
          .toUpperCase();

      const validEventTypes:
        ReviewEventType[] = [
          "COMMENT",
          "AMENDMENT_REQUESTED",
          "RESUBMITTED",
          "AUDIT_COMPLETED",
          "OWNER_OVERRIDE",
        ];

      const eventType =
        validEventTypes.includes(
          eventTypeRaw as
            ReviewEventType,
        )
          ? eventTypeRaw as
              ReviewEventType
          : undefined;

      const comment =
        String(
          request.body
            ?.comment ||
            "",
        ).trim();

      if (
        !entityType ||
        !entityId ||
        !eventType
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Valid entityType, entityId and eventType are required.",
          });
      }

      if (
        !comment ||
        comment.length > 2000
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "A review comment between 1 and 2000 characters is required.",
          });
      }

      let relatedDecision:
        any =
          undefined;

      if (
        entityType ===
          "APPROVAL"
      ) {
        const approval =
          await storage
            .getApproval(
              entityId,
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

        relatedDecision =
          await storage
            .findDecisionByReceiptId(
              approval.receiptId,
            );
      } else {
        const decisions =
          await storage
            .listDecisions(
              500,
            );

        relatedDecision =
          decisions.find(
            (item) =>
              item.id ===
                entityId,
          );
      }

      if (
        !relatedDecision
      ) {
        return reply
          .code(404)
          .send({
            success: false,
            message:
              "Related decision was not found.",
          });
      }

      if (
        relatedDecision
          .organizationId !==
        user.organizationId
      ) {
        return reply
          .code(403)
          .send({
            success: false,
            message:
              "This review belongs to another organisation.",
          });
      }

      let allowed = false;

      if (
        entityType ===
          "APPROVAL"
      ) {
        if (
          eventType ===
            "COMMENT"
        ) {
          if (
            role ===
              "OWNER" ||
            role ===
              "ADMIN"
          ) {
            allowed = true;
          } else if (
            role ===
              "APPROVER"
          ) {
            const context =
              await getNamedApproverContext(
                relatedDecision,
              );

            allowed =
              Boolean(
                context.member &&
                context.member
                  .status ===
                    "ACTIVE" &&
                context.member
                  .role ===
                    "APPROVER" &&
                context.member
                  .userId ===
                    user.id,
              );
          }
        }

        if (
          eventType ===
            "AMENDMENT_REQUESTED"
        ) {
          if (
            role ===
              "OWNER"
          ) {
            allowed = true;
          } else if (
            role ===
              "APPROVER"
          ) {
            const context =
              await getNamedApproverContext(
                relatedDecision,
              );

            allowed =
              Boolean(
                context.member &&
                context.member
                  .status ===
                    "ACTIVE" &&
                context.member
                  .userId ===
                    user.id,
              );
          }
        }

        if (
          eventType ===
            "RESUBMITTED"
        ) {
          allowed =
            role === "OWNER" ||
            role === "ADMIN";
        }

        if (
          eventType ===
            "OWNER_OVERRIDE"
        ) {
          allowed =
            role === "OWNER";
        }
      }

      if (
        entityType ===
          "AUDIT"
      ) {
        if (
          eventType ===
            "COMMENT"
        ) {
          allowed =
            role === "OWNER" ||
            role === "ADMIN" ||
            role === "AUDITOR";
        }

        if (
          eventType ===
            "AMENDMENT_REQUESTED" ||
          eventType ===
            "AUDIT_COMPLETED"
        ) {
          allowed =
            role === "OWNER" ||
            role === "AUDITOR";
        }

        if (
          eventType ===
            "RESUBMITTED"
        ) {
          allowed =
            role === "OWNER" ||
            role === "ADMIN";
        }
      }

      if (!allowed) {
        return reply
          .code(403)
          .send({
            success: false,
            message:
              "Your role is not permitted to perform this review action.",
          });
      }

      const reviewEvent = {
        id:
          randomUUID(),
        organizationId:
          user.organizationId,
        entityType,
        entityId,
        decisionId:
          String(
            request.body
              ?.decisionId ||
            relatedDecision.id ||
            "",
          ).trim() ||
          undefined,
        eventType,
        comment,
        actorUserId:
          user.id,
        actorEmail:
          user.email,
        actorRole:
          role,
        createdAt:
          new Date()
            .toISOString(),
      };

      await reviewStorage
        .save(
          reviewEvent,
        );

      return reply
        .code(201)
        .send({
          success: true,
          event:
            reviewEvent,
        });
    },
  );

  app.get(
    "/v1/approvals",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers
            .authorization,
        );

      if (
        !user &&
        requireHumanApprovalAuth
      ) {
        return reply
          .code(401)
          .send({
            success: false,
            message:
              "Authentication is required.",
          });
      }

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
                organizationId:
                  relatedDecision
                    ?.organizationId,
              };
            },
          ),
        );

      return {
        success: true,

        approvals:
          user
            ? enriched.filter(
                (approval) =>
                  approval
                    .organizationId ===
                  user.organizationId,
              )
            : enriched,
      };
    },
  );

  app.get(
    "/v1/decisions",
    async (
      request,
      reply,
    ) => {
      const user =
        await resolveAuthenticatedUser(
          request.headers
            .authorization,
        );

      if (
        !user &&
        requireHumanApprovalAuth
      ) {
        return reply
          .code(401)
          .send({
            success: false,
            message:
              "Authentication is required.",
          });
      }

      const decisions =
        await storage
          .listDecisions(200);

      return {
        success: true,

        decisions:
          user
            ? decisions
                .filter(
                  (decision) =>
                    decision
                      .organizationId ===
                    user.organizationId,
                )
                .slice(0, 50)
            : decisions.slice(
                0,
                50,
              ),
      };
    },
  );

  app.get<{
    Params: {
      decisionId: string;
    };
  }>(
    "/v1/decisions/:decisionId",
    async (
      request,
      reply,
    ) => {
      const authenticatedApiKey =
        await resolveApiKey(
          request.headers
            .authorization,
        );

      if (!authenticatedApiKey) {
        return reply
          .code(401)
          .send({
            success: false,
            message:
              "A valid ControlPact API key is required.",
          });
      }

      const decision =
        await storage
          .getDecisionById(
            request.params
              .decisionId,
          );

      if (
        !decision ||
        !decision.organizationId ||
        decision.organizationId !==
          authenticatedApiKey
            .organizationId
      ) {
        return reply
          .code(404)
          .send({
            success: false,
            message:
              "Decision was not found.",
          });
      }

      const approvals =
        await storage
          .listApprovals();

      const approval =
        approvals.find(
          (item) =>
            item.receiptId ===
            decision.receiptId,
        ) ||
        null;

      return {
        success: true,

        decision: {
          id:
            decision.id,

          receiptId:
            decision.receiptId,

          agentId:
            decision.agentId,

          action:
            decision.action,

          decision:
            decision.decision,

          policyId:
            decision.policyId,

          policyVersion:
            decision.policyVersion,

          referenceId:
            decision.referenceId,

          resource:
            decision.resource,

          reason:
            decision.reason,

          matchedRuleIds: [
            ...decision
              .matchedRuleIds,
          ],

          requiredApproverRoles:
            decision
              .requiredApproverRoles
              ? [
                  ...decision
                    .requiredApproverRoles,
                ]
              : undefined,

          createdAt:
            decision.createdAt,

          approvalStatus:
            decision
              .approvalStatus,

          decidedAt:
            decision.decidedAt,

          decidedBy:
            decision.decidedBy,

          approvalReason:
            decision
              .approvalReason,
        },

        approval,
      };
    },
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

      const relatedDecision =
        await storage
          .findDecisionByReceiptId(
            approval.receiptId,
          );

      const actor =
        await getApprovalActor(
          request.headers
            .authorization,
          relatedDecision,
          request.body
            ?.decidedBy,
          reply,
        );

      if (!actor) {
        return;
      }

      const namedApproverAuthority =
        await enforceNamedAssignmentApprover(
          request.headers
            .authorization,
          relatedDecision,
        );

      if (
        !namedApproverAuthority.ok
      ) {
        return reply
          .code(
            namedApproverAuthority
              .statusCode ||
              403,
          )
          .send({
            success: false,
            message:
              namedApproverAuthority
                .message ||
              "Named Approver authority is required.",
          });
      }

      try {
        const updated =
          approveRequest(
            approval,
            actor.decidedBy,
            request.body
              ?.reason,
          );

        await storage
          .saveApproval(
            updated,
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

      const relatedDecision =
        await storage
          .findDecisionByReceiptId(
            approval.receiptId,
          );

      const actor =
        await getApprovalActor(
          request.headers
            .authorization,
          relatedDecision,
          request.body
            ?.decidedBy,
          reply,
        );

      if (!actor) {
        return;
      }

      const namedApproverAuthority =
        await enforceNamedAssignmentApprover(
          request.headers
            .authorization,
          relatedDecision,
        );

      if (
        !namedApproverAuthority.ok
      ) {
        return reply
          .code(
            namedApproverAuthority
              .statusCode ||
              403,
          )
          .send({
            success: false,
            message:
              namedApproverAuthority
                .message ||
              "Named Approver authority is required.",
          });
      }

      try {
        const updated =
          rejectRequest(
            approval,
            actor.decidedBy,
            request.body
              ?.reason,
          );

        await storage
          .saveApproval(
            updated,
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
      const authenticatedApiKey =
        await resolveApiKey(
          request.headers
            .authorization,
        );

      if (
        requireApiKeyAuth &&
        !authenticatedApiKey
      ) {
        return reply
          .code(401)
          .send({
            success: false,
            message:
              "A valid ControlPact API key is required.",
          });
      }

      const idempotencyKey =
        getIdempotencyKey(
          request.headers[
            "idempotency-key"
          ],
        );

      if (
        idempotencyKey.length > 200
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Idempotency-Key must not exceed 200 characters.",
          });
      }

      if (
        idempotencyKey &&
        !authenticatedApiKey
      ) {
        return reply
          .code(401)
          .send({
            success: false,
            message:
              "A valid ControlPact API key is required when Idempotency-Key is used.",
          });
      }

      const idempotencyRequestHash =
        idempotencyKey
          ? hashDecisionRequest(
              request.body,
            )
          : undefined;

      if (
        idempotencyKey &&
        authenticatedApiKey
      ) {
        const existing =
          await storage
            .findDecisionByIdempotency(
              authenticatedApiKey
                .organizationId,
              authenticatedApiKey.id,
              idempotencyKey,
            );

        if (existing) {
          if (
            existing
              .idempotencyRequestHash !==
              idempotencyRequestHash
          ) {
            return reply
              .code(409)
              .send({
                success: false,
                message:
                  "This Idempotency-Key was already used for a different decision request.",
              });
          }

          return buildStoredDecisionResponse(
            existing,
            true,
          );
        }
      }

      const callerRequest =
        request.body?.request;

      const action =
        String(
          callerRequest?.action ||
          "",
        ).trim();

      if (!action) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "request.action is required.",
          });
      }

      const keyBindingCount =
        authenticatedApiKey
          ? [
              authenticatedApiKey
                .environmentId,
              authenticatedApiKey
                .agentId,
              authenticatedApiKey
                .policyId,
            ].filter(Boolean).length
          : 0;

      if (
        keyBindingCount !== 0 &&
        keyBindingCount !== 3
      ) {
        return reply
          .code(403)
          .send({
            success: false,
            message:
              "This API key has an incomplete execution binding.",
          });
      }

      const scopedExecution =
        Boolean(
          authenticatedApiKey &&
          keyBindingCount === 3,
        );

      let actionRequest:
        ActionRequest;

      let policyId:
        string;

      let policy:
        Parameters<
          typeof evaluatePolicy
        >[1];

      if (
        scopedExecution &&
        authenticatedApiKey
      ) {
        if (
          !authenticatedApiKey
            .scopes
            ?.includes(
              "decisions:execute",
            )
        ) {
          return reply
            .code(403)
            .send({
              success: false,
              message:
                "This API key is not permitted to execute decisions.",
            });
        }

        const environmentId =
          authenticatedApiKey
            .environmentId!;

        const agentId =
          authenticatedApiKey
            .agentId!;

        policyId =
          authenticatedApiKey
            .policyId!;

        const [
          environment,
          agent,
          organizationPolicy,
          assignments,
        ] =
          await Promise.all([
            domainStorage
              .getEnvironment(
                environmentId,
              ),
            domainStorage
              .getAgent(
                agentId,
              ),
            domainStorage
              .getOrganizationPolicy(
                policyId,
              ),
            domainStorage
              .listAssignments(
                authenticatedApiKey
                  .organizationId,
              ),
          ]);

        const assignment =
          assignments.find(
            (item) =>
              item.environmentId ===
                environmentId &&
              item.agentId ===
                agentId &&
              item.policyId ===
                policyId,
          );

        if (
          !environment ||
          !agent ||
          !organizationPolicy ||
          !assignment ||
          environment.organizationId !==
            authenticatedApiKey
              .organizationId ||
          agent.organizationId !==
            authenticatedApiKey
              .organizationId ||
          organizationPolicy
            .organizationId !==
            authenticatedApiKey
              .organizationId ||
          agent.environmentId !==
            environment.id ||
          organizationPolicy
            .environmentId !==
            environment.id
        ) {
          return reply
            .code(403)
            .send({
              success: false,
              message:
                "The scoped API key no longer matches a valid organisation assignment.",
            });
        }

        if (
          environment.status !==
            "ACTIVE" ||
          agent.status !==
            "ACTIVE" ||
          organizationPolicy.status !==
            "ACTIVE"
        ) {
          return reply
            .code(409)
            .send({
              success: false,
              message:
                "The scoped environment, agent and organisation policy must all be ACTIVE.",
            });
        }

        if (
          environment.mode ===
            "PRODUCTION" &&
          !(
            await hasOrganizationProductionAccess(
              authenticatedApiKey
                .organizationId,
            )
          )
        ) {
          return reply
            .code(402)
            .send({
              success: false,
              code:
                "PRODUCTION_ENTITLEMENT_REQUIRED",
              message:
                "A Production Platform, Business Platform, Enterprise, or standalone Production SDK entitlement is required for production decision execution.",
            });
        }
        actionRequest = {
          ...(callerRequest || {}),
          agentId:
            agent.externalAgentId,
          action,
        };

        policy =
          organizationPolicy.policy;
      } else {
        const callerAgentId =
          String(
            callerRequest
              ?.agentId ||
            "",
          ).trim();

        policyId =
          String(
            request.body
              ?.policyId ||
              "",
          ).trim();

        if (!callerAgentId) {
          return reply
            .code(400)
            .send({
              success: false,
              message:
                "request.agentId is required for an unscoped API key.",
            });
        }

        if (!policyId) {
          return reply
            .code(400)
            .send({
              success: false,
              message:
                "policyId is required for an unscoped API key.",
            });
        }

        const registryPolicy =
          policyRegistry.get(
            policyId,
          );

        if (!registryPolicy) {
          return reply
            .code(404)
            .send({
              success: false,
              message:
                "Requested ControlPact policy was not found.",
            });
        }

        actionRequest = {
          ...(callerRequest || {}),
          agentId:
            callerAgentId,
          action,
        };

        policy =
          registryPolicy;
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

          receiptSignature:
            receipt.signature,

          receiptIssuedAt:
            receipt.payload.issuedAt,

          agentId:
            actionRequest.agentId,

          action:
            actionRequest.action,

          decision:
            result.decision,

          policyId:
            result.policyId,

          policyVersion:
            result.policyVersion,

          requiredApproverRoles:
            result.requiredApproverRoles
              ? [
                  ...result
                    .requiredApproverRoles,
                ]
              : undefined,

          organizationId:
            authenticatedApiKey
              ?.organizationId,

          apiKeyId:
            authenticatedApiKey
              ?.id,

          idempotencyKey:
            idempotencyKey ||
            undefined,

          idempotencyRequestHash,

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

      try {
        await storage
          .saveDecision(
            decisionRecord,
          );
      } catch (error) {
        const code =
          typeof error ===
            "object" &&
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

        if (
          code === 11000 &&
          idempotencyKey &&
          authenticatedApiKey
        ) {
          const existing =
            await storage
              .findDecisionByIdempotency(
                authenticatedApiKey
                  .organizationId,
                authenticatedApiKey.id,
                idempotencyKey,
              );

          if (
            existing &&
            existing
              .idempotencyRequestHash ===
              idempotencyRequestHash
          ) {
            return buildStoredDecisionResponse(
              existing,
              true,
            );
          }
        }

        throw error;
      }

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

  app.post<{
    Body:
      BillingCheckoutBody;
  }>(
    "/v1/billing/checkout",
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

      const planId =
        String(
          request.body
            ?.planId ||
            "",
        ).trim();

      const plan =
        CONTROLPACT_BILLING_CATALOG
          .find(
            (item) =>
              item.id ===
              planId,
          );

      if (
        !plan ||
        plan.id ===
          "sandbox" ||
        plan.id ===
          "enterprise" ||
        plan.amountMinor ===
          null
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "This ControlPact plan is not available through self-service checkout.",
          });
      }

      const stripeSecretKey =
        String(
          process.env
            .STRIPE_SECRET_KEY ||
            "",
        ).trim();

      if (!stripeSecretKey) {
        return reply
          .code(503)
          .send({
            success: false,
            message:
              "ControlPact checkout is not configured yet.",
          });
      }

      const publicWebUrl =
        String(
          process.env
            .CONTROLPACT_PUBLIC_WEB_URL ||
            "",
        )
          .trim()
          .replace(
            /\/+$/,
            "",
          );

      if (
        !publicWebUrl ||
        !/^https?:\/\//i
          .test(
            publicWebUrl,
          )
      ) {
        return reply
          .code(503)
          .send({
            success: false,
            message:
              "ControlPact public web URL is not configured.",
          });
      }

      const recurringInterval =
        plan.interval ===
          "MONTHLY"
          ? "month"
          : "year";

      const stripe =
        new Stripe(
          stripeSecretKey,
        );

      const session =
        await stripe
          .checkout
          .sessions
          .create({
            mode:
              "subscription",
            customer_email:
              user.email,
            client_reference_id:
              user.organizationId,
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency:
                    "gbp",
                  unit_amount:
                    plan.amountMinor,
                  recurring: {
                    interval:
                      recurringInterval,
                  },
                  product_data: {
                    name:
                      plan.label,
                    description:
                      plan.product ===
                        "SDK"
                        ? "ControlPact Production SDK â€” one production application."
                        : "ControlPact hosted production governance subscription.",
                  },
                },
              },
            ],
            metadata: {
              organizationId:
                user.organizationId,
              userId:
                user.id,
              planId:
                plan.id,
              product:
                plan.product,
              plan:
                plan.plan,
            },
            subscription_data: {
              metadata: {
                organizationId:
                  user.organizationId,
                planId:
                  plan.id,
                product:
                  plan.product,
                plan:
                  plan.plan,
              },
            },
            success_url:
              `${publicWebUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:
              `${publicWebUrl}/pricing?checkout=cancelled`,
          });

      if (!session.url) {
        return reply
          .code(502)
          .send({
            success: false,
            message:
              "Stripe did not return a checkout URL.",
          });
      }

      return {
        success: true,
        sessionId:
          session.id,
        url:
          session.url,
      };
    },
  );
  app.post(
    "/v1/billing/stripe/webhook",
    {
      config: {
        rawBody:
          true,
      },
    },
    async (
      request,
      reply,
    ) => {
      const stripeSecretKey =
        String(
          process.env
            .STRIPE_SECRET_KEY ||
            "",
        ).trim();

      const webhookSecret =
        String(
          process.env
            .STRIPE_WEBHOOK_SECRET ||
            "",
        ).trim();

      if (
        !stripeSecretKey ||
        !webhookSecret
      ) {
        return reply
          .code(503)
          .send({
            success: false,
            message:
              "Stripe webhook processing is not configured.",
          });
      }

      const rawSignature =
        request.headers[
          "stripe-signature"
        ];

      const signature =
        Array.isArray(
          rawSignature,
        )
          ? rawSignature[0]
          : rawSignature;

      if (!signature) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Stripe-Signature is required.",
          });
      }

      const rawBodyValue =
        (
          request as typeof request & {
            rawBody?: string | Buffer;
          }
        ).rawBody;

      if (!rawBodyValue) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Stripe webhook raw body is unavailable.",
          });
      }

      const stripe =
        new Stripe(
          stripeSecretKey,
        );

      let event:
        Stripe.Event;

      try {
        event =
          stripe.webhooks
            .constructEvent(
              rawBodyValue,
              signature,
              webhookSecret,
            );
      } catch {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Stripe webhook signature verification failed.",
          });
      }

      const saveStripeEntitlement =
        async ({
          organizationId,
          planId,
          status,
          stripeCustomerId,
          stripeSubscriptionId,
          stripeCheckoutSessionId,
        }: {
          organizationId?: string;
          planId?: string;
          status:
            | "ACTIVE"
            | "PAST_DUE"
            | "CANCELLED"
            | "EXPIRED";
          stripeCustomerId?: string;
          stripeSubscriptionId?: string;
          stripeCheckoutSessionId?: string;
        }) => {
          if (
            !organizationId ||
            !planId
          ) {
            return;
          }

          const plan =
            CONTROLPACT_BILLING_CATALOG
              .find(
                (item) =>
                  item.id ===
                    planId,
              );

          if (
            !plan ||
            plan.id ===
              "sandbox" ||
            plan.id ===
              "enterprise" ||
            plan.amountMinor ===
              null
          ) {
            return;
          }

          const existing =
            await billingStorage
              .getByProduct(
                organizationId,
                plan.product,
              );

          const now =
            new Date()
              .toISOString();

          await billingStorage
            .save({
              id:
                existing?.id ||
                (
                  plan.product ===
                    "SDK"
                    ? `billing_sdk_${organizationId}`
                    : `billing_platform_${organizationId}`
                ),
              organizationId,
              product:
                plan.product,
              plan:
                plan.plan,
              status,
              interval:
                plan.interval,
              currency:
                plan.currency,
              amountMinor:
                plan.amountMinor,
              source:
                "STRIPE",
              stripeCustomerId:
                stripeCustomerId ||
                existing
                  ?.stripeCustomerId,
              stripeSubscriptionId:
                stripeSubscriptionId ||
                existing
                  ?.stripeSubscriptionId,
              stripeCheckoutSessionId:
                stripeCheckoutSessionId ||
                existing
                  ?.stripeCheckoutSessionId,
              metadata: {
                ...(existing
                  ?.metadata ||
                  {}),
                planId:
                  plan.id,
              },
              createdAt:
                existing
                  ?.createdAt ||
                now,
              updatedAt:
                now,
              cancelledAt:
                status ===
                  "CANCELLED"
                  ? now
                  : undefined,
            });
        };

      if (
        event.type ===
          "checkout.session.completed" ||
        event.type ===
          "checkout.session.async_payment_succeeded"
      ) {
        const session =
          event.data.object as
            Stripe.Checkout.Session;

        const organizationId =
          session.metadata
            ?.organizationId ||
          session
            .client_reference_id ||
          undefined;

        const planId =
          session.metadata
            ?.planId;

        const customerId =
          typeof session.customer ===
            "string"
            ? session.customer
            : session.customer
                ?.id;

        const subscriptionId =
          typeof session.subscription ===
            "string"
            ? session.subscription
            : session.subscription
                ?.id;

        await saveStripeEntitlement({
          organizationId,
          planId,
          status:
            session.payment_status ===
              "paid" ||
            session.payment_status ===
              "no_payment_required"
              ? "ACTIVE"
              : "PAST_DUE",
          stripeCustomerId:
            customerId,
          stripeSubscriptionId:
            subscriptionId,
          stripeCheckoutSessionId:
            session.id,
        });
      }

      if (
        event.type ===
          "customer.subscription.created" ||
        event.type ===
          "customer.subscription.updated" ||
        event.type ===
          "customer.subscription.deleted"
      ) {
        const subscription =
          event.data.object as
            Stripe.Subscription;

        const organizationId =
          subscription.metadata
            ?.organizationId;

        const planId =
          subscription.metadata
            ?.planId;

        const customerId =
          typeof subscription.customer ===
            "string"
            ? subscription.customer
            : subscription.customer
                ?.id;

        await saveStripeEntitlement({
          organizationId,
          planId,
          status:
            event.type ===
              "customer.subscription.deleted"
              ? "CANCELLED"
              : mapStripeSubscriptionStatus(
                  subscription.status,
                ),
          stripeCustomerId:
            customerId,
          stripeSubscriptionId:
            subscription.id,
        });
      }

      return {
        received: true,
      };
    },
  );
  app.get(
    "/v1/billing/plans",
    async () => ({
      success: true,
      plans:
        CONTROLPACT_BILLING_CATALOG,
    }),
  );

  app.get(
    "/v1/billing/status",
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

      await billingStorage
        .ensureSandboxPlatform(
          user.organizationId,
        );

      const records =
        await billingStorage
          .listByOrganization(
            user.organizationId,
          );

      return {
        success: true,
        organizationId:
          user.organizationId,
        records,
        entitlements:
          buildControlPactEntitlements(
            records,
          ),
      };
    },
  );

  app.addHook(
    "onClose",
    async () => {
      await billingStorage
        .close();
    },
  );
  app.post<{
    Body: {
      name?: string;
      email?: string;
      company?: string;
      website?: string;
      role?: string;
      requirements?: string;
      solutions?: string[];
      companyUrl?: string;
    };
  }>(
    "/v1/enterprise-enquiries",
    async (
      request,
      reply,
    ) => {
      const name =
        String(
          request.body?.name ||
          "",
        ).trim();

      const email =
        normalizeEmail(
          String(
            request.body?.email ||
            "",
          ),
        );

      const company =
        String(
          request.body?.company ||
          "",
        ).trim();

      const website =
        String(
          request.body?.website ||
          "",
        ).trim();

      const role =
        String(
          request.body?.role ||
          "",
        ).trim();

      const requirements =
        String(
          request.body
            ?.requirements ||
          "",
        ).trim();

      const companyUrl =
        String(
          request.body
            ?.companyUrl ||
          "",
        ).trim();

      const solutions =
        Array.isArray(
          request.body?.solutions,
        )
          ? Array.from(
              new Set(
                request.body
                  .solutions
                  .map(
                    (item) =>
                      String(
                        item ||
                        "",
                      ).trim(),
                  )
                  .filter(Boolean),
              ),
            ).slice(0, 12)
          : [];

      if (companyUrl) {
        return {
          success: true,
        };
      }

      if (
        name.length < 2 ||
        name.length > 120
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Name must be between 2 and 120 characters.",
          });
      }

      if (!isValidEmail(email)) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "A valid work email is required.",
          });
      }

      if (
        company.length < 2 ||
        company.length > 160
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Company must be between 2 and 160 characters.",
          });
      }

      if (
        role.length > 120 ||
        website.length > 240
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Enterprise enquiry details are too long.",
          });
      }

      if (
        requirements.length < 10 ||
        requirements.length > 4000
      ) {
        return reply
          .code(400)
          .send({
            success: false,
            message:
              "Requirements must be between 10 and 4000 characters.",
          });
      }

      const resendApiKey =
        String(
          process.env
            .RESEND_API_KEY ||
          "",
        ).trim();

      const sender =
        String(
          process.env
            .CONTROLPACT_ENTERPRISE_FROM_EMAIL ||
          process.env
            .CONTROLPACT_INVITE_FROM_EMAIL ||
          process.env
            .RESEND_FROM_EMAIL ||
          "",
        ).trim();

      const salesEmail =
        String(
          process.env
            .CONTROLPACT_SALES_EMAIL ||
          "partnerships@velvetpay.app",
        ).trim();

      if (
        !resendApiKey ||
        !sender
      ) {
        return reply
          .code(503)
          .send({
            success: false,
            message:
              "Enterprise enquiry email delivery is not configured.",
          });
      }

      const submittedAt =
        new Date()
          .toISOString();

      const safeSolutions =
        solutions.length > 0
          ? solutions
          : [
              "Not specified",
            ];

      const textBody = [
        "New ControlPact Enterprise enquiry",
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        `Company: ${company}`,
        `Role: ${role || "Not supplied"}`,
        `Website: ${website || "Not supplied"}`,
        `Solutions: ${safeSolutions.join(", ")}`,
        "",
        "Requirements:",
        requirements,
        "",
        `Submitted: ${submittedAt}`,
      ].join("\n");

      const resendResponse =
        await fetch(
          "https://api.resend.com/emails",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${resendApiKey}`,
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                from:
                  sender,
                to: [
                  salesEmail,
                ],
                reply_to:
                  email,
                subject:
                  `ControlPact Enterprise enquiry â€” ${company}`,
                text:
                  textBody,
              }),
          },
        );

      if (!resendResponse.ok) {
        const providerMessage =
          await resendResponse
            .text()
            .catch(
              () => "",
            );

        request.log.error(
          {
            status:
              resendResponse.status,
            providerMessage,
          },
          "ControlPact Enterprise enquiry email delivery failed.",
        );

        return reply
          .code(502)
          .send({
            success: false,
            message:
              "Your enquiry could not be delivered. Please try again.",
          });
      }

      return {
        success: true,
        message:
          "Enterprise enquiry received.",
      };
    },
  );
  return app;
};