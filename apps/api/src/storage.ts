import {
  MongoClient,
  type Collection,
  type Document,
} from "mongodb";

import type {
  ApprovalRequest,
} from "@controlpact/approvals";

export type StoredDecisionRecord = {
  id: string;
  receiptId: string;
  agentId: string;
  action: string;
  decision:
    | "ALLOW"
    | "APPROVE"
    | "BLOCK";
  policyId: string;
  referenceId: string;
  resource?: string;
  reason: string;
  matchedRuleIds: string[];
  createdAt: string;
  approvalStatus?:
    | "PENDING"
    | "APPROVED"
    | "REJECTED";
  decidedAt?: string;
  decidedBy?: string;
  approvalReason?: string;
};

export type DecisionLifecycleUpdate =
  Partial<
    Pick<
      StoredDecisionRecord,
      | "approvalStatus"
      | "decidedAt"
      | "decidedBy"
      | "approvalReason"
    >
  >;

export type StoredUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  organizationId: string;
  organizationName: string;
  role: "OWNER";
  createdAt: string;
  updatedAt: string;
};

export type StoredSessionRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
};

export interface ControlPactStorage {
  ready(): Promise<void>;

  listApprovals():
    Promise<ApprovalRequest[]>;

  getApproval(
    id: string,
  ): Promise<
    ApprovalRequest | undefined
  >;

  saveApproval(
    approval: ApprovalRequest,
  ): Promise<void>;

  listDecisions(
    limit?: number,
  ): Promise<
    StoredDecisionRecord[]
  >;

  findDecisionByReceiptId(
    receiptId: string,
  ): Promise<
    StoredDecisionRecord | undefined
  >;

  saveDecision(
    decision: StoredDecisionRecord,
  ): Promise<void>;

  updateDecisionByReceiptId(
    receiptId: string,
    update: DecisionLifecycleUpdate,
  ): Promise<void>;

  getUserByEmail(
    email: string,
  ): Promise<
    StoredUserRecord | undefined
  >;

  getUserById(
    id: string,
  ): Promise<
    StoredUserRecord | undefined
  >;

  saveUser(
    user: StoredUserRecord,
  ): Promise<void>;

  getSessionByTokenHash(
    tokenHash: string,
  ): Promise<
    StoredSessionRecord | undefined
  >;

  saveSession(
    session: StoredSessionRecord,
  ): Promise<void>;

  deleteSessionByTokenHash(
    tokenHash: string,
  ): Promise<void>;

  close(): Promise<void>;
}

const cloneApproval = (
  approval: ApprovalRequest,
): ApprovalRequest => ({
  ...approval,
});

const cloneDecision = (
  decision: StoredDecisionRecord,
): StoredDecisionRecord => ({
  ...decision,
  matchedRuleIds: [
    ...decision.matchedRuleIds,
  ],
});

const cloneUser = (
  user: StoredUserRecord,
): StoredUserRecord => ({
  ...user,
});

const cloneSession = (
  session: StoredSessionRecord,
): StoredSessionRecord => ({
  ...session,
});

