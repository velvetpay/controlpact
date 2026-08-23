import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
} from "react-router-dom";
import type {
  ControlPactAccountUser,
} from "../components/AccountAccess";

type ControlPactLayoutProps = {
  user: ControlPactAccountUser;
  accessToken: string;
  onLogout: () => void;
};

type PlatformPlan =
  | "SANDBOX"
  | "PRODUCTION"
  | "BUSINESS"
  | "ENTERPRISE";

const fullFlow = [
  ["/environments", "1", "Environment"],
  ["/policies", "2", "Policy"],
  ["/agents", "3", "Agent"],
  ["/assignments", "4", "Assignment"],
  ["/api-keys", "5", "API Key"],
  ["/decisions", "6", "Decision"],
  ["/approvals", "7", "Approval"],
  ["/audit", "8", "Audit"],
] as const;

const operationalFlow = [
  ["/decisions", "6", "Decision"],
  ["/approvals", "7", "Approval"],
  ["/audit", "8", "Audit"],
] as const;

const managerSetupItems = [
  {
    to: "/overview",
    label: "Overview",
  },
  {
    to: "/environments",
    label: "1. Environment",
  },
  {
    to: "/policies",
    label: "2. Policy",
  },
  {
    to: "/agents",
    label: "3. Agent",
  },
  {
    to: "/assignments",
    label: "4. Assignment",
  },
  {
    to: "/api-keys",
    label: "5. API Key",
  },
];

const operationalItems = [
  {
    to: "/decisions",
    label: "6. Decision",
  },
  {
    to: "/approvals",
    label: "7. Approval",
  },
  {
    to: "/audit",
    label: "8. Audit",
  },
];

const managerNext:
  Record<
    string,
    {
      to: string;
      label: string;
    }
  > = {
    "/environments": {
      to: "/policies",
      label: "Next: Policy →",
    },
    "/policies": {
      to: "/agents",
      label: "Next: Agent →",
    },
    "/agents": {
      to: "/assignments",
      label: "Next: Assignment →",
    },
    "/assignments": {
      to: "/api-keys",
      label: "Next: API Key →",
    },
    "/api-keys": {
      to: "/decisions",
      label: "Next: Decision →",
    },
    "/decisions": {
      to: "/approvals",
      label: "Next: Approval →",
    },
    "/approvals": {
      to: "/audit",
      label: "Next: Audit →",
    },
  };

const operationalNext:
  Record<
    string,
    {
      to: string;
      label: string;
    }
  > = {
    "/decisions": {
      to: "/approvals",
      label: "Next: Approval →",
    },
    "/approvals": {
      to: "/audit",
      label: "Next: Audit →",
    },
  };

