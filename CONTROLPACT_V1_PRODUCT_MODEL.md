# ControlPact V1 Product Model

ControlPact is the authority layer for AI agents and automated systems.

Before a controlled system performs a consequential action, it asks ControlPact. The organisation's active policy returns one deterministic outcome:

- ALLOW
- APPROVE
- BLOCK

## Product structure

Organisation
-> Control Environments
-> Agents / Integrations
-> Organisation Policies
-> Human Roles / Assignments
-> Scoped API Keys
-> Decision Requests
-> Approval Tasks
-> Audit Receipts

## Control Environments

A Control Environment is the organisation's starting object.

Examples:

- Production Deployment
- Finance Operations
- Customer Data
- Security Operations
- Communications
- IT Administration
- Customer Operations
- Custom

Each environment owns its agents, policies, assignments, credentials and activity.

## Human users

Human users authenticate with ControlPact accounts.

Roles:

- OWNER
- ADMIN
- APPROVER
- AUDITOR
- VIEWER

Humans do not require agent API keys.

## Agents and integrations

Every controlled agent or integration authenticates using an organisation-issued API key.

The target model binds each key to:

- organisationId
- environmentId
- agentId
- scopes
- environment type (test or production)

The server derives agent authority from the key. An agent must not be able to grant itself another identity or policy.

## Policies

ControlPact supplies editable templates.

Initial template families:

- Software & DevOps
- Finance & Payments
- Data & Security
- Customer Operations
- Communications
- IT Administration
- Blank / Custom

Organisations clone a template and customise it for their own operation.

Policy lifecycle:

Draft -> Test -> Publish -> Active -> Retired

Published policy versions are immutable. Changes create a new version.

## Decision API

The decision API is industry-agnostic.

A controlled system sends:

- action
- resource
- referenceId
- context

The organisation policy determines ALLOW, APPROVE or BLOCK.

## Approvals

APPROVE automatically creates human work.

The responsible authorised role or person reviews the action. Reviewer identity must come from the authenticated ControlPact account, not caller-controlled text.

## Audit

Every decision creates signed evidence containing the controlling policy, matched rules, action, agent, result and timestamp.

## SDK / API market

The ControlPact Platform is the ready-made governance control centre.

The ControlPact SDK/API is the infrastructure layer for developers and software vendors who want to build their own interface and workflow.

ControlPact understands actions and policies, not industries.
