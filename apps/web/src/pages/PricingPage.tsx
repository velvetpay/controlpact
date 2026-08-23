import {
  useEffect,
} from "react";

import {
  Link,
  useLocation,
} from "react-router-dom";
import "../public-pricing.css";

const plans = [
  {
    name: "Sandbox",
    price: "Free",
    cadence: "Development and evaluation",
    description:
      "Explore ControlPact in a controlled test environment. Production execution is locked until you upgrade.",
    features: [
      "2 human users",
      "1 team",
      "1 test environment",
      "3 registered AI agents",
      "5 active assignments",
      "2 test API keys",
      "1,000 test decisions/month",
      "1 named approver",
      "30-day audit history",
      "No production environments",
      "No production execution",
    ],
    action: "Create sandbox",
    href: "/register",
    featured: false,
  },
  {
    name: "Production Platform",
    price: "£149",
    cadence: "per month",
    annual: "or £1,490/year",
    description:
      "For organisations putting governed AI agents into real production.",
    features: [
      "10 human users",
      "3 teams",
      "5 test environments",
      "2 production environments",
      "20 registered AI agents",
      "50 active assignments",
      "10 API keys",
      "25,000 governed decisions/month",
      "5 named approvers",
      "1-year audit history",
      "Production execution enabled",
      "Official SDK included for this subscribed ControlPact account",
    ],
    action: "Start production",
    href: "/checkout/production-monthly",
    featured: true,
  },
  {
    name: "Business Platform",
    price: "£399",
    cadence: "per month",
    annual: "or £3,990/year",
    description:
      "For larger multi-team organisations operating substantially more governed AI activity.",
    features: [
      "30 human users",
      "10 teams",
      "20 test environments",
      "10 production environments",
      "100 registered AI agents",
      "250 active assignments",
      "50 API keys",
      "150,000 governed decisions/month",
      "20 named approvers",
      "3-year audit history",
      "Advanced audit and export capability",
      "Priority commercial support",
      "Official SDK included for this subscribed ControlPact account",
    ],
    action: "Choose Business",
    href: "/checkout/business-monthly",
    featured: false,
  },
  {
    name: "Enterprise",
    price: "Contact Sales",
    cadence: "Contracted capacity",
    description:
      "For large organisations requiring higher governed capacity, identity integration and contractual support.",
    features: [
      "100 human users",
      "30 teams",
      "50 test environments",
      "30 production environments",
      "500 registered AI agents",
      "1,000 active assignments",
      "200 API keys",
      "1,000,000 governed decisions/month",
      "75 named approvers",
      "7-year audit history",
      "Enterprise identity / SSO options",
      "Contract support and SLA",
      "Higher custom limits available by agreement",
    ],
    action: "Contact Sales",
    href: "/enterprise",
    featured: false,
  },
];

export default function PricingPage() {
  const location =
    useLocation();

  useEffect(
    () => {
      if (
        location.hash !==
          "#sdk"
      ) {
        return;
      }

      const timer =
        window.setTimeout(
          () => {
            document
              .getElementById(
                "sdk",
              )
              ?.scrollIntoView({
                behavior:
                  "smooth",
                block:
                  "start",
              });
          },
          0,
        );

      return () =>
        window.clearTimeout(
          timer,
        );
    },
    [
      location.hash,
    ],
  );

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

              {plan.name === "Production Platform" && (
                <Link
                  className="cp-pricing-inline-choice"
                  to="/checkout/production-annual"
                >
                  Choose annual billing
                </Link>
              )}

              {plan.name === "Business Platform" && (
                <Link
                  className="cp-pricing-inline-choice"
                  to="/checkout/business-annual"
                >
                  Choose annual billing
                </Link>
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

        <section
          className="cp-pricing-sdk"
          id="sdk"
        >
          <div>
            <div className="cp-pricing-eyebrow">
              ControlPact Production SDK
            </div>
            <h2>
              £1,495/year per production application
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

            <div className="cp-pricing-sdk-actions">
              <Link
                className="cp-pricing-card-action"
                to="/checkout/sdk-annual"
              >
                Buy annual SDK licence
              </Link>

              <Link
                className="cp-pricing-secondary-action"
                to="/licensing"
              >
                View SDK licensing
              </Link>
            </div>
          </div>
        </section>

        <section className="cp-pricing-note">
          <strong>No double charging for normal platform integrations.</strong>
          <p>
            Organisations already paying for a Production Platform or
            Business Platform subscription may use the official SDK to
            connect their own systems to that subscribed ControlPact
            account. A separate £1,495 SDK licence is for standalone
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
          <Link to="/docs">Documentation</Link>
          <Link to="/licensing">Licensing</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
