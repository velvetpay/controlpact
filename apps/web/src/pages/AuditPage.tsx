import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import AuditReceiptsPanel from "../components/AuditReceiptsPanel";
import PageHeader from "../components/PageHeader";
import type {
  ControlPactAccountUser,
} from "../components/AccountAccess";

type DecisionItem = {
  id: string;
  receiptId: string;
  agentId: string;
  action: string;
  decision:
    | "ALLOW"
    | "APPROVE"
    | "BLOCK";
  policyId: string;
  referenceId: string;
  resource?: string;
  reason: string;
  approvalStatus?: string;
  createdAt: string;
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

type AuditPageProps = {
  accessToken: string;
  user: ControlPactAccountUser;
};

export default function AuditPage({
  accessToken,
  user,
}: AuditPageProps) {
  const [decisions, setDecisions] =
    useState<DecisionItem[]>([]);

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
          const [
            decisionsResponse,
            eventsResponse,
          ] =
            await Promise.all([
              fetch(
                "/controlpact-api/v1/decisions",
                { headers },
              ),
              fetch(
                "/controlpact-api/v1/review-events?entityType=AUDIT",
                { headers },
              ),
            ]);

          const [
            decisionData,
            eventData,
          ] =
            await Promise.all([
              decisionsResponse
                .json()
                .catch(
                  () => null,
                ),
              eventsResponse
                .json()
                .catch(
                  () => null,
                ),
            ]);

          if (
            !decisionsResponse.ok ||
            !eventsResponse.ok
          ) {
            throw new Error(
              decisionData
                ?.message ||
              eventData?.message ||
              "Unable to load audit review.",
            );
          }

          setDecisions(
            Array.isArray(
              decisionData
                ?.decisions,
            )
              ? decisionData
                  .decisions
              : [],
          );

          setEvents(
            Array.isArray(
              eventData?.events,
            )
              ? eventData.events
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
              : "Unable to load audit review.",
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
        5000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [load]);

  const auditContext =
    (
      decision:
        DecisionItem,
    ) => {
      const decisionEvents =
        events.filter(
          (event) =>
            event.entityId ===
              decision.id,
        );

      const lifecycle =
        [...decisionEvents]
          .reverse()
          .find(
            (event) =>
              [
                "AMENDMENT_REQUESTED",
                "RESUBMITTED",
                "AUDIT_COMPLETED",
              ].includes(
                event.eventType,
              ),
          )
          ?.eventType;

      return {
        decisionEvents,
        state:
          lifecycle ||
          "READY_FOR_AUDIT",
        amendmentOutstanding:
          lifecycle ===
            "AMENDMENT_REQUESTED",
        completed:
          lifecycle ===
            "AUDIT_COMPLETED",
      };
    };

  const submitEvent =
    async (
      decision:
        DecisionItem,
      eventType:
        ReviewEvent[
          "eventType"
        ],
    ) => {
      const comment =
        String(
          notes[decision.id] ||
          "",
        ).trim();

      if (!comment) {
        setError(
          "Add an audit comment before submitting this action.",
        );
        return;
      }

      setBusy(
        decision.id,
      );
      setError("");
      setMessage("");

      try {
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
                    "AUDIT",
                  entityId:
                    decision.id,
                  decisionId:
                    decision.id,
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
              "Audit review action failed.",
          );
        }

        setNotes(
          (current) => ({
            ...current,
            [decision.id]:
              "",
          }),
        );

        setMessage(
          eventType ===
            "AMENDMENT_REQUESTED"
            ? "Audit remediation requested. Owner/Admin must address it and resubmit."
            : eventType ===
                "RESUBMITTED"
              ? "Remediation response recorded and audit resubmitted."
              : eventType ===
                  "AUDIT_COMPLETED"
                ? "Audit completed with the comment permanently recorded."
                : "Audit comment recorded.",
        );

        await load();
      } catch (
        requestError
      ) {
        setError(
          requestError
            instanceof Error
            ? requestError.message
            : "Audit review action failed.",
        );
      } finally {
        setBusy("");
      }
    };

  const canAudit =
    role === "OWNER" ||
    role === "AUDITOR";

  const canRemediate =
    role === "OWNER" ||
    role === "ADMIN";

  return (
    <>
      <PageHeader
        eyebrow="STEP 8 · AUDIT & REMEDIATION"
        title="Audit"
        description="Auditors can comment, request remediation and complete audit. Owner remains the ultimate authority; Owner/Admin can respond to amendment requests and resubmit."
      />

      <AuditReceiptsPanel
        accessToken={
          accessToken
        }
      />

      {message && (
        <div className="cp-message">
          {message}
        </div>
      )}

      {error && (
        <div className="cp-error">
          {error}
        </div>
      )}

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
              Audit authority
            </span>

            <strong>
              {role === "OWNER"
                ? "OWNER · ULTIMATE"
                : role}
            </strong>
          </div>

          <div>
            <span>
              Capability
            </span>

            <strong>
              {canAudit
                ? "Comment · Amend · Complete"
                : canRemediate
                  ? "Respond · Resubmit"
                  : "Read Only"}
            </strong>
          </div>
        </div>
      </section>

      <section className="cp-review-list">
        {decisions.length ===
        0 ? (
          <div className="panel cp-empty">
            No decisions are available for audit.
          </div>
        ) : (
          decisions.map(
            (decision) => {
              const context =
                auditContext(
                  decision,
                );

              const showAuditActions =
                canAudit &&
                !context.completed;

              const showResubmit =
                canRemediate &&
                context
                  .amendmentOutstanding;

              return (
                <article
                  className="panel cp-review-card"
                  key={
                    decision.id
                  }
                >
                  <div className="cp-review-card-head">
                    <div>
                      <strong>
                        {
                          decision.action
                        }
                      </strong>

                      <span>
                        {
                          decision.referenceId
                        }
                      </span>
                    </div>

                    <span
                      className={
                        context
                          .amendmentOutstanding
                          ? "cp-review-status cp-review-status-amend"
                          : context
                                .completed
                            ? "cp-review-status cp-review-status-complete"
                            : "cp-review-status"
                      }
                    >
                      {context.state}
                    </span>
                  </div>

                  <div className="cp-review-context">
                    <span>
                      Decision:
                      {" "}
                      {
                        decision.decision
                      }
                    </span>

                    <span>
                      Approval:
                      {" "}
                      {decision
                        .approvalStatus ||
                        "N/A"}
                    </span>

                    <span>
                      Agent:
                      {" "}
                      {
                        decision.agentId
                      }
                    </span>

                    <span>
                      Policy:
                      {" "}
                      {
                        decision.policyId
                      }
                    </span>

                    <span>
                      Receipt:
                      {" "}
                      {
                        decision.receiptId
                      }
                    </span>
                  </div>

                  {context
                    .decisionEvents
                    .length >
                    0 && (
                    <div className="cp-review-timeline">
                      {context
                        .decisionEvents
                        .map(
                          (event) => (
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

                  {(showAuditActions ||
                    showResubmit) && (
                    <textarea
                      className="cp-review-textarea"
                      rows={3}
                      value={
                        notes[
                          decision.id
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
                            [decision.id]:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      placeholder={
                        showResubmit
                          ? "Describe the remediation completed before resubmission..."
                          : "Record audit comment, amendment required, or completion note..."
                      }
                    />
                  )}

                  <div className="cp-review-actions">
                    {showAuditActions && (
                      <>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={
                            busy ===
                            decision.id
                          }
                          onClick={() =>
                            submitEvent(
                              decision,
                              "COMMENT",
                            )
                          }
                        >
                          Add Audit Comment
                        </button>

                        <button
                          type="button"
                          className="secondary-button"
                          disabled={
                            busy ===
                              decision.id ||
                            context
                              .amendmentOutstanding
                          }
                          onClick={() =>
                            submitEvent(
                              decision,
                              "AMENDMENT_REQUESTED",
                            )
                          }
                        >
                          Request Remediation
                        </button>

                        <button
                          type="button"
                          className="primary-button"
                          disabled={
                            busy ===
                              decision.id ||
                            context
                              .amendmentOutstanding
                          }
                          onClick={() =>
                            submitEvent(
                              decision,
                              "AUDIT_COMPLETED",
                            )
                          }
                        >
                          Complete Audit
                        </button>
                      </>
                    )}

                    {showResubmit && (
                      <button
                        type="button"
                        className="primary-button"
                        disabled={
                          busy ===
                          decision.id
                        }
                        onClick={() =>
                          submitEvent(
                            decision,
                            "RESUBMITTED",
                          )
                        }
                      >
                        Resubmit After Remediation
                      </button>
                    )}
                  </div>
                </article>
              );
            },
          )
        )}
      </section>
    </>
  );
}
