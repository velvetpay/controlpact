import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
} from "react-router-dom";
import PageHeader from "../components/PageHeader";
import type {
  ControlPactAccountUser,
} from "../components/AccountAccess";

type ApprovalItem = {
  id: string;
  receiptId: string;
  agentId: string;
  action: string;
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED";
  requestedAt?: string;
  decidedAt?: string;
  decidedBy?: string;
  reason?: string;
  referenceId?: string;
  resource?: string;
};

type DecisionItem = {
  id: string;
  receiptId: string;
  agentId: string;
  policyId: string;
  organizationId?: string;
  referenceId: string;
  action: string;
  approvalStatus?: string;
};

type AssignmentItem = {
  id: string;
  environmentId: string;
  agentId: string;
  policyId: string;
  responsibleUserId?: string;
};

type TeamMember = {
  id: string;
  userId?: string;
  email: string;
  displayName?: string;
  role: string;
  status: string;
};

type ReviewEvent = {
  id: string;
  entityType:
    | "APPROVAL"
    | "AUDIT";
  entityId: string;
  decisionId?: string;
  eventType:
    | "COMMENT"
    | "AMENDMENT_REQUESTED"
    | "RESUBMITTED"
    | "AUDIT_COMPLETED"
    | "OWNER_OVERRIDE";
  comment: string;
  actorEmail: string;
  actorRole: string;
  createdAt: string;
};

type ApprovalsPageProps = {
  accessToken: string;
  user: ControlPactAccountUser;
};

