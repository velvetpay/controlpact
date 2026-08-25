# ControlPact

## The authority layer for AI and automated systems

ControlPact helps organisations control what automated systems and AI agents are allowed to do.

It provides a structured control layer for defining environments, policies, agents, assignments, scoped API access, approvals and audit evidence.

```text
Environment
    ↓
Policy
    ↓
Agent
    ↓
Assignment
    ↓
API Key
    ↓
Decision
    ↓
Approval
    ↓
Audit
````

## What ControlPact does

ControlPact can evaluate automated actions against defined organisational controls and return an enforceable outcome.

```text
ALLOW
BLOCK
APPROVE → Human authority required
```

The platform is designed to provide:

* Policy-governed AI and automated decisions
* Environment controls
* Agent registration and management
* Agent-to-policy assignments
* Scoped API keys
* Human approval workflows
* Decision records
* Auditable evidence
* Organisation and team controls

## Platform

🌐 **Live ControlPact platform**

https://ctrlpact.com/

ControlPact is part of the Velvet Technologies ecosystem.

🌐 **Velvet Technologies**

https://technologies.velvetpay.app/

## Architecture

```text
Your Application
       │
       ▼
ControlPact API
       │
       ▼
Policy Evaluation
       │
       ├──────────────► ALLOW
       │
       ├──────────────► BLOCK
       │
       └──────────────► APPROVE
                              │
                              ▼
                       Human Authority
                              │
                              ▼
                        Audit Evidence
```

## Control Flow

The ControlPact platform follows a structured control sequence:

1. **Environment** — Define where controlled actions operate.
2. **Policy** — Establish the rules governing those actions.
3. **Agent** — Register the automated or AI system.
4. **Assignment** — Connect agents to the appropriate controls.
5. **API Key** — Provide scoped access for integration.
6. **Decision** — Evaluate an action against applicable controls.
7. **Approval** — Route actions requiring human authority.
8. **Audit** — Preserve decision evidence.

## Developer Infrastructure

ControlPact includes infrastructure for integrating policy-governed decisions into external applications.

The platform supports controlled API access and commercial entitlement flows for production capabilities.

## Repository Structure

```text
controlpact/
├── apps/
│   ├── api/          # ControlPact API
│   └── web/          # ControlPact web platform
├── package.json
└── README.md
```

## Velvet Technologies Ecosystem

ControlPact sits alongside other Velvet Technologies products and infrastructure:

* 🤖 Velvet AI
* 💳 VelvetPay
* 🌐 VelvetSites
* 📄 PDFHub
* 🔧 VelvetInspect
* 🌍 NexVelvet
* 🛡️ ControlPact

## Links

* **ControlPact:** https://ctrlpact.com/
* **Velvet Technologies:** https://technologies.velvetpay.app/
* **GitHub Organisation:** https://github.com/velvetpay

---

**ControlPact — governing automated decisions with policy, human authority and auditable evidence.**

© 2026 Velvet Technologies
