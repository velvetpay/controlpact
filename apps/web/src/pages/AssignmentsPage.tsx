import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Link,
  useSearchParams,
} from "react-router-dom";
import PageHeader from "../components/PageHeader";
import type {
  AgentAssignment,
  ControlEnvironment,
  OrganizationPolicy,
  RegisteredAgent,
} from "../types";

type AssignmentsPageProps = {
  accessToken: string;
};

type TeamMember = {
  id: string;
  userId?: string;
  email: string;
  displayName?: string;
  role:
    | "OWNER"
    | "ADMIN"
    | "APPROVER"
    | "AUDITOR"
    | "VIEWER";
  status:
    | "ACTIVE"
    | "INVITED"
    | "DISABLED";
};

export default function AssignmentsPage({
  accessToken,
}: AssignmentsPageProps) {
  const [searchParams] =
    useSearchParams();

  const [
    environments,
    setEnvironments,
  ] =
    useState<ControlEnvironment[]>([]);

  const [agents, setAgents] =
    useState<RegisteredAgent[]>([]);

  const [policies, setPolicies] =
    useState<OrganizationPolicy[]>([]);

  const [
    assignments,
    setAssignments,
  ] =
    useState<AgentAssignment[]>([]);

  const [members, setMembers] =
    useState<TeamMember[]>([]);

  const [
    environmentId,
    setEnvironmentId,
  ] =
    useState(
      searchParams.get(
        "environmentId",
      ) || "",
    );

  const [agentId, setAgentId] =
    useState(
      searchParams.get(
        "agentId",
      ) || "",
    );

  const [policyId, setPolicyId] =
    useState(
      searchParams.get(
        "policyId",
      ) || "",
    );

  const [
    approverId,
    setApproverId,
  ] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const headers = useMemo(
    () => ({
      Authorization:
        `Bearer ${accessToken}`,
    }),
    [accessToken],
  );

  const load =
    useCallback(
      async () => {
        const responses =
          await Promise.all([
            fetch(
              "/controlpact-api/v1/environments",
              { headers },
            ),
            fetch(
              "/controlpact-api/v1/agents",
              { headers },
            ),
            fetch(
              "/controlpact-api/v1/organization-policies",
              { headers },
            ),
            fetch(
              "/controlpact-api/v1/agent-assignments",
              { headers },
            ),
            fetch(
              "/controlpact-api/v1/team-members",
              { headers },
            ),
          ]);

        const data =
          await Promise.all(
            responses.map(
              (response) =>
                response
                  .json()
                  .catch(() => null),
            ),
          );

        if (
          responses.some(
            (response) =>
              !response.ok,
          )
        ) {
          throw new Error(
            data.find(
              (item) =>
                item?.message,
            )?.message ||
              "Unable to load assignment authority.",
          );
        }

        const nextEnvironments =
          Array.isArray(
            data[0]?.environments,
          )
            ? data[0].environments
            : [];

        const nextAgents =
          Array.isArray(
            data[1]?.agents,
          )
            ? data[1].agents
            : [];

        const nextPolicies =
          Array.isArray(
            data[2]?.policies,
          )
            ? data[2].policies
            : [];

        const nextAssignments =
          Array.isArray(
            data[3]?.assignments,
          )
            ? data[3].assignments
            : [];

        const nextMembers =
          Array.isArray(
            data[4]?.members,
          )
            ? data[4].members
            : [];

        setEnvironments(
          nextEnvironments,
        );

        setAgents(nextAgents);
        setPolicies(nextPolicies);

        setAssignments(
          nextAssignments,
        );

        setMembers(
          nextMembers,
        );

        setEnvironmentId(
          (current) =>
            current ||
            nextEnvironments.find(
              (item: ControlEnvironment) =>
                item.status ===
                "ACTIVE",
            )?.id ||
            "",
        );
      },
      [headers],
    );

  useEffect(() => {
    load().catch(
      (requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load assignment authority.",
        ),
    );
  }, [load]);

  const filteredAgents =
    useMemo(
      () =>
        agents.filter(
          (agent) =>
            agent.environmentId ===
            environmentId,
        ),
      [
        agents,
        environmentId,
      ],
    );

  const filteredPolicies =
    useMemo(
      () =>
        policies.filter(
          (policy) =>
            policy.environmentId ===
            environmentId,
        ),
      [
        policies,
        environmentId,
      ],
    );

  const approvers =
    useMemo(
      () =>
        members.filter(
          (member) =>
            member.role ===
              "APPROVER" &&
            member.status !==
              "DISABLED",
        ),
      [members],
    );

  useEffect(() => {
    if (
      agentId &&
      filteredAgents.some(
        (item) =>
          item.id === agentId,
      )
    ) {
      return;
    }

    setAgentId(
      filteredAgents[0]?.id || "",
    );
  }, [
    filteredAgents,
    agentId,
  ]);

  useEffect(() => {
    if (
      policyId &&
      filteredPolicies.some(
        (item) =>
          item.id === policyId,
      )
    ) {
      return;
    }

    setPolicyId(
      filteredPolicies.find(
        (item) =>
          item.status ===
            "ACTIVE",
      )?.id ||
      filteredPolicies[0]?.id ||
      "",
    );
  }, [
    filteredPolicies,
    policyId,
  ]);

  useEffect(() => {
    if (
      approverId &&
      approvers.some(
        (item) =>
          item.id === approverId,
      )
    ) {
      return;
    }

    setApproverId(
      approvers[0]?.id || "",
    );
  }, [
    approvers,
    approverId,
  ]);

  const create =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      setBusy(true);
      setError("");
      setMessage("");

      try {
        const response =
          await fetch(
            "/controlpact-api/v1/agent-assignments",
            {
              method: "POST",
              headers: {
                ...headers,
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  environmentId,
                  agentId,
                  policyId,
                  responsibleUserId:
                    approverId,
                  responsibleRole:
                    "APPROVER",
                }),
            },
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(
            data?.message ||
              "Agent assignment failed.",
          );
        }

        setMessage(
          "Authority assignment saved. The agent is now tied to its environment, policy and named independent Approver.",
        );

        await load();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Agent assignment failed.",
        );
      } finally {
        setBusy(false);
      }
    };

  const environmentName =
    (id: string) =>
      environments.find(
        (item) =>
          item.id === id,
      )?.name ||
      id;

  const agentName =
    (id: string) =>
      agents.find(
        (item) =>
          item.id === id,
      )?.name ||
      id;

  const policyName =
    (id: string) =>
      policies.find(
        (item) =>
          item.id === id,
      )?.name ||
      id;

  const approverName =
    (
      id?: string,
      role?: string,
    ) => {
      if (id) {
        const member =
          members.find(
            (item) =>
              item.id === id,
          );

        if (member) {
          return (
            member.displayName ||
            member.email
          );
        }
      }

      return role ||
        "Legacy assignment";
    };

  return (
    <>
      <PageHeader
        eyebrow="STEP 4 · AUTHORITY ASSIGNMENT"
        title="Assignments"
        description="Owner or Admin connects the agent to its governing environment and policy, then appoints a separate human Approver."
      />

      <section className="panel cp-page-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              POWER STRUCTURE
            </p>
            <h3>
              Who Controls What
            </h3>
          </div>
        </div>

        <p>
          <strong>
            Owner / Admin
          </strong>
          {" "}creates the assignment.
          The{" "}
          <strong>
            Agent
          </strong>
          {" "}operates only inside the assigned policy.
          A named{" "}
          <strong>
            independent human Approver
          </strong>
          {" "}is designated for escalated actions.
          ControlPact records the resulting authority chain.
        </p>
      </section>

      <section className="panel cp-page-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              CREATE AUTHORITY CHAIN
            </p>
            <h3>
              Assign Agent + Approver
            </h3>
          </div>
        </div>

        {approvers.length === 0 && (
          <div className="cp-empty">
            No Approver is available yet.
            Add a team member with the
            Approver role in{" "}
            <Link
              to="/settings"
              className="cp-text-link"
            >
              Settings
            </Link>
            {" "}before creating this
            assignment.
          </div>
        )}

        <form
          className="cp-form-grid"
          onSubmit={create}
        >
          <label>
            <span>Environment</span>
            <select
              value={environmentId}
              onChange={(event) =>
                setEnvironmentId(
                  event.target.value,
                )
              }
              required
            >
              <option value="">
                Select environment
              </option>

              {environments.map(
                (environment) => (
                  <option
                    key={environment.id}
                    value={environment.id}
                  >
                    {environment.name}
                    {" — "}
                    {environment.status}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span>Agent</span>
            <select
              value={agentId}
              onChange={(event) =>
                setAgentId(
                  event.target.value,
                )
              }
              required
            >
              <option value="">
                Select agent
              </option>

              {filteredAgents.map(
                (agent) => (
                  <option
                    key={agent.id}
                    value={agent.id}
                  >
                    {agent.name}
                    {" — "}
                    {agent.status}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span>Policy</span>
            <select
              value={policyId}
              onChange={(event) =>
                setPolicyId(
                  event.target.value,
                )
              }
              required
            >
              <option value="">
                Select policy
              </option>

              {filteredPolicies.map(
                (policy) => (
                  <option
                    key={policy.id}
                    value={policy.id}
                  >
                    {policy.name}
                    {" — "}
                    {policy.status}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span>
              Independent human Approver
            </span>
            <select
              value={approverId}
              onChange={(event) =>
                setApproverId(
                  event.target.value,
                )
              }
              required
            >
              <option value="">
                Select Approver
              </option>

              {approvers.map(
                (member) => (
                  <option
                    key={member.id}
                    value={member.id}
                  >
                    {member.displayName ||
                      member.email}
                    {" — "}
                    {member.status}
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="cp-form-actions cp-form-wide">
            <button
              type="submit"
              className="primary-button"
              disabled={
                busy ||
                !environmentId ||
                !agentId ||
                !policyId ||
                !approverId
              }
            >
              {busy
                ? "Saving..."
                : "Create Authority Assignment"}
            </button>
          </div>
        </form>

        {message && (
          <div className="cp-message">
            {message}
          </div>
        )}

        {error && (
          <div className="cp-error">
            {error}
          </div>
        )}
      </section>

      <section className="panel cp-page-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              CURRENT AUTHORITY
            </p>
            <h3>
              Saved Assignments
            </h3>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="cp-empty">
            No assignments have been
            created yet.
          </div>
        ) : (
          <div className="cp-table-wrap">
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Environment</th>
                  <th>Agent</th>
                  <th>Policy</th>
                  <th>
                    Human Approver
                  </th>
                  <th>Next</th>
                </tr>
              </thead>

              <tbody>
                {assignments.map(
                  (assignment) => (
                    <tr
                      key={
                        assignment.id
                      }
                    >
                      <td>
                        {environmentName(
                          assignment
                            .environmentId,
                        )}
                      </td>

                      <td>
                        {agentName(
                          assignment
                            .agentId,
                        )}
                      </td>

                      <td>
                        {policyName(
                          assignment
                            .policyId,
                        )}
                      </td>

                      <td>
                        {approverName(
                          assignment
                            .responsibleUserId,
                          assignment
                            .responsibleRole,
                        )}
                      </td>

                      <td>
                        <Link
                          to="/api-keys"
                          className="cp-text-link"
                        >
                          Create key →
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