export default function ApprovalsPage({
  accessToken,
  user,
}: ApprovalsPageProps) {
  const [approvals, setApprovals] =
    useState<ApprovalItem[]>([]);

  const [decisions, setDecisions] =
    useState<DecisionItem[]>([]);

  const [assignments, setAssignments] =
    useState<AssignmentItem[]>([]);

  const [members, setMembers] =
    useState<TeamMember[]>([]);

  const [events, setEvents] =
    useState<ReviewEvent[]>([]);

  const [notes, setNotes] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [busy, setBusy] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const role =
    String(
      user.role || "",
    ).toUpperCase();

  const headers =
    useMemo(
      () => ({
        Authorization:
          `Bearer ${accessToken}`,
      }),
      [accessToken],
    );

  const load =
    useCallback(
      async () => {
        try {
          const responses =
            await Promise.all([
              fetch(
                "/controlpact-api/v1/approvals",
                { headers },
              ),
              fetch(
                "/controlpact-api/v1/decisions",
                { headers },
              ),
              fetch(
                "/controlpact-api/v1/agent-assignments",
                { headers },
              ),
              fetch(
                "/controlpact-api/v1/team-members",
                { headers },
              ),
              fetch(
                "/controlpact-api/v1/review-events?entityType=APPROVAL",
                { headers },
              ),
            ]);

          const data =
            await Promise.all(
              responses.map(
                (response) =>
                  response
                    .json()
                    .catch(
                      () => null,
                    ),
              ),
            );

          if (
            responses.some(
              (response) =>
                !response.ok,
            )
          ) {
            throw new Error(
              data.find(
                (item) =>
                  item?.message,
              )?.message ||
                "Unable to load approval review.",
            );
          }

          setApprovals(
            Array.isArray(
              data[0]?.approvals,
            )
              ? data[0].approvals
              : [],
          );

          setDecisions(
            Array.isArray(
              data[1]?.decisions,
            )
              ? data[1].decisions
              : [],
          );

          setAssignments(
            Array.isArray(
              data[2]?.assignments,
            )
              ? data[2].assignments
              : [],
          );

          setMembers(
            Array.isArray(
              data[3]?.members,
            )
              ? data[3].members
              : [],
          );

          setEvents(
            Array.isArray(
              data[4]?.events,
            )
              ? data[4].events
              : [],
          );

          setError("");
        } catch (
          requestError
        ) {
          setError(
            requestError
              instanceof Error
              ? requestError.message
              : "Unable to load approval review.",
          );
        }
      },
      [headers],
    );

  useEffect(() => {
    load();

    const timer =
      window.setInterval(
        load,
        4000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [load]);

  const contextFor =
    (
      approval:
        ApprovalItem,
    ) => {
      const decision =
        decisions.find(
          (item) =>
            item.receiptId ===
              approval.receiptId,
        );

      const assignment =
        decision
          ? assignments.find(
              (item) =>
                item.agentId ===
                  approval.agentId &&
                item.policyId ===
                  decision.policyId,
            )
          : undefined;

      const approver =
        assignment
          ?.responsibleUserId
          ? members.find(
              (member) =>
                member.id ===
                  assignment
                    .responsibleUserId,
            )
          : undefined;

      const approvalEvents =
        events.filter(
          (event) =>
            event.entityId ===
              approval.id,
        );

      const lifecycle =
        [...approvalEvents]
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

      const amendmentOutstanding =
        lifecycle ===
        "AMENDMENT_REQUESTED";

      const isNamedApprover =
        Boolean(
          approver &&
          approver.status ===
            "ACTIVE" &&
          approver.role ===
            "APPROVER" &&
          approver.userId ===
            user.id &&
          role ===
            "APPROVER",
        );

      return {
        decision,
        assignment,
        approver,
        approvalEvents,
        amendmentOutstanding,
        isNamedApprover,
      };
    };

  const postReview =
    async (
      approval:
        ApprovalItem,
      eventType:
        ReviewEvent[
          "eventType"
        ],
    ) => {
      const comment =
        String(
          notes[approval.id] ||
          "",
        ).trim();

      if (!comment) {
        setError(
          "Add a comment before submitting this review action.",
        );
        return false;
      }

      const context =
        contextFor(
          approval,
        );

      const response =
        await fetch(
          "/controlpact-api/v1/review-events",
          {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                entityType:
                  "APPROVAL",
                entityId:
                  approval.id,
                decisionId:
                  context.decision
                    ?.id,
                eventType,
                comment,
              }),
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => null,
          );

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            "Review action failed.",
        );
      }

      return true;
    };

  const reviewAction =
    async (
      approval:
        ApprovalItem,
      eventType:
        ReviewEvent[
          "eventType"
        ],
    ) => {
      setBusy(
        approval.id,
      );
      setError("");
      setMessage("");

      try {
        await postReview(
          approval,
          eventType,
        );

        setNotes(
          (current) => ({
            ...current,
            [approval.id]:
              "",
          }),
        );

        setMessage(
          eventType ===
            "AMENDMENT_REQUESTED"
            ? "Amendment requested. Owner/Admin must amend and resubmit before the assigned Approver can decide."
            : eventType ===
                "RESUBMITTED"
              ? "Amendment response recorded and the item has been resubmitted."
              : "Review comment recorded.",
        );

        await load();
      } catch (
        requestError
      ) {
        setError(
          requestError
            instanceof Error
            ? requestError.message
            : "Review action failed.",
        );
      } finally {
        setBusy("");
      }
    };

  const decide =
    async (
      approval:
        ApprovalItem,
      decision:
        | "approve"
        | "reject",
    ) => {
      const comment =
        String(
          notes[approval.id] ||
          "",
        ).trim();

      if (
        role === "OWNER" &&
        !comment
      ) {
        setError(
          "Owner override requires a recorded reason.",
        );
        return;
      }

      setBusy(
        approval.id,
      );
      setError("");
      setMessage("");

      try {
        const response =
          await fetch(
            `/controlpact-api/v1/approvals/${approval.id}/${decision}`,
            {
              method: "POST",
              headers: {
                ...headers,
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  reason:
                    comment,
                }),
            },
          );

        const data =
          await response
            .json()
            .catch(
              () => null,
            );

        if (
          !response.ok ||
          !data?.approval
        ) {
          throw new Error(
            data?.message ||
              "Approval decision failed.",
          );
        }

        if (
          role === "OWNER"
        ) {
          await postReview(
            approval,
            "OWNER_OVERRIDE",
          );
        }

        setNotes(
          (current) => ({
            ...current,
            [approval.id]:
              "",
          }),
        );

        setMessage(
          role === "OWNER"
            ? `Owner override recorded: ${decision}.`
            : `Approval ${decision} recorded.`,
        );

        await load();
      } catch (
        requestError
      ) {
        setError(
          requestError
            instanceof Error
            ? requestError.message
            : "Approval decision failed.",
        );
      } finally {
        setBusy("");
      }
    };

  const pending =
    approvals.filter(
      (item) =>
        item.status ===
          "PENDING",
    );

  const completed =
    approvals.filter(
      (item) =>
        item.status !==
          "PENDING",
    );

  return (
    <>
      <PageHeader
        eyebrow="STEP 7 · HUMAN AUTHORITY"
        title="Approvals"
        description="Approvers can comment, request amendments, approve or reject assigned work. Owner remains the ultimate authority and may override with a recorded reason."
        action={
          <span className="policy-count">
            {pending.length}
            {" "}
            pending
          </span>
        }
      />

      <section className="panel cp-page-panel">
        <div className="cp-authority-strip">
          <div>
            <span>
              Signed in
            </span>

            <strong>
              {user.email}
            </strong>
          </div>

          <div>
            <span>
              Authority
            </span>

            <strong>
              {role === "OWNER"
                ? "OWNER · ULTIMATE"
                : role}
            </strong>
          </div>

          <div>
            <span>
              Boundary
            </span>

            <strong>
              {role === "ADMIN"
                ? "Manage / Resubmit · No Approval"
                : role === "AUDITOR"
                  ? "Read Approval · Audit Separately"
                  : role === "VIEWER"
                    ? "Read Only"
                    : role === "APPROVER"
                      ? "Assigned Decisions Only"
                      : "Full Override"}
            </strong>
          </div>
        </div>
      </section>

      {message && (
        <div className="cp-message">
          {message}
          {" "}
          <Link
            to="/audit"
            className="cp-text-link"
          >
            Continue to Audit →
          </Link>
        </div>
      )}

      {error && (
        <div className="cp-error">
          {error}
        </div>
      )}

      <section className="panel cp-page-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              ACTION REQUIRED
            </p>

            <h3>
              Pending Approvals
            </h3>
          </div>
        </div>

        {pending.length ===
        0 ? (
          <div className="cp-empty">
            No approvals are waiting.
          </div>
        ) : (
          <div className="cp-review-list">
            {pending.map(
              (approval) => {
                const context =
                  contextFor(
                    approval,
                  );

                const canApproverDecide =
                  context
                    .isNamedApprover &&
                  !context
                    .amendmentOutstanding;

                const ownerCanDecide =
                  role === "OWNER";

                const canComment =
                  role === "OWNER" ||
                  role === "ADMIN" ||
                  context
                    .isNamedApprover;

                const canRequestAmendment =
                  role === "OWNER" ||
                  context
                    .isNamedApprover;

                const canResubmit =
                  (
                    role === "OWNER" ||
                    role === "ADMIN"
                  ) &&
                  context
                    .amendmentOutstanding;

                return (
                  <article
                    className="cp-review-card"
                    key={
                      approval.id
                    }
                  >
                    <div className="cp-review-card-head">
                      <div>
                        <strong>
                          {
                            approval.action
                          }
                        </strong>

                        <span>
                          Agent:
                          {" "}
                          {
                            approval.agentId
                          }
                        </span>
                      </div>

                      <span
                        className={
                          context
                            .amendmentOutstanding
                            ? "cp-review-status cp-review-status-amend"
                            : "cp-review-status"
                        }
                      >
                        {context
                          .amendmentOutstanding
                          ? "AMENDMENT REQUESTED"
                          : "PENDING"}
                      </span>
                    </div>

                    <div className="cp-review-context">
                      <span>
                        Reference:
                        {" "}
                        {approval.referenceId ||
                          "-"}
                      </span>

                      <span>
                        Policy:
                        {" "}
                        {context.decision
                          ?.policyId ||
                          "-"}
                      </span>

                      <span>
                        Named Approver:
                        {" "}
                        <strong>
                          {context.approver
                            ? (
                                context
                                  .approver
                                  .displayName ||
                                context
                                  .approver
                                  .email
                              )
                            : "Legacy / not assigned"}
                        </strong>
                      </span>
                    </div>

                    {context
                      .approvalEvents
                      .length >
                      0 && (
                      <div className="cp-review-timeline">
                        {context
                          .approvalEvents
                          .map(
                            (
                              event,
                            ) => (
                              <div
                                key={
                                  event.id
                                }
                              >
                                <strong>
                                  {
                                    event.eventType
                                  }
                                </strong>

                                <span>
                                  {
                                    event.comment
                                  }
                                </span>

                                <small>
                                  {
                                    event.actorEmail
                                  }
                                  {" · "}
                                  {
                                    event.actorRole
                                  }
                                  {" · "}
                                  {new Date(
                                    event.createdAt,
                                  ).toLocaleString()}
                                </small>
                              </div>
                            ),
                          )}
                      </div>
                    )}

                    {(canComment ||
                      canRequestAmendment ||
                      canResubmit ||
                      ownerCanDecide ||
                      canApproverDecide) && (
                      <textarea
                        className="cp-review-textarea"
                        rows={3}
                        value={
                          notes[
                            approval.id
                          ] || ""
                        }
                        onChange={(
                          event,
                        ) =>
                          setNotes(
                            (
                              current,
                            ) => ({
                              ...current,
                              [approval.id]:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder={
                          role ===
                          "OWNER"
                            ? "Comment or required reason for Owner override..."
                            : "Add review comment or amendment detail..."
                        }
                      />
                    )}

                    <div className="cp-review-actions">
                      {canComment && (
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={
                            busy ===
                            approval.id
                          }
                          onClick={() =>
                            reviewAction(
                              approval,
                              "COMMENT",
                            )
                          }
                        >
                          Add Comment
                        </button>
                      )}

                      {canRequestAmendment && (
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={
                            busy ===
                              approval.id ||
                            context
                              .amendmentOutstanding
                          }
                          onClick={() =>
                            reviewAction(
                              approval,
                              "AMENDMENT_REQUESTED",
                            )
                          }
                        >
                          Request Amendment
                        </button>
                      )}

                      {canResubmit && (
                        <button
                          type="button"
                          className="primary-button"
                          disabled={
                            busy ===
                            approval.id
                          }
                          onClick={() =>
                            reviewAction(
                              approval,
                              "RESUBMITTED",
                            )
                          }
                        >
                          Resubmit After Amendment
                        </button>
                      )}

                      {canApproverDecide && (
                        <>
                          <button
                            type="button"
                            className="primary-button"
                            disabled={
                              busy ===
                              approval.id
                            }
                            onClick={() =>
                              decide(
                                approval,
                                "approve",
                              )
                            }
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            className="cp-danger-button"
                            disabled={
                              busy ===
                              approval.id
                            }
                            onClick={() =>
                              decide(
                                approval,
                                "reject",
                              )
                            }
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {ownerCanDecide && (
                        <>
                          <button
                            type="button"
                            className="primary-button"
                            disabled={
                              busy ===
                              approval.id
                            }
                            onClick={() =>
                              decide(
                                approval,
                                "approve",
                              )
                            }
                          >
                            Owner Approve / Override
                          </button>

                          <button
                            type="button"
                            className="cp-danger-button"
                            disabled={
                              busy ===
                              approval.id
                            }
                            onClick={() =>
                              decide(
                                approval,
                                "reject",
                              )
                            }
                          >
                            Owner Reject / Override
                          </button>
                        </>
                      )}
                    </div>

                    {!ownerCanDecide &&
                      !canApproverDecide &&
                      !canResubmit &&
                      role !==
                        "APPROVER" && (
                        <div className="cp-review-lock">
                          This role cannot approve this item.
                        </div>
                      )}
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>

      <section className="panel cp-page-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              REVIEW HISTORY
            </p>

            <h3>
              Completed Approvals
            </h3>
          </div>
        </div>

        {completed.length ===
        0 ? (
          <div className="cp-empty">
            No completed approval records.
          </div>
        ) : (
          <div className="cp-table-wrap">
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Reviewer</th>
                  <th>Reason</th>
                </tr>
              </thead>

              <tbody>
                {completed.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                    >
                      <td>
                        {item.action}
                      </td>

                      <td>
                        {item.agentId}
                      </td>

                      <td>
                        {item.status}
                      </td>

                      <td>
                        {item.decidedBy ||
                          "-"}
                      </td>

                      <td>
                        {item.reason ||
                          "-"}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
