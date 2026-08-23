import {
  useEffect,
  useState,
} from "react";
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import "./App.css";
import "./visible-platform.css";
import AccountAccess, {
  type ControlPactAccountUser,
} from "./components/AccountAccess";
import ControlPactLayout from "./layout/ControlPactLayout";
import OverviewPage from "./pages/OverviewPage";
import EnvironmentsPage from "./pages/EnvironmentsPage";
import PoliciesPage from "./pages/PoliciesPage";
import AgentsPage from "./pages/AgentsPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import ApiKeysPage from "./pages/ApiKeysPage";
import DecisionsPage from "./pages/DecisionsPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import AuditPage from "./pages/AuditPage";
import SettingsPage from "./pages/SettingsPage";
import PublicHomePage from "./pages/PublicHomePage";
import DeveloperDocsPage from "./pages/DeveloperDocsPage";
import PricingPage from "./pages/PricingPage";
import LicensingPage from "./pages/LicensingPage";
import BillingCheckoutPage, { CheckoutSuccessPage } from "./pages/BillingCheckoutPage";

export default function App() {
  const [
    accessToken,
    setAccessToken,
  ] =
    useState(
      () =>
        sessionStorage.getItem(
          "controlpactOwnerToken",
        ) || "",
    );

  const [
    accountUser,
    setAccountUser,
  ] =
    useState<
      ControlPactAccountUser |
      null
    >(null);

  const [
    authReady,
    setAuthReady,
  ] =
    useState(false);

  const [
    activeApiKey,
    setActiveApiKey,
  ] =
    useState(
      () =>
        sessionStorage.getItem(
          "controlpactAgentApiKey",
        ) || "",
    );

  const handleAuthenticated =
    (
      token: string,
      user:
        ControlPactAccountUser,
    ) => {
      sessionStorage.setItem(
        "controlpactOwnerToken",
        token,
      );

      setAccessToken(token);
      setAccountUser(user);
      setAuthReady(true);
    };

  const handleActiveApiKey =
    (
      apiKey: string,
    ) => {
      if (apiKey) {
        sessionStorage.setItem(
          "controlpactAgentApiKey",
          apiKey,
        );
      } else {
        sessionStorage.removeItem(
          "controlpactAgentApiKey",
        );
      }

      setActiveApiKey(apiKey);
    };

  const handleLogout =
    async () => {
      try {
        if (accessToken) {
          await fetch(
            "/controlpact-api/v1/auth/logout",
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
              },
            },
          );
        }
      } finally {
        sessionStorage.removeItem(
          "controlpactOwnerToken",
        );

        sessionStorage.removeItem(
          "controlpactAgentApiKey",
        );

        setAccessToken("");
        setAccountUser(null);
        setActiveApiKey("");
        setAuthReady(true);
      }
    };

  useEffect(() => {
    if (!accessToken) {
      setAccountUser(null);
      setAuthReady(true);
      return;
    }

    setAuthReady(false);

    fetch(
      "/controlpact-api/v1/auth/me",
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    )
      .then(
        async (response) => {
          const data =
            await response.json();

          if (
            !response.ok ||
            !data?.success ||
            !data?.user
          ) {
            throw new Error(
              "Session expired.",
            );
          }

          setAccountUser(
            data.user,
          );
        },
      )
      .catch(() => {
        sessionStorage.removeItem(
          "controlpactOwnerToken",
        );

        sessionStorage.removeItem(
          "controlpactAgentApiKey",
        );

        setAccessToken("");
        setAccountUser(null);
        setActiveApiKey("");
      })
      .finally(() =>
        setAuthReady(true),
      );
  }, [accessToken]);

  if (!authReady) {
    return (
      <div className="cp-auth-loading">
        Loading ControlPact...
      </div>
    );
  }

  if (!accountUser) {
    const inviteToken =
      new URLSearchParams(
        window.location.search,
      ).get("invite");

    if (inviteToken) {
      return (
        <AccountAccess
          onAuthenticated={
            handleAuthenticated
          }
        />
      );
    }

    return (
      <Routes>
        <Route
          path="/"
          element={
            <PublicHomePage />
          }
        />

        <Route
          path="/docs"
          element={
            <DeveloperDocsPage />
          }
        />

        <Route
          path="/docs/quick-start"
          element={
            <DeveloperDocsPage
              section="quick-start"
            />
          }
        />

        <Route
          path="/docs/decisions"
          element={
            <DeveloperDocsPage
              section="decisions"
            />
          }
        />

        <Route
          path="/docs/approvals"
          element={
            <DeveloperDocsPage
              section="approvals"
            />
          }
        />

        <Route
          path="/docs/idempotency"
          element={
            <DeveloperDocsPage
              section="idempotency"
            />
          }
        />

        <Route
          path="/docs/security"
          element={
            <DeveloperDocsPage
              section="security"
            />
          }
        />
        <Route
          path="/pricing"
          element={
            <PricingPage />
          }
        />

        <Route
          path="/licensing"
          element={
            <LicensingPage />
          }
        />
        <Route
          path="/checkout/:planId"
          element={
            <AccountAccess
              onAuthenticated={
                handleAuthenticated
              }
            />
          }
        />
        <Route
          path="/login"
          element={
            <AccountAccess
              initialMode="login"
              onAuthenticated={
                handleAuthenticated
              }
            />
          }
        />

        <Route
          path="/register"
          element={
            <AccountAccess
              initialMode="register"
              onAuthenticated={
                handleAuthenticated
              }
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    );
  }

  const role =
    String(
      accountUser.role || "",
    ).toUpperCase();

  const canManage =
    role === "OWNER" ||
    role === "ADMIN";

  const fallback =
    canManage
      ? "/overview"
      : "/decisions";

  return (
    <Routes>
      <Route
        path="/pricing"
        element={
          <PricingPage />
        }
      />
      <Route
        path="/checkout/success"
        element={
          <CheckoutSuccessPage />
        }
      />

      <Route
        path="/checkout/:planId"
        element={
          <BillingCheckoutPage
            accessToken={
              accessToken
            }
          />
        }
      />


      <Route
        path="/licensing"
        element={
          <LicensingPage />
        }
      />

      <Route
        path="/docs"
        element={
          <DeveloperDocsPage />
        }
      />

      <Route
        path="/docs/quick-start"
        element={
          <DeveloperDocsPage
            section="quick-start"
          />
        }
      />

      <Route
        path="/docs/decisions"
        element={
          <DeveloperDocsPage
            section="decisions"
          />
        }
      />

      <Route
        path="/docs/approvals"
        element={
          <DeveloperDocsPage
            section="approvals"
          />
        }
      />

      <Route
        path="/docs/idempotency"
        element={
          <DeveloperDocsPage
            section="idempotency"
          />
        }
      />

      <Route
        path="/docs/security"
        element={
          <DeveloperDocsPage
            section="security"
          />
        }
      />

      <Route
        element={
          <ControlPactLayout
            user={accountUser}
            onLogout={
              handleLogout
            }
          />
        }
      >
        <Route
          index
          element={
            <Navigate
              to={fallback}
              replace
            />
          }
        />

        <Route
          path="/overview"
          element={
            <OverviewPage
              accessToken={
                accessToken
              }
            />
          }
        />

        {canManage && (
          <>
            <Route
              path="/environments"
              element={
                <EnvironmentsPage
                  accessToken={
                    accessToken
                  }
                />
              }
            />

            <Route
              path="/policies"
              element={
                <PoliciesPage
                  accessToken={
                    accessToken
                  }
                />
              }
            />

            <Route
              path="/agents"
              element={
                <AgentsPage
                  accessToken={
                    accessToken
                  }
                />
              }
            />

            <Route
              path="/assignments"
              element={
                <AssignmentsPage
                  accessToken={
                    accessToken
                  }
                />
              }
            />

            <Route
              path="/api-keys"
              element={
                <ApiKeysPage
                  accessToken={
                    accessToken
                  }
                  activeApiKey={
                    activeApiKey
                  }
                  onActiveApiKey={
                    handleActiveApiKey
                  }
                />
              }
            />
          </>
        )}

        <Route
          path="/decisions"
          element={
            <DecisionsPage
              accessToken={
                accessToken
              }
              apiKey={
                activeApiKey
              }
            />
          }
        />

        <Route
          path="/approvals"
          element={
            <ApprovalsPage
              accessToken={
                accessToken
              }
              user={
                accountUser
              }
            />
          }
        />

        <Route
          path="/audit"
          element={
            <AuditPage
              accessToken={
                accessToken
              }
              user={
                accountUser
              }
            />
          }
        />

        {canManage && (
          <Route
            path="/settings"
            element={
              <SettingsPage
                user={
                  accountUser
                }
                accessToken={
                  accessToken
                }
                activeApiKey={
                  activeApiKey
                }
                onActiveApiKey={
                  handleActiveApiKey
                }
              />
            }
          />
        )}

        <Route
          path="*"
          element={
            <Navigate
              to={fallback}
              replace
            />
          }
        />
      </Route>
    </Routes>
  );
}
