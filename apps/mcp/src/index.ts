import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod/v4";

const API_BASE_URL = (
  process.env.CONTROLPACT_API_BASE_URL ||
  "http://127.0.0.1:3001"
).replace(/\/+$/, "");

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unexpected ControlPact MCP error.";
}

function upstreamMessage(data: unknown): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof (data as { message?: unknown }).message === "string"
  ) {
    return (data as { message: string }).message;
  }

  return "ControlPact API request failed.";
}

async function callControlPact(
  path: string,
  authorization: string,
  options: {
    method: "GET" | "POST";
    body?: unknown;
    idempotencyKey?: string;
  },
): Promise<unknown> {
  const headers: Record<string, string> = {
    authorization,
    accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  if (options.idempotencyKey) {
    headers["idempotency-key"] =
      options.idempotencyKey.slice(0, 200);
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      method: options.method,
      headers,
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
    },
  );

  const text = await response.text();

  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        success: false,
        message: text,
      };
    }
  }

  if (!response.ok) {
    throw new Error(
      `ControlPact API ${response.status}: ${upstreamMessage(data)}`,
    );
  }

  return data;
}

function createControlPactMcpServer(
  authorization: string,
): McpServer {
  const server = new McpServer({
    name: "controlpact",
    version: "0.1.0",
  });

  server.registerTool(
    "evaluate_action",
    {
      title: "Evaluate AI Agent Action",
      description:
        "Ask ControlPact whether an AI agent action is ALLOW, APPROVE, or BLOCK before execution. ControlPact policy remains authoritative and automatically creates a human approval request when required.",
      inputSchema: {
        action: z
          .string()
          .min(1)
          .describe(
            "The action the AI agent intends to perform.",
          ),

        resource: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Optional resource or target affected by the action.",
          ),

        amount: z
          .number()
          .finite()
          .optional()
          .describe(
            "Optional monetary or numeric amount associated with the action.",
          ),

        currency: z
          .string()
          .min(1)
          .max(10)
          .optional()
          .describe(
            "Optional currency code such as GBP, USD or NGN.",
          ),

        context: z
          .record(
            z.string(),
            z.unknown(),
          )
          .optional()
          .describe(
            "Additional contextual facts for ControlPact policy evaluation.",
          ),

        referenceId: z
          .string()
          .min(1)
          .max(180)
          .optional()
          .describe(
            "Optional correlation reference for this governed action.",
          ),
      },
    },
    async ({
      action,
      resource,
      amount,
      currency,
      context,
      referenceId,
    }) => {
      try {
        const request: Record<string, unknown> = {
          action,
        };

        if (resource !== undefined) {
          request.resource = resource;
        }

        if (amount !== undefined) {
          request.amount = amount;
        }

        if (currency !== undefined) {
          request.currency = currency;
        }

        if (context !== undefined) {
          request.context = context;
        }

        const body: Record<string, unknown> = {
          request,
        };

        if (referenceId !== undefined) {
          body.referenceId = referenceId;
        }

        const result = await callControlPact(
          "/v1/decisions",
          authorization,
          {
            method: "POST",
            body,
            idempotencyKey:
              referenceId !== undefined
                ? `mcp:${referenceId}`
                : undefined,
          },
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                result,
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: errorMessage(error),
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    "get_decision",
    {
      title: "Get ControlPact Decision",
      description:
        "Retrieve a previous ControlPact governance decision and its human approval status.",
      inputSchema: {
        decisionId: z
          .string()
          .min(1)
          .describe(
            "The ControlPact decision identifier.",
          ),
      },
    },
    async ({ decisionId }) => {
      try {
        const result = await callControlPact(
          `/v1/decisions/${encodeURIComponent(decisionId)}`,
          authorization,
          {
            method: "GET",
          },
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                result,
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: errorMessage(error),
            },
          ],
        };
      }
    },
  );

  return server;
}

const app = express();

app.use(
  express.json({
    limit: "1mb",
  }),
);

app.get(
  "/health",
  (_request, response) => {
    response.json({
      ok: true,
      service: "controlpact-mcp",
      version: "0.1.0",
    });
  },
);

app.post(
  "/mcp",
  async (request, response) => {
    const authorization =
      request.headers.authorization;

    if (
      !authorization ||
      !authorization
        .toLowerCase()
        .startsWith("bearer ")
    ) {
      response
        .status(401)
        .json({
          error:
            "A ControlPact Bearer credential is required.",
        });

      return;
    }

    const server =
      createControlPactMcpServer(
        authorization,
      );

    const transport =
      new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

    try {
      await server.connect(transport);

      await transport.handleRequest(
        request,
        response,
        request.body,
      );
    } catch (error) {
      console.error(
        "ControlPact MCP request failed:",
        error,
      );

      if (!response.headersSent) {
        response
          .status(500)
          .json({
            error:
              "ControlPact MCP request failed.",
          });
      }
    } finally {
      await transport.close();
    }
  },
);

const port = Number(
  process.env.PORT || 3002,
);

const host =
  process.env.HOST ||
  "127.0.0.1";

app.listen(
  port,
  host,
  () => {
    console.log(
      `ControlPact MCP listening on ${host}:${port}`,
    );
  },
);