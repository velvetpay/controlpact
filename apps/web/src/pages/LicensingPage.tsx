import {
  Link,
} from "react-router-dom";
import "../public-pricing.css";

export default function LicensingPage() {
  return (
    <div className="cp-pricing cp-licensing">
      <header className="cp-pricing-nav">
        <Link
          className="cp-pricing-brand"
          to="/"
        >
          <span className="cp-pricing-brand-mark">CP</span>
          <span>ControlPact</span>
        </Link>

        <nav>
          <Link to="/">ControlPact Home</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/docs">Documentation</Link>
        </nav>

        <div className="cp-pricing-actions">
          <Link to="/login">Sign in</Link>
          <Link
            className="cp-pricing-primary"
            to="/register"
          >
            Create organisation
          </Link>
        </div>
      </header>

      <main className="cp-license-shell">
        <section className="cp-license-hero">
          <div className="cp-pricing-eyebrow">
            Commercial licensing
          </div>

          <h1>
            Clear rights for platform use, SDK integration and enterprise deployment.
          </h1>

          <p>
            This page summarises the commercial structure. Final checkout
            terms and the binding licence agreement will be presented
            before purchase.
          </p>
        </section>

        <section className="cp-license-grid">
          <article>
            <span>01</span>
            <h2>Sandbox</h2>
            <p>
              Free for development and evaluation. Sandbox use does not
              grant production rights.
            </p>
          </article>

          <article>
            <span>02</span>
            <h2>Hosted Platform</h2>
            <p>
              Production and Business subscriptions cover use of the
              hosted ControlPact service by the subscribing organisation.
              The official SDK is included when it is used to connect that
              organisation's own systems to its subscribed ControlPact account.
            </p>
          </article>

          <article>
            <span>03</span>
            <h2>Production SDK</h2>
            <p>
              £1,495/year covers one customer-owned production
              application using the ControlPact SDK under a dedicated
              commercial integration licence.
            </p>
          </article>

          <article>
            <span>04</span>
            <h2>Enterprise / OEM</h2>
            <p>
              Multi-application, redistribution, resale, sublicensing,
              OEM, white-label and private deployment require an
              Enterprise agreement.
            </p>
          </article>
        </section>

        <section className="cp-license-terms">
          <h2>Production SDK licence — core rights</h2>

          <div className="cp-license-term-list">
            <div>
              <strong>Permitted</strong>
              <p>
                Use the official ControlPact SDK in one customer-owned
                production application for the active licence period.
              </p>
            </div>

            <div>
              <strong>Included</strong>
              <p>
                SDK updates released during the active licence period,
                production API integration rights and access to published
                developer documentation.
              </p>
            </div>

            <div>
              <strong>Not included</strong>
              <p>
                Redistribution, resale, sublicensing, white-label,
                embedding ControlPact as a separately resold product,
                or using one licence across multiple applications.
              </p>
            </div>

            <div>
              <strong>Enterprise route</strong>
              <p>
                Any non-standard deployment, OEM arrangement, multi-app
                use, resale model or bespoke implementation is handled
                under a separate Enterprise agreement.
              </p>
            </div>
          </div>
        </section>

        <section className="cp-pricing-note">
          <strong>Commercial summary, not the final legal instrument.</strong>
          <p>
            The binding licence agreement, payment terms, renewal rules
            and service terms will be presented as part of the final
            checkout flow before a licence is purchased.
          </p>
        </section>

        <section className="cp-pricing-enterprise">
          <div>
            <div className="cp-pricing-eyebrow">
              Need broader rights?
            </div>
            <h2>
              Talk to us about Enterprise, OEM, white-label or private deployment.
            </h2>
          </div>

          <Link
            className="cp-pricing-primary cp-pricing-large"
            to="/enterprise"
          >
            Contact Sales
          </Link>
        </section>
      </main>

      <footer className="cp-pricing-footer">
        <span>
          ControlPact — a Velvet Technologies product.
        </span>
        <div>
          <Link to="/pricing">Pricing</Link>
          <Link to="/docs">Documentation</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
