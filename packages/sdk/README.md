# ControlPact SDK

Official TypeScript and JavaScript SDK for ControlPact.

```ts
import {
  ControlPactClient,
} from "@controlpact/sdk";

const controlPact =
  new ControlPactClient({
    baseUrl:
      process.env.CONTROLPACT_API_URL!,
    apiKey:
      process.env.CONTROLPACT_API_KEY!,
  });

const decision =
  await controlPact.decide({
    policyId:
      "production-policy",
    request: {
      agentId:
        "deployment-agent",
      action:
        "deploy",
      resource:
        "service:billing",
    },
  });
```

Keep API keys on the server side.