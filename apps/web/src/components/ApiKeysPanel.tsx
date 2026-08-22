import { useCallback, useEffect, useState, type FormEvent } from "react";
import { controlPactJson } from "../lib/controlPactApi";
import type { AgentAssignment, ApiKeyItem, ControlEnvironment, OrganizationPolicy, RegisteredAgent } from "../types";

type Props = {
  accessToken: string;
  activeApiKey: string;
  onActiveApiKey: (apiKey: string) => void;
};

export default function ApiKeysPanel({ accessToken, activeApiKey, onActiveApiKey }: Props) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [environments, setEnvironments] = useState<ControlEnvironment[]>([]);
  const [agents, setAgents] = useState<RegisteredAgent[]>([]);
  const [policies, setPolicies] = useState<OrganizationPolicy[]>([]);
  const [assignments, setAssignments] = useState<AgentAssignment[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [name, setName] = useState("Production Agent");
  const [newSecret, setNewSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [k,e,a,p,s] = await Promise.all([
      controlPactJson("/v1/api-keys", accessToken),
      controlPactJson("/v1/environments", accessToken),
      controlPactJson("/v1/agents", accessToken),
      controlPactJson("/v1/organization-policies", accessToken),
      controlPactJson("/v1/agent-assignments", accessToken),
    ]);
    const nextAssignments = Array.isArray(s.assignments) ? s.assignments : [];
    setKeys(Array.isArray(k.apiKeys) ? k.apiKeys : []);
    setEnvironments(Array.isArray(e.environments) ? e.environments : []);
    setAgents(Array.isArray(a.agents) ? a.agents : []);
    setPolicies(Array.isArray(p.policies) ? p.policies : []);
    setAssignments(nextAssignments);
    setAssignmentId((v) => v || nextAssignments[0]?.id || "");
  }, [accessToken]);

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load API keys.")); }, [load]);

  const selected = assignments.find((x) => x.id === assignmentId);
  const envName = (id: string) => environments.find((x) => x.id === id)?.name || id;
  const agentName = (id: string) => agents.find((x) => x.id === id)?.name || id;
  const policyName = (id: string) => policies.find((x) => x.id === id)?.name || id;

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) { setError("Create an agent assignment first."); return; }
    setBusy(true); setError(""); setMessage(""); setNewSecret(""); setShowSecret(false);
    try {
      const data = await controlPactJson("/v1/api-keys", accessToken, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          environmentId: selected.environmentId,
          agentId: selected.agentId,
          policyId: selected.policyId,
          scopes: ["decisions:execute"],
        }),
      });
      setNewSecret(data.secret); onActiveApiKey(data.secret);
      setMessage("Scoped API key created and connected to the Decisions page for this browser session.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create scoped API key."); }
    finally { setBusy(false); }
  };

  const revoke = async (id: string) => {
    setBusy(true); setError(""); setMessage("");
    try { await controlPactJson(`/v1/api-keys/${id}/revoke`, accessToken, { method: "POST" }); setMessage("API key revoked."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to revoke API key."); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(newSecret); setMessage("API key copied."); }
    catch { setMessage("Copy was unavailable."); }
  };

  return <section className="panel cp-settings-panel">
    <div className="panel-heading"><div><p className="eyebrow">AGENT AUTHENTICATION</p><h3>Scoped API Keys</h3></div><span className={activeApiKey ? "live-chip" : "api-key-required-chip"}>{activeApiKey ? "KEY CONNECTED" : "KEY REQUIRED"}</span></div>
    <p className="api-keys-copy">Each execution key is bound to one existing Environment + Agent + Policy assignment.</p>
    <form className="cp-form-grid" onSubmit={create}>
      <label><span>Key name</span><input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={80} required /></label>
      <label><span>Agent assignment</span><select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} required><option value="">Select assignment</option>{assignments.map((x) => <option key={x.id} value={x.id}>{envName(x.environmentId)} / {agentName(x.agentId)} / {policyName(x.policyId)}</option>)}</select></label>
      <label><span>Scope</span><input value="decisions:execute" readOnly /></label>
      <div className="cp-form-actions"><button className="primary-button" type="submit" disabled={busy || !selected}>{busy ? "Working..." : "Create Scoped Key"}</button></div>
    </form>
    {assignments.length === 0 && <p className="cp-settings-note">No assignment exists yet. Open Agent Assignments in Settings and connect an active environment, agent and policy.</p>}
    {newSecret && <div className="api-key-secret cp-secret-box"><span>NEW KEY — SHOWN ONCE</span><code>{showSecret ? newSecret : "••••••••••••••••••••••••••••••••"}</code><div className="api-key-secret-actions"><button type="button" onClick={() => setShowSecret((v) => !v)}>{showSecret ? "Hide Key" : "Show Key"}</button><button type="button" onClick={copy}>Copy Key</button><button type="button" onClick={() => onActiveApiKey(newSecret)}>Use in Decisions</button></div></div>}
    <div className="api-key-list">{keys.length === 0 ? <div className="api-key-empty">No API keys yet.</div> : keys.map((k) => <div className="api-key-row" key={k.id}><div><strong>{k.name}</strong><code>{k.keyPrefix}...</code><small>{k.environmentId && k.agentId && k.policyId ? `${envName(k.environmentId)} / ${agentName(k.agentId)} / ${policyName(k.policyId)}` : "Legacy unscoped key"}</small>{k.scopes && <small>{k.scopes.join(", ")}</small>}</div>{k.revokedAt ? <span className="api-key-revoked">REVOKED</span> : <button type="button" className="api-key-revoke" disabled={busy} onClick={() => revoke(k.id)}>Revoke</button>}</div>)}</div>
    {message && <p className="api-key-message">{message}</p>}{error && <p className="decision-error">{error}</p>}
  </section>;
}
