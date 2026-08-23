import {
  useEffect,
} from "react";
import {
  Link,
} from "react-router-dom";
import "../public-site.css";

const flowSteps = [
  ["01", "Environment", "Define the operating boundary for an AI system."],
  ["02", "Policy", "Set the rules the agent is required to follow."],
  ["03", "Agent", "Register the machine identity operating under those rules."],
  ["04", "Assignment", "Connect authorised humans, responsibilities and scope."],
  ["05", "API Key", "Issue controlled credentials for the assigned agent."],
  ["06", "Decision", "Capture what the agent wants to do before execution."],
  ["07", "Approval", "Route governed actions to the right human authority."],
  ["08", "Audit", "Preserve evidence, comments, remediation and outcomes."],
];

const authorityRoles = [
  ["Owner", "Ultimate organisation authority", "Creates the governance structure, retains override authority and can perform administrative functions."],
  ["Admin", "Management and setup", "Creates environments, policies, agents, assignments and API keys. Admin does not approve governed work."],
  ["Approver", "Independent human review", "Reviews assigned decisions, comments, requests amendments and approves or rejects work."],
  ["Auditor", "Evidence and remediation", "Reviews evidence, comments, requests remediation and completes independent audits."],
  ["Viewer", "Read-only visibility", "Can inspect permitted governance records without creating or approving anything."],
];

export default function PublicHomePage() {
  useEffect(() => {
    document.title =
      "ControlPact | Govern AI Agents with Human Authority";
  }, []);

  return (
    <div className="cp-public">
      <header className="cp-public-nav">
        <Link
          className="cp-public-brand"
          to="/"
          aria-label="ControlPact home"
        >
          <span className="cp-public-brand-mark">CP</span>
          <span>ControlPact</span>
        </Link>

        <nav
          className="cp-public-links"
          aria-label="Public navigation"
        >
          <a href="#product">Product</a>
          <a href="#flow">Control flow</a>
          <a href="#authority">Authority</a>
          <a href="#sdk">SDK</a>
        </nav>

        <div className="cp-public-actions">
          <Link
            className="cp-public-button cp-public-button-quiet"
            to="/login"
          >
            Sign in
          </Link>
          <Link
            className="cp-public-button cp-public-button-primary"
            to="/register"
          >
            Create organisation
          </Link>
        </div>
      </header>

      <main>
        <section
          className="cp-public-hero"
          id="product"
        >
          <div className="cp-public-hero-copy">
            <div className="cp-public-eyebrow">
              AI agent governance control plane
            </div>

            <h1>
              Govern AI agents
              <span> with human authority.</span>
            </h1>

            <p className="cp-public-hero-lead">
              ControlPact gives organisations a clear chain of
              authority for AI agents â€” from policy and assignment
              to human approval, execution evidence and audit.
            </p>

            <div className="cp-public-hero-actions">
              <Link
                className="cp-public-button cp-public-button-primary cp-public-button-large"
                to="/register"
              >
                Start with ControlPact
              </Link>

              <a
                className="cp-public-button cp-public-button-outline cp-public-button-large"
                href="#flow"
              >
                See the control flow
              </a>
            </div>

            <div className="cp-public-trustline">
              <span>Policy enforcement</span>
              <span>Human approvals</span>
              <span>Audit evidence</span>
            </div>
          </div>

          <div
            className="cp-public-hero-panel"
            aria-label="ControlPact governance sequence"
          >
            <div className="cp-public-terminal-top">
              <span>CONTROLPACT / GOVERNANCE</span>
              <span className="cp-public-live-dot">
                CONTROL READY
              </span>
            </div>

            <div className="cp-public-terminal-title">
              One governed path from agent intent to accountable action.
            </div>

            <div className="cp-public-terminal-flow">
              {flowSteps.map(
                ([number, title]) => (
                  <div
                    className="cp-public-terminal-step"
                    key={title}
                  >
                    <span>{number}</span>
                    <strong>{title}</strong>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="cp-public-proof">
          <div>
            <strong>Human authority first</strong>
            <span>
              Machine identities do not create their own governance.
            </span>
          </div>
          <div>
            <strong>Explicit responsibility</strong>
            <span>
              Every governed action can be tied to policy, assignment and reviewer.
            </span>
          </div>
          <div>
            <strong>Evidence by design</strong>
            <span>
              Decisions, approvals, comments and remediation remain auditable.
            </span>
          </div>
        </section>

        <section
          className="cp-public-section"
          id="flow"
        >
          <div className="cp-public-section-heading">
            <div className="cp-public-eyebrow">
              The ControlPact sequence
            </div>
            <h2>
              Eight connected controls. One understandable machine.
            </h2>
            <p>
              ControlPact keeps governance in a deliberate order so
              organisations can see how authority, agents and evidence
              connect instead of jumping between disconnected controls.
            </p>
          </div>

          <div className="cp-public-flow-grid">
            {flowSteps.map(
              ([number, title, description]) => (
                <article
                  className="cp-public-flow-card"
                  key={title}
                >
                  <span className="cp-public-flow-number">
                    {number}
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ),
            )}
          </div>
        </section>

        <section
          className="cp-public-section cp-public-authority"
          id="authority"
        >
          <div className="cp-public-section-heading">
            <div className="cp-public-eyebrow">
              Human authority model
            </div>
            <h2>
              Separation of power is part of the product.
            </h2>
            <p>
              ControlPact separates setup, approval, audit and visibility
              so the same person does not automatically control every stage.
            </p>
          </div>

          <div className="cp-public-role-grid">
            {authorityRoles.map(
              ([role, subtitle, description]) => (
                <article
                  className="cp-public-role-card"
                  key={role}
                >
                  <div>
                    <span className="cp-public-role-label">
                      {role}
                    </span>
                    <h3>{subtitle}</h3>
                  </div>
                  <p>{description}</p>
                </article>
              ),
            )}
          </div>
        </section>

        <section
          className="cp-public-sdk"
          id="sdk"
        >
          <div>
            <div className="cp-public-eyebrow">
              ControlPact Developer SDK
            </div>
            <h2>
              Put the same governance controls inside your own AI product.
            </h2>
            <p>
              The ControlPact developer layer is being packaged for
              teams that need agent identity, policy checks, governed
              decisions, human approval and auditable evidence inside
              their own application.
            </p>
          </div>

          <div className="cp-public-sdk-card">
            <span className="cp-public-sdk-kicker">
              COMMERCIAL SDK
            </span>
            <h3>Production governance for one application</h3>
            <ul>
              <li>Agent identity and assignment controls</li>
              <li>Policy-governed decision requests</li>
              <li>Human approval workflow</li>
              <li>Audit-ready decision evidence</li>
              <li>Production API access</li>
            </ul>
            <div className="cp-public-sdk-note">
              SDK packaging, documentation and commercial licensing
              are the next product stage.
            </div>
          </div>
        </section>

        <section className="cp-public-final-cta">
          <div>
            <div className="cp-public-eyebrow">
              Build with accountable AI
            </div>
            <h2>
              Give every governed agent a policy, an owner and an audit trail.
            </h2>
          </div>

          <div className="cp-public-final-actions">
            <Link
              className="cp-public-button cp-public-button-primary cp-public-button-large"
              to="/register"
            >
              Create organisation
            </Link>
            <Link
              className="cp-public-button cp-public-button-outline cp-public-button-large"
              to="/login"
            >
              Sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="cp-public-footer">
        <div>
          <strong>ControlPact</strong>
          <span>AI agent governance with human authority.</span>
        </div>
        <div>
          A Velvet Technologies product.
        </div>
      </footer>
    </div>
  );
}
