import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Link,
} from "react-router-dom";
import ApiKeysPanel from "../components/ApiKeysPanel";
import PageHeader from "../components/PageHeader";
import type {
  ControlPactAccountUser,
} from "../components/AccountAccess";

type SettingsPageProps = {
  user: ControlPactAccountUser;
  accessToken: string;
  activeApiKey: string;
  onActiveApiKey: (
    apiKey: string,
  ) => void;
};

type SettingsTab =
  | "organisation"
  | "team"
  | "assignments"
  | "api-keys"
  | "security";

type TeamRole =
  | "OWNER"
  | "ADMIN"
  | "APPROVER"
  | "AUDITOR"
  | "VIEWER";

type TeamMemberStatus =
  | "ACTIVE"
  | "INVITED"
  | "DISABLED";

type TeamMember = {
  id: string;
  organizationId: string;
  userId?: string;
  email: string;
  displayName?: string;
  role: TeamRole;
  status: TeamMemberStatus;
  inviteExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export default function SettingsPage({
  user,
  accessToken,
  activeApiKey,
  onActiveApiKey,
}: SettingsPageProps) {
  const [tab, setTab] =
    useState<SettingsTab>(
      "organisation",
    );

  const [members, setMembers] =
    useState<TeamMember[]>([]);

  const [
    teamLoading,
    setTeamLoading,
  ] = useState(false);

  const [
    inviteEmail,
    setInviteEmail,
  ] = useState("");

  const [
    inviteName,
    setInviteName,
  ] = useState("");

  const [
    inviteRole,
    setInviteRole,
  ] =
    useState<
      Exclude<
        TeamRole,
        "OWNER"
      >
    >(
      "APPROVER",
    );

  const [
    inviteBusy,
    setInviteBusy,
  ] = useState(false);

  const [
    invitationLink,
    setInvitationLink,
  ] = useState("");

  const [
    invitationExpiry,
    setInvitationExpiry,
  ] = useState("");

  const [
    teamMessage,
    setTeamMessage,
  ] = useState("");

  const [
    teamError,
    setTeamError,
  ] = useState("");

  const canManageTeam =
    user.role === "OWNER" ||
    user.role === "ADMIN";

  const headers = useMemo(
    () => ({
      Authorization:
        `Bearer ${accessToken}`,
    }),
    [accessToken],
  );

  const loadMembers =
    useCallback(
      async () => {
        setTeamLoading(true);
        setTeamError("");

        try {
          const response =
            await fetch(
              "/controlpact-api/v1/team-members",
              {
                headers,
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
                "Unable to load organisation members.",
            );
          }

          setMembers(
            Array.isArray(
              data.members,
            )
              ? data.members
              : [],
          );
        } catch (requestError) {
          setTeamError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load organisation members.",
          );
        } finally {
          setTeamLoading(false);
        }
      },
      [headers],
    );

  useEffect(() => {
    if (tab === "team") {
      loadMembers();
    }
  }, [
    tab,
    loadMembers,
  ]);

  const inviteMember =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      setInviteBusy(true);
      setTeamError("");
      setTeamMessage("");
      setInvitationLink("");
      setInvitationExpiry("");

      try {
        const response =
          await fetch(
            "/controlpact-api/v1/team-members",
            {
              method: "POST",
              headers: {
                ...headers,
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  email:
                    inviteEmail
                      .trim(),
                  displayName:
                    inviteName
                      .trim() ||
                    undefined,
                  role:
                    inviteRole,
                }),
            },
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (
          !response.ok ||
          !data?.success ||
          !data?.invitationToken
        ) {
          throw new Error(
            data?.message ||
              "Unable to create invitation.",
          );
        }

        const activationUrl =
          new URL(
            window.location.origin,
          );

        activationUrl.searchParams.set(
          "invite",
          data.invitationToken,
        );

        setInvitationLink(
          activationUrl.toString(),
        );

        setInvitationExpiry(
          String(
            data.invitationExpiresAt ||
              "",
          ),
        );

        setTeamMessage(
          `${inviteRole} invitation created for ${inviteEmail.trim()}.`,
        );

        setInviteEmail("");
        setInviteName("");

        await loadMembers();
      } catch (requestError) {
        setTeamError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to create invitation.",
        );
      } finally {
        setInviteBusy(false);
      }
    };

  const copyInvitation =
    async () => {
      try {
        await navigator
          .clipboard
          .writeText(
            invitationLink,
          );

        setTeamMessage(
          "Invitation link copied.",
        );
      } catch {
        setTeamMessage(
          "Copy the invitation link manually from the box below.",
        );
      }
    };


  // CONTROLPACT_INVITE_REISSUE_UI_V1
  const regenerateInvitation =
    async (
      member: TeamMember,
    ) => {
      setInviteBusy(true);
      setTeamError("");
      setTeamMessage("");
      setInvitationLink("");
      setInvitationExpiry("");

      try {
        const response =
          await fetch(
            `/controlpact-api/v1/team-members/${member.id}/reinvite`,
            {
              method: "POST",
              headers,
            },
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (
          !response.ok ||
          !data?.success ||
          !data?.invitationToken
        ) {
          throw new Error(
            data?.message ||
              "Unable to regenerate invitation.",
          );
        }

        const activationUrl =
          new URL(
            window.location.origin,
          );

        activationUrl.searchParams.set(
          "invite",
          data.invitationToken,
        );

        setInvitationLink(
          activationUrl.toString(),
        );

        setInvitationExpiry(
          String(
            data.invitationExpiresAt ||
              "",
          ),
        );

        setTeamMessage(
          `Fresh activation link created for ${member.displayName || member.email}.`,
        );

        await loadMembers();
      } catch (requestError) {
        setTeamError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to regenerate invitation.",
        );
      } finally {
        setInviteBusy(false);
      }
    };


  // CONTROLPACT_INVITE_EMAIL_UI_V1
  const sendInvitationEmail =
    async (
      member: TeamMember,
    ) => {
      setInviteBusy(true);
      setTeamError("");
      setTeamMessage("");

      try {
        const response =
          await fetch(
            `/controlpact-api/v1/team-members/${member.id}/send-invite-email`,
            {
              method: "POST",
              headers,
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
              "Unable to send invitation email.",
          );
        }

        setTeamMessage(
          data.message ||
            `Invitation email sent to ${member.email}.`,
        );

        await loadMembers();
      } catch (requestError) {
        setTeamError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to send invitation email.",
        );
      } finally {
        setInviteBusy(false);
      }
    };

  return (
    <>
      <PageHeader
        eyebrow="ORGANISATION CONTROL"
        title="Settings"
        description="Manage organisation identity, human authority, API access and security configuration."
      />

      <div className="cp-settings-tabs">
        <button
          type="button"
          className={
            tab ===
            "organisation"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab(
              "organisation",
            )
          }
        >
          Organisation
        </button>

        <button
          type="button"
          className={
            tab === "team"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("team")
          }
        >
          Team & Roles
        </button>

        <button
          type="button"
          className={
            tab ===
            "assignments"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab(
              "assignments",
            )
          }
        >
          Agent Assignments
        </button>

        <button
          type="button"
          className={
            tab ===
            "api-keys"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab(
              "api-keys",
            )
          }
        >
          API Keys
        </button>

        <button
          type="button"
          className={
            tab ===
            "security"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab(
              "security",
            )
          }
        >
          Security
        </button>
      </div>

      {tab ===
        "organisation" && (
        <section className="panel cp-settings-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                ORGANISATION
              </p>
              <h3>
                Organisation Identity
              </h3>
            </div>
          </div>

          <div className="cp-detail-grid">
            <div>
              <span>
                Organisation
              </span>
              <strong>
                {
                  user.organizationName
                }
              </strong>
            </div>

            <div>
              <span>
                Organisation ID
              </span>
              <code>
                {
                  user.organizationId
                }
              </code>
            </div>

            <div>
              <span>
                Signed-in account
              </span>
              <strong>
                {user.email}
              </strong>
            </div>

            <div>
              <span>
                Platform role
              </span>
              <strong>
                {user.role}
              </strong>
            </div>
          </div>
        </section>
      )}

      {tab === "team" && (
        <>
          <section className="panel cp-settings-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">
                  HUMAN AUTHORITY
                </p>
                <h3>
                  Team & Roles
                </h3>
              </div>

              <span className="policy-count">
                {members.length}
                {" "}
                members
              </span>
            </div>

            <div className="cp-role-model">
              <article>
                <strong>
                  Owner
                </strong>
                <span>
                  Ultimate organisation authority
                </span>
              </article>

              <article>
                <strong>
                  Admin
                </strong>
                <span>
                  Operational management authority
                </span>
              </article>

              <article>
                <strong>
                  Approver
                </strong>
                <span>
                  Assigned human approval authority
                </span>
              </article>

              <article>
                <strong>
                  Auditor
                </strong>
                <span>
                  Evidence and audit oversight
                </span>
              </article>

              <article>
                <strong>
                  Viewer
                </strong>
                <span>
                  Read-only oversight
                </span>
              </article>
            </div>
          </section>

          {canManageTeam && (
            <section className="panel cp-settings-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    INVITE HUMAN AUTHORITY
                  </p>
                  <h3>
                    Add Organisation Member
                  </h3>
                </div>
              </div>

              <form
                className="cp-form-grid"
                onSubmit={
                  inviteMember
                }
              >
                <label>
                  <span>
                    Name
                  </span>
                  <input
                    value={
                      inviteName
                    }
                    onChange={(
                      event,
                    ) =>
                      setInviteName(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="e.g. Jane Smith"
                  />
                </label>

                <label>
                  <span>
                    Email
                  </span>
                  <input
                    type="email"
                    value={
                      inviteEmail
                    }
                    onChange={(
                      event,
                    ) =>
                      setInviteEmail(
                        event
                          .target
                          .value,
                      )
                    }
                    required
                  />
                </label>

                <label>
                  <span>
                    Role
                  </span>
                  <select
                    value={
                      inviteRole
                    }
                    onChange={(
                      event,
                    ) =>
                      setInviteRole(
                        event
                          .target
                          .value as Exclude<
                            TeamRole,
                            "OWNER"
                          >,
                      )
                    }
                  >
                    <option value="APPROVER">
                      Approver
                    </option>
                    <option value="ADMIN">
                      Admin
                    </option>
                    <option value="AUDITOR">
                      Auditor
                    </option>
                    <option value="VIEWER">
                      Viewer
                    </option>
                  </select>
                </label>

                <div className="cp-form-actions">
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={
                      inviteBusy
                    }
                  >
                    {inviteBusy
                      ? "Creating..."
                      : "Create Invitation"}
                  </button>
                </div>
              </form>

              {inviteRole ===
                "APPROVER" && (
                <p className="cp-settings-note">
                  Use a separate human reviewer for the Approver role. The assignment screen attaches a named Approver to agent authority, while the Owner remains the ultimate organisation authority.
                </p>
              )}

              {invitationLink && (
                <div className="cp-invite-result">
                  <strong>
                    One-time activation link
                  </strong>

                  <p>
                    Send this link only to the invited person. They will set their own password and activate the role you assigned.
                  </p>

                  <textarea
                    readOnly
                    value={
                      invitationLink
                    }
                    rows={3}
                  />

                  <div className="cp-form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        copyInvitation
                      }
                    >
                      Copy Invitation Link
                    </button>
                  </div>

                  {invitationExpiry && (
                    <small>
                      Expires:
                      {" "}
                      {new Date(
                        invitationExpiry,
                      ).toLocaleString()}
                    </small>
                  )}
                </div>
              )}

              {teamMessage && (
                <p className="api-key-message">
                  {teamMessage}
                </p>
              )}

              {teamError && (
                <p className="decision-error">
                  {teamError}
                </p>
              )}
            </section>
          )}

          <section className="panel cp-settings-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">
                  ORGANISATION MEMBERS
                </p>
                <h3>
                  Authority Directory
                </h3>
              </div>
            </div>

            {teamLoading ? (
              <div className="cp-empty">
                Loading members...
              </div>
            ) : members.length ===
              0 ? (
              <div className="cp-empty">
                No members found.
              </div>
            ) : (
              <div className="cp-table-wrap">
                <table className="cp-table">
                  <thead>
                    <tr>
                      <th>
                        Person
                      </th>
                      <th>
                        Role
                      </th>
                      <th>
                        Status
                      </th>
                      <th>
                        Account
                      </th>
                      <th>
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {members.map(
                      (member) => (
                        <tr
                          key={
                            member.id
                          }
                        >
                          <td>
                            <strong>
                              {member.displayName ||
                                member.email}
                            </strong>
                            {member.displayName && (
                              <small className="cp-table-subtext">
                                {member.email}
                              </small>
                            )}
                          </td>

                          <td>
                            <span className="role-chip">
                              {member.role}
                            </span>
                          </td>

                          <td>
                            {
                              member.status
                            }
                          </td>

                          <td>
                            {member.userId
                              ? "Activated"
                              : member.status ===
                                  "INVITED"
                                ? "Invitation pending"
                                : "Not activated"}
                          </td>

                          <td>
                            {canManageTeam &&
                            member.status ===
                              "INVITED" ? (
                              <>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  disabled={
                                    inviteBusy
                                  }
                                  onClick={() =>
                                    regenerateInvitation(
                                      member,
                                    )
                                  }
                                >
                                  Regenerate Activation Link
                                </button>

                                <button
                                  type="button"
                                  className="primary-button"
                                  disabled={
                                    inviteBusy
                                  }
                                  onClick={() =>
                                    sendInvitationEmail(
                                      member,
                                    )
                                  }
                                >
                                  Send Invitation Email
                                </button>
                              </>
                            ) : (
                              "—"
                            )}
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
      )}

      {tab ===
        "assignments" && (
        <section className="panel cp-settings-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                AUTHORITY ASSIGNMENTS
              </p>
              <h3>
                Agent Assignments
              </h3>
            </div>
          </div>

          <p>
            Assignments are now a first-class control step. Owner or Admin connects an Agent to its Environment, Policy and named independent Approver.
          </p>

          <Link
            to="/assignments"
            className="cp-flow-next-button"
          >
            Open Assignment Control →
          </Link>
        </section>
      )}

      {tab ===
        "api-keys" && (
        <ApiKeysPanel
          accessToken={
            accessToken
          }
          activeApiKey={
            activeApiKey
          }
          onActiveApiKey={
            onActiveApiKey
          }
        />
      )}

      {tab ===
        "security" && (
        <section className="panel cp-settings-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                SECURITY
              </p>
              <h3>
                Access Security
              </h3>
            </div>
          </div>

          <div className="cp-security-list">
            <div>
              <strong>
                Human sessions
              </strong>
              <span>
                Authenticated and revocable
              </span>
            </div>

            <div>
              <strong>
                Team invitations
              </strong>
              <span>
                One-time token, hashed at rest
              </span>
            </div>

            <div>
              <strong>
                Password storage
              </strong>
              <span>
                Server-side scrypt hashing
              </span>
            </div>

            <div>
              <strong>
                Agent credentials
              </strong>
              <span>
                Scoped and revocable API keys
              </span>
            </div>

            <div>
              <strong>
                Audit evidence
              </strong>
              <span>
                Signed decision receipts
              </span>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
