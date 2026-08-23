import {
  ControlPactClient,
} from "@controlpact/sdk";

const client =
  new ControlPactClient({
    baseUrl:
      process.env.CONTROLPACT_BASE_URL,
    apiKey:
      process.env.CONTROLPACT_API_KEY,
  });

const decisionId =
  process.argv[2];

if (!decisionId) {
  throw new Error(
    "Usage: node examples/approval-status.mjs <decision-id>",
  );
}

const status =
  await client.getDecision(
    decisionId,
  );

console.log(
  JSON.stringify(
    {
      decision:
        status.decision.decision,
      approvalStatus:
        status.decision.approvalStatus,
      decidedAt:
        status.decision.decidedAt,
      decidedBy:
        status.decision.decidedBy,
      approvalReason:
        status.decision.approvalReason,
    },
    null,
    2,
  ),
);
