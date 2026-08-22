import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ExecutionConsole from "../components/ExecutionConsole";
import PageHeader from "../components/PageHeader";
import { controlPactJson } from "../lib/controlPactApi";
import type { ControlPactDecision } from "../types";

type Props = { accessToken: string; apiKey: string };

export default function DecisionsPage({ accessToken, apiKey }: Props) {
  const [items, setItems] = useState<ControlPactDecision[]>([]);
  const load = useCallback(async () => {
    const data = await controlPactJson("/v1/decisions", accessToken);
    setItems(Array.isArray(data.decisions) ? data.decisions : []);
  }, [accessToken]);
  useEffect(() => { load().catch(() => undefined); const timer = window.setInterval(() => load().catch(() => undefined), 2500); return () => window.clearInterval(timer); }, [load]);

  return <>
    <PageHeader eyebrow="EXECUTION CONTROL" title="Decisions" description="Send a consequential action through the scoped authority boundary and inspect every persisted ALLOW, APPROVE and BLOCK result." action={!apiKey ? <Link className="cp-text-link" to="/settings">Create scoped key</Link> : undefined} />
    <ExecutionConsole apiKey={apiKey} />
    <section className="panel cp-page-panel">
      <div className="panel-heading"><div><p className="eyebrow">DECISION HISTORY</p><h3>Recorded Decisions</h3></div><span className="policy-count">{items.length} recorded</span></div>
      {items.length === 0 ? <div className="cp-empty">No decisions recorded yet.</div> : <div className="cp-table-wrap"><table className="cp-table"><thead><tr><th>Action</th><th>Agent</th><th>Policy</th><th>Reference</th><th>Decision</th><th>Approval</th><th>Time</th></tr></thead><tbody>{items.map((x) => <tr key={x.id}><td><strong>{x.action}</strong></td><td>{x.agentId}</td><td>{x.policyId}</td><td>{x.referenceId}</td><td><span className={`decision decision-${x.decision.toLowerCase()}`}>{x.decision}</span></td><td>{x.approvalStatus || "-"}</td><td>{new Date(x.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
