import {
  useMemo,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import "../billing-checkout.css";

import "../public-back-button.css";
type BillingCheckoutPageProps = {
  accessToken: string;
};

const planLabels:
  Record<
    string,
    {
      title: string;
      price: string;
      detail: string;
    }
  > = {
    "production-monthly": {
      title:
        "Production Platform",
      price:
        "£149/month",
      detail:
        "Hosted production governance with SDK access for this subscribed ControlPact account.",
    },
    "production-annual": {
      title:
        "Production Platform",
      price:
        "£1,490/year",
      detail:
        "Annual hosted production governance with SDK access for this subscribed ControlPact account.",
    },
    "business-monthly": {
      title:
        "Business Platform",
      price:
        "£399/month",
      detail:
        "Expanded hosted governance for larger teams and operational usage.",
    },
    "business-annual": {
      title:
        "Business Platform",
      price:
        "£3,990/year",
      detail:
        "Annual Business Platform subscription for larger teams and operational usage.",
    },
    "sdk-annual": {
      title:
        "Production SDK",
      price:
        "£1,495/year",
      detail:
        "One production application under the standalone commercial SDK licence.",
    },
  };

export default function BillingCheckoutPage({
  accessToken,
}: BillingCheckoutPageProps) {
  const {
    planId = "",
  } =
    useParams<{
      planId: string;
    }>();

  const plan =
    useMemo(
      () =>
        planLabels[
          planId
        ],
      [planId],
    );

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const beginCheckout =
    async () => {
      if (!plan) {
        return;
      }

      setBusy(true);
      setError("");

      try {
        const response =
          await fetch(
            "/controlpact-api/v1/billing/checkout",
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
              body:
                JSON.stringify({
                  planId,
                }),
            },
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data?.success ||
          !data?.url
        ) {
          throw new Error(
            data?.message ||
            "Unable to start checkout.",
          );
        }

        window.location.href =
          data.url;
      } catch (checkoutError) {
        setError(
          checkoutError
            instanceof Error
            ? checkoutError
                .message
            : "Unable to start checkout.",
        );

        setBusy(false);
      }
    };

  if (!plan) {
    return (
      <div className="cp-checkout">
        <div className="cp-checkout-card">
          <div className="cp-checkout-eyebrow">
            ControlPact checkout
          </div>
          <h1>
            This pricing option is not available.
          </h1>
          <Link
            className="cp-checkout-primary"
            to="/pricing"
          >
            Return to pricing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-checkout">
      <header className="cp-checkout-nav">
        <Link
          to="/"
          className="cp-checkout-brand"
        >
          <span>CP</span>
          ControlPact
        </Link>

        <Link to="/pricing">
          Back to pricing
        </Link>
      </header>

      <main className="cp-checkout-shell">
        <div className="cp-page-back-row cp-page-back-row-narrow">
          <Link
            className="cp-page-back-button"
            to="/pricing"
          >
            â† Back to Pricing
          </Link>
        </div>
        <section className="cp-checkout-card">
          <div className="cp-checkout-eyebrow">
            Secure checkout
          </div>

          <h1>{plan.title}</h1>

          <div className="cp-checkout-price">
            {plan.price}
          </div>

          <p>{plan.detail}</p>

          <div className="cp-checkout-summary">
            <div>
              <span>Currency</span>
              <strong>GBP</strong>
            </div>
            <div>
              <span>Payment processor</span>
              <strong>Stripe</strong>
            </div>
            <div>
              <span>Account</span>
              <strong>
                Your signed-in ControlPact organisation
              </strong>
            </div>
          </div>

          {error && (
            <div className="cp-checkout-error">
              {error}
            </div>
          )}

          <button
            type="button"
            className="cp-checkout-primary"
            disabled={busy}
            onClick={
              beginCheckout
            }
          >
            {busy
              ? "Opening secure checkout..."
              : "Continue to secure checkout"}
          </button>

          <p className="cp-checkout-note">
            ControlPact does not collect your card details directly.
            Payment is completed on Stripe Checkout.
          </p>
        </section>
      </main>
    </div>
  );
}

export function CheckoutSuccessPage() {
  return (
    <div className="cp-checkout">
      <main className="cp-checkout-shell">
        <section className="cp-checkout-card">
          <div className="cp-checkout-eyebrow">
            Payment return
          </div>

          <h1>
            Stripe has returned you to ControlPact.
          </h1>

          <p>
            Payment confirmation and entitlement activation are
            completed by ControlPact only after the signed Stripe
            webhook has been verified. Your organisation can return to
            the platform while that confirmation completes.
          </p>

          <Link
            className="cp-checkout-primary"
            to="/overview"
          >
            Return to ControlPact
          </Link>
        </section>
      </main>
    </div>
  );
}
