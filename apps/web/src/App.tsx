import { useEffect, useState } from "react";
import "./App.css";

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
  }, []);

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

        <section className="workspace-grid">
          <article className="panel">
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

          <article className="panel approval-panel">
            <p className="eyebrow">
              HUMAN-IN-THE-LOOP
            </p>
            <h3>Approval Queue</h3>

            <div className="approval-card">
              <span>finance-agent</span>

              <strong>
                Refund customer £750
              </strong>

              <p>
                Policy requires management approval
                above £500.
              </p>

              <div className="approval-actions">
                <button className="approve">
                  Approve
                </button>

                <button className="reject">
                  Reject
                </button>
              </div>
            </div>
          </article>
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