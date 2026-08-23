import {
  MongoClient,
  type Collection,
  type Document,
} from "mongodb";

export type BillingProduct =
  | "PLATFORM"
  | "SDK";

export type BillingPlan =
  | "SANDBOX"
  | "PRODUCTION"
  | "BUSINESS"
  | "SDK"
  | "ENTERPRISE";

export type BillingStatus =
  | "SANDBOX"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED";

export const mapStripeSubscriptionStatus =
  (
    status: string,
  ): Exclude<
    BillingStatus,
    "SANDBOX"
  > => {
    switch (status) {
      case "active":
      case "trialing":
        return "ACTIVE";

      case "canceled":
        return "CANCELLED";

      case "incomplete_expired":
        return "EXPIRED";

      case "past_due":
      case "unpaid":
      case "incomplete":
      case "paused":
      default:
        return "PAST_DUE";
    }
  };
export type BillingInterval =
  | "FREE"
  | "MONTHLY"
  | "ANNUAL"
  | "CUSTOM";

export type BillingSource =
  | "SYSTEM"
  | "STRIPE"
  | "MANUAL";

export type StoredBillingEntitlement = {
  id: string;
  organizationId: string;
  product: BillingProduct;
  plan: BillingPlan;
  status: BillingStatus;
  interval: BillingInterval;
  currency: "GBP";
  amountMinor: number;
  source: BillingSource;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCheckoutSessionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelledAt?: string;
  metadata?: Record<
    string,
    string
  >;
  createdAt: string;
  updatedAt: string;
};

export type ControlPactBillingEntitlements = {
  platformPlan:
    | "SANDBOX"
    | "PRODUCTION"
    | "BUSINESS"
    | "ENTERPRISE";
  platformStatus: BillingStatus;
  sandboxAccess: true;
  productionPlatformAccess: boolean;
  subscribedAccountSdkAccess: boolean;
  standaloneProductionSdkAccess: boolean;
  standaloneSdkApplicationLimit: number;
};

export type ControlPactPlatformPlan =
  | "SANDBOX"
  | "PRODUCTION"
  | "BUSINESS"
  | "ENTERPRISE";

export type ControlPactPlanLimits = {
  humanUsers: number;
  testEnvironments: number;
  productionEnvironments: number;
  agents: number;
  assignments: number;
  apiKeys: number;
  monthlyDecisions: number;
  approvers: number;
  auditRetentionDays: number;
};

export const CONTROLPACT_PLAN_LIMITS:
  Record<
    ControlPactPlatformPlan,
    ControlPactPlanLimits
  > = {
    SANDBOX: {
      humanUsers: 2,
      testEnvironments: 1,
      productionEnvironments: 0,
      agents: 3,
      assignments: 5,
      apiKeys: 2,
      monthlyDecisions: 1000,
      approvers: 1,
      auditRetentionDays: 30,
    },
    PRODUCTION: {
      humanUsers: 10,
      testEnvironments: 5,
      productionEnvironments: 2,
      agents: 20,
      assignments: 50,
      apiKeys: 10,
      monthlyDecisions: 25000,
      approvers: 5,
      auditRetentionDays: 365,
    },
    BUSINESS: {
      humanUsers: 30,
      testEnvironments: 20,
      productionEnvironments: 10,
      agents: 100,
      assignments: 250,
      apiKeys: 50,
      monthlyDecisions: 150000,
      approvers: 20,
      auditRetentionDays: 1095,
    },
    ENTERPRISE: {
      humanUsers: 100,
      testEnvironments: 50,
      productionEnvironments: 30,
      agents: 500,
      assignments: 1000,
      apiKeys: 200,
      monthlyDecisions: 1000000,
      approvers: 75,
      auditRetentionDays: 2555,
    },
  };

export type BillingPlanCatalogItem = {
  id:
    | "sandbox"
    | "production-monthly"
    | "production-annual"
    | "business-monthly"
    | "business-annual"
    | "sdk-annual"
    | "enterprise";
  product: BillingProduct;
  plan: BillingPlan;
  label: string;
  interval: BillingInterval;
  currency: "GBP";
  amountMinor:
    | number
    | null;
  productionPlatformAccess: boolean;
  subscribedAccountSdkAccess: boolean;
  standaloneSdkApplicationLimit: number;
};

