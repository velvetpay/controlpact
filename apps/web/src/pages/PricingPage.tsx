import {
  Link,
} from "react-router-dom";
import "../public-pricing.css";

const plans = [
  {
    name: "Sandbox",
    price: "Free",
    cadence: "Development and evaluation",
    description:
      "Explore the ControlPact workflow, build an integration and validate governance before production use.",
    features: [
      "Development and evaluation use",
      "ControlPact dashboard access",
      "Agent and policy setup",
      "Decision-flow testing",
      "Developer documentation",
    ],
    action: "Create sandbox",
    href: "/register",
    featured: false,
  },
  {
    name: "Production Platform",
    price: "Â£149",
    cadence: "per month",
    annual: "or Â£1,490/year",
    description:
      "For organisations running real AI agents through the hosted ControlPact platform.",
    features: [
      "Production governance",
      "Human approval workflow",
      "Audit and remediation evidence",
      "Production API access",
      "Official SDK included for this subscribed ControlPact account",
    ],
    action: "Start production",
    href: "/register",
    featured: true,
  },
  {
    name: "Business Platform",
    price: "Â£399",
    cadence: "per month",
    annual: "or Â£3,990/year",
    description:
      "For larger teams operating more governed agents, approvals and audit activity.",
    features: [
      "Everything in Production Platform",
      "Expanded organisation usage",
      "Broader operational governance",
      "Higher production capacity",
      "Priority commercial support",
    ],
    action: "Choose Business",
    href: "/register",
    featured: false,
  },
  {
    name: "Enterprise",
    price: "Contact Sales",
    cadence: "Custom agreement",
    description:
      "For high-volume, private, specialised or embedded ControlPact deployments.",
    features: [
      "Private or specialised deployment",
      "Multi-application and OEM rights",
      "White-label and redistribution options",
      "Bespoke integration",
      "Custom support and commercial terms",
    ],
    action: "Contact Sales",
    href: "#enterprise",
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <div className="cp-pricing">
      <header className="cp-pricing-nav">
        <Link
          className="cp-pricing-brand"
          to="/"
        >
          <span className="cp-pricing-brand-mark">CP</span>
          <span>ControlPact</span>
        </Link>

        <nav>
          <Link to="/">Product</Link>
          <Link to="/docs">Documentation</Link>
          <Link to="/licensing">Licensing</Link>
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

      <main>
        <section className="cp-pricing-hero">
          <div className="cp-pricing-eyebrow">
            ControlPact pricing
          </div>

          <h1>
            Start in sandbox.
            <span> Govern production when you are ready.</span>
          </h1>

          <p>
            Hosted platform subscriptions cover organisations using
            ControlPact directly in production. The commercial SDK is
            separately licensed when used as a standalone integration
            product.
          </p>
        </section>

        <section className="cp-pricing-grid">
          {plans.map((plan) => (
            <article
              className={
                plan.featured
                  ? "cp-pricing-card featured"
                  : "cp-pricing-card"
              }
              key={plan.name}
            >
              {plan.featured && (
                <div className="cp-pricing-badge">
                  PRODUCTION
                </div>
              )}

              <h2>{plan.name}</h2>

              <div className="cp-pricing-price">
                {plan.price}
              </div>

              <div className="cp-pricing-cadence">
                {plan.cadence}
              </div>

              {"annual" in plan && plan.annual && (
                <div className="cp-pricing-annual">
                  {plan.annual}
                </div>
              )}

              <p>{plan.description}</p>

              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.href.startsWith("#") ? (
                <a
                  className="cp-pricing-card-action"
                  href={plan.href}
                >
                  {plan.action}
                </a>
              ) : (
                <Link
                  className="cp-pricing-card-action"
                  to={plan.href}
                >
                  {plan.action}
                </Link>
              )}
            </article>
          ))}
        </section>

        <section className="cp-pricing-sdk">
          <div>
            <div className="cp-pricing-eyebrow">
              ControlPact Production SDK
            </div>
            <h2>
              Â£1,495/year per production application
            </h2>
            <p>
              For a customer-owned application integrating ControlPact
              programmatically under a dedicated commercial SDK licence.
            </p>
          </div>

          <div className="cp-pricing-sdk-card">
            <strong>One application licence</strong>
            <ul>
              <li>Official TypeScript/JavaScript SDK</li>
              <li>Production API integration rights</li>
              <li>Policy-governed decisions</li>
              <li>Human approval workflow</li>
              <li>Decision receipts and audit evidence</li>
              <li>SDK updates during the active licence term</li>
            </ul>

            <Link
              className="cp-pricing-card-action"
              to="/licensing"
            >
              View SDK licensing
            </Link>
          </div>
        </section>

        <section className="cp-pricing-note">
          <strong>No double charging for normal platform integrations.</strong>
          <p>
            Organisations already paying for a Production Platform or
            Business Platform subscription may use the official SDK to
            connect their own systems to that subscribed ControlPact
            account. A separate Â£1,495 SDK licence is for standalone
            commercial application integration outside that included
            platform use.
          </p>
        </section>

        <section
          className="cp-pricing-enterprise"
          id="enterprise"
        >
          <div>
            <div className="cp-pricing-eyebrow">
              Enterprise / OEM / White-label
            </div>
            <h2>
              Need ControlPact across several products or inside your own platform?
            </h2>
            <p>
              Multi-application use, redistribution, resale, OEM,
              white-label, private deployment and bespoke integration
              require a tailored commercial agreement.
            </p>
          </div>

          <a
            className="cp-pricing-primary cp-pricing-large"
            href="mailto:partnerships@velvetpay.app?subject=ControlPact%20Enterprise%20Enquiry"
          >
            Contact Sales
          </a>
        </section>
      </main>

      <footer className="cp-pricing-footer">
        <span>
          ControlPact â€” a Velvet Technologies product.
        </span>
        <div>
          <Link to="/docs">Documentation</Link>
          <Link to="/licensing">Licensing</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
