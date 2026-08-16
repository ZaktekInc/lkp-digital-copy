import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  name: text("name").notNull(),
  inn: text("inn").notNull(),
  city: text("city").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const userOrganizations = sqliteTable(
  "user_organizations",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.organizationId] }),
    index("idx_user_organizations_organization_id").on(table.organizationId),
  ],
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    groupName: text("group_name").notNull(),
    vendor: text("vendor").notNull(),
    rrpCents: integer("rrp_cents").notNull(),
    partnerPriceCents: integer("partner_price_cents").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [uniqueIndex("idx_products_code_unique").on(table.code)],
);

export const organizationProducts = sqliteTable(
  "organization_products",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
    isAvailable: integer("is_available", { mode: "boolean" })
      .notNull()
      .default(true),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.productId] }),
    index("idx_organization_products_product_id").on(table.productId),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    cartId: text("cart_id").notNull().default(""),
    cartNumber: text("cart_number").notNull().default(""),
    vendor: text("vendor").notNull().default(""),
    status: text("status").notNull(),
    paymentStatus: text("payment_status").notNull().default("В ожидании"),
    invoiceNumber: text("invoice_number"),
    deliveryTerms: text("delivery_terms").notNull(),
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    contactEmail: text("contact_email").notNull(),
    comment: text("comment").notNull().default(""),
    totalCents: integer("total_cents").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_orders_number_unique").on(table.number),
    uniqueIndex("idx_orders_user_idempotency_unique").on(
      table.userId,
      table.idempotencyKey,
    ),
    index("idx_orders_organization_created_at").on(
      table.organizationId,
      table.createdAt,
    ),
    index("idx_orders_status").on(table.status),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    productCode: text("product_code").notNull(),
    productName: text("product_name").notNull(),
    vendor: text("vendor").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (table) => [index("idx_order_items_order_id").on(table.orderId)],
);

export const orderStatusHistory = sqliteTable(
  "order_status_history",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    changedByUserId: text("changed_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_order_status_history_order_created_at").on(
      table.orderId,
      table.createdAt,
    ),
  ],
);

export const contacts = sqliteTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    department: text("department").notNull(),
    position: text("position").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("idx_contacts_user_active").on(table.userId, table.isActive)],
);

export const referenceItems = sqliteTable(
  "reference_items",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_reference_items_kind_code_unique").on(table.kind, table.code),
    index("idx_reference_items_kind_active").on(table.kind, table.isActive),
  ],
);

export const activations = sqliteTable(
  "activations",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    orderNumber: text("order_number").notNull().default(""),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    status: text("status").notNull(),
    vendor: text("vendor").notNull(),
    totalCents: integer("total_cents").notNull(),
    paymentStatus: text("payment_status").notNull(),
    orderedAt: text("ordered_at").notNull(),
    comment: text("comment").notNull().default(""),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [
    uniqueIndex("idx_activations_number_unique").on(table.number),
    index("idx_activations_organization_ordered_at").on(table.organizationId, table.orderedAt),
  ],
);

export const activationItems = sqliteTable(
  "activation_items",
  {
    id: text("id").primaryKey(),
    activationId: text("activation_id")
      .notNull()
      .references(() => activations.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    licenseType: text("license_type").notNull(),
    subscriptionEnd: text("subscription_end").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
  },
  (table) => [index("idx_activation_items_activation_id").on(table.activationId)],
);

export const licenseKeys = sqliteTable(
  "license_keys",
  {
    id: text("id").primaryKey(),
    activationItemId: text("activation_item_id")
      .notNull()
      .references(() => activationItems.id, { onDelete: "cascade" }),
    serialNumber: text("serial_number").notNull(),
    licenseKey: text("license_key").notNull().default(""),
    status: text("status").notNull().default("Активна"),
  },
  (table) => [index("idx_license_keys_activation_item_id").on(table.activationItemId)],
);
