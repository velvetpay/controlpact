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

const result =
  await client.decide({
    idempotencyKey:
      "example-operation-001",
    referenceId:
      "example-operation-001",
    request: {
      action:
        "deploy",
      context: {
        environment:
          "production",
      },
    },
  });

console.log(
  JSON.stringify(
    result,
    null,
    2,
  ),
);