export default function ControlPactLayout({
  user,
  accessToken,
  onLogout,
}: ControlPactLayoutProps) {
  const location =
    useLocation();

  const role =
    String(
      user.role || "",
    ).toUpperCase();

  const canManage =
    role === "OWNER" ||
    role === "ADMIN";

  const flow =
    canManage
      ? fullFlow
      : operationalFlow;

  const nextStep =
    (
      canManage
        ? managerNext
        : operationalNext
    )[location.pathname];

  // CONTROLPACT_PLAN_VISIBILITY_V4
  const [
    platformPlan,
    setPlatformPlan,
  ] =
    useState<PlatformPlan>(
      "SANDBOX",
    );

  useEffect(() => {
    let cancelled = false;

    fetch(
      "/controlpact-api/v1/billing/status",
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          Accept:
            "application/json",
        },
      },
    )
      .then(
        async (response) => {
          const data =
            await response.json();

          if (
            !response.ok ||
            !data?.success
          ) {
            throw new Error(
              "Unable to load billing status.",
            );
          }

          const candidate =
            String(
              data?.entitlements
                ?.platformPlan ||
              "SANDBOX",
            ).toUpperCase();

          if (
            !cancelled &&
            (
              candidate === "SANDBOX" ||
              candidate === "PRODUCTION" ||
              candidate === "BUSINESS" ||
              candidate === "ENTERPRISE"
            )
          ) {
            setPlatformPlan(
              candidate as PlatformPlan,
            );
          }
        },
      )
      .catch(() => {
        if (!cancelled) {
          setPlatformPlan(
            "SANDBOX",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const planDisplay = {
    SANDBOX: {
      label: "Sandbox",
      detail:
        "2 user seats | test only",
      action:
        "View plans / Upgrade",
    },
    PRODUCTION: {
      label: "Production",
      detail:
        "10 user seats | 20 agents",
      action:
        "Upgrade to Business",
    },
    BUSINESS: {
      label: "Business",
      detail:
        "30 user seats | 100 agents",
      action:
        "View plans",
    },
    ENTERPRISE: {
      label: "Enterprise",
      detail:
        "100 user seats | 500 agents",
      action:
        "View plan",
    },
  }[platformPlan];

  const renderLink =
    (
      item: {
        to: string;
        label: string;
      },
    ) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={({
          isActive,
        }: {
          isActive: boolean;
        }) =>
          isActive
            ? "cp-nav-link cp-nav-link-active"
            : "cp-nav-link"
        }
      >
        {item.label}
      </NavLink>
    );

  return (
    <div className="cp-shell">
      <aside className="cp-sidebar">
        <div className="cp-brand">
          <div className="cp-brand-mark">
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

        <nav className="cp-nav">
          {canManage ? (
            <>
              <div className="cp-nav-flow-group">
                <span className="cp-nav-flow-label">
                  SET UP CONTROL
                </span>

                {managerSetupItems.map(
                  renderLink,
                )}
              </div>

              <div className="cp-nav-flow-group">
                <span className="cp-nav-flow-label">
                  OPERATE
                </span>

                {operationalItems.map(
                  renderLink,
                )}
              </div>
            </>
          ) : (
            <>
              <div className="cp-nav-flow-group">
                <span className="cp-nav-flow-label">
                  OPERATIONAL REVIEW
                </span>

                <NavLink
                  to="/overview"
                  className={({
                    isActive,
                  }: {
                    isActive: boolean;
                  }) =>
                    isActive
                      ? "cp-nav-link cp-nav-link-active"
                      : "cp-nav-link"
                  }
                >
                  Overview
                </NavLink>

                {operationalItems.map(
                  renderLink,
                )}
              </div>

              <div className="cp-role-boundary">
                <strong>
                  {role === "APPROVER"
                    ? "Approver"
                    : role === "AUDITOR"
                      ? "Auditor"
                      : "Read-only"}
                </strong>

                <span>
                  {role === "APPROVER"
                    ? "Read, comment, request amendments and approve assigned work."
                    : role === "AUDITOR"
                      ? "Read, comment, request remediation and complete audit."
                      : "Read operational evidence only."}
                </span>
              </div>
            </>
          )}
        </nav>

        <div className="cp-sidebar-bottom">
          <div className="cp-plan-mini">
            <span className="cp-plan-mini-eyebrow">
              CURRENT PLAN
            </span>

            <strong>
              {planDisplay.label}
            </strong>

            <span className="cp-plan-mini-detail">
              {planDisplay.detail}
            </span>

            <Link
              className="cp-plan-mini-action"
              to="/pricing"
            >
              {planDisplay.action}
            </Link>
          </div>

          {canManage && (
            <NavLink
              to="/settings"
              className={({
                isActive,
              }: {
                isActive: boolean;
              }) =>
                isActive
                  ? "cp-nav-link cp-nav-link-active"
                  : "cp-nav-link"
              }
            >
              Settings
            </NavLink>
          )}

          <div className="cp-org-mini">
            <strong>
              {user.organizationName}
            </strong>

            <span>
              {role === "OWNER"
                ? "Owner · Ultimate Authority"
                : role === "ADMIN"
                  ? "Admin · Delegated Management"
                  : role}
            </span>
          </div>
        </div>
      </aside>

      <div className="cp-workspace">
        <header className="cp-topbar">
          <div>
            <span className="cp-topbar-label">
              CONTROLPACT
            </span>
          </div>

          <div className="cp-account">
            <div>
              <strong>
                {user.organizationName}
              </strong>

              <span>
                {user.email}
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="cp-page">
          <section className="cp-flow-rail">
            <div className="cp-flow-rail-heading">
              <div>
                <strong>
                  {canManage
                    ? "CONTROL FLOW"
                    : "HUMAN REVIEW FLOW"}
                </strong>

                <span>
                  {canManage
                    ? "Environment → Policy → Agent → Assignment → API Key → Decision → Approval → Audit"
                    : "Decision → Approval → Audit"}
                </span>
              </div>

              {nextStep && (
                <Link
                  to={nextStep.to}
                  className="cp-flow-next-button"
                >
                  {nextStep.label}
                </Link>
              )}
            </div>

            <div
              className={
                canManage
                  ? "cp-flow-rail-steps"
                  : "cp-flow-rail-steps cp-flow-rail-steps-operational"
              }
            >
              {flow.map(
                (
                  [
                    to,
                    number,
                    label,
                  ],
                ) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({
                      isActive,
                    }: {
                      isActive:
                        boolean;
                    }) =>
                      isActive
                        ? "cp-flow-rail-step cp-flow-rail-step-active"
                        : "cp-flow-rail-step"
                    }
                  >
                    <span>
                      {number}
                    </span>

                    <strong>
                      {label}
                    </strong>
                  </NavLink>
                ),
              )}
            </div>
          </section>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
