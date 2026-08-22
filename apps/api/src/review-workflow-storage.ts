import {
  MongoClient,
  type Collection,
  type Document,
} from "mongodb";

export type ReviewEntityType =
  | "APPROVAL"
  | "AUDIT";

export type ReviewEventType =
  | "COMMENT"
  | "AMENDMENT_REQUESTED"
  | "RESUBMITTED"
  | "AUDIT_COMPLETED"
  | "OWNER_OVERRIDE";

export type ReviewEvent = {
  id: string;
  organizationId: string;
  entityType: ReviewEntityType;
  entityId: string;
  decisionId?: string;
  eventType: ReviewEventType;
  comment: string;
  actorUserId: string;
  actorEmail: string;
  actorRole: string;
  createdAt: string;
};

export interface ReviewWorkflowStorage {
  ready(): Promise<void>;

  listByOrganization(
    organizationId: string,
    entityType?: ReviewEntityType,
    entityId?: string,
  ): Promise<ReviewEvent[]>;

  listByEntity(
    organizationId: string,
    entityType: ReviewEntityType,
    entityId: string,
  ): Promise<ReviewEvent[]>;

  save(
    event: ReviewEvent,
  ): Promise<void>;

  close(): Promise<void>;
}

const clone = (
  event: ReviewEvent,
): ReviewEvent => ({
  ...event,
});

export class MemoryReviewWorkflowStorage
implements ReviewWorkflowStorage {
  private readonly events =
    new Map<
      string,
      ReviewEvent
    >();

  async ready(): Promise<void> {
    return;
  }

  async listByOrganization(
    organizationId: string,
    entityType?: ReviewEntityType,
    entityId?: string,
  ): Promise<ReviewEvent[]> {
    return Array.from(
      this.events.values(),
    )
      .filter(
        (event) =>
          event.organizationId ===
            organizationId &&
          (
            !entityType ||
            event.entityType ===
              entityType
          ) &&
          (
            !entityId ||
            event.entityId ===
              entityId
          ),
      )
      .sort(
        (a, b) =>
          a.createdAt.localeCompare(
            b.createdAt,
          ),
      )
      .map(clone);
  }

  async listByEntity(
    organizationId: string,
    entityType: ReviewEntityType,
    entityId: string,
  ): Promise<ReviewEvent[]> {
    return this
      .listByOrganization(
        organizationId,
        entityType,
        entityId,
      );
  }

  async save(
    event: ReviewEvent,
  ): Promise<void> {
    this.events.set(
      event.id,
      clone(event),
    );
  }

  async close(): Promise<void> {
    return;
  }
}

const cleanDocument = (
  value: Record<
    string,
    unknown
  >,
): Document =>
  Object.fromEntries(
    Object.entries(value)
      .filter(
        ([, item]) =>
          item !== undefined,
      ),
  );

export class MongoReviewWorkflowStorage
implements ReviewWorkflowStorage {
  private readonly client:
    MongoClient;

  private readonly databaseName:
    string;

  private collection:
    Collection<Document> |
    null =
      null;

  private readyPromise:
    Promise<void> |
    null =
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

    this.collection =
      database.collection(
        "review_events",
      );

    await this.collection
      .createIndex(
        {
          organizationId: 1,
          entityType: 1,
          entityId: 1,
          createdAt: 1,
        },
      );
  }

  async ready(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise =
        this.connect();
    }

    await this.readyPromise;
  }

  private async events():
    Promise<
      Collection<Document>
    > {
    await this.ready();

    if (!this.collection) {
      throw new Error(
        "Review workflow storage is not ready.",
      );
    }

    return this.collection;
  }

  async listByOrganization(
    organizationId: string,
    entityType?: ReviewEntityType,
    entityId?: string,
  ): Promise<ReviewEvent[]> {
    const collection =
      await this.events();

    const filter:
      Record<
        string,
        unknown
      > = {
        organizationId,
      };

    if (entityType) {
      filter.entityType =
        entityType;
    }

    if (entityId) {
      filter.entityId =
        entityId;
    }

    const documents =
      await collection
        .find(
          filter,
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
      ReviewEvent[];
  }

  async listByEntity(
    organizationId: string,
    entityType: ReviewEntityType,
    entityId: string,
  ): Promise<ReviewEvent[]> {
    return this
      .listByOrganization(
        organizationId,
        entityType,
        entityId,
      );
  }

  async save(
    event: ReviewEvent,
  ): Promise<void> {
    const collection =
      await this.events();

    await collection.replaceOne(
      {
        id: event.id,
      },
      cleanDocument({
        ...event,
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

export const createReviewWorkflowStorage =
  (): ReviewWorkflowStorage => {
    const mode =
      String(
        process.env
          .CONTROLPACT_STORAGE ||
          "memory",
      )
        .trim()
        .toLowerCase();

    if (mode !== "mongodb") {
      return new MemoryReviewWorkflowStorage();
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

    return new MongoReviewWorkflowStorage(
      uri,
      databaseName,
    );
  };
