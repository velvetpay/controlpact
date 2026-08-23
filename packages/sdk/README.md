# @controlpact/sdk

Official TypeScript and JavaScript SDK for ControlPact.

ControlPact is an AI-agent governance control plane that connects agent identity, policy, assignment, decisions, human approval and audit evidence in one enforceable flow.

## What the SDK does

The SDK lets an application:

- authenticate with a ControlPact agent API key;
- submit an action to ControlPact for a governed decision;
- receive `ALLOW`, `APPROVE` or `BLOCK`;
- attach an idempotency key to prevent accidental duplicate decision creation;
- query a decision again to inspect its current approval status;
- receive typed API errors when ControlPact rejects a request.

## Requirements

- Node.js 18 or newer, or another JavaScript runtime with a standards-compatible `fetch`.
- A ControlPact API base URL.
- A ControlPact agent API key beginning with `cpk_`.

Never expose an agent API key in browser-side or public client code. Use the SDK from a trusted server-side environment.

## Installation

### From a packaged ControlPact SDK tarball

```bash
npm install ./controlpact-sdk-0.1.0.tgz
```

### From npm

The package name is reserved as:

```bash
npm install @controlpact/sdk
```

Use the npm command only after the package has been published to the configured registry.

## Quick start

```js
import {
  ControlPactClient,
} from "@controlpact/sdk";

const controlPact =
  new ControlPactClient({
    baseUrl:
      process.env.CONTROLPACT_BASE_URL,
    apiKey:
      process.env.CONTROLPACT_API_KEY,
  });

const result =
  await controlPact.decide({
    idempotencyKey:
      "refund-order-1042",
    referenceId:
      "order-1042",
    request: {
      action:
        "refundCustomer",
      amount: 750,
      currency: "GBP",
      context: {
        customerTier:
          "standard",
      },
    },
  });

switch (result.result.decision) {
  case "ALLOW":
    // Continue only with the action ControlPact allowed.
    break;

  case "APPROVE":
    // Do not execute yet. A human approval is required.
    break;

  case "BLOCK":
    // Stop the action.
    break;
}
```

## Decision model

Every governed request returns one of three decisions:

| Decision | Meaning |
| --- | --- |
| `ALLOW` | The policy permits the action without a human approval gate. |
| `APPROVE` | The action is gated and must wait for the required human authority. |
| `BLOCK` | The policy does not permit the action. |

Your application remains responsible for enforcing the result. In particular, an `APPROVE` result is not permission to execute.

## Submit a scoped decision

If the API key has already been scoped to an assigned agent and policy, the caller can omit `agentId` and `policyId`:

```js
const result =
  await controlPact.decide({
    referenceId:
      "deploy-2026-08-23",
    request: {
      action: "deploy",
      context: {
        environment:
          "production",
      },
    },
  });
```

## Idempotency

For operations that may be retried, supply an `idempotencyKey`:

```js
await controlPact.decide({
  idempotencyKey:
    "invoice-8821-refund",
  request: {
    action:
      "refundCustomer",
  },
});
```

ControlPact sends the value as the `Idempotency-Key` HTTP header.

Use a stable key for the same business operation. Do not generate a new key for every retry of the same action.

## Check decision and approval status

A decision that requires approval can be queried again:

```js
const status =
  await controlPact.getDecision(
    "DECISION_OR_RECEIPT_ID",
  );

console.log(
  status.decision.decision,
  status.decision.approvalStatus,
);
```

Typical approval states are:

- `PENDING`
- `APPROVED`
- `REJECTED`

Do not execute an approval-gated action until your application has confirmed the required approved state.

## Error handling

HTTP errors are represented by `ControlPactApiError`:

```js
import {
  ControlPactApiError,
} from "@controlpact/sdk";

try {
  await controlPact.decide({
    request: {
      action: "deploy",
    },
  });
} catch (error) {
  if (
    error instanceof
      ControlPactApiError
  ) {
    console.error(
      error.status,
      error.message,
      error.payload,
    );
  } else {
    throw error;
  }
}
```

## Security guidance

- Keep `cpk_` API keys server-side.
- Use HTTPS in production.
- Give each agent only the assignment and policy scope it needs.
- Use idempotency keys for retryable or financially sensitive operations.
- Treat `APPROVE` as a hard execution gate.
- Keep the ControlPact receipt/reference alongside the business operation that caused the decision.
- Rotate an API key immediately if it is exposed.

## API surface

### `new ControlPactClient(options)`

```ts
type ControlPactClientOptions = {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof globalThis.fetch;
};
```

### `client.decide(input)`

Submits a governed action to `POST /v1/decisions`.

### `client.getDecision(decisionId)`

Fetches the current state of a decision from `GET /v1/decisions/:decisionId`.

### `ControlPactApiError`

Typed error containing:

```ts
status: number;
payload: unknown;
```

## Examples

See:

- `examples/decision.mjs`
- `examples/approval-status.mjs`

## Development

From the ControlPact monorepo root:

```bash
npm run build:sdk
npm run test:sdk
npm pack --workspace=@controlpact/sdk
```

## Commercial licensing

`@controlpact/sdk` is a commercial ControlPact product. Production, redistribution, OEM, white-label and multi-application rights are governed by the applicable ControlPact licence.

Final commercial licence tiers and purchasing terms are published separately by ControlPact.

Copyright Â© Velvet Technologies. All rights reserved.
