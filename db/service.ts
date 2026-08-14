import type { RequestActor } from "../lib/auth";

export type D1ResultLike<T = Record<string, unknown>> = {
  success?: boolean;
  results?: T[];
  meta?: { changes?: number };
};

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1ResultLike<T>>;
  run<T = Record<string, unknown>>(): Promise<D1ResultLike<T>>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
  batch<T = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<Array<D1ResultLike<T>>>;
}

export class DomainError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "DomainError";
  }
}

export const ORDER_STATUSES = [
  "Принят",
  "Ожидает сборки",
  "Готов к отгрузке",
  "Отгружен",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  "Принят": ["Ожидает сборки", "Готов к отгрузке"],
  "Ожидает сборки": ["Готов к отгрузке"],
  "Готов к отгрузке": ["Отгружен"],
  "Отгружен": [],
};

const schemaStatements = [
  "PRAGMA foreign_keys = ON",
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    inn TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS user_organizations (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, organization_id)
  )`,
  "CREATE INDEX IF NOT EXISTS idx_user_organizations_organization_id ON user_organizations(organization_id)",
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    vendor TEXT NOT NULL,
    rrp_cents INTEGER NOT NULL,
    partner_price_cents INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS organization_products (
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price_cents INTEGER NOT NULL,
    is_available INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (organization_id, product_id)
  )`,
  "CREATE INDEX IF NOT EXISTS idx_organization_products_product_id ON organization_products(product_id)",
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY NOT NULL,
    number TEXT NOT NULL UNIQUE,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'В ожидании',
    invoice_number TEXT,
    delivery_terms TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    comment TEXT NOT NULL DEFAULT '',
    total_cents INTEGER NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, idempotency_key)
  )`,
  "CREATE INDEX IF NOT EXISTS idx_orders_organization_created_at ON orders(organization_id, created_at)",
  "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
  `CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY NOT NULL,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    vendor TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    line_total_cents INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)",
  `CREATE TABLE IF NOT EXISTS order_status_history (
    id TEXT PRIMARY KEY NOT NULL,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by_user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_order_status_history_order_created_at ON order_status_history(order_id, created_at)",
];

const organizationsSeed = [
  ["101", 'ООО "ЗОЛОТОЙ СТАНДАРТ"', "7724827983", "Санкт-Петербург", "+7 800 555-35-36", "example1@mail.ru"],
  ["102", "ООО Бета", "7812345678", "Санкт-Петербург", "+7 812 000-00-02", "info@beta.example"],
] as const;

const productsSeed = [
  ["AQSI-5F", "AQSI-5F", "ПАК aQsi 5Ф", "ПАК", "Пи Джи Групп", 3000000, 2500000],
  ["AQSI-6F", "AQSI-6F", "ПАК aQsi 6Ф", "ПАК", "Пи Джи Групп", 3600000, 3100000],
  ["AQSI-13", "AQSI-13", "ПАК aQsi 13", "ПАК", "Пи Джи Групп", 3900000, 3400000],
  ["AQSI-PS-5F", "AQSI-PS-5F", 'Адаптер питания для "aQsi-5Ф"', "Аксессуары", "Пи Джи Групп", 250000, 210000],
  ["AQSI-BAT-5F", "AQSI-BAT-5F", 'Аккумулятор для "aQsi 5Ф"', "Аксессуары", "Пи Джи Групп", 350000, 300000],
  ["RR-01F", "RR-01F", "ККТ РР-01Ф", "ККТ", "РР-Электро", 2700000, 2350000],
  ["RR-04F", "RR-04F", "ККТ РР-04Ф", "ККТ", "РР-Электро", 3200000, 2850000],
] as const;

const organizationProductsSeed = [
  ["101", "AQSI-5F", 2300000], ["102", "AQSI-5F", 2500000],
  ["101", "AQSI-6F", 2890000], ["102", "AQSI-6F", 3100000],
  ["101", "AQSI-13", 3190000],
  ["101", "AQSI-PS-5F", 190000], ["102", "AQSI-PS-5F", 210000],
  ["101", "AQSI-BAT-5F", 270000], ["102", "AQSI-BAT-5F", 300000],
  ["101", "RR-01F", 2180000], ["102", "RR-01F", 2350000],
  ["101", "RR-04F", 2640000],
] as const;

const initializedDatabases = new WeakMap<object, Promise<void>>();

export async function initializeDatabase(db: D1DatabaseLike): Promise<void> {
  const key = db as object;
  const existing = initializedDatabases.get(key);
  if (existing) return existing;

  const initialization = (async () => {
    await db.batch(schemaStatements.map((sql) => db.prepare(sql)));

    const now = new Date().toISOString();
    const seedStatements: D1PreparedStatementLike[] = [
      db.prepare("INSERT OR IGNORE INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)").bind("test-partner-user", "partner@example.com", now, now),
      ...organizationsSeed.map((row) => db.prepare("INSERT OR IGNORE INTO organizations (id, name, inn, city, phone, email, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)").bind(...row)),
      ...productsSeed.map((row) => db.prepare("INSERT OR IGNORE INTO products (id, code, name, group_name, vendor, rrp_cents, partner_price_cents, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)").bind(...row)),
      ...organizationProductsSeed.map((row) => db.prepare("INSERT OR IGNORE INTO organization_products (organization_id, product_id, price_cents, is_available) VALUES (?, ?, ?, 1)").bind(...row)),
      db.prepare("INSERT OR IGNORE INTO user_organizations (user_id, organization_id) VALUES (?, ?)").bind("test-partner-user", "101"),
    ];
    await db.batch(seedStatements);
  })();

  initializedDatabases.set(key, initialization);
  try {
    await initialization;
  } catch (error) {
    initializedDatabases.delete(key);
    throw error;
  }
}

async function ensureUser(db: D1DatabaseLike, actor: RequestActor): Promise<string> {
  const existingByEmail = await db.prepare("SELECT id FROM users WHERE email = ?").bind(actor.email).first<{ id: string }>();
  if (existingByEmail) return existingByEmail.id;

  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO users (id, email, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET email = excluded.email, updated_at = excluded.updated_at`)
    .bind(actor.userId, actor.email, now, now)
    .run();
  return actor.userId;
}

