import { useCallback, useEffect, useState, type FormEvent } from "react";
import PageHeader from "../components/PageHeader";
import { controlPactJson } from "../lib/controlPactApi";
import type { ControlEnvironment, OrganizationPolicy, PolicyTemplate } from "../types";

type Props = { accessToken: string };

export default function PoliciesPage({ accessToken }: Props) {
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [environments, setEnvironments] = useState<ControlEnvironment[]>([]);
  const [policies, setPolicies] = useState<OrganizationPolicy[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [environmentId, setEnvironmentId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [t,e,p] = await Promise.all([
      controlPactJson("/v1/policy-templates", accessToken),
      controlPactJson("/v1/environments", accessToken),
      controlPactJson("/v1/organization-policies", accessToken),
    ]);
    const nextTemplates = Array.isArray(t.templates) ? t.templates : [];
    const nextEnvironments = Array.isArray(e.environments) ? e.environments : [];
    setTemplates(nextTemplates); setEnvironments(nextEnvironments); setPolicies(Array.isArray(p.policies) ? p.policies : []);
    setTemplateId((v) => v || nextTemplates[0]?.id || "");
    setEnvironmentId((v) => v || nextEnvironments[0]?.id || "");
  }, [accessToken]);

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load policies.")); }, [load]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy("create"); setError(""); setMessage("");
    try {
      const data = await controlPactJson("/v1/organization-policies/from-template", accessToken, {
        method: "POST", body: JSON.stringify({ templateId, environmentId, name: name.trim(), description: description.trim() }),
      });
      setName(""); setDescription(""); setMessage(`${data.policy.name} created as DRAFT.`); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Policy creation failed."); }
    finally { setBusy(""); }
  };

  const publish = async (id: string) => {
    setBusy(id); setError(""); setMessage("");
    try { const data = await controlPactJson(`/v1/organization-policies/${id}/publish`, accessToken, { method: "POST" }); setMessage(`${data.policy.name} is ACTIVE.`); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Policy publishing failed."); }
    finally { setBusy(""); }
  };

  const envName = (id?: string) => environments.find((x) => x.id === id)?.name || "Unknown environment";

  return <>
    <PageHeader eyebrow="POLICY AUTHORITY" title="Policies" description="Choose a ControlPact template, create an organisation policy inside an environment, then publish it as active authority." action={<span className="policy-count">{templates.length} templates</span>} />
    <section className="panel cp-page-panel">
      <div className="panel-heading"><div><p className="eyebrow">TEMPLATE LIBRARY</p><h3>Policy Families</h3></div></div>
      <div className="cp-template-grid">{templates.map((t) => <button type="button" key={t.id} className={templateId === t.id ? "cp-template-card cp-template-card-active" : "cp-template-card"} onClick={() => { setTemplateId(t.id); if (!name) setName(t.name || ""); }}><strong>{t.name || t.id}</strong><span>{t.description || "Editable ControlPact policy template"}</span></button>)}</div>
    </section>
    <section className="panel cp-page-panel">
      <div className="panel-heading"><div><p className="eyebrow">ORGANISATION POLICY</p><h3>Create From Template</h3></div></div>
      <form className="cp-form-grid" onSubmit={create}>
        <label><span>Environment</span><select value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)} required><option value="">Select environment</option>{environments.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.status}</option>)}</select></label>
        <label><span>Template</span><select value={templateId} onChange={(e) => setTemplateId(e.target.value)} required>{templates.map((x) => <option key={x.id} value={x.id}>{x.name || x.id}</option>)}</select></label>
        <label><span>Policy name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production Release Policy" /></label>
        <label><span>Description</span><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Authority rules for this environment" /></label>
        <div className="cp-form-actions cp-form-wide"><button className="primary-button" type="submit" disabled={busy === "create" || !environmentId || !templateId}>{busy === "create" ? "Creating..." : "Create Policy"}</button></div>
      </form>
      {message && <p className="api-key-message">{message}</p>}{error && <p className="decision-error">{error}</p>}
    </section>
    <section className="cp-card-grid">{policies.length === 0 ? <div className="panel cp-empty">No organisation policies yet.</div> : policies.map((p) => <article className="panel cp-resource-card" key={p.id}><div className="cp-resource-card-head"><div><p className="eyebrow">VERSION {p.version}</p><h3>{p.name}</h3></div><span className={`cp-status cp-status-${p.status.toLowerCase()}`}>{p.status}</span></div><p>{p.description || "Organisation-controlled policy."}</p><dl className="cp-mini-details"><div><dt>Environment</dt><dd>{envName(p.environmentId)}</dd></div><div><dt>Template</dt><dd>{p.templateId || "Custom"}</dd></div></dl>{p.status !== "ACTIVE" && <div className="cp-card-actions"><button type="button" disabled={busy === p.id} onClick={() => publish(p.id)}>Publish Policy</button></div>}</article>)}</section>
  </>;
}
