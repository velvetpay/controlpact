import { useState, type FormEvent } from "react";

type Props = { apiKey: string };

export default function ExecutionConsole({ apiKey }: Props) {
  const [action, setAction] = useState("deploy");
  const [resource, setResource] = useState("service:payments-api");
  const [referenceId, setReferenceId] = useState(`action_${Date.now()}`);
  const [idempotencyKey, setIdempotencyKey] = useState(`idem_${Date.now()}`);
  const [context, setContext] = useState(JSON.stringify({ environment: "production", testsPassed: true }, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const run = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!apiKey) { setError("Create and connect a scoped API key in Settings first."); return; }
    setBusy(true); setError(""); setResult(null);
    try {
      const parsedContext = context.trim() ? JSON.parse(context) : {};
      const response = await fetch("/controlpact-api/v1/decisions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.trim(),
        },
        body: JSON.stringify({ referenceId: referenceId.trim(), request: { action: action.trim(), resource: resource.trim() || undefined, context: parsedContext } }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.message || "Decision request failed.");
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Decision request failed."); }
    finally { setBusy(false); }
  };

  return <section className="panel cp-page-panel">
    <div className="panel-heading"><div><p className="eyebrow">CONTROLLED EXECUTION</p><h3>Decision Console</h3></div><span className={apiKey ? "live-chip" : "api-key-required-chip"}>{apiKey ? "SCOPED KEY CONNECTED" : "KEY REQUIRED"}</span></div>
    <form className="cp-form-grid" onSubmit={run}>
      <label><span>Action</span><input value={action} onChange={(e) => setAction(e.target.value)} required /></label>
      <label><span>Resource</span><input value={resource} onChange={(e) => setResource(e.target.value)} /></label>
      <label><span>Reference ID</span><input value={referenceId} onChange={(e) => setReferenceId(e.target.value)} /></label>
      <label><span>Idempotency key</span><input value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} required /></label>
      <label className="cp-form-wide"><span>Context JSON</span><textarea value={context} onChange={(e) => setContext(e.target.value)} rows={7} /></label>
      <div className="cp-form-actions cp-form-wide"><button className="primary-button" type="submit" disabled={busy || !apiKey}>{busy ? "Evaluating..." : "Evaluate Action"}</button></div>
    </form>
    {error && <p className="decision-error">{error}</p>}
    {result && <div className="cp-decision-result">
      <div><span>DECISION</span><strong className={`decision decision-${String(result.result.decision).toLowerCase()}`}>{result.result.decision}</strong></div>
      <div><span>POLICY</span><strong>{result.result.policyId}</strong></div>
      <div><span>AGENT</span><strong>{result.receipt.payload.agentId}</strong></div>
      <div><span>RECEIPT</span><code>{result.receipt.payload.receiptId}</code></div>
      <p>{result.result.reason}</p>
      {result.approval && <p className="cp-approval-notice">Human approval required. Approval task <code>{result.approval.id}</code> is pending.</p>}
      {result.idempotentReplay && <p className="cp-settings-note">Idempotent replay: original signed decision returned.</p>}
    </div>}
  </section>;
}