async function accessibleOrganizations(db: D1DatabaseLike, actor: RequestActor, userId: string) {
  const statement = actor.isAdmin
    ? db.prepare("SELECT id, name, inn, city, phone, email FROM organizations WHERE is_active = 1 ORDER BY name")
    : db.prepare(`SELECT o.id, o.name, o.inn, o.city, o.phone, o.email
        FROM organizations o
        JOIN user_organizations uo ON uo.organization_id = o.id
        WHERE uo.user_id = ? AND o.is_active = 1
        ORDER BY o.name`).bind(userId);
  return (await statement.all<OrganizationRow>()).results ?? [];
}

async function assertOrganizationAccess(
  db: D1DatabaseLike,
  actor: RequestActor,
  userId: string,
  organizationId: string,
): Promise<OrganizationRow> {
  const statement = actor.isAdmin
    ? db.prepare("SELECT id, name, inn, city, phone, email FROM organizations WHERE id = ? AND is_active = 1").bind(organizationId)
    : db.prepare(`SELECT o.id, o.name, o.inn, o.city, o.phone, o.email
        FROM organizations o
        JOIN user_organizations uo ON uo.organization_id = o.id
        WHERE o.id = ? AND uo.user_id = ? AND o.is_active = 1`).bind(organizationId, userId);
  const organization = await statement.first<OrganizationRow>();
  if (!organization) throw new DomainError(403, "ORGANIZATION_FORBIDDEN", "Организация недоступна этому пользователю");
  return organization;
}

type OrganizationRow = {
  id: string;
  name: string;
  inn: string;
  city: string;
  phone: string;
  email: string;
};

export async function getCatalog(
  db: D1DatabaseLike,
  actor: RequestActor,
  organizationId?: string | null,
) {
  await initializeDatabase(db);
  const userId = await ensureUser(db, actor);
  const organizations = await accessibleOrganizations(db, actor, userId);

  const groups = (await db.prepare(`SELECT DISTINCT p.group_name AS name
      FROM products p
      JOIN organization_products op ON op.product_id = p.id
      WHERE p.is_active = 1 AND op.is_available = 1
      ORDER BY p.group_name`).all<{ name: string }>()).results?.map((row) => row.name) ?? [];

  if (!organizationId) return { organizations, groups, products: [] };
  await assertOrganizationAccess(db, actor, userId, organizationId);

  const products = (await db.prepare(`SELECT p.id, p.code, p.name, p.group_name, p.vendor,
      p.rrp_cents, p.partner_price_cents, op.price_cents
      FROM products p
      JOIN organization_products op ON op.product_id = p.id
      WHERE op.organization_id = ? AND p.is_active = 1 AND op.is_available = 1
      ORDER BY p.group_name, p.name`).bind(organizationId).all<ProductRow>()).results ?? [];

  return {
    organizations,
    groups,
    products: products.map((product) => ({
      id: product.id,
      code: product.code,
      name: product.name,
      group: product.group_name,
      vendor: product.vendor,
      rrpCents: product.rrp_cents,
      partnerPriceCents: product.partner_price_cents,
      priceCents: product.price_cents,
      available: true,
    })),
  };
}

type ProductRow = {
  id: string;
  code: string;
  name: string;
  group_name: string;
  vendor: string;
  rrp_cents: number;
  partner_price_cents: number;
  price_cents: number;
};

export type CreateOrderInput = {
  organizationId?: string;
  idempotencyKey?: string;
  items?: Array<{ productId?: string; quantity?: number }>;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  deliveryTerms?: string;
  comment?: string;
};

function normalizedText(value: unknown, field: string, maxLength: number): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new DomainError(400, "INVALID_FIELD", `${field} должен быть строкой`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new DomainError(400, "INVALID_FIELD", `${field} содержит слишком много символов`);
  }
  return normalized;
}

function checkedLineTotal(priceCents: number, quantity: number): number {
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
    throw new DomainError(500, "INVALID_STORED_PRICE", "В базе данных указана некорректная цена товара");
  }
  const lineTotalCents = priceCents * quantity;
  if (!Number.isSafeInteger(lineTotalCents)) {
    throw new DomainError(400, "ORDER_TOTAL_TOO_LARGE", "Сумма заказа слишком велика");
  }
  return lineTotalCents;
}

export async function createOrder(
  db: D1DatabaseLike,
  actor: RequestActor,
  input: CreateOrderInput,
) {
  await initializeDatabase(db);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_ORDER", "Данные заказа должны быть объектом JSON");
  }
  const userId = await ensureUser(db, actor);
  const organizationId = normalizedText(input.organizationId, "organizationId", 128);
  if (!organizationId) throw new DomainError(400, "ORGANIZATION_REQUIRED", "Необходимо выбрать организацию");
  const organization = await assertOrganizationAccess(db, actor, userId, organizationId);

  const idempotencyKey = normalizedText(input.idempotencyKey, "idempotencyKey", 160);
  if (idempotencyKey.length < 8 || idempotencyKey.length > 160) {
    throw new DomainError(400, "INVALID_IDEMPOTENCY_KEY", "Ключ повторной отправки должен содержать от 8 до 160 символов");
  }

  const existing = await db.prepare("SELECT id FROM orders WHERE user_id = ? AND idempotency_key = ?")
    .bind(userId, idempotencyKey)
    .first<{ id: string }>();
  if (existing) return { ...(await getOrder(db, actor, existing.id)), idempotent: true };

  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 50) {
    throw new DomainError(400, "INVALID_ITEMS", "Заказ должен содержать от 1 до 50 позиций");
  }

  const requested = new Map<string, number>();
  for (const item of input.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new DomainError(400, "INVALID_ITEM", "Каждая позиция заказа должна быть объектом");
    }
    const productId = normalizedText(item.productId, "productId", 128);
    const quantity = item.quantity;
    if (!productId || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
      throw new DomainError(400, "INVALID_ITEM", "Для каждой позиции нужны productId и целое количество от 1 до 500");
    }
    requested.set(productId, (requested.get(productId) ?? 0) + quantity);
  }

  const pricedItems: Array<ProductRow & { quantity: number; lineTotalCents: number }> = [];
  for (const [productId, quantity] of requested) {
    if (quantity > 500) throw new DomainError(400, "INVALID_ITEM", "Общее количество одного товара не может превышать 500");
    const product = await db.prepare(`SELECT p.id, p.code, p.name, p.group_name, p.vendor,
        p.rrp_cents, p.partner_price_cents, op.price_cents
        FROM products p
        JOIN organization_products op ON op.product_id = p.id
        WHERE p.id = ? AND op.organization_id = ? AND p.is_active = 1 AND op.is_available = 1`)
      .bind(productId, organizationId)
      .first<ProductRow>();
    if (!product) throw new DomainError(400, "PRODUCT_UNAVAILABLE", `Товар ${productId} недоступен для выбранной организации`);
    pricedItems.push({ ...product, quantity, lineTotalCents: checkedLineTotal(product.price_cents, quantity) });
  }

  let totalCents = 0;
  for (const item of pricedItems) {
    totalCents += item.lineTotalCents;
    if (!Number.isSafeInteger(totalCents)) {
      throw new DomainError(400, "ORDER_TOTAL_TOO_LARGE", "Сумма заказа слишком велика");
    }
  }
  const orderId = crypto.randomUUID();
  const number = `LKP-${orderId.slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  const status: OrderStatus = "Принят";
  const contactName = normalizedText(input.contactName, "contactName", 200) || "Иванов Иван Иванович";
  const contactPhone = normalizedText(input.contactPhone, "contactPhone", 64) || "+7 987 654 32 10";
  const contactEmail = normalizedText(input.contactEmail, "contactEmail", 320) || actor.email;
  const deliveryTerms = normalizedText(input.deliveryTerms, "deliveryTerms", 500) || "Предоплата 100%";
  const comment = normalizedText(input.comment, "comment", 4000);

  const statements: D1PreparedStatementLike[] = [
    db.prepare(`INSERT INTO orders (
      id, number, organization_id, user_id, status, payment_status, invoice_number,
      delivery_terms, contact_name, contact_phone, contact_email, comment,
      total_cents, idempotency_key, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'В ожидании', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(orderId, number, organizationId, userId, status, deliveryTerms, contactName, contactPhone, contactEmail, comment, totalCents, idempotencyKey, now, now),
    ...pricedItems.map((item) => db.prepare(`INSERT INTO order_items (
      id, order_id, product_id, product_code, product_name, vendor,
      unit_price_cents, quantity, line_total_cents
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), orderId, item.id, item.code, item.name, item.vendor, item.price_cents, item.quantity, item.lineTotalCents)),
    db.prepare(`INSERT INTO order_status_history (
      id, order_id, from_status, to_status, changed_by_user_id, created_at
    ) VALUES (?, ?, NULL, ?, ?, ?)`)
      .bind(crypto.randomUUID(), orderId, status, userId, now),
  ];

  try {
    await db.batch(statements);
  } catch (error) {
    const duplicate = await db.prepare("SELECT id FROM orders WHERE user_id = ? AND idempotency_key = ?")
      .bind(userId, idempotencyKey)
      .first<{ id: string }>();
    if (duplicate) return { ...(await getOrder(db, actor, duplicate.id)), idempotent: true };
    throw error;
  }

  return { ...(await getOrder(db, actor, orderId)), idempotent: false, organization };
}

type OrderRow = {
  id: string;
  number: string;
  organization_id: string;
  organization_name: string;
  user_id: string;
  status: OrderStatus;
  payment_status: string;
  invoice_number: string | null;
  delivery_terms: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  comment: string;
  total_cents: number;
  created_at: string;
  updated_at: string;
};

function mapOrder(row: OrderRow) {
  return {
    id: row.id,
    number: row.number,
    organization: { id: row.organization_id, name: row.organization_name },
    status: row.status,
    paymentStatus: row.payment_status,
    invoiceNumber: row.invoice_number,
    deliveryTerms: row.delivery_terms,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    comment: row.comment,
    totalCents: row.total_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listOrders(
  db: D1DatabaseLike,
  actor: RequestActor,
  filters: { organizationId?: string | null; status?: string | null } = {},
  admin = false,
) {
  await initializeDatabase(db);
  if (admin && !actor.isAdmin) throw new DomainError(403, "ADMIN_REQUIRED", "Требуются права администратора");
  const userId = await ensureUser(db, actor);
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (!admin && !actor.isAdmin) {
    conditions.push("o.user_id = ?");
    values.push(userId);
  }
  if (filters.organizationId) {
    conditions.push("o.organization_id = ?");
    values.push(filters.organizationId);
  }
  if (filters.status) {
    if (!ORDER_STATUSES.includes(filters.status as OrderStatus)) throw new DomainError(400, "INVALID_STATUS", "Неизвестный статус заказа");
    conditions.push("o.status = ?");
    values.push(filters.status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = (await db.prepare(`SELECT o.*, org.name AS organization_name
      FROM orders o JOIN organizations org ON org.id = o.organization_id
      ${where} ORDER BY o.created_at DESC`).bind(...values).all<OrderRow>()).results ?? [];
  return rows.map(mapOrder);
}

export async function getOrder(
  db: D1DatabaseLike,
  actor: RequestActor,
  orderId: string,
  admin = false,
) {
  await initializeDatabase(db);
  if (admin && !actor.isAdmin) throw new DomainError(403, "ADMIN_REQUIRED", "Требуются права администратора");
  const userId = await ensureUser(db, actor);
  const accessSql = admin || actor.isAdmin
    ? ""
    : "AND o.user_id = ?";
  const statement = db.prepare(`SELECT o.*, org.name AS organization_name
      FROM orders o JOIN organizations org ON org.id = o.organization_id
      WHERE o.id = ? ${accessSql}`);
  const row = admin || actor.isAdmin
    ? await statement.bind(orderId).first<OrderRow>()
    : await statement.bind(orderId, userId).first<OrderRow>();
  if (!row) throw new DomainError(404, "ORDER_NOT_FOUND", "Заказ не найден");

  const items = (await db.prepare(`SELECT id, product_id, product_code, product_name, vendor,
      unit_price_cents, quantity, line_total_cents
      FROM order_items WHERE order_id = ? ORDER BY rowid`).bind(orderId).all<OrderItemRow>()).results ?? [];
  const history = (await db.prepare(`SELECT h.id, h.from_status, h.to_status, h.created_at,
      u.email AS changed_by_email
      FROM order_status_history h JOIN users u ON u.id = h.changed_by_user_id
      WHERE h.order_id = ? ORDER BY h.created_at, h.rowid`).bind(orderId).all<HistoryRow>()).results ?? [];

  return {
    ...mapOrder(row),
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      code: item.product_code,
      name: item.product_name,
      vendor: item.vendor,
      unitPriceCents: item.unit_price_cents,
      quantity: item.quantity,
      lineTotalCents: item.line_total_cents,
    })),
    history: history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.from_status,
      toStatus: entry.to_status,
      changedAt: entry.created_at,
      ...(admin || actor.isAdmin ? { changedByEmail: entry.changed_by_email } : {}),
    })),
  };
}

type OrderItemRow = {
  id: string; product_id: string; product_code: string; product_name: string;
  vendor: string; unit_price_cents: number; quantity: number; line_total_cents: number;
};
type HistoryRow = {
  id: string; from_status: string | null; to_status: string; created_at: string; changed_by_email: string;
};

export async function updateOrderStatus(
  db: D1DatabaseLike,
  actor: RequestActor,
  orderId: string,
  nextStatus: string,
) {
  if (!actor.isAdmin) throw new DomainError(403, "ADMIN_REQUIRED", "Требуются права администратора");
  if (!ORDER_STATUSES.includes(nextStatus as OrderStatus)) throw new DomainError(400, "INVALID_STATUS", "Неизвестный статус заказа");
  const current = await getOrder(db, actor, orderId, true);
  if (!STATUS_TRANSITIONS[current.status].includes(nextStatus as OrderStatus)) {
    throw new DomainError(409, "INVALID_STATUS_TRANSITION", `Нельзя изменить статус «${current.status}» на «${nextStatus}»`);
  }
  const userId = await ensureUser(db, actor);
  const now = new Date().toISOString();
  const results = await db.batch([
    db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?")
      .bind(nextStatus, now, orderId, current.status),
    db.prepare(`INSERT INTO order_status_history (
      id, order_id, from_status, to_status, changed_by_user_id, created_at
    ) SELECT ?, ?, ?, ?, ?, ? WHERE changes() = 1`)
      .bind(crypto.randomUUID(), orderId, current.status, nextStatus, userId, now),
  ]);
  if (results[0]?.meta?.changes !== 1) {
    throw new DomainError(409, "STATUS_CONFLICT", "Статус заказа уже изменился. Обновите данные и повторите действие");
  }
  if (results[1]?.meta?.changes !== 1) {
    throw new DomainError(500, "STATUS_HISTORY_FAILED", "Не удалось сохранить историю изменения статуса");
  }
  return getOrder(db, actor, orderId, true);
}
