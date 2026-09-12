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

export default function TermsPage() {
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
              Terms of Service
            </h1>

            <p
              style={{
                margin: 0,
                color: "#a8b5c8",
                fontSize: "17px",
                lineHeight: 1.7,
              }}
            >
              These terms govern access to and use of the ControlPact
              AI-agent governance platform and its integrations.
            </p>
          </div>
        </header>

        <article style={cardStyle}>
          <p style={{ color: "#94a3b8" }}>
            Effective date: 12 September 2026
          </p>

          <section style={sectionStyle}>
            <h2>1. ControlPact service</h2>

            <p>
              ControlPact provides infrastructure for governing actions
              performed or proposed by AI agents, automation systems and
              connected applications.
            </p>

            <p>
              Depending on the customer's configuration, ControlPact
              may return ALLOW, APPROVE or BLOCK decisions and may
              create associated approval and audit records.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>2. Accounts and organisations</h2>

            <p>
              Customers are responsible for maintaining accurate account
              information and for managing access to their ControlPact
              organisation, environments, agents, policies,
              assignments and integrations.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>3. API keys and credentials</h2>

            <p>
              API keys and other credentials must be protected from
              unauthorised access. Customers are responsible for
              activity performed using credentials issued to their
              organisation until those credentials are revoked or
              replaced.
            </p>

            <p>
              Credentials should be scoped to the minimum permissions
              reasonably required for the relevant integration.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>4. Policies and governance decisions</h2>

            <p>
              Customers are responsible for configuring policies,
              agents and assignments appropriate to their intended use.
              A ControlPact decision reflects the policy configuration
              and information available at the time the request is
              evaluated.
            </p>

            <p>
              ControlPact governance decisions do not replace legal,
              regulatory, security, financial or other professional
              judgment where such judgment is required.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>5. Human approvals</h2>

            <p>
              Where a policy requires human approval, customers are
              responsible for assigning appropriate approvers and for
              determining whether an action may proceed after approval.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>6. Acceptable use</h2>

            <p>
              Customers must not use ControlPact to violate applicable
              law, compromise third-party systems, interfere with the
              service, bypass access controls or intentionally submit
              malicious content intended to disrupt the platform.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>7. Third-party integrations</h2>

            <p>
              ControlPact may integrate with third-party applications,
              platforms and services. Those services remain subject to
              their own terms, availability and technical limitations.
            </p>

            <p>
              ControlPact is not responsible for changes made by a
              third-party platform that restrict, alter or discontinue
              an integration.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>8. Plans and billing</h2>

            <p>
              Access to particular ControlPact capabilities may depend
              on the customer's active plan, entitlement or commercial
              agreement. Applicable prices and plan limits are
              presented through ControlPact or an agreed commercial
              arrangement.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>9. Availability and changes</h2>

            <p>
              ControlPact may evolve over time, including changes to
              functionality, integrations, limits and technical
              requirements. Reasonable efforts are made to maintain a
              reliable service, but uninterrupted availability cannot
              be guaranteed.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>10. Intellectual property</h2>

            <p>
              ControlPact and its associated software, branding,
              documentation and platform materials remain subject to
              the intellectual-property rights of their respective
              owners. These terms do not transfer ownership of the
              ControlPact platform to customers.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>11. Suspension and termination</h2>

            <p>
              Access may be suspended or terminated where necessary to
              protect the platform, address misuse, respond to legal or
              security requirements, or where a customer's applicable
              entitlement has ended.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>12. Responsibility for use</h2>

            <p>
              Customers remain responsible for the systems, agents,
              applications, policies and actions they connect to
              ControlPact and for reviewing whether their governance
              configuration is suitable for their intended use.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>13. Changes to these terms</h2>

            <p>
              These terms may be updated as the ControlPact service
              develops. The effective date shown on this page will be
              updated when the published terms change.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>14. Contact</h2>

            <p>
              Questions about these terms can be raised through the
              ControlPact website at{" "}
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

          <a href="/privacy" style={linkStyle}>
            Privacy Policy
          </a>
        </footer>
      </div>
    </main>
  );
}