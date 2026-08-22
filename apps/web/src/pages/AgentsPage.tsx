import { useCallback, useEffect, useState, type FormEvent } from "react";
import PageHeader from "../components/PageHeader";
import { controlPactJson } from "../lib/controlPactApi";
import type { ControlEnvironment, RegisteredAgent } from "../types";

type Props = { accessToken: string };

export default function AgentsPage({ accessToken }: Props) {
  const [environments, setEnvironments] = useState<ControlEnvironment[]>([]);
  const [agents, setAgents] = useState<RegisteredAgent[]>([]);
  const [environmentId, setEnvironmentId] = useState("");
  const [name, setName] = useState("");
  const [externalAgentId, setExternalAgentId] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [e,a] = await Promise.all([controlPactJson("/v1/environments", accessToken), controlPactJson("/v1/agents", accessToken)]);
    const next = Array.isArray(e.environments) ? e.environments : [];
    setEnvironments(next); setAgents(Array.isArray(a.agents) ? a.agents : []); setEnvironmentId((v) => v || next[0]?.id || "");
  }, [accessToken]);

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load agents.")); }, [load]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const data = await controlPactJson("/v1/agents", accessToken, { method: "POST", body: JSON.stringify({ environmentId, name: name.trim(), externalAgentId: externalAgentId.trim(), description: description.trim() }) });
      setName(""); setExternalAgentId(""); setDescription(""); setMessage(`${data.agent.name} registered.`); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Agent registration failed."); }
    finally { setBusy(false); }
  };

  const envName = (id: string) => environments.find((x) => x.id === id)?.name || id;

  return <>
    <PageHeader eyebrow="AGENT GOVERNANCE" title="Agents" description="Register the AI agents and automated systems that may request authority from ControlPact." action={<span className="policy-count">{agents.length} registered</span>} />
    <section className="panel cp-page-panel">
      <div className="panel-heading"><div><p className="eyebrow">REGISTER AGENT</p><h3>Controlled Identity</h3></div></div>
      <form className="cp-form-grid" onSubmit={create}>
        <label><span>Environment</span><select value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)} required><option value="">Select environment</option>{environments.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.status}</option>)}</select></label>
        <label><span>Agent name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Deployment Agent" minLength={2} required /></label>
        <label><span>External agent ID</span><input value={externalAgentId} onChange={(e) => setExternalAgentId(e.target.value)} placeholder="deployment-agent" minLength={2} required /></label>
        <label><span>Description</span><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="CI/CD release automation" /></label>
        <div className="cp-form-actions cp-form-wide"><button className="primary-button" type="submit" disabled={busy || !environmentId}>{busy ? "Registering..." : "Register Agent"}</button></div>
      </form>
      {message && <p className="api-key-message">{message}</p>}{error && <p className="decision-error">{error}</p>}
    </section>
    <section className="cp-card-grid">{agents.length === 0 ? <div className="panel cp-empty">No agents registered yet.</div> : agents.map((a) => <article className="panel cp-resource-card" key={a.id}><div className="cp-resource-card-head"><div><p className="eyebrow">{a.externalAgentId}</p><h3>{a.name}</h3></div><span className={`cp-status cp-status-${a.status.toLowerCase()}`}>{a.status}</span></div><p>{a.description || "Registered ControlPact agent."}</p><dl className="cp-mini-details"><div><dt>Environment</dt><dd>{envName(a.environmentId)}</dd></div><div><dt>Record ID</dt><dd><code>{a.id}</code></dd></div></dl></article>)}</section>
  </>;
}