export const CONTROLPACT_BILLING_CATALOG:
  BillingPlanCatalogItem[] = [
    {
      id: "sandbox",
      product: "PLATFORM",
      plan: "SANDBOX",
      label: "Sandbox",
      interval: "FREE",
      currency: "GBP",
      amountMinor: 0,
      productionPlatformAccess: false,
      subscribedAccountSdkAccess: false,
      standaloneSdkApplicationLimit: 0,
    },
    {
      id: "production-monthly",
      product: "PLATFORM",
      plan: "PRODUCTION",
      label: "Production Platform",
      interval: "MONTHLY",
      currency: "GBP",
      amountMinor: 14900,
      productionPlatformAccess: true,
      subscribedAccountSdkAccess: true,
      standaloneSdkApplicationLimit: 0,
    },
    {
      id: "production-annual",
      product: "PLATFORM",
      plan: "PRODUCTION",
      label: "Production Platform",
      interval: "ANNUAL",
      currency: "GBP",
      amountMinor: 149000,
      productionPlatformAccess: true,
      subscribedAccountSdkAccess: true,
      standaloneSdkApplicationLimit: 0,
    },
    {
      id: "business-monthly",
      product: "PLATFORM",
      plan: "BUSINESS",
      label: "Business Platform",
      interval: "MONTHLY",
      currency: "GBP",
      amountMinor: 39900,
      productionPlatformAccess: true,
      subscribedAccountSdkAccess: true,
      standaloneSdkApplicationLimit: 0,
    },
    {
      id: "business-annual",
      product: "PLATFORM",
      plan: "BUSINESS",
      label: "Business Platform",
      interval: "ANNUAL",
      currency: "GBP",
      amountMinor: 399000,
      productionPlatformAccess: true,
      subscribedAccountSdkAccess: true,
      standaloneSdkApplicationLimit: 0,
    },
    {
      id: "sdk-annual",
      product: "SDK",
      plan: "SDK",
      label: "Production SDK",
      interval: "ANNUAL",
      currency: "GBP",
      amountMinor: 149500,
      productionPlatformAccess: false,
      subscribedAccountSdkAccess: false,
      standaloneSdkApplicationLimit: 1,
    },
    {
      id: "enterprise",
      product: "PLATFORM",
      plan: "ENTERPRISE",
      label: "Enterprise / OEM / White-label",
      interval: "CUSTOM",
      currency: "GBP",
      amountMinor: null,
      productionPlatformAccess: true,
      subscribedAccountSdkAccess: true,
      standaloneSdkApplicationLimit: 0,
    },
  ];

const cloneRecord = (
  record: StoredBillingEntitlement,
): StoredBillingEntitlement => ({
  ...record,
  metadata:
    record.metadata
      ? {
          ...record.metadata,
        }
      : undefined,
});

const isActiveBillingStatus = (
  status: BillingStatus,
) =>
  status === "ACTIVE";

export const buildControlPactEntitlements = (
  records: StoredBillingEntitlement[],
): ControlPactBillingEntitlements => {
  const platform =
    records.find(
      (record) =>
        record.product ===
          "PLATFORM",
    );

  const standaloneSdk =
    records.find(
      (record) =>
        record.product ===
          "SDK" &&
        record.plan ===
          "SDK" &&
        isActiveBillingStatus(
          record.status,
        ),
    );

  const platformPlan =
    platform?.plan ===
      "PRODUCTION" ||
    platform?.plan ===
      "BUSINESS" ||
    platform?.plan ===
      "ENTERPRISE"
      ? platform.plan
      : "SANDBOX";

  const platformStatus =
    platform?.status ||
    "SANDBOX";

  const paidPlatformActive =
    Boolean(
      platform &&
      isActiveBillingStatus(
        platform.status,
      ) &&
      (
        platform.plan ===
          "PRODUCTION" ||
        platform.plan ===
          "BUSINESS" ||
        platform.plan ===
          "ENTERPRISE"
      ),
    );

  return {
    platformPlan,
    platformStatus,
    sandboxAccess: true,
    productionPlatformAccess:
      paidPlatformActive,
    subscribedAccountSdkAccess:
      paidPlatformActive,
    standaloneProductionSdkAccess:
      Boolean(standaloneSdk),
    standaloneSdkApplicationLimit:
      standaloneSdk
        ? 1
        : 0,
  };
};

export interface ControlPactBillingStorage {
  ready(): Promise<void>;

  listByOrganization(
    organizationId: string,
  ): Promise<
    StoredBillingEntitlement[]
  >;

  getByProduct(
    organizationId: string,
    product: BillingProduct,
  ): Promise<
    StoredBillingEntitlement |
    undefined
  >;

  ensureSandboxPlatform(
    organizationId: string,
  ): Promise<
    StoredBillingEntitlement
  >;

  save(
    entitlement:
      StoredBillingEntitlement,
  ): Promise<void>;

  close(): Promise<void>;
}

