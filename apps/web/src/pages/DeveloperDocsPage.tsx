import {
  Link,
  NavLink,
} from "react-router-dom";
import "../public-docs.css";

import "../public-back-button.css";
type DocsSection =
  | "overview"
  | "quick-start"
  | "decisions"
  | "approvals"
  | "idempotency"
  | "security";

type DeveloperDocsPageProps = {
  section?: DocsSection;
};

const sections = [
  ["overview", "Overview", "/docs"],
  ["quick-start", "Quick Start", "/docs/quick-start"],
  ["decisions", "Decisions", "/docs/decisions"],
  ["approvals", "Approvals", "/docs/approvals"],
  ["idempotency", "Idempotency", "/docs/idempotency"],
  ["security", "Security", "/docs/security"],
] as const;

const Code = ({
  children,
}: {
  children: string;
}) => (
  <pre className="cp-docs-code">
    <code>{children}</code>
  </pre>
);

function Overview() {
  return (
    <>
      <div className="cp-docs-eyebrow">
        Developer documentation
      </div>
      <h1>Build governed AI actions with ControlPact.</h1>
      <p className="cp-docs-lead">
        The ControlPact SDK lets your server submit an agent action
        for policy evaluation, receive an enforceable decision,
        wait for human approval when required, and retain a durable
        decision record for audit.
      </p>

      <div className="cp-docs-callout">
        <strong>Core decision model</strong>
        <span>
          Every governed request resolves to ALLOW, APPROVE or BLOCK.
          Your application is responsible for enforcing that result.
        </span>
      </div>

      <h2>Typical integration flow</h2>
      <ol className="cp-docs-steps">
        <li>Create and assign an agent in ControlPact.</li>
        <li>Issue the agent a scoped API key.</li>
        <li>Install and initialise the ControlPact SDK on your server.</li>
        <li>Submit the proposed action before your application executes it.</li>
        <li>Enforce ALLOW, APPROVE or BLOCK.</li>
        <li>For approval-gated actions, re-check status before execution.</li>
        <li>Keep the ControlPact decision/reference with your business record.</li>
      </ol>

      <h2>Package</h2>
      <Code>{`npm install @controlpact/sdk`}</Code>

      <p className="cp-docs-muted">
        Until the npm package is published publicly, install the
        commercial tarball supplied with your ControlPact licence.
      </p>
    </>
  );
}

function QuickStart() {
  return (
    <>
      <div className="cp-docs-eyebrow">
        Quick Start
      </div>
      <h1>Make your first governed decision.</h1>
      <p className="cp-docs-lead">
        Keep the API key on your trusted backend. Do not expose it
        in browser JavaScript or mobile client bundles.
      </p>

      <h2>1. Configure credentials</h2>
      <Code>{`CONTROLPACT_BASE_URL=https://your-controlpact-endpoint
CONTROLPACT_API_KEY=cpk_your_agent_key`}</Code>

      <h2>2. Create the client</h2>
      <Code>{`import {
  ControlPactClient,
} from "@controlpact/sdk";

const controlPact =
  new ControlPactClient({
    baseUrl:
      process.env.CONTROLPACT_BASE_URL,
    apiKey:
      process.env.CONTROLPACT_API_KEY,
  });`}</Code>

      <h2>3. Submit the action before execution</h2>
      <Code>{`const result =
  await controlPact.decide({
    idempotencyKey:
      "refund-order-1042",
    referenceId:
      "order-1042",
    request: {
      action:
        "refundCustomer",
      amount: 750,
      currency: "GBP",
      context: {
        customerTier:
          "standard",
      },
    },
  });`}</Code>

      <h2>4. Enforce the result</h2>
      <Code>{`switch (result.result.decision) {
  case "ALLOW":
    // Continue with the approved-by-policy action.
    break;

  case "APPROVE":
    // Stop here. Human approval is required.
    break;

  case "BLOCK":
    // Do not execute.
    break;
}`}</Code>
    </>
  );
}

function Decisions() {
  return (
    <>
      <div className="cp-docs-eyebrow">
        Decisions
      </div>
      <h1>Three outcomes. No ambiguous execution state.</h1>

      <div className="cp-docs-decision-grid">
        <article>
          <span>ALLOW</span>
          <h3>Policy permits execution</h3>
          <p>
            The action passed the assigned policy without requiring
            a human approval gate.
          </p>
        </article>
        <article>
          <span>APPROVE</span>
          <h3>Human authority required</h3>
          <p>
            The action must remain paused until the required approver
            has reviewed and approved it.
          </p>
        </article>
        <article>
          <span>BLOCK</span>
          <h3>Execution prohibited</h3>
          <p>
            The action did not satisfy the assigned policy and should
            not proceed.
          </p>
        </article>
      </div>

      <h2>Scoped decisions</h2>
      <p>
        When an API key is already scoped to an assigned agent and
        policy, callers can omit explicit agent and policy identifiers:
      </p>

      <Code>{`const result =
  await controlPact.decide({
    referenceId:
      "deploy-2026-08-23",
    request: {
      action: "deploy",
      context: {
        environment:
          "production",
      },
    },
  });`}</Code>

      <h2>Decision evidence</h2>
      <p>
        Successful responses include the decision result, matched
        policy/rules, a receipt payload, a receipt signature and any
        related approval object.
      </p>
    </>
  );
}

