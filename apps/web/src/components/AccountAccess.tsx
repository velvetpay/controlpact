import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

export type ControlPactAccountUser = {
  id: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

type AccountAccessProps = {
  onAuthenticated: (
    token: string,
    user: ControlPactAccountUser,
  ) => void;
};

export default function AccountAccess({
  onAuthenticated,
}: AccountAccessProps) {
  const inviteToken = useMemo(
    () =>
      new URLSearchParams(
        window.location.search,
      ).get("invite") || "",
    [],
  );

  const [mode, setMode] =
    useState<"login" | "register">(
      "login",
    );

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    organizationName,
    setOrganizationName,
  ] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const acceptingInvite =
    Boolean(inviteToken);

  const clearInvite = () => {
    const url =
      new URL(
        window.location.href,
      );

    url.searchParams.delete(
      "invite",
    );

    window.history.replaceState(
      {},
      "",
      url.pathname +
        url.search +
        url.hash,
    );

    window.location.reload();
  };

  const submit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      setBusy(true);
      setError("");

      try {
        if (
          acceptingInvite &&
          password !==
            confirmPassword
        ) {
          throw new Error(
            "Passwords do not match.",
          );
        }

        const endpoint =
          acceptingInvite
            ? "/controlpact-api/v1/auth/accept-invite"
            : mode === "register"
              ? "/controlpact-api/v1/auth/register"
              : "/controlpact-api/v1/auth/login";

        const body =
          acceptingInvite
            ? {
                token:
                  inviteToken,
                password,
              }
            : {
                email:
                  email.trim(),
                password,
                ...(mode ===
                "register"
                  ? {
                      organizationName:
                        organizationName
                          .trim(),
                    }
                  : {}),
              };

        const response =
          await fetch(
            endpoint,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify(
                  body,
                ),
            },
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (
          !response.ok ||
          !data?.success ||
          !data?.accessToken ||
          !data?.user
        ) {
          throw new Error(
            data?.message ||
              (
                acceptingInvite
                  ? "Invitation activation failed."
                  : "Authentication failed."
              ),
          );
        }

        if (acceptingInvite) {
          const url =
            new URL(
              window.location.href,
            );

          url.searchParams.delete(
            "invite",
          );

          window.history.replaceState(
            {},
            "",
            url.pathname +
              url.search +
              url.hash,
          );
        }

        onAuthenticated(
          data.accessToken,
          data.user,
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : acceptingInvite
              ? "Invitation activation failed."
              : "Authentication failed.",
        );
      } finally {
        setBusy(false);
      }
    };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">
            CP
          </div>

          <div>
            <strong>
              ControlPact
            </strong>

            <span>
              Authority Layer
            </span>
          </div>
        </div>

        <p className="eyebrow">
          {acceptingInvite
            ? "ORGANISATION INVITATION"
            : "SECURE CONTROL ACCESS"}
        </p>

        <h1>
          {acceptingInvite
            ? "Activate your ControlPact access"
            : mode === "register"
              ? "Create your ControlPact account"
              : "Sign in to ControlPact"}
        </h1>

        <p className="auth-copy">
          {acceptingInvite
            ? "You were invited into an existing ControlPact organisation. Set your password to activate the role assigned by the organisation Owner or Admin."
            : mode === "register"
              ? "Create the Owner account for a new organisation."
              : "Sign in with your organisation account."}
        </p>

        <form
          onSubmit={submit}
          className="auth-form"
        >
          {!acceptingInvite && (
            <label>
              <span>
                Email
              </span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                autoComplete="email"
                required
              />
            </label>
          )}

          {!acceptingInvite &&
            mode ===
              "register" && (
              <label>
                <span>
                  Organisation name
                </span>

                <input
                  value={
                    organizationName
                  }
                  onChange={(event) =>
                    setOrganizationName(
                      event.target.value,
                    )
                  }
                  required
                />
              </label>
            )}

          <label>
            <span>
              {acceptingInvite
                ? "Create password"
                : "Password"}
            </span>

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              autoComplete={
                acceptingInvite ||
                mode === "register"
                  ? "new-password"
                  : "current-password"
              }
              minLength={12}
              required
            />
          </label>

          {acceptingInvite && (
            <label>
              <span>
                Confirm password
              </span>

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  confirmPassword
                }
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value,
                  )
                }
                autoComplete="new-password"
                minLength={12}
                required
              />
            </label>
          )}

          <label className="auth-show-password">
            <input
              type="checkbox"
              checked={
                showPassword
              }
              onChange={(event) =>
                setShowPassword(
                  event.target.checked,
                )
              }
            />

            <span>
              Show password
            </span>
          </label>

          {error && (
            <p className="decision-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={busy}
          >
            {busy
              ? acceptingInvite
                ? "Activating..."
                : "Please wait..."
              : acceptingInvite
                ? "Activate My Access"
                : mode ===
                    "register"
                  ? "Create Organisation"
                  : "Sign In"}
          </button>
        </form>

        {acceptingInvite ? (
          <button
            type="button"
            className="auth-mode-button"
            onClick={
              clearInvite
            }
          >
            Back to sign in
          </button>
        ) : (
          <button
            type="button"
            className="auth-mode-button"
            onClick={() => {
              setMode(
                mode === "login"
                  ? "register"
                  : "login",
              );
              setError("");
            }}
          >
            {mode === "login"
              ? "Create a new organisation"
              : "Already have an account? Sign in"}
          </button>
        )}
      </section>
    </main>
  );
}
