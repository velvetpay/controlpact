export type ControlPactDecision =
  | "ALLOW"
  | "APPROVE"
  | "BLOCK";

export type ControlPactActionRequest = {
  agentId: string;
  action: string;
  resource?: string;
  [key: string]: unknown;
};

export type ControlPactDecisionRequest = {
  policyId: string;
  referenceId?: string;
  request: ControlPactActionRequest;
};

export type ControlPactDecisionResponse = {
  success: true;
  result: {
    decision: ControlPactDecision;
    policyId: string;
    reason: string;
    matchedRuleIds: string[];
  };
  receipt: {
    payload: {
      receiptId: string;
      agentId: string;
      action: string;
      decision: ControlPactDecision;
      policyId: string;
      referenceId: string;
      resource?: string;
      matchedRuleIds: string[];
      issuedAt: string;
    };
    signature: string;
  };
  approval: Record<string, unknown> | null;
};

export type ControlPactClientOptions = {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof globalThis.fetch;
};

export class ControlPactApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(
    message: string,
    status: number,
    payload?: unknown,
  ) {
    super(message);
    this.name = "ControlPactApiError";
    this.status = status;
    this.payload = payload;
  }
}

export class ControlPactClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(options: ControlPactClientOptions) {
    const baseUrl =
      String(options?.baseUrl || "")
        .trim()
        .replace(/\/+$/, "");

    const apiKey =
      String(options?.apiKey || "").trim();

    if (!baseUrl) {
      throw new Error(
        "ControlPact baseUrl is required.",
      );
    }

    let url: URL;

    try {
      url = new URL(baseUrl);
    } catch {
      throw new Error(
        "ControlPact baseUrl must be a valid HTTP or HTTPS URL.",
      );
    }

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      throw new Error(
        "ControlPact baseUrl must use HTTP or HTTPS.",
      );
    }

    if (!apiKey) {
      throw new Error(
        "ControlPact apiKey is required.",
      );
    }

    if (!apiKey.startsWith("cpk_")) {
      throw new Error(
        "ControlPact apiKey must start with cpk_.",
      );
    }

    const fetchImpl =
      options.fetch ?? globalThis.fetch;

    if (typeof fetchImpl !== "function") {
      throw new Error(
        "A fetch implementation is required.",
      );
    }

    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  async decide(
    input: ControlPactDecisionRequest,
  ): Promise<ControlPactDecisionResponse> {
    const policyId =
      String(input?.policyId || "").trim();

    const agentId =
      String(
        input?.request?.agentId || "",
      ).trim();

    const action =
      String(
        input?.request?.action || "",
      ).trim();

    if (!policyId) {
      throw new Error(
        "ControlPact policyId is required.",
      );
    }

    if (!agentId || !action) {
      throw new Error(
        "ControlPact request.agentId and request.action are required.",
      );
    }

    const response =
      await this.fetchImpl(
        `${this.baseUrl}/v1/decisions`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${this.apiKey}`,
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            policyId,
            referenceId:
              input.referenceId,
            request: {
              ...input.request,
              agentId,
              action,
            },
          }),
        },
      );

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        "message" in payload
          ? String(
              (payload as {
                message?: unknown;
              }).message ||
              `ControlPact API request failed with HTTP ${response.status}.`,
            )
          : `ControlPact API request failed with HTTP ${response.status}.`;

      throw new ControlPactApiError(
        message,
        response.status,
        payload,
      );
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      !("success" in payload) ||
      (payload as {
        success?: unknown;
      }).success !== true
    ) {
      throw new ControlPactApiError(
        "ControlPact API returned an invalid response.",
        response.status,
        payload,
      );
    }

    return payload as
      ControlPactDecisionResponse;
  }
}