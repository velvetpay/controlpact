import { useEffect, useState } from "react";
import "./App.css";
import DecisionConsole from "./components/DecisionConsole";

const decisions = [
  {
    agent: "finance-agent",
    action: "refundCustomer",
    decision: "APPROVE",
    policy: "finance-policy",
    time: "Just now",
  },
  {
    agent: "support-agent",
    action: "deleteAccount",
    decision: "BLOCK",
    policy: "production-policy",
    time: "2m ago",
  },
  {
    agent: "sales-agent",
    action: "updateCRM",
    decision: "ALLOW",
    policy: "sales-policy",
    time: "5m ago",
  },
];

function DecisionBadge({
  value,
}: {
  value: string;
}) {
  return (
    <span
      className={`decision decision-${value.toLowerCase()}`}
    >
      {value}
    </span>
  );
}

function App() {
  const [apiOnline, setApiOnline] =
    useState(false);

  const [policies, setPolicies] =
    useState<Array<{
      id: string;
      defaultDecision: string;
      ruleCount: number;
    }>>([]);

  const [approvals, setApprovals] =
    useState<Array<{
      id: string;
      receiptId: string;
      agentId: string;
      action: string;
      status: string;
      requestedAt: string;
      decidedAt?: string;
      decidedBy?: string;
      reason?: string;
    }>>([]);

  const [approvalBusy, setApprovalBusy] =
    useState("");

  const [approvalMessage, setApprovalMessage] =
    useState("");

  useEffect(() => {
    fetch("/controlpact-api/health")
      .then((response) => response.json())
      .then((data) =>
        setApiOnline(
          data?.success === true
        )
      )
      .catch(() =>
        setApiOnline(false)
      );

    fetch("/controlpact-api/v1/policies")
      .then((response) => response.json())
      .then((data) =>
        setPolicies(
          Array.isArray(data?.policies)
            ? data.policies
            : []
        )
      )
      .catch(() =>
        setPolicies([])
      );
  }, []);

  useEffect(() => {
    const loadApprovals = () => {
      fetch("/controlpact-api/v1/approvals")
        .then((response) => response.json())
        .then((data) =>
          setApprovals(
            Array.isArray(data?.approvals)
              ? data.approvals
              : []
          )
        )
        .catch(() =>
          setApprovals([])
        );
    };

    loadApprovals();

    const timer =
      window.setInterval(
        loadApprovals,
        1500
      );

    return () =>
      window.clearInterval(timer);
  }, []);

  const decideApproval =
    async (
      approvalId: string,
      decision:
        | "approve"
        | "reject",
    ) => {
      const decidedBy =
        window.prompt(
          "Reviewer name",
          "controlpact-admin"
        );

      if (!decidedBy?.trim()) {
        return;
      }

      const reason =
        window.prompt(
          decision === "approve"
            ? "Approval reason (optional)"
            : "Rejection reason",
          ""
        ) || "";

      setApprovalBusy(approvalId);
      setApprovalMessage("");

      try {
        const response =
          await fetch(
            `/controlpact-api/v1/approvals/${approvalId}/${decision}`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  decidedBy:
                    decidedBy.trim(),
                  reason:
                    reason.trim(),
                }),
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(
            data?.message ||
              "Approval decision failed."
          );
        }

        setApprovals(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                approvalId
                  ? data.approval
                  : item
            )
        );

        setApprovalMessage(
          `${data.approval.action} ${data.approval.status.toLowerCase()} by ${data.approval.decidedBy}.`
        );
      } catch (error) {
        setApprovalMessage(
          error instanceof Error
            ? error.message
            : "Approval decision failed."
        );
      } finally {
        setApprovalBusy("");
      }
    };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CP</div>
          <div>
            <strong>ControlPact</strong>
            <span>Agent Control Plane</span>
          </div>
        </div>

        <nav>
          <button className="nav-active">
            Overview
          </button>
          <button>Decisions</button>
          <button>Approvals</button>
          <button>Policies</button>
          <button>Agents</button>
          <button>Audit Receipts</button>
        </nav>

        <div className="sidebar-footer">
          <span
            className="status-dot"
            style={{
              background: apiOnline
                ? "#22c55e"
                : "#ef4444",
            }}
          />
          {apiOnline
            ? "ControlPact API operational"
            : "ControlPact API offline"}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              RUNTIME AUTHORITY FOR AI AGENTS
            </p>
            <h1>Control Center</h1>
          </div>

          <button className="primary-button">
            + New Policy
          </button>
        </header>

        <section className="hero">
          <div>
            <p className="eyebrow">
              PRODUCTION CONTROL
            </p>

            <h2>
              Give agents power.
              <br />
              Keep the authority.
            </h2>

            <p className="hero-copy">
              Every consequential AI action passes
              through deterministic policy,
              approval and signed audit controls
              before execution.
            </p>
          </div>

          <div className="decision-flow">
            <span>AGENT ACTION</span>
            <strong>→</strong>
            <span>POLICY</span>
            <strong>→</strong>
            <div className="flow-results">
              <DecisionBadge value="ALLOW" />
              <DecisionBadge value="APPROVE" />
              <DecisionBadge value="BLOCK" />
            </div>
          </div>
        </section>

        <section className="stats">
          <article>
            <span>DECISIONS TODAY</span>
            <strong>128</strong>
            <small>All actions evaluated</small>
          </article>

          <article>
            <span>PENDING APPROVALS</span>
            <strong>3</strong>
            <small>Human decision required</small>
          </article>

          <article>
            <span>BLOCKED ACTIONS</span>
            <strong>7</strong>
            <small>Prevented before execution</small>
          </article>

          <article>
            <span>SIGNED RECEIPTS</span>
            <strong>128</strong>
            <small>Tamper-evident records</small>
          </article>
        </section>

        <DecisionConsole />

        <article id="approval-queue" className="panel approval-panel workflow-panel">
          <p className="eyebrow">
            HUMAN-IN-THE-LOOP
          </p>

          <h3>
            Approval Queue
          </h3>

          {approvals.filter(
            (item) =>
              item.status ===
              "PENDING"
          ).length === 0 ? (
            <div className="approval-card">
              <strong>
                No pending approvals
              </strong>

              <p>
                Actions requiring human authority
                will appear here automatically.
              </p>
            </div>
          ) : (
            approvals
              .filter(
                (item) =>
                  item.status ===
                  "PENDING"
              )
              .map(
                (approval) => (
                  <div
                    className="approval-card"
                    key={approval.id}
                  >
                    <span>
                      {approval.agentId}
                    </span>

                    <strong>
                      {approval.action}
                    </strong>

                    <p>
                      Pending since{" "}
                      {new Date(
                        approval.requestedAt
                      ).toLocaleString()}
                    </p>

                    <small className="approval-receipt">
                      Receipt:{" "}
                      {approval.receiptId}
                    </small>

                    <div className="approval-actions">
                      <button
                        className="approve"
                        disabled={
                          approvalBusy ===
                          approval.id
                        }
                        onClick={() =>
                          decideApproval(
                            approval.id,
                            "approve"
                          )
                        }
                      >
                        {approvalBusy ===
                        approval.id
                          ? "Working..."
                          : "Approve"}
                      </button>

                      <button
                        className="reject"
                        disabled={
                          approvalBusy ===
                          approval.id
                        }
                        onClick={() =>
                          decideApproval(
                            approval.id,
                            "reject"
                          )
                        }
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )
              )
          )}

          {approvalMessage && (
            <p className="approval-message">
              {approvalMessage}
            </p>
          )}
        </article>

        <article className="panel workflow-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                LIVE CONTROL
              </p>
              <h3>Recent Decisions</h3>
            </div>

            <button className="text-button">
              View all
            </button>
          </div>

          <div className="decision-list">
            {decisions.map((item) => (
              <div
                className="decision-row"
                key={`${item.agent}-${item.action}`}
              >
                <div>
                  <strong>{item.action}</strong>
                  <span>
                    {item.agent} · {item.policy}
                  </span>
                </div>

                <DecisionBadge
                  value={item.decision}
                />

                <small>{item.time}</small>
              </div>
            ))}
          </div>
        </article>

        <section className="panel policy-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                SERVER-OWNED CONTROL
              </p>
              <h3>Active Policies</h3>
            </div>

            <span className="policy-count">
              {policies.length} active
            </span>
          </div>

          <div className="policy-grid">
            {policies.map((policy) => (
              <div
                className="policy-card"
                key={policy.id}
              >
                <strong>{policy.id}</strong>

                <span>
                  Default: {policy.defaultDecision}
                </span>

                <small>
                  {policy.ruleCount} rule
                  {policy.ruleCount === 1
                    ? ""
                    : "s"}
                </small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel trust-panel">
          <div>
            <p className="eyebrow">
              VERIFIABLE CONTROL
            </p>
            <h3>
              Every decision leaves proof.
            </h3>

            <p>
              Signed decision receipts record the
              agent, action, policy, matched rules,
              decision and timestamp.
            </p>
          </div>

          <code>
            receipt_01J... verified ✓
          </code>
        </section>
      </main>
    </div>
  );
}

export default App;