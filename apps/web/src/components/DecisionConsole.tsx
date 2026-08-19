import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

type Policy = {
  id: string;
  defaultDecision: string;
  ruleCount: number;
};

type DecisionResult = {
  policyId: string;
  decision: "ALLOW" | "APPROVE" | "BLOCK";
  reason: string;
  matchedRuleIds: string[];
};

type Receipt = {
  payload: {
    receiptId: string;
    agentId: string;
    action: string;
    decision: string;
    policyId: string;
    issuedAt: string;
  };
  signature: string;
};

export default function DecisionConsole() {
  const [policies, setPolicies] =
    useState<Policy[]>([]);

  const [policyId, setPolicyId] =
    useState("finance-policy");

  const [agentId, setAgentId] =
    useState("finance-agent");

  const [action, setAction] =
    useState("refundCustomer");

  const [amount, setAmount] =
    useState("100");

  const [currency, setCurrency] =
    useState("GBP");

  const [result, setResult] =
    useState<DecisionResult | null>(null);

  const [receipt, setReceipt] =
    useState<Receipt | null>(null);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    fetch("/controlpact-api/v1/policies")
      .then((response) => response.json())
      .then((data) => {
        const items =
          Array.isArray(data?.policies)
            ? data.policies
            : [];

        setPolicies(items);

        if (
          items.length &&
          !items.some(
            (item: Policy) =>
              item.id === policyId
          )
        ) {
          setPolicyId(items[0].id);
        }
      })
      .catch(() =>
        setPolicies([])
      );
  }, []);

  const runPreset = (
    preset:
      | "ALLOW"
      | "APPROVE"
      | "BLOCK",
  ) => {
    setResult(null);
    setReceipt(null);
    setError("");

    if (preset === "ALLOW") {
      setPolicyId("finance-policy");
      setAgentId("finance-agent");
      setAction("refundCustomer");
      setAmount("100");
      setCurrency("GBP");
      return;
    }

    if (preset === "APPROVE") {
      setPolicyId("finance-policy");
      setAgentId("finance-agent");
      setAction("refundCustomer");
      setAmount("750");
      setCurrency("GBP");
      return;
    }

    setPolicyId("production-policy");
    setAgentId("support-agent");
    setAction("deleteAccount");
    setAmount("");
    setCurrency("");
  };

  const submit =
    async (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      setBusy(true);
      setError("");
      setResult(null);
      setReceipt(null);

      const numericAmount =
        amount.trim()
          ? Number(amount)
          : undefined;

      try {
        const response =
          await fetch(
            "/controlpact-api/v1/decisions",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  policyId,
                  request: {
                    agentId:
                      agentId.trim(),
                    action:
                      action.trim(),

                    ...(
                      numericAmount !==
                        undefined &&
                      Number.isFinite(
                        numericAmount
                      )
                        ? {
                            amount:
                              numericAmount,
                          }
                        : {}
                    ),

                    ...(
                      currency.trim()
                        ? {
                            currency:
                              currency
                                .trim()
                                .toUpperCase(),
                          }
                        : {}
                    ),
                  },
                }),
            }
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
              "Decision request failed."
          );
        }

        setResult(data.result);
        setReceipt(data.receipt);

        if (
          data.result?.decision ===
            "APPROVE" &&
          data.approval
        ) {
          window.setTimeout(
            () => {
              document
                .getElementById(
                  "approval-queue"
                )
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
            },
            350
          );
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Decision request failed."
        );
      } finally {
        setBusy(false);
      }
    };

  return (
    <section className="panel decision-console">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            LIVE POLICY EVALUATION
          </p>

          <h3>Decision Console</h3>
        </div>

        <span className="live-chip">
          REAL API
        </span>
      </div>

      <div className="preset-row">
        <button
          type="button"
          onClick={() =>
            runPreset("ALLOW")
          }
        >
          Test ALLOW
        </button>

        <button
          type="button"
          onClick={() =>
            runPreset("APPROVE")
          }
        >
          Test APPROVE
        </button>

        <button
          type="button"
          onClick={() =>
            runPreset("BLOCK")
          }
        >
          Test BLOCK
        </button>
      </div>

      <form
        className="decision-form"
        onSubmit={submit}
      >
        <label>
          <span>Policy</span>

          <select
            value={policyId}
            onChange={(event) =>
              setPolicyId(
                event.target.value
              )
            }
          >
            {policies.map(
              (policy) => (
                <option
                  key={policy.id}
                  value={policy.id}
                >
                  {policy.id}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span>Agent ID</span>

          <input
            value={agentId}
            onChange={(event) =>
              setAgentId(
                event.target.value
              )
            }
            required
          />
        </label>

        <label>
          <span>Action</span>

          <input
            value={action}
            onChange={(event) =>
              setAction(
                event.target.value
              )
            }
            required
          />
        </label>

        <label>
          <span>Amount</span>

          <input
            type="number"
            value={amount}
            onChange={(event) =>
              setAmount(
                event.target.value
              )
            }
            placeholder="Optional"
          />
        </label>

        <label>
          <span>Currency</span>

          <input
            value={currency}
            onChange={(event) =>
              setCurrency(
                event.target.value
              )
            }
            placeholder="GBP"
          />
        </label>

        <button
          className="evaluate-button"
          disabled={busy}
          type="submit"
        >
          {busy
            ? "Evaluating..."
            : "Evaluate Action"}
        </button>
      </form>

      {error && (
        <div className="decision-error">
          {error}
        </div>
      )}

      {result && receipt && (
        <div className="decision-output">
          <div>
            <span
              className={`decision decision-${result.decision.toLowerCase()}`}
            >
              {result.decision}
            </span>

            <strong>
              {result.reason}
            </strong>

            <p>
              Policy: {result.policyId}
            </p>

            <p>
              Matched rules:{" "}
              {result.matchedRuleIds.length
                ? result.matchedRuleIds.join(
                    ", "
                  )
                : "Default policy"}
            </p>
          </div>

          <div className="receipt-output">
            <span>
              SIGNED RECEIPT
            </span>

            <code>
              {receipt.payload.receiptId}
            </code>

            <small>
              {receipt.payload.issuedAt}
            </small>

            <small>
              Signature:{" "}
              {receipt.signature.slice(
                0,
                24
              )}
              ...
            </small>
          </div>
        </div>
      )}
    </section>
  );
}