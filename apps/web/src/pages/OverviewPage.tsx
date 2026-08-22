import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { controlPactJson } from "../lib/controlPactApi";
import type { AgentAssignment, ApiKeyItem, ControlEnvironment, ControlPactApproval, ControlPactDecision, OrganizationPolicy, RegisteredAgent } from "../types";

type Props = { accessToken: string };

export default function OverviewPage({ accessToken }: Props) {
  const [environments, setEnvironments] = useState<ControlEnvironment[]>([]);
  const [agents, setAgents] = useState<RegisteredAgent[]>([]);
  const [policies, setPolicies] = useState<OrganizationPolicy[]>([]);
  const [assignments, setAssignments] = useState<AgentAssignment[]>([]);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [decisions, setDecisions] = useState<ControlPactDecision[]>([]);
  const [approvals, setApprovals] = useState<ControlPactApproval[]>([]);
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const health = await fetch("/controlpact-api/health").then((r) => r.json());
        const [e,a,p,s,k,d,q] = await Promise.all([
          controlPactJson("/v1/environments", accessToken),
          controlPactJson("/v1/agents", accessToken),
          controlPactJson("/v1/organization-policies", accessToken),
          controlPactJson("/v1/agent-assignments", accessToken),
          controlPactJson("/v1/api-keys", accessToken),
          controlPactJson("/v1/decisions", accessToken),
          controlPactJson("/v1/approvals", accessToken),
        ]);
        if (!active) return;
        setApiOnline(health?.success === true);
        setEnvironments(Array.isArray(e.environments) ? e.environments : []);
        setAgents(Array.isArray(a.agents) ? a.agents : []);
        setPolicies(Array.isArray(p.policies) ? p.policies : []);
        setAssignments(Array.isArray(s.assignments) ? s.assignments : []);
        setKeys(Array.isArray(k.apiKeys) ? k.apiKeys : []);
        setDecisions(Array.isArray(d.decisions) ? d.decisions : []);
        setApprovals(Array.isArray(q.approvals) ? q.approvals : []);
      } catch { if (active) setApiOnline(false); }
    };
    load(); const timer = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [accessToken]);

  const activeEnvironments = environments.filter((x) => x.status === "ACTIVE").length;
  const activePolicies = policies.filter((x) => x.status === "ACTIVE").length;
  const liveKeys = keys.filter((x) => !x.revokedAt).length;
  const pending = approvals.filter((x) => x.status === "PENDING").length;
  const setup = [
    ["Create a control environment", environments.length > 0, "/environments"],
    ["Publish an organisation policy", activePolicies > 0, "/policies"],
    ["Register an agent", agents.length > 0, "/agents"],
    ["Assign agent to policy", assignments.length > 0, "/settings"],
    ["Create a scoped API key", keys.some((x) => x.environmentId && x.agentId && x.policyId && !x.revokedAt), "/settings"],
    ["Run a controlled decision", decisions.length > 0, "/decisions"],
  ] as const;

  return <>
    <PageHeader eyebrow="CONTROL ROOM" title="Overview" description="Control consequential agent actions through environments, policies, assignments, scoped credentials, approvals and signed evidence." action={<span className={apiOnline ? "live-chip" : "api-key-required-chip"}>{apiOnline ? "API ONLINE" : "API OFFLINE"}</span>} />
    <section className="cp-stat-grid cp-stat-grid-six">
      <article className="cp-stat-card"><span>ACTIVE ENVIRONMENTS</span><strong>{activeEnvironments}</strong><small>{environments.length} total</small></article>
      <article className="cp-stat-card"><span>REGISTERED AGENTS</span><strong>{agents.length}</strong><small>Controlled identities</small></article>
      <article className="cp-stat-card"><span>ACTIVE POLICIES</span><strong>{activePolicies}</strong><small>Organisation rules</small></article>
      <article className="cp-stat-card"><span>LIVE API KEYS</span><strong>{liveKeys}</strong><small>Agent credentials</small></article>
      <article className="cp-stat-card"><span>PENDING APPROVALS</span><strong>{pending}</strong><small>Human action required</small></article>
      <article className="cp-stat-card"><span>DECISIONS</span><strong>{decisions.length}</strong><small>Signed outcomes</small></article>
    </section>
    <section className="cp-dashboard-grid">
      <article className="panel cp-page-panel"><div className="panel-heading"><div><p className="eyebrow">ONBOARDING</p><h3>Control Setup</h3></div><span className="policy-count">{setup.filter((x) => x[1]).length}/{setup.length}</span></div><div className="cp-checklist">{setup.map(([label,ready,to]) => <Link key={label} to={to} className={ready ? "cp-check cp-check-done" : "cp-check"}><span>{ready ? "✓" : "○"}</span><strong>{label}</strong></Link>)}</div></article>
      <article className="panel cp-page-panel"><div className="panel-heading"><div><p className="eyebrow">EXECUTION CHAIN</p><h3>Authority Boundary</h3></div></div><div className="cp-authority-flow"><div><strong>1</strong><span>Agent presents scoped key</span></div><div><strong>2</strong><span>ControlPact derives environment, agent and policy</span></div><div><strong>3</strong><span>Policy returns ALLOW, APPROVE or BLOCK</span></div><div><strong>4</strong><span>Human authority resolves escalations</span></div><div><strong>5</strong><span>Signed receipt records proof</span></div></div></article>
    </section>
  </>;
}
