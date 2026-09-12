const pageStyle = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #07111f 0%, #0b1526 100%)",
  color: "#e8eef8",
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const containerStyle = {
  width: "min(920px, calc(100% - 40px))",
  margin: "0 auto",
  padding: "42px 0 72px",
};

const cardStyle = {
  marginTop: "32px",
  padding: "32px",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "18px",
  background: "rgba(15, 23, 42, 0.82)",
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.28)",
};

const sectionStyle = {
  marginTop: "30px",
};

const linkStyle = {
  color: "#7db7ff",
};

export default function PrivacyPage() {
  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header>
          <a
            href="/"
            style={{
              ...linkStyle,
              textDecoration: "none",
              fontWeight: 800,
              letterSpacing: "0.04em",
            }}
          >
            CONTROLPACT
          </a>

          <div
            style={{
              marginTop: "26px",
              maxWidth: "760px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#60a5fa",
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Legal
            </p>

            <h1
              style={{
                margin: "10px 0 12px",
                fontSize: "clamp(36px, 7vw, 60px)",
                lineHeight: 1,
              }}
            >
              Privacy Policy
            </h1>

            <p
              style={{
                margin: 0,
                color: "#a8b5c8",
                fontSize: "17px",
                lineHeight: 1.7,
              }}
            >
              This policy explains how ControlPact handles information
              used to provide AI-agent governance, policy enforcement,
              approvals and audit evidence.
            </p>
          </div>
        </header>

        <article style={cardStyle}>
          <p style={{ color: "#94a3b8" }}>
            Effective date: 12 September 2026
          </p>

          <section style={sectionStyle}>
            <h2>1. Scope</h2>

            <p>
              This Privacy Policy applies to the ControlPact website,
              application, API, developer integrations and associated
              governance services.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>2. Information processed by ControlPact</h2>

            <p>
              Depending on how the service is used, ControlPact may
              process account and organisation information, environment
              and agent configuration, policy and assignment data,
              governance requests, approval activity and audit evidence.
            </p>

            <p>
              Governance requests may contain an action name, resource,
              reference identifier and contextual information supplied
              by the customer or their connected application.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>3. Governance decisions and receipts</h2>

            <p>
              ControlPact may retain governance outcomes such as ALLOW,
              APPROVE or BLOCK decisions together with policy,
              reference and receipt information needed to provide
              decision history, approvals and auditability.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>4. API credentials</h2>

            <p>
              API credentials are used to authenticate authorised
              applications and agents. Customers are responsible for
              protecting their credentials and using appropriately
              scoped keys.
            </p>

            <p>
              Full API credentials should not be placed in public
              source code, client-side JavaScript or other locations
              accessible to unauthorised users.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>5. WordPress integration</h2>

            <p>
              The ControlPact WordPress plugin connects a WordPress
              installation to the external ControlPact governance
              service.
            </p>

            <p>
              When a governance evaluation is made, the integration may
              transmit the requested action, resource, reference ID,
              contextual metadata and relevant site information to
              ControlPact. The configured API credential is transmitted
              in the HTTP Authorization header to authenticate the
              request.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>6. Why information is processed</h2>

            <p>
              Information is processed to operate the governance
              service, evaluate policies, provide approvals and audit
              evidence, authenticate users and integrations, maintain
              security, administer accounts and improve service
              reliability.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>7. Service providers</h2>

            <p>
              ControlPact may use infrastructure, hosting, database,
              communications, payment and other service providers where
              reasonably necessary to operate and support the platform.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>8. Data retention</h2>

            <p>
              Information may be retained for as long as reasonably
              necessary to operate the service, maintain security,
              provide governance and audit records, meet contractual
              requirements and comply with applicable obligations.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>9. Customer responsibilities</h2>

            <p>
              Customers decide what contextual information their agents,
              applications and integrations submit to ControlPact and
              are responsible for ensuring that their use of the
              service is appropriate for their organisation and
              applicable requirements.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>10. Changes to this policy</h2>

            <p>
              This policy may be updated as ControlPact develops.
              Material changes will be reflected by updating the
              effective date shown on this page.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>11. Contact</h2>

            <p>
              Questions about ControlPact privacy practices can be
              raised through the ControlPact website at{" "}
              <a href="/" style={linkStyle}>
                ctrlpact.com
              </a>
              .
            </p>
          </section>
        </article>

        <footer
          style={{
            marginTop: "30px",
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            color: "#94a3b8",
          }}
        >
          <a href="/" style={linkStyle}>
            Home
          </a>

          <a href="/terms" style={linkStyle}>
            Terms of Service
          </a>
        </footer>
      </div>
    </main>
  );
}