import {
  Collection,
  type Document,
  MongoClient,
} from "mongodb";

import type {
  Policy,
} from "@controlpact/policy-engine";

export type OrganizationRole =
  | "OWNER"
  | "ADMIN"
  | "APPROVER"
  | "AUDITOR"
  | "VIEWER";

export type ControlEnvironmentCategory =
  | "SOFTWARE_DEVOPS"
  | "FINANCE_PAYMENTS"
  | "DATA_SECURITY"
  | "CUSTOMER_OPERATIONS"
  | "COMMUNICATIONS"
  | "IT_ADMINISTRATION"
  | "CUSTOM";

export type ControlEnvironmentMode =
  | "TEST"
  | "PRODUCTION";

export type ControlEnvironmentStatus =
  | "DRAFT"
  | "ACTIVE"
  | "SUSPENDED";

export type StoredControlEnvironment = {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category: ControlEnvironmentCategory;
  mode: ControlEnvironmentMode;
  status: ControlEnvironmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type AgentStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "REVOKED";

export type StoredAgent = {
  id: string;
  organizationId: string;
  environmentId: string;
  name: string;
  externalAgentId: string;
  description?: string;
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationPolicyStatus =
  | "DRAFT"
  | "TEST"
  | "ACTIVE"
  | "RETIRED";

export type StoredOrganizationPolicy = {
  id: string;
  organizationId: string;
  environmentId?: string;
  name: string;
  description?: string;
  templateId?: string;
  version: number;
  status: OrganizationPolicyStatus;
  policy: Policy;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type TeamMemberStatus =
  | "ACTIVE"
  | "INVITED"
  | "DISABLED";

export type StoredTeamMember = {
  id: string;
  organizationId: string;
  organizationName?: string;
  userId?: string;
  email: string;
  displayName?: string;
  role: OrganizationRole;
  status: TeamMemberStatus;
  inviteTokenHash?: string;
  inviteExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredAgentAssignment = {
  id: string;
  organizationId: string;
  environmentId: string;
  agentId: string;
  policyId: string;
  responsibleUserId?: string;
  responsibleRole?: OrganizationRole;
  createdAt: string;
  updatedAt: string;
};

export interface ControlPactDomainStorage {
  ready(): Promise<void>;

  listEnvironments(
    organizationId: string,
  ): Promise<StoredControlEnvironment[]>;

  getEnvironment(
    id: string,
  ): Promise<
    StoredControlEnvironment | undefined
  >;

  saveEnvironment(
    environment: StoredControlEnvironment,
  ): Promise<void>;

  listAgents(
    organizationId: string,
  ): Promise<StoredAgent[]>;

  getAgent(
    id: string,
  ): Promise<
    StoredAgent | undefined
  >;

  saveAgent(
    agent: StoredAgent,
  ): Promise<void>;

  listOrganizationPolicies(
    organizationId: string,
  ): Promise<
    StoredOrganizationPolicy[]
  >;

  getOrganizationPolicy(
    id: string,
  ): Promise<
    StoredOrganizationPolicy | undefined
  >;

  saveOrganizationPolicy(
    policy: StoredOrganizationPolicy,
  ): Promise<void>;

  listTeamMembers(
    organizationId: string,
  ): Promise<StoredTeamMember[]>;

  getTeamMember(
    id: string,
  ): Promise<
    StoredTeamMember | undefined
  >;

  getTeamMemberByInviteTokenHash(
    inviteTokenHash: string,
  ): Promise<
    StoredTeamMember | undefined
  >;

  saveTeamMember(
    member: StoredTeamMember,
  ): Promise<void>;

  listAssignments(
    organizationId: string,
  ): Promise<
    StoredAgentAssignment[]
  >;

  saveAssignment(
    assignment: StoredAgentAssignment,
  ): Promise<void>;

  close(): Promise<void>;
}

const clone = <T>(
  value: T,
): T =>
  JSON.parse(
    JSON.stringify(value),
  ) as T;

export class MemoryControlPactDomainStorage
implements ControlPactDomainStorage {
  private readonly environments =
    new Map<
      string,
      StoredControlEnvironment
    >();

  private readonly agents =
    new Map<
      string,
      StoredAgent
    >();

  private readonly policies =
    new Map<
      string,
      StoredOrganizationPolicy
    >();

  private readonly members =
    new Map<
      string,
      StoredTeamMember
    >();

  private readonly assignments =
    new Map<
      string,
      StoredAgentAssignment
    >();

  async ready(): Promise<void> {
    return;
  }

  async listEnvironments(
    organizationId: string,
  ): Promise<
    StoredControlEnvironment[]
  > {
    return Array.from(
      this.environments.values(),
    )
      .filter(
        (item) =>
          item.organizationId ===
          organizationId,
      )
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(
            a.createdAt,
          ),
      )
      .map(clone);
  }

  async getEnvironment(
    id: string,
  ): Promise<
    StoredControlEnvironment | undefined
  > {
    const item =
      this.environments.get(id);

    return item
      ? clone(item)
      : undefined;
  }

  async saveEnvironment(
    environment:
      StoredControlEnvironment,
  ): Promise<void> {
    this.environments.set(
      environment.id,
      clone(environment),
    );
  }

  async listAgents(
    organizationId: string,
  ): Promise<StoredAgent[]> {
    return Array.from(
      this.agents.values(),
    )
      .filter(
        (item) =>
          item.organizationId ===
          organizationId,
      )
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(
            a.createdAt,
          ),
      )
      .map(clone);
  }

  async getAgent(
    id: string,
  ): Promise<
    StoredAgent | undefined
  > {
    const item =
      this.agents.get(id);

    return item
      ? clone(item)
      : undefined;
  }

  async saveAgent(
    agent: StoredAgent,
  ): Promise<void> {
    this.agents.set(
      agent.id,
      clone(agent),
    );
  }

  async listOrganizationPolicies(
    organizationId: string,
  ): Promise<
    StoredOrganizationPolicy[]
  > {
    return Array.from(
      this.policies.values(),
    )
      .filter(
        (item) =>
          item.organizationId ===
          organizationId,
      )
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(
            a.createdAt,
          ),
      )
      .map(clone);
  }

  async getOrganizationPolicy(
    id: string,
  ): Promise<
    StoredOrganizationPolicy | undefined
  > {
    const item =
      this.policies.get(id);

    return item
      ? clone(item)
      : undefined;
  }

  async saveOrganizationPolicy(
    policy:
      StoredOrganizationPolicy,
  ): Promise<void> {
    this.policies.set(
      policy.id,
      clone(policy),
    );
  }

  async listTeamMembers(
    organizationId: string,
  ): Promise<
    StoredTeamMember[]
  > {
    return Array.from(
      this.members.values(),
    )
      .filter(
        (item) =>
          item.organizationId ===
          organizationId,
      )
      .sort(
        (a, b) =>
          a.createdAt.localeCompare(
            b.createdAt,
          ),
      )
      .map(clone);
  }

  async getTeamMember(
    id: string,
  ): Promise<
    StoredTeamMember | undefined
  > {
    const item =
      this.members.get(id);

    return item
      ? clone(item)
      : undefined;
  }

  async getTeamMemberByInviteTokenHash(
    inviteTokenHash: string,
  ): Promise<
    StoredTeamMember | undefined
  > {
    const member =
      Array.from(
        this.members.values(),
      ).find(
        (item) =>
          item.inviteTokenHash ===
          inviteTokenHash,
      );

    return member
      ? clone(member)
      : undefined;
  }

  async saveTeamMember(
    member: StoredTeamMember,
  ): Promise<void> {
    this.members.set(
      member.id,
      clone(member),
    );
  }

  async listAssignments(
    organizationId: string,
  ): Promise<
    StoredAgentAssignment[]
  > {
    return Array.from(
      this.assignments.values(),
    )
      .filter(
        (item) =>
          item.organizationId ===
          organizationId,
      )
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(
            a.createdAt,
          ),
      )
      .map(clone);
  }

  async saveAssignment(
    assignment:
      StoredAgentAssignment,
  ): Promise<void> {
    this.assignments.set(
      assignment.id,
      clone(assignment),
    );
  }

  async close(): Promise<void> {
    return;
  }
}

const cleanDocument = (
  value: Record<string, unknown>,
): Document =>
  Object.fromEntries(
    Object.entries(value)
      .filter(
        ([, item]) =>
          item !== undefined,
      ),
  );

export class MongoControlPactDomainStorage
implements ControlPactDomainStorage {
  private readonly client:
    MongoClient;

  private readonly databaseName:
    string;

  private environmentCollection:
    Collection<Document> | null =
    null;

  private agentCollection:
    Collection<Document> | null =
    null;

  private policyCollection:
    Collection<Document> | null =
    null;

  private memberCollection:
    Collection<Document> | null =
    null;

  private assignmentCollection:
    Collection<Document> | null =
    null;

  private readyPromise:
    Promise<void> | null =
    null;

  constructor(
    uri: string,
    databaseName: string,
  ) {
    this.client =
      new MongoClient(uri);

    this.databaseName =
      databaseName;
  }

  private async connect():
    Promise<void> {
    await this.client.connect();

    const db =
      this.client.db(
        this.databaseName,
      );

    this.environmentCollection =
      db.collection(
        "control_environments",
      );

    this.agentCollection =
      db.collection(
        "agents",
      );

    this.policyCollection =
      db.collection(
        "organization_policies",
      );

    this.memberCollection =
      db.collection(
        "team_members",
      );

    this.assignmentCollection =
      db.collection(
        "agent_assignments",
      );

    await Promise.all([
      this.environmentCollection
        .createIndex({
          organizationId: 1,
          createdAt: -1,
        }),
      this.agentCollection
        .createIndex({
          organizationId: 1,
          externalAgentId: 1,
        }),
      this.policyCollection
        .createIndex({
          organizationId: 1,
          environmentId: 1,
          createdAt: -1,
        }),
      this.memberCollection
        .createIndex(
          {
            organizationId: 1,
            email: 1,
          },
          {
            unique: true,
          },
        ),
      this.assignmentCollection
        .createIndex({
          organizationId: 1,
          agentId: 1,
          createdAt: -1,
        }),
    ]);
  }

  async ready(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise =
        this.connect();
    }

    await this.readyPromise;
  }

  private async environments():
    Promise<
      Collection<Document>
    > {
    await this.ready();
    return this
      .environmentCollection!;
  }

  private async agents():
    Promise<
      Collection<Document>
    > {
    await this.ready();
    return this
      .agentCollection!;
  }

  private async policies():
    Promise<
      Collection<Document>
    > {
    await this.ready();
    return this
      .policyCollection!;
  }

  private async members():
    Promise<
      Collection<Document>
    > {
    await this.ready();
    return this
      .memberCollection!;
  }

  private async assignments():
    Promise<
      Collection<Document>
    > {
    await this.ready();
    return this
      .assignmentCollection!;
  }

  async listEnvironments(
    organizationId: string,
  ): Promise<
    StoredControlEnvironment[]
  > {
    const collection =
      await this.environments();

    const documents =
      await collection
        .find(
          { organizationId },
          {
            projection: {
              _id: 0,
            },
          },
        )
        .sort({
          createdAt: -1,
        })
        .toArray();

    return documents as unknown as
      StoredControlEnvironment[];
  }

  async getEnvironment(
    id: string,
  ): Promise<
    StoredControlEnvironment | undefined
  > {
    const collection =
      await this.environments();

    const document =
      await collection.findOne(
        { id },
        {
          projection: {
            _id: 0,
          },
        },
      );

    return document
      ? document as unknown as
          StoredControlEnvironment
      : undefined;
  }

  async saveEnvironment(
    environment:
      StoredControlEnvironment,
  ): Promise<void> {
    const collection =
      await this.environments();

    await collection.replaceOne(
      {
        id: environment.id,
      },
      cleanDocument({
        ...environment,
      }),
      {
        upsert: true,
      },
    );
  }

  async listAgents(
    organizationId: string,
  ): Promise<StoredAgent[]> {
    const collection =
      await this.agents();

    const documents =
      await collection
        .find(
          { organizationId },
          {
            projection: {
              _id: 0,
            },
          },
        )
        .sort({
          createdAt: -1,
        })
        .toArray();

    return documents as unknown as
      StoredAgent[];
  }

  async getAgent(
    id: string,
  ): Promise<
    StoredAgent | undefined
  > {
    const collection =
      await this.agents();

    const document =
      await collection.findOne(
        { id },
        {
          projection: {
            _id: 0,
          },
        },
      );

    return document
      ? document as unknown as
          StoredAgent
      : undefined;
  }

  async saveAgent(
    agent: StoredAgent,
  ): Promise<void> {
    const collection =
      await this.agents();

    await collection.replaceOne(
      {
        id: agent.id,
      },
      cleanDocument({
        ...agent,
      }),
      {
        upsert: true,
      },
    );
  }

  async listOrganizationPolicies(
    organizationId: string,
  ): Promise<
    StoredOrganizationPolicy[]
  > {
    const collection =
      await this.policies();

    const documents =
      await collection
        .find(
          { organizationId },
          {
            projection: {
              _id: 0,
            },
          },
        )
        .sort({
          createdAt: -1,
        })
        .toArray();

    return documents as unknown as
      StoredOrganizationPolicy[];
  }

  async getOrganizationPolicy(
    id: string,
  ): Promise<
    StoredOrganizationPolicy | undefined
  > {
    const collection =
      await this.policies();

    const document =
      await collection.findOne(
        { id },
        {
          projection: {
            _id: 0,
          },
        },
      );

    return document
      ? document as unknown as
          StoredOrganizationPolicy
      : undefined;
  }

  async saveOrganizationPolicy(
    policy:
      StoredOrganizationPolicy,
  ): Promise<void> {
    const collection =
      await this.policies();

    await collection.replaceOne(
      {
        id: policy.id,
      },
      cleanDocument({
        ...policy,
      }),
      {
        upsert: true,
      },
    );
  }

  async listTeamMembers(
    organizationId: string,
  ): Promise<
    StoredTeamMember[]
  > {
    const collection =
      await this.members();

    const documents =
      await collection
        .find(
          { organizationId },
          {
            projection: {
              _id: 0,
            },
          },
        )
        .sort({
          createdAt: 1,
        })
        .toArray();

    return documents as unknown as
      StoredTeamMember[];
  }

  async getTeamMember(
    id: string,
  ): Promise<
    StoredTeamMember | undefined
  > {
    const collection =
      await this.members();

    const document =
      await collection.findOne(
        { id },
        {
          projection: {
            _id: 0,
          },
        },
      );

    return document
      ? document as unknown as
          StoredTeamMember
      : undefined;
  }

  async getTeamMemberByInviteTokenHash(
    inviteTokenHash: string,
  ): Promise<
    StoredTeamMember | undefined
  > {
    const collection =
      await this.members();

    const document =
      await collection.findOne(
        {
          inviteTokenHash,
        },
        {
          projection: {
            _id: 0,
          },
        },
      );

    return document
      ? document as unknown as
          StoredTeamMember
      : undefined;
  }

  async saveTeamMember(
    member: StoredTeamMember,
  ): Promise<void> {
    const collection =
      await this.members();

    await collection.replaceOne(
      {
        id: member.id,
      },
      cleanDocument({
        ...member,
      }),
      {
        upsert: true,
      },
    );
  }

  async listAssignments(
    organizationId: string,
  ): Promise<
    StoredAgentAssignment[]
  > {
    const collection =
      await this.assignments();

    const documents =
      await collection
        .find(
          { organizationId },
          {
            projection: {
              _id: 0,
            },
          },
        )
        .sort({
          createdAt: -1,
        })
        .toArray();

    return documents as unknown as
      StoredAgentAssignment[];
  }

  async saveAssignment(
    assignment:
      StoredAgentAssignment,
  ): Promise<void> {
    const collection =
      await this.assignments();

    await collection.replaceOne(
      {
        id: assignment.id,
      },
      cleanDocument({
        ...assignment,
      }),
      {
        upsert: true,
      },
    );
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export const createControlPactDomainStorage =
  (): ControlPactDomainStorage => {
    const mode =
      String(
        process.env
          .CONTROLPACT_STORAGE ||
          "memory",
      )
        .trim()
        .toLowerCase();

    if (mode !== "mongodb") {
      return new MemoryControlPactDomainStorage();
    }

    const uri =
      String(
        process.env
          .CONTROLPACT_MONGODB_URI ||
          "",
      ).trim();

    if (!uri) {
      throw new Error(
        "CONTROLPACT_MONGODB_URI is required when CONTROLPACT_STORAGE=mongodb.",
      );
    }

    const databaseName =
      String(
        process.env
          .CONTROLPACT_MONGODB_DB ||
          "controlpact",
      ).trim() ||
      "controlpact";

    return new MongoControlPactDomainStorage(
      uri,
      databaseName,
    );
  };