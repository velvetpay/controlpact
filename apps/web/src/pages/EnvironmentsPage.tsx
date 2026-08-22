import { useCallback, useEffect, useState, type FormEvent } from "react";
import PageHeader from "../components/PageHeader";
import { controlPactJson } from "../lib/controlPactApi";
import type { ControlEnvironment } from "../types";

type Props = { accessToken: string };

const categories = [
  ["SOFTWARE_DEVOPS", "Software & DevOps"],
  ["FINANCE_PAYMENTS", "Finance & Payments"],
  ["DATA_SECURITY", "Data & Security"],
  ["CUSTOMER_OPERATIONS", "Customer Operations"],
  ["COMMUNICATIONS", "Communications"],
  ["IT_ADMINISTRATION", "IT Administration"],
  ["CUSTOM", "Custom"],
] as const;

export default function EnvironmentsPage({ accessToken }: Props) {
  const [items, setItems] = useState<ControlEnvironment[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ControlEnvironment["category"]>("SOFTWARE_DEVOPS");
  const [mode, setMode] = useState<ControlEnvironment["mode"]>("TEST");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const data = await controlPactJson("/v1/environments", accessToken);
    setItems(Array.isArray(data.environments) ? data.environments : []);
  }, [accessToken]);

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load environments.")); }, [load]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("create"); setError(""); setMessage("");
    try {
      const data = await controlPactJson("/v1/environments", accessToken, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: description.trim(), category, mode }),
      });
      setName(""); setDescription(""); setMessage(`${data.environment.name} created as DRAFT.`); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Environment creation failed."); }
    finally { setBusy(""); }
  };

  const updateStatus = async (id: string, status: "ACTIVE" | "SUSPENDED") => {
    setBusy(id); setError(""); setMessage("");
    try {
      const data = await controlPactJson(`/v1/environments/${id}`, accessToken, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(`${data.environment.name} is now ${data.environment.status}.`); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Environment update failed."); }
    finally { setBusy(""); }
  };

  return <>
    <PageHeader eyebrow="CONTROL BOUNDARY" title="Environments" description="Create the operational boundaries in which agents are allowed to act. Every scoped credential belongs to one environment." action={<span className="policy-count">{items.length} total</span>} />

    <section className="panel cp-page-panel">
      <div className="panel-heading"><div><p className="eyebrow">NEW ENVIRONMENT</p><h3>Define a Control Environment</h3></div></div>
      <form className="cp-form-grid" onSubmit={create}>
        <label><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production Deployment" minLength={2} maxLength={120} required /></label>
        <label><span>Category</span><select value={category} onChange={(e) => setCategory(e.target.value as ControlEnvironment["category"])}>{categories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Mode</span><select value={mode} onChange={(e) => setMode(e.target.value as ControlEnvironment["mode"])}><option value="TEST">Test</option><option value="PRODUCTION">Production</option></select></label>
        <label><span>Description</span><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Boundary for controlled agent actions" /></label>
        <div className="cp-form-actions cp-form-wide"><button className="primary-button" type="submit" disabled={busy === "create"}>{busy === "create" ? "Creating..." : "Create Environment"}</button></div>
      </form>
      {message && <p className="api-key-message">{message}</p>}
      {error && <p className="decision-error">{error}</p>}
    </section>

    <section className="cp-card-grid">
      {items.length === 0 ? <div className="panel cp-empty">No environments yet.</div> : items.map((item) => <article className="panel cp-resource-card" key={item.id}>
        <div className="cp-resource-card-head"><div><p className="eyebrow">{categories.find(([v]) => v === item.category)?.[1] || item.category}</p><h3>{item.name}</h3></div><span className={`cp-status cp-status-${item.status.toLowerCase()}`}>{item.status}</span></div>
        <p>{item.description || "No description provided."}</p>
        <dl className="cp-mini-details"><div><dt>Mode</dt><dd>{item.mode}</dd></div><div><dt>ID</dt><dd><code>{item.id}</code></dd></div></dl>
        <div className="cp-card-actions">{item.status !== "ACTIVE" ? <button type="button" disabled={busy === item.id} onClick={() => updateStatus(item.id,"ACTIVE")}>Activate</button> : <button type="button" className="cp-danger-button" disabled={busy === item.id} onClick={() => updateStatus(item.id,"SUSPENDED")}>Suspend</button>}</div>
      </article>)}
    </section>
  </>;
}