function Approvals() {
  return (
    <>
      <div className="cp-docs-eyebrow">
        Approvals
      </div>
      <h1>APPROVE is a hard execution gate.</h1>
      <p className="cp-docs-lead">
        A decision of APPROVE means the policy requires a human
        authority. It is not permission to continue.
      </p>

      <h2>Check the decision again</h2>
      <Code>{`const status =
  await controlPact.getDecision(
    "DECISION_OR_RECEIPT_ID",
  );

console.log(
  status.decision.approvalStatus,
);`}</Code>

      <h2>Approval states</h2>
      <div className="cp-docs-status-list">
        <div>
          <strong>PENDING</strong>
          <span>Wait. The required human review is not complete.</span>
        </div>
        <div>
          <strong>APPROVED</strong>
          <span>
            The approval requirement has been satisfied. Your
            application may proceed only if its own business checks
            also still pass.
          </span>
        </div>
        <div>
          <strong>REJECTED</strong>
          <span>Stop the action.</span>
        </div>
      </div>

      <div className="cp-docs-callout cp-docs-callout-warning">
        <strong>Do not convert APPROVE into ALLOW locally.</strong>
        <span>
          ControlPact keeps approval as a separate human-authority
          stage so audit evidence remains explicit.
        </span>
      </div>
    </>
  );
}

function Idempotency() {
  return (
    <>
      <div className="cp-docs-eyebrow">
        Idempotency
      </div>
      <h1>Retry safely without duplicating governed actions.</h1>
      <p className="cp-docs-lead">
        Use a stable idempotency key for the same business operation,
        especially for financial actions, deployments, account changes
        and retryable jobs.
      </p>

      <Code>{`await controlPact.decide({
  idempotencyKey:
    "invoice-8821-refund",
  request: {
    action:
      "refundCustomer",
  },
});`}</Code>

      <h2>Rules for good idempotency keys</h2>
      <ul className="cp-docs-list">
        <li>Use the same key when retrying the same operation.</li>
        <li>Do not generate a fresh key for every network retry.</li>
        <li>Bind the key to a durable business reference where possible.</li>
        <li>Do not exceed 200 characters.</li>
      </ul>
    </>
  );
}

function Security() {
  return (
    <>
      <div className="cp-docs-eyebrow">
        Security
      </div>
      <h1>Treat agent credentials like production secrets.</h1>

      <div className="cp-docs-security-grid">
        <article>
          <h3>Server-side keys</h3>
          <p>
            Keep `cpk_` API keys on trusted infrastructure. Never
            embed them in browser code or public repositories.
          </p>
        </article>
        <article>
          <h3>Least privilege</h3>
          <p>
            Scope agents and assignments only to the environments,
            policies and responsibilities they require.
          </p>
        </article>
        <article>
          <h3>HTTPS</h3>
          <p>
            Use HTTPS for production SDK traffic and do not downgrade
            transport security.
          </p>
        </article>
        <article>
          <h3>Rotate exposed keys</h3>
          <p>
            If an API key is exposed, revoke or rotate it immediately
            and update the consuming service.
          </p>
        </article>
        <article>
          <h3>Preserve evidence</h3>
          <p>
            Keep ControlPact decision and receipt references with the
            business action they governed.
          </p>
        </article>
        <article>
          <h3>Respect approval gates</h3>
          <p>
            Never execute an APPROVE decision until the required human
            approval is confirmed.
          </p>
        </article>
      </div>
    </>
  );
}

export default function DeveloperDocsPage({
  section = "overview",
}: DeveloperDocsPageProps) {
  const content = {
    overview: <Overview />,
    "quick-start": <QuickStart />,
    decisions: <Decisions />,
    approvals: <Approvals />,
    idempotency: <Idempotency />,
    security: <Security />,
  }[section];

  return (
    <div className="cp-docs">
      <header className="cp-docs-topbar">
        <Link
          className="cp-docs-brand"
          to="/"
        >
          <span className="cp-docs-brand-mark">CP</span>
          <span>ControlPact</span>
          <small>Developers</small>
        </Link>

        <div className="cp-docs-top-actions">
          <Link to="/">Product</Link>
          <Link to="/login">Sign in</Link>
          <Link
            className="cp-docs-primary-link"
            to="/register"
          >
            Create organisation
          </Link>
        </div>
      </header>

      <div className="cp-docs-shell">
        <aside className="cp-docs-sidebar">
          <div className="cp-docs-sidebar-title">
            Documentation
          </div>
          <nav>
            {sections.map(
              ([id, label, path]) => (
                <NavLink
                  key={id}
                  to={path}
                  end={id === "overview"}
                  className={(
                    navData: {
                      isActive: boolean;
                    },
                  ) =>
                    navData.isActive
                      ? "cp-docs-nav-link active"
                      : "cp-docs-nav-link"
                  }
                >
                  {label}
                </NavLink>
              ),
            )}
          </nav>

          <div className="cp-docs-sidebar-note">
            SDK package
            <strong>@controlpact/sdk</strong>
            <span>v0.1.0</span>
          </div>
        </aside>

        <main className="cp-docs-content">
        <div className="cp-page-back-row">
          <Link
            className="cp-page-back-button"
            to="/"
          >
            â† Back to ControlPact Home
          </Link>
        </div>
          {content}

          <div className="cp-docs-next">
            <span>ControlPact Developer SDK</span>
            <strong>
              Govern the action before your system executes it.
            </strong>
          </div>
        </main>
      </div>
    </div>
  );
}