export class MemoryControlPactStorage
implements ControlPactStorage {
  private readonly approvals =
    new Map<
      string,
      ApprovalRequest
    >();

  private readonly decisions:
    StoredDecisionRecord[] = [];

  private readonly users =
    new Map<
      string,
      StoredUserRecord
    >();

  private readonly sessions =
    new Map<
      string,
      StoredSessionRecord
    >();

  async ready(): Promise<void> {
    return;
  }

  async listApprovals():
    Promise<ApprovalRequest[]> {
    return Array.from(
      this.approvals.values(),
    ).map(cloneApproval);
  }

  async getApproval(
    id: string,
  ): Promise<
    ApprovalRequest | undefined
  > {
    const approval =
      this.approvals.get(id);

    return approval
      ? cloneApproval(approval)
      : undefined;
  }

  async saveApproval(
    approval: ApprovalRequest,
  ): Promise<void> {
    this.approvals.set(
      approval.id,
      cloneApproval(approval),
    );
  }

  async listDecisions(
    limit = 50,
  ): Promise<
    StoredDecisionRecord[]
  > {
    return this.decisions
      .slice(
        0,
        Math.max(0, limit),
      )
      .map(cloneDecision);
  }

  async findDecisionByReceiptId(
    receiptId: string,
  ): Promise<
    StoredDecisionRecord | undefined
  > {
    const decision =
      this.decisions.find(
        (item) =>
          item.receiptId ===
          receiptId,
      );

    return decision
      ? cloneDecision(decision)
      : undefined;
  }

  async saveDecision(
    decision: StoredDecisionRecord,
  ): Promise<void> {
    const index =
      this.decisions.findIndex(
        (item) =>
          item.id === decision.id,
      );

    if (index >= 0) {
      this.decisions[index] =
        cloneDecision(decision);

      return;
    }

    this.decisions.unshift(
      cloneDecision(decision),
    );
  }

  async updateDecisionByReceiptId(
    receiptId: string,
    update: DecisionLifecycleUpdate,
  ): Promise<void> {
    const decision =
      this.decisions.find(
        (item) =>
          item.receiptId ===
          receiptId,
      );

    if (!decision) {
      return;
    }

    Object.assign(
      decision,
      update,
    );
  }

  async getUserByEmail(
    email: string,
  ): Promise<
    StoredUserRecord | undefined
  > {
    const user =
      Array.from(
        this.users.values(),
      ).find(
        (item) =>
          item.email === email,
      );

    return user
      ? cloneUser(user)
      : undefined;
  }

  async getUserById(
    id: string,
  ): Promise<
    StoredUserRecord | undefined
  > {
    const user =
      this.users.get(id);

    return user
      ? cloneUser(user)
      : undefined;
  }

  async saveUser(
    user: StoredUserRecord,
  ): Promise<void> {
    this.users.set(
      user.id,
      cloneUser(user),
    );
  }

  async getSessionByTokenHash(
    tokenHash: string,
  ): Promise<
    StoredSessionRecord | undefined
  > {
    const session =
      this.sessions.get(
        tokenHash,
      );

    return session
      ? cloneSession(session)
      : undefined;
  }

  async saveSession(
    session: StoredSessionRecord,
  ): Promise<void> {
    this.sessions.set(
      session.tokenHash,
      cloneSession(session),
    );
  }

  async deleteSessionByTokenHash(
    tokenHash: string,
  ): Promise<void> {
    this.sessions.delete(
      tokenHash,
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

export class MongoControlPactStorage
implements ControlPactStorage {
  private readonly client:
    MongoClient;

  private readonly databaseName:
    string;

  private approvalCollection:
    Collection<Document> | null =
    null;

  private decisionCollection:
    Collection<Document> | null =
    null;

  private userCollection:
    Collection<Document> | null =
    null;

  private sessionCollection:
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

    const database =
      this.client.db(
        this.databaseName,
      );

    this.approvalCollection =
      database.collection(
        "approvals",
      );

    this.decisionCollection =
      database.collection(
        "decisions",
      );

    this.userCollection =
      database.collection(
        "users",
      );

    this.sessionCollection =
      database.collection(
        "sessions",
      );

    await Promise.all([
      this.approvalCollection
        .createIndex(
          { id: 1 },
          { unique: true },
        ),

      this.approvalCollection
        .createIndex({
          receiptId: 1,
        }),

      this.decisionCollection
        .createIndex(
          { id: 1 },
          { unique: true },
        ),

      this.decisionCollection
        .createIndex(
          { receiptId: 1 },
          { unique: true },
        ),

      this.decisionCollection
        .createIndex({
          createdAt: -1,
        }),

      this.userCollection
        .createIndex(
          { id: 1 },
          { unique: true },
        ),

      this.userCollection
        .createIndex(
          { email: 1 },
          { unique: true },
        ),

      this.sessionCollection
        .createIndex(
          { id: 1 },
          { unique: true },
        ),

      this.sessionCollection
        .createIndex(
          { tokenHash: 1 },
          { unique: true },
        ),

      this.sessionCollection
        .createIndex({
          expiresAt: 1,
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

  private async approvals():
    Promise<
      Collection<Document>
    > {
    await this.ready();

    return this
      .approvalCollection!;
  }

  private async decisions():
    Promise<
      Collection<Document>
    > {
    await this.ready();

    return this
      .decisionCollection!;
  }

  private async users():
    Promise<
      Collection<Document>
    > {
    await this.ready();

    return this
      .userCollection!;
  }

  private async sessions():
    Promise<
      Collection<Document>
    > {
    await this.ready();

    return this
      .sessionCollection!;
  }

  async listApprovals():
    Promise<ApprovalRequest[]> {
    const collection =
      await this.approvals();

    const documents =
      await collection
        .find(
          {},
          {
            projection: {
              _id: 0,
            },
          },
        )
        .sort({
          requestedAt: 1,
        })
        .toArray();

    return (
      documents as unknown as ApprovalRequest[]
    );
  }

  async getApproval(
    id: string,
  ): Promise<
    ApprovalRequest | undefined
  > {
    const collection =
      await this.approvals();

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
      ? (
          document as unknown as ApprovalRequest
        )
      : undefined;
  }

  async saveApproval(
    approval: ApprovalRequest,
  ): Promise<void> {
    const collection =
      await this.approvals();

    await collection.replaceOne(
      {
        id: approval.id,
      },
      cleanDocument({
        ...approval,
      }),
      {
        upsert: true,
      },
    );
  }

  async listDecisions(
    limit = 50,
  ): Promise<
    StoredDecisionRecord[]
  > {
    const collection =
      await this.decisions();

    const documents =
      await collection
        .find(
          {},
          {
            projection: {
              _id: 0,
            },
          },
        )
        .sort({
          createdAt: -1,
        })
        .limit(
          Math.max(0, limit),
        )
        .toArray();

    return (
      documents as unknown as StoredDecisionRecord[]
    );
  }

  async findDecisionByReceiptId(
    receiptId: string,
  ): Promise<
    StoredDecisionRecord | undefined
  > {
    const collection =
      await this.decisions();

    const document =
      await collection.findOne(
        {
          receiptId,
        },
        {
          projection: {
            _id: 0,
          },
        },
      );

    return document
      ? (
          document as unknown as StoredDecisionRecord
        )
      : undefined;
  }

  async saveDecision(
    decision: StoredDecisionRecord,
  ): Promise<void> {
    const collection =
      await this.decisions();

    await collection.replaceOne(
      {
        id: decision.id,
      },
      cleanDocument({
        ...decision,
      }),
      {
        upsert: true,
      },
    );
  }

  async updateDecisionByReceiptId(
    receiptId: string,
    update: DecisionLifecycleUpdate,
  ): Promise<void> {
    const collection =
      await this.decisions();

    const cleanUpdate =
      cleanDocument({
        ...update,
      });

    if (
      Object.keys(cleanUpdate)
        .length === 0
    ) {
      return;
    }

    await collection.updateOne(
      {
        receiptId,
      },
      {
        $set: cleanUpdate,
      },
    );
  }

  async getUserByEmail(
    email: string,
  ): Promise<
    StoredUserRecord | undefined
  > {
    const collection =
      await this.users();

    const document =
      await collection.findOne(
        { email },
        {
          projection: {
            _id: 0,
          },
        },
      );

    return document
      ? document as unknown as StoredUserRecord
      : undefined;
  }

  async getUserById(
    id: string,
  ): Promise<
    StoredUserRecord | undefined
  > {
    const collection =
      await this.users();

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
      ? document as unknown as StoredUserRecord
      : undefined;
  }

  async saveUser(
    user: StoredUserRecord,
  ): Promise<void> {
    const collection =
      await this.users();

    await collection.replaceOne(
      { id: user.id },
      cleanDocument({
        ...user,
      }),
      {
        upsert: true,
      },
    );
  }

  async getSessionByTokenHash(
    tokenHash: string,
  ): Promise<
    StoredSessionRecord | undefined
  > {
    const collection =
      await this.sessions();

    const document =
      await collection.findOne(
        { tokenHash },
        {
          projection: {
            _id: 0,
          },
        },
      );

    return document
      ? document as unknown as StoredSessionRecord
      : undefined;
  }

  async saveSession(
    session: StoredSessionRecord,
  ): Promise<void> {
    const collection =
      await this.sessions();

    await collection.replaceOne(
      {
        id: session.id,
      },
      cleanDocument({
        ...session,
      }),
      {
        upsert: true,
      },
    );
  }

  async deleteSessionByTokenHash(
    tokenHash: string,
  ): Promise<void> {
    const collection =
      await this.sessions();

    await collection.deleteOne({
      tokenHash,
    });
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export const createControlPactStorage =
  (): ControlPactStorage => {
    const mode =
      String(
        process.env
          .CONTROLPACT_STORAGE ||
          "memory",
      )
        .trim()
        .toLowerCase();

    if (mode !== "mongodb") {
      return new MemoryControlPactStorage();
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

    return new MongoControlPactStorage(
      uri,
      databaseName,
    );
  };