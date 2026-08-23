import test from "node:test";
import assert from "node:assert/strict";

process.env.CONTROLPACT_STORAGE =
  "memory";

delete process.env
  .CONTROLPACT_REQUIRE_API_KEYS;

delete process.env
  .CONTROLPACT_REQUIRE_HUMAN_APPROVAL_AUTH;

process.env.CONTROLPACT_RECEIPT_SECRET =
  "controlpact-team-invite-auth-test-secret";

const {
  buildApp,
} =
  await import(
    "../dist/app.js"
  );

const bearer = (
  token,
) => ({
  authorization:
    `Bearer ${token}`,
});

test(
  "invited Approver activates a real same-organisation account exactly once",
  async () => {
    const app =
      await buildApp();

    const ownerResponse =
      await app.inject({
        method:
          "POST",
        url:
          "/v1/auth/register",
        payload: {
          email:
            "owner-invite@controlpact.test",
          password:
            "ControlPact-Owner-Invite-2026!",
          organizationName:
            "Invite Authority Org",
        },
      });

    assert.equal(
      ownerResponse.statusCode,
      201,
    );

    const owner =
      ownerResponse.json();

    const inviteResponse =
      await app.inject({
        method:
          "POST",
        url:
          "/v1/team-members",
        headers:
          bearer(
            owner.accessToken,
          ),
        payload: {
          email:
            "approver-invite@controlpact.test",
          displayName:
            "Independent Approver",
          role:
            "APPROVER",
        },
      });

    assert.equal(
      inviteResponse.statusCode,
      201,
    );

    const invite =
      inviteResponse.json();

    assert.equal(
      invite.member.role,
      "APPROVER",
    );

    assert.equal(
      invite.member.status,
      "INVITED",
    );

    assert.ok(
      typeof invite
        .invitationToken ===
        "string" &&
      invite
        .invitationToken
        .length > 20,
    );

    assert.equal(
      "inviteTokenHash" in
        invite.member,
      false,
    );

    const activateResponse =
      await app.inject({
        method:
          "POST",
        url:
          "/v1/auth/accept-invite",
        payload: {
          token:
            invite.invitationToken,
          password:
            "ControlPact-Approver-2026!",
        },
      });

    assert.equal(
      activateResponse.statusCode,
      201,
    );

    const activated =
      activateResponse.json();

    assert.equal(
      activated.user.role,
      "APPROVER",
    );

    assert.equal(
      activated
        .user
        .organizationId,
      owner
        .user
        .organizationId,
    );

    assert.equal(
      activated
        .user
        .organizationName,
      owner
        .user
        .organizationName,
    );

    const meResponse =
      await app.inject({
        method:
          "GET",
        url:
          "/v1/auth/me",
        headers:
          bearer(
            activated.accessToken,
          ),
      });

    assert.equal(
      meResponse.statusCode,
      200,
    );

    assert.equal(
      meResponse
        .json()
        .user
        .role,
      "APPROVER",
    );

    const loginResponse =
      await app.inject({
        method:
          "POST",
        url:
          "/v1/auth/login",
        payload: {
          email:
            "approver-invite@controlpact.test",
          password:
            "ControlPact-Approver-2026!",
        },
      });

    assert.equal(
      loginResponse.statusCode,
      200,
    );

    assert.equal(
      loginResponse
        .json()
        .user
        .role,
      "APPROVER",
    );

    const membersResponse =
      await app.inject({
        method:
          "GET",
        url:
          "/v1/team-members",
        headers:
          bearer(
            owner.accessToken,
          ),
      });

    assert.equal(
      membersResponse.statusCode,
      200,
    );

    const member =
      membersResponse
        .json()
        .members
        .find(
          (item) =>
            item.email ===
            "approver-invite@controlpact.test",
        );

    assert.ok(member);

    assert.equal(
      member.status,
      "ACTIVE",
    );

    assert.equal(
      member.role,
      "APPROVER",
    );

    assert.ok(
      typeof member.userId ===
        "string" &&
      member.userId.length > 0,
    );

    assert.equal(
      "inviteTokenHash" in member,
      false,
    );

    const reusedResponse =
      await app.inject({
        method:
          "POST",
        url:
          "/v1/auth/accept-invite",
        payload: {
          token:
            invite.invitationToken,
          password:
            "ControlPact-Another-Password-2026!",
        },
      });

    assert.equal(
      reusedResponse.statusCode,
      404,
    );

    await app.close();
  },
);
