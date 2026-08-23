import {
  useEffect,
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
  const accessToken =
    sessionStorage.getItem(
      "controlpactOwnerToken",
    ) || "";

  const [
    sdkState,
    setSdkState,
  ] =
    useState<
      | "checking"
      | "ready"
      | "pending"
      | "error"
    >("checking");

  const [
    downloadBusy,
    setDownloadBusy,
  ] =
    useState(false);

  const [
    downloadError,
    setDownloadError,
  ] =
    useState("");

  useEffect(() => {
    if (!accessToken) {
      setSdkState(
        "error",
      );
      return;
    }

    let cancelled = false;
    let timer = 0;
    let attempt = 0;

    const checkEntitlement =
      async () => {
        attempt += 1;

        try {
          const response =
            await fetch(
              "/controlpact-api/v1/billing/status",
              {
                headers: {
                  Authorization:
                    `Bearer ${accessToken}`,
                  Accept:
                    "application/json",
                },
              },
            );

          const data =
            await response
              .json();

          const entitled =
            Boolean(
              data?.entitlements
                ?.subscribedAccountSdkAccess ||
              data?.entitlements
                ?.standaloneProductionSdkAccess,
            );

          if (
            response.ok &&
            data?.success &&
            entitled
          ) {
            if (!cancelled) {
              setSdkState(
                "ready",
              );
            }
            return;
          }

          if (
            attempt < 10 &&
            !cancelled
          ) {
            timer =
              window.setTimeout(
                checkEntitlement,
                1500,
              );
            return;
          }

          if (!cancelled) {
            setSdkState(
              "pending",
            );
          }
        } catch {
          if (!cancelled) {
            setSdkState(
              "error",
            );
          }
        }
      };

    checkEntitlement();

    return () => {
      cancelled = true;
      window.clearTimeout(
        timer,
      );
    };
  }, [accessToken]);

  const downloadSdk =
    async () => {
      setDownloadBusy(true);
      setDownloadError("");

      try {
        const response =
          await fetch(
            "/controlpact-api/v1/billing/sdk/download",
            {
              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
              },
            },
          );

        if (!response.ok) {
          const data =
            await response
              .json()
              .catch(
                () => null,
              );

          throw new Error(
            data?.message ||
            "Unable to download the ControlPact SDK.",
          );
        }

        const archive =
          await response.blob();

        const objectUrl =
          window.URL
            .createObjectURL(
              archive,
            );

        const link =
          document
            .createElement(
              "a",
            );

        link.href =
          objectUrl;

        link.download =
          "controlpact-sdk-0.1.0.tgz";

        document.body
          .appendChild(
            link,
          );

        link.click();
        link.remove();

        window.URL
          .revokeObjectURL(
            objectUrl,
          );
      } catch (error) {
        setDownloadError(
          error instanceof Error
            ? error.message
            : "Unable to download the ControlPact SDK.",
        );
      } finally {
        setDownloadBusy(false);
      }
    };

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

          {sdkState === "checking" && (
            <div className="cp-checkout-entitlement">
              Verifying your signed Stripe payment and SDK entitlement...
            </div>
          )}

          {sdkState === "ready" && (
            <div className="cp-checkout-entitlement cp-checkout-entitlement-ready">
              <strong>
                SDK access is active.
              </strong>
              <span>
                Your verified ControlPact entitlement can now download the commercial SDK package.
              </span>
            </div>
          )}

          {sdkState === "pending" && (
            <div className="cp-checkout-entitlement">
              Stripe confirmation is still processing. Your SDK download becomes available only after the signed webhook activates your entitlement.
            </div>
          )}

          {sdkState === "error" && (
            <div className="cp-checkout-entitlement">
              We could not verify SDK access on this return page. Sign in to the same ControlPact organisation and check your billing status.
            </div>
          )}

          {downloadError && (
            <div className="cp-checkout-error">
              {downloadError}
            </div>
          )}

          <div className="cp-checkout-success-actions">
            {sdkState === "ready" && (
              <button
                type="button"
                className="cp-checkout-primary"
                disabled={
                  downloadBusy
                }
                onClick={
                  downloadSdk
                }
              >
                {downloadBusy
                  ? "Preparing SDK..."
                  : "Download ControlPact SDK"}
              </button>
            )}

            <Link
              className="cp-checkout-secondary"
              to="/overview"
            >
              Return to ControlPact
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
