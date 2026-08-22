export type ControlPactDecision =
  | "ALLOW"
  | "APPROVE"
  | "BLOCK";

export type ControlPactActionContext =
  Record<string, unknown>;

export type ControlPactActionRequest = {
  agentId?: string;
  action: string;
  resource?: string;
  amount?: number;
  currency?: string;
  context?: ControlPactActionContext;
  [key: string]: unknown;
};

export type ControlPactDecisionRequest = {
  policyId?: string;
  referenceId?: string;
  idempotencyKey?: string;
  request: ControlPactActionRequest;
};

export type ControlPactDecisionResponse = {
  success: true;
  result: {
    decision: ControlPactDecision;
    policyId: string;
    policyVersion?: number;
    reason: string;
    matchedRuleIds: string[];
    requiredApproverRoles?: string[];
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
  idempotentReplay?: boolean;
};

export type ControlPactDecisionStatusResponse = {
  success: true;
  decision: {
    id: string;
    receiptId: string;
    agentId: string;
    action: string;
    decision: ControlPactDecision;
    policyId: string;
    policyVersion?: number;
    referenceId: string;
    resource?: string;
    reason: string;
    matchedRuleIds: string[];
    requiredApproverRoles?: string[];
    createdAt: string;
    approvalStatus?:
      | "PENDING"
      | "APPROVED"
      | "REJECTED";
    decidedAt?: string;
    decidedBy?: string;
    approvalReason?: string;
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
      String(options?.apiKey || "")
        .trim();

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

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const response =
      await this.fetchImpl(
        `${this.baseUrl}${path}`,
        {
          ...init,
          headers: {
            Authorization:
              `Bearer ${this.apiKey}`,
            Accept: "application/json",
            ...(init.body
              ? {
                  "Content-Type":
                    "application/json",
                }
              : {}),
            ...(init.headers || {}),
          },
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
              (
                payload as {
                  message?: unknown;
                }
              ).message ||
              `ControlPact API request failed with HTTP ${response.status}.`,
            )
          : `ControlPact API request failed with HTTP ${response.status}.`;

      throw new ControlPactApiError(
        message,
        response.status,
        payload,
      );
    }

    return payload as T;
  }

  async decide(
    input: ControlPactDecisionRequest,
  ): Promise<ControlPactDecisionResponse> {
    const policyId =
      String(input?.policyId || "")
        .trim();

    const agentId =
      String(
        input?.request?.agentId || "",
      ).trim();

    const action =
      String(
        input?.request?.action || "",
      ).trim();

    if (!action) {
      throw new Error(
        "ControlPact request.action is required.",
      );
    }

    const idempotencyKey =
      String(
        input?.idempotencyKey ||
        "",
      ).trim();

    if (
      input?.idempotencyKey !==
        undefined &&
      !idempotencyKey
    ) {
      throw new Error(
        "ControlPact idempotencyKey cannot be empty.",
      );
    }

    if (
      idempotencyKey.length >
      200
    ) {
      throw new Error(
        "ControlPact idempotencyKey must not exceed 200 characters.",
      );
    }

    const payload =
      await this.request<
        ControlPactDecisionResponse
      >(
        "/v1/decisions",
        {
          method: "POST",
          headers:
            idempotencyKey
              ? {
                  "Idempotency-Key":
                    idempotencyKey,
                }
              : undefined,
          body: JSON.stringify({
            policyId:
              policyId ||
              undefined,
            referenceId:
              input.referenceId,
            request: {
              ...input.request,
              agentId:
                agentId ||
                undefined,
              action,
            },
          }),
        },
      );

    if (
      !payload ||
      payload.success !== true
    ) {
      throw new ControlPactApiError(
        "ControlPact API returned an invalid response.",
        200,
        payload,
      );
    }

    return payload;
  }
  async getDecision(
    decisionId: string,
  ): Promise<ControlPactDecisionStatusResponse> {
    const id =
      String(
        decisionId || "",
      ).trim();

    if (!id) {
      throw new Error(
        "ControlPact decisionId is required.",
      );
    }

    const payload =
      await this.request<
        ControlPactDecisionStatusResponse
      >(
        `/v1/decisions/${encodeURIComponent(id)}`,
        {
          method: "GET",
        },
      );

    if (
      !payload ||
      payload.success !== true
    ) {
      throw new ControlPactApiError(
        "ControlPact API returned an invalid decision status response.",
        200,
        payload,
      );
    }

    return payload;
  }
}