export class MemoryControlPactBillingStorage
implements ControlPactBillingStorage {
  private readonly records =
    new Map<
      string,
      StoredBillingEntitlement
    >();

  async ready(): Promise<void> {
    return;
  }

  async listByOrganization(
    organizationId: string,
  ): Promise<
    StoredBillingEntitlement[]
  > {
    return Array.from(
      this.records.values(),
    )
      .filter(
        (record) =>
          record.organizationId ===
            organizationId,
      )
      .map(cloneRecord);
  }

  async getByProduct(
    organizationId: string,
    product: BillingProduct,
  ): Promise<
    StoredBillingEntitlement |
    undefined
  > {
    const record =
      Array.from(
        this.records.values(),
      ).find(
        (item) =>
          item.organizationId ===
            organizationId &&
          item.product === product,
      );

    return record
      ? cloneRecord(record)
      : undefined;
  }

  async ensureSandboxPlatform(
    organizationId: string,
  ): Promise<
    StoredBillingEntitlement
  > {
    const existing =
      await this.getByProduct(
        organizationId,
        "PLATFORM",
      );

    if (existing) {
      return existing;
    }

    const now =
      new Date()
        .toISOString();

    const record:
      StoredBillingEntitlement = {
        id:
          `billing_platform_${organizationId}`,
        organizationId,
        product: "PLATFORM",
        plan: "SANDBOX",
        status: "SANDBOX",
        interval: "FREE",
        currency: "GBP",
        amountMinor: 0,
        source: "SYSTEM",
        createdAt: now,
        updatedAt: now,
      };

    await this.save(record);

    return cloneRecord(record);
  }

  async save(
    entitlement:
      StoredBillingEntitlement,
  ): Promise<void> {
    this.records.set(
      entitlement.id,
      cloneRecord(
        entitlement,
      ),
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

export class MongoControlPactBillingStorage
implements ControlPactBillingStorage {
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
    await this.client
      .connect();

    const database =
      this.client.db(
        this.databaseName,
      );

    this.collection =
      database.collection(
        "billing_entitlements",
      );

    await Promise.all([
      this.collection
        .createIndex(
          {
            id: 1,
          },
          {
            unique: true,
          },
        ),
      this.collection
        .createIndex(
          {
            organizationId: 1,
            product: 1,
          },
          {
            unique: true,
          },
        ),
      this.collection
        .createIndex(
          {
            stripeCustomerId: 1,
          },
          {
            sparse: true,
          },
        ),
      this.collection
        .createIndex(
          {
            stripeSubscriptionId: 1,
          },
          {
            sparse: true,
          },
        ),
    ]);
  }

  async ready():
    Promise<void> {
    if (
      !this.readyPromise
    ) {
      this.readyPromise =
        this.connect();
    }

    await this.readyPromise;
  }

  private async records():
    Promise<
      Collection<Document>
    > {
    await this.ready();

    if (!this.collection) {
      throw new Error(
        "ControlPact billing storage is not ready.",
      );
    }

    return this.collection;
  }

  async listByOrganization(
    organizationId: string,
  ): Promise<
    StoredBillingEntitlement[]
  > {
    const collection =
      await this.records();

    const documents =
      await collection
        .find(
          {
            organizationId,
          },
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
      StoredBillingEntitlement[];
  }

  async getByProduct(
    organizationId: string,
    product: BillingProduct,
  ): Promise<
    StoredBillingEntitlement |
    undefined
  > {
    const collection =
      await this.records();

    const document =
      await collection.findOne(
        {
          organizationId,
          product,
        },
        {
          projection: {
            _id: 0,
          },
        },
      );

    return document
      ? document as unknown as
          StoredBillingEntitlement
      : undefined;
  }

  async ensureSandboxPlatform(
    organizationId: string,
  ): Promise<
    StoredBillingEntitlement
  > {
    const existing =
      await this.getByProduct(
        organizationId,
        "PLATFORM",
      );

    if (existing) {
      return existing;
    }

    const now =
      new Date()
        .toISOString();

    const record:
      StoredBillingEntitlement = {
        id:
          `billing_platform_${organizationId}`,
        organizationId,
        product: "PLATFORM",
        plan: "SANDBOX",
        status: "SANDBOX",
        interval: "FREE",
        currency: "GBP",
        amountMinor: 0,
        source: "SYSTEM",
        createdAt: now,
        updatedAt: now,
      };

    const collection =
      await this.records();

    await collection.updateOne(
      {
        organizationId,
        product: "PLATFORM",
      },
      {
        $setOnInsert:
          cleanDocument({
            ...record,
          }),
      },
      {
        upsert: true,
      },
    );

    return (
      await this.getByProduct(
        organizationId,
        "PLATFORM",
      )
    ) || record;
  }

  async save(
    entitlement:
      StoredBillingEntitlement,
  ): Promise<void> {
    const collection =
      await this.records();

    await collection.replaceOne(
      {
        organizationId:
          entitlement
            .organizationId,
        product:
          entitlement.product,
      },
      cleanDocument({
        ...entitlement,
      }),
      {
        upsert: true,
      },
    );
  }

  async close():
    Promise<void> {
    await this.client.close();
  }
}

export const createControlPactBillingStorage =
  (): ControlPactBillingStorage => {
    const mode =
      String(
        process.env
          .CONTROLPACT_STORAGE ||
          "memory",
      )
        .trim()
        .toLowerCase();

    if (mode !== "mongodb") {
      return new MemoryControlPactBillingStorage();
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

    return new MongoControlPactBillingStorage(
      uri,
      databaseName,
    );
  };
