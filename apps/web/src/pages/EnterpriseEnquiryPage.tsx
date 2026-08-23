import {
  useState,
} from "react";
import type {
  FormEvent,
} from "react";
import {
  Link,
} from "react-router-dom";
import "../enterprise-enquiry.css";

import "../public-back-button.css";
const solutionOptions = [
  "Multi-application use",
  "OEM / embedded ControlPact",
  "White-label",
  "Private deployment",
  "Bespoke integration",
  "Enhanced support",
];

export default function EnterpriseEnquiryPage() {
  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    sent,
    setSent,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    selected,
    setSelected,
  ] =
    useState<string[]>(
      [],
    );

  const submit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (busy) {
        return;
      }

      const form =
        new FormData(
          event.currentTarget,
        );

      setBusy(true);
      setError("");

      try {
        const response =
          await fetch(
            "/controlpact-api/v1/enterprise-enquiries",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
              body:
                JSON.stringify({
                  name:
                    form.get("name"),
                  email:
                    form.get("email"),
                  company:
                    form.get("company"),
                  website:
                    form.get("website"),
                  role:
                    form.get("role"),
                  requirements:
                    form.get(
                      "requirements",
                    ),
                  solutions:
                    selected,
                  companyUrl:
                    form.get(
                      "companyUrl",
                    ),
                }),
            },
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(
            data?.message ||
            "Unable to send your enquiry.",
          );
        }

        setSent(true);
      } catch (submitError) {
        setError(
          submitError
            instanceof Error
            ? submitError.message
            : "Unable to send your enquiry.",
        );
      } finally {
        setBusy(false);
      }
    };

  return (
    <div className="cp-enterprise">
      <header className="cp-enterprise-nav">
        <Link
          className="cp-enterprise-brand"
          to="/"
        >
          <span>CP</span>
          ControlPact
        </Link>

        <nav>
          <Link to="/pricing">
            Pricing
          </Link>
          <Link to="/licensing">
            Licensing
          </Link>
          <Link to="/docs">
            Documentation
          </Link>
        </nav>
      </header>

      <main className="cp-enterprise-shell">
        <div className="cp-page-back-row">
          <Link
            className="cp-page-back-button"
            to="/pricing"
          >
            â† Back to Pricing
          </Link>
        </div>
        <section className="cp-enterprise-copy">
          <div className="cp-enterprise-eyebrow">
            Enterprise / OEM / White-label
          </div>

          <h1>
            Tell us how you want to deploy ControlPact.
          </h1>

          <p>
            Use this route for multi-application licensing,
            redistribution, OEM embedding, white-label use,
            private deployment, bespoke integration or other
            non-standard production requirements.
          </p>

          <div className="cp-enterprise-points">
            <div>
              <strong>
                Commercial rights
              </strong>
              <span>
                Multi-app, OEM, resale and white-label arrangements.
              </span>
            </div>

            <div>
              <strong>
                Deployment
              </strong>
              <span>
                Hosted, private or specialised implementation.
              </span>
            </div>

            <div>
              <strong>
                Engineering
              </strong>
              <span>
                Bespoke integration and implementation support.
              </span>
            </div>
          </div>
        </section>

        <section className="cp-enterprise-form-card">
          {sent ? (
            <div className="cp-enterprise-success">
              <div className="cp-enterprise-eyebrow">
                Enquiry received
              </div>

              <h2>
                Thank you. Your ControlPact Enterprise enquiry has been sent.
              </h2>

              <p>
                We will review the deployment and licensing requirements you supplied.
              </p>

              <Link
                className="cp-enterprise-primary"
                to="/"
              >
                Return to ControlPact
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2>
                Enterprise enquiry
              </h2>

              <div className="cp-enterprise-grid">
                <label>
                  <span>Name</span>
                  <input
                    name="name"
                    required
                    maxLength={120}
                    autoComplete="name"
                  />
                </label>

                <label>
                  <span>Work email</span>
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={180}
                    autoComplete="email"
                  />
                </label>

                <label>
                  <span>Company</span>
                  <input
                    name="company"
                    required
                    maxLength={160}
                    autoComplete="organization"
                  />
                </label>

                <label>
                  <span>Your role</span>
                  <input
                    name="role"
                    maxLength={120}
                    autoComplete="organization-title"
                  />
                </label>
              </div>

              <label>
                <span>
                  Company website
                </span>
                <input
                  name="website"
                  maxLength={240}
                  placeholder="https://"
                  inputMode="url"
                />
              </label>

              <fieldset>
                <legend>
                  What do you need?
                </legend>

                <div className="cp-enterprise-options">
                  {solutionOptions.map(
                    (option) => {
                      const checked =
                        selected.includes(
                          option,
                        );

                      return (
                        <label
                          className="cp-enterprise-option"
                          key={option}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelected(
                                checked
                                  ? selected.filter(
                                      (item) =>
                                        item !==
                                        option,
                                    )
                                  : [
                                      ...selected,
                                      option,
                                    ],
                              );
                            }}
                          />
                          <span>
                            {option}
                          </span>
                        </label>
                      );
                    },
                  )}
                </div>
              </fieldset>

              <label>
                <span>
                  Deployment / licensing requirements
                </span>
                <textarea
                  name="requirements"
                  required
                  maxLength={4000}
                  rows={7}
                  placeholder="Tell us what you are building, how ControlPact would be used and the deployment model you need."
                />
              </label>

              <label className="cp-enterprise-trap">
                <span>
                  Leave this field empty
                </span>
                <input
                  name="companyUrl"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>

              {error && (
                <div className="cp-enterprise-error">
                  {error}
                </div>
              )}

              <button
                className="cp-enterprise-primary"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? "Sending enquiry..."
                  : "Send Enterprise enquiry"}
              </button>

              <p className="cp-enterprise-footnote">
                This form is for Enterprise, OEM, white-label,
                multi-application and bespoke requirements.
                Standard platform and SDK pricing remains available
                through the public pricing page.
              </p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
