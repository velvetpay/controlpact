import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuditDecision = {
  id: string;
  receiptId: string;
  receiptSignature?: string;
  receiptIssuedAt?: string;
  agentId: string;
  action: string;
  decision:
    | "ALLOW"
    | "APPROVE"
    | "BLOCK";
  policyId: string;
  referenceId: string;
  resource?: string;
  createdAt: string;
};

type AuditReceiptsPanelProps = {
  accessToken: string;
};

export default function AuditReceiptsPanel({
  accessToken,
}: AuditReceiptsPanelProps) {
  const [decisions, setDecisions] =
    useState<AuditDecision[]>([]);

  const [query, setQuery] =
    useState("");

  const [verifying, setVerifying] =
    useState("");

  const [
    verification,
    setVerification,
  ] = useState<
    Record<
      string,
      | "VERIFIED"
      | "INVALID"
      | "LEGACY"
      | "ERROR"
    >
  >({});

  const loadReceipts =
    useCallback(
      async () => {
        const response =
          await fetch(
            "/controlpact-api/v1/decisions",
          );

        const data =
          await response
            .json()
            .catch(
              () => null,
            );

        setDecisions(
          response.ok &&
          Array.isArray(
            data?.decisions,
          )
            ? data.decisions
            : [],
        );
      },
      [],
    );

  useEffect(() => {
    loadReceipts();

    const timer =
      window.setInterval(
        loadReceipts,
        4000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [loadReceipts]);

  const filtered =
    useMemo(
      () => {
        const value =
          query
            .trim()
            .toLowerCase();

        if (!value) {
          return decisions;
        }

        return decisions.filter(
          (item) =>
            [
              item.receiptId,
              item.agentId,
              item.action,
              item.policyId,
              item.referenceId,
              item.resource || "",
            ]
              .join(" ")
              .toLowerCase()
              .includes(value),
        );
      },
      [decisions, query],
    );

  const verify =
    async (
      item: AuditDecision,
    ) => {
      if (
        !item.receiptSignature
      ) {
        setVerification(
          (current) => ({
            ...current,
            [item.receiptId]:
              "LEGACY",
          }),
        );
        return;
      }

      setVerifying(
        item.receiptId,
      );

      try {
        const response =
          await fetch(
            `/controlpact-api/v1/receipts/${item.receiptId}/verify`,
            {
              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
              },
            },
          );

        const data =
          await response
            .json()
            .catch(
              () => null,
            );

        if (
          response.status === 409
        ) {
          setVerification(
            (current) => ({
              ...current,
              [item.receiptId]:
                "LEGACY",
            }),
          );
          return;
        }

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(
            data?.message ||
              "Verification failed.",
          );
        }

        setVerification(
          (current) => ({
            ...current,
            [item.receiptId]:
              data.valid
                ? "VERIFIED"
                : "INVALID",
          }),
        );
      } catch {
        setVerification(
          (current) => ({
            ...current,
            [item.receiptId]:
              "ERROR",
          }),
        );
      } finally {
        setVerifying("");
      }
    };

  return (
    <section
      id="audit-receipts"
      className="panel audit-panel"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            TAMPER-EVIDENT PROOF
          </p>
          <h3>
            Audit Receipts
          </h3>
        </div>

        <span className="policy-count">
          {decisions.length} recorded
        </span>
      </div>

      <div className="audit-toolbar">
        <input
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value,
            )
          }
          placeholder="Search receipt, agent, action or reference"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="audit-empty">
          No matching receipts.
        </div>
      ) : (
        <div className="audit-list">
          {filtered.map(
            (item) => {
              const state =
                verification[
                  item.receiptId
                ];

              return (
                <article
                  className="audit-card"
                  key={item.id}
                >
                  <div className="audit-card-heading">
                    <div>
                      <span>
                        RECEIPT
                      </span>
                      <code>
                        {item.receiptId}
                      </code>
                    </div>

                    <span
                      className={`decision decision-${item.decision.toLowerCase()}`}
                    >
                      {item.decision}
                    </span>
                  </div>

                  <div className="audit-meta">
                    <span>
                      Agent:{" "}
                      <strong>
                        {item.agentId}
                      </strong>
                    </span>
                    <span>
                      Action:{" "}
                      <strong>
                        {item.action}
                      </strong>
                    </span>
                    <span>
                      Policy:{" "}
                      {item.policyId}
                    </span>
                    <span>
                      Ref:{" "}
                      {item.referenceId}
                    </span>

                    {item.resource && (
                      <span>
                        Target:{" "}
                        {item.resource}
                      </span>
                    )}
                  </div>

                  <div className="audit-signature">
                    <div>
                      <span>
                        SIGNATURE
                      </span>
                      <code>
                        {item.receiptSignature
                          ? `${item.receiptSignature.slice(
                              0,
                              30,
                            )}...`
                          : "Earlier record - signature not persisted"}
                      </code>
                    </div>

                    <button
                      type="button"
                      disabled={
                        verifying ===
                        item.receiptId
                      }
                      onClick={() =>
                        verify(item)
                      }
                    >
                      {verifying ===
                      item.receiptId
                        ? "Verifying..."
                        : "Verify Receipt"}
                    </button>
                  </div>

                  {state && (
                    <div
                      className={`audit-verification audit-verification-${state.toLowerCase()}`}
                    >
                      {state === "VERIFIED"
                        ? "Cryptographic receipt verified."
                        : state === "LEGACY"
                          ? "Earlier record: full signature proof was not persisted."
                          : state === "INVALID"
                            ? "Receipt verification failed."
                            : "Receipt could not be verified."}
                    </div>
                  )}

                  <small>
                    Issued{" "}
                    {item.receiptIssuedAt ||
                      new Date(
                        item.createdAt,
                      ).toLocaleString()}
                  </small>
                </article>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}