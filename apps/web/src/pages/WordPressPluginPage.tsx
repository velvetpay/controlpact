export default function WordPressPluginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 15% 0%, #172554 0%, #08111f 32%, #020617 72%)",
        color: "#f8fafc",
        padding: "48px 20px 72px",
      }}
    >
      <div style={{ width: "min(1080px, 100%)", margin: "0 auto" }}>
        <a
          href="/"
          style={{
            color: "#94a3b8",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← ControlPact
        </a>

        <section
          style={{
            marginTop: 52,
            padding: "clamp(28px, 6vw, 54px)",
            borderRadius: 28,
            border: "1px solid rgba(148,163,184,.22)",
            background: "rgba(15,23,42,.72)",
            boxShadow: "0 30px 90px rgba(0,0,0,.38)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: "8px 13px",
              borderRadius: 999,
              background: "rgba(59,130,246,.14)",
              border: "1px solid rgba(96,165,250,.3)",
              color: "#93c5fd",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            Official WordPress Integration
          </div>

          <h1
            style={{
              margin: "24px 0 16px",
              maxWidth: 900,
              fontSize: "clamp(2.5rem, 6vw, 4.8rem)",
              lineHeight: 1,
              letterSpacing: "-0.055em",
            }}
          >
            Govern WordPress AI and automation with ControlPact.
          </h1>

          <p
            style={{
              maxWidth: 770,
              margin: 0,
              color: "#cbd5e1",
              fontSize: 19,
              lineHeight: 1.7,
            }}
          >
            Connect WordPress to ControlPact and evaluate governed actions
            through ALLOW, APPROVE and BLOCK decisions backed by your
            organisation's policies.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              marginTop: 34,
            }}
          >
            <a
              href="/downloads/controlpact-governance-0.1.0.zip"
              download
              style={{
                minHeight: 52,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 24px",
                borderRadius: 12,
                background: "#f8fafc",
                color: "#020617",
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              Download Plugin ZIP
            </a>

            <a
              href="/docs"
              style={{
                minHeight: 52,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 24px",
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,.34)",
                color: "#e2e8f0",
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
              Developer Docs
            </a>
          </div>

          <p
            style={{
              margin: "18px 0 0",
              color: "#64748b",
              fontSize: 14,
            }}
          >
            ControlPact Governance v0.1.0 · WordPress 6.0+ · PHP 7.4+
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 16,
            marginTop: 24,
          }}
        >
          {[
            [
              "1",
              "Install",
              "Download the ZIP and upload it from WordPress → Plugins → Add Plugin.",
            ],
            [
              "2",
              "Connect",
              "Add your own scoped ControlPact API credential in the plugin settings.",
            ],
            [
              "3",
              "Govern",
              "Evaluate governed actions and receive ALLOW, APPROVE or BLOCK decisions.",
            ],
          ].map(([number, title, text]) => (
            <article
              key={number}
              style={{
                padding: 26,
                borderRadius: 20,
                border: "1px solid rgba(148,163,184,.18)",
                background: "rgba(15,23,42,.55)",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 10,
                  background: "rgba(59,130,246,.16)",
                  color: "#93c5fd",
                  fontWeight: 900,
                }}
              >
                {number}
              </div>

              <h2 style={{ margin: "18px 0 8px", fontSize: 21 }}>
                {title}
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#94a3b8",
                  lineHeight: 1.65,
                }}
              >
                {text}
              </p>
            </article>
          ))}
        </section>

        <section
          style={{
            marginTop: 24,
            padding: 30,
            borderRadius: 20,
            border: "1px solid rgba(148,163,184,.18)",
            background: "rgba(15,23,42,.42)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Your credentials remain yours.</h2>
          <p
            style={{
              marginBottom: 0,
              color: "#94a3b8",
              lineHeight: 1.7,
            }}
          >
            No shared or developer-owned ControlPact credential is bundled
            with the plugin. Each customer connects using their own
            organisation, agent assignment, policy and scoped API credential.
          </p>
        </section>
      </div>
    </main>
  );
}
