import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  DomainError,
  createOrder,
  getCatalog,
  getOrder,
  initializeDatabase,
  listOrders,
  updateOrderStatus,
} from "../db/service.ts";
import {
  AuthorizationError,
  getRequestActor,
  requireAdminActor,
  requireRequestActor,
} from "../lib/auth.ts";

class TestStatement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new TestStatement(this.database, this.sql, values);
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.values) ?? null;
  }

  async all() {
    return { success: true, results: this.database.prepare(this.sql).all(...this.values) };
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class TestD1 {
  constructor(database = new DatabaseSync(":memory:")) {
    this.database = database;
  }

  prepare(sql) {
    return new TestStatement(this.database, sql);
  }

  async batch(statements) {
    this.database.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

const partner = { userId: "platform-partner", email: "partner@example.com", isAdmin: false };
const admin = { userId: "platform-admin", email: "seregaswimer@gmail.com", isAdmin: true };

test("platform headers are required and admin access is email allowlisted", () => {
  const anonymous = new Request("https://example.test/api/orders");
  assert.equal(getRequestActor(anonymous), null);
  assert.throws(() => requireRequestActor(anonymous), (error) => error instanceof AuthorizationError && error.status === 401);

  const ordinaryRequest = new Request("https://example.test/api/orders", { headers: {
    "oai-authenticated-user-id": "user-1",
    "oai-authenticated-user-email": "partner@example.com",
    "x-role": "admin",
  } });
  assert.equal(requireRequestActor(ordinaryRequest).isAdmin, false);
  assert.throws(() => requireAdminActor(ordinaryRequest), (error) => error instanceof AuthorizationError && error.status === 403);

  const partialIdentity = new Request("http://localhost/api/orders", { headers: {
    "oai-authenticated-user-email": "seregaswimer@gmail.com",
  } });
  assert.equal(getRequestActor(partialIdentity), null, "a partial Sites identity must never become the local administrator");

  const adminRequest = new Request("https://example.test/admin", { headers: {
    "oai-authenticated-user-id": "admin-1",
    "oai-authenticated-user-email": "SeregaSwimer@gmail.com",
  } });
  assert.equal(requireAdminActor(adminRequest).isAdmin, true);
});

test("organization → catalog → idempotent order → admin status → partner view", async () => {
  const db = new TestD1();
  const catalog = await getCatalog(db, partner, "101");
  assert.deepEqual(catalog.organizations.map((organization) => organization.id), ["101"]);
  assert.ok(catalog.products.length >= 1);

  await assert.rejects(() => getCatalog(db, partner, "102"), (error) => error instanceof DomainError && error.status === 403);

  const product = catalog.products.find((item) => item.code === "AQSI-5F");
  assert.ok(product);
  const input = {
    organizationId: "101",
    idempotencyKey: "checkout-test-organization-101",
    items: [{ productId: product.id, quantity: 2, clientPriceCents: 1 }],
    contactName: "Тестовый партнёр",
    contactPhone: "+7 900 000-00-00",
    contactEmail: "partner@example.com",
    deliveryTerms: "Предоплата 100%",
  };

  const created = await createOrder(db, partner, input);
  assert.equal(created.idempotent, false);
  assert.equal(created.totalCents, product.priceCents * 2, "price must come from D1, not the browser");
  assert.equal(created.status, "Принят");
  assert.equal("userId" in created, false, "internal user IDs must not be exposed by the API");

  await assert.rejects(
    () => createOrder(db, partner, { ...input, idempotencyKey: "invalid-quantity", items: [{ productId: product.id, quantity: "2" }] }),
    (error) => error instanceof DomainError && error.code === "INVALID_ITEM",
  );
  await assert.rejects(
    () => createOrder(db, partner, null),
    (error) => error instanceof DomainError && error.code === "INVALID_ORDER",
  );

  const duplicate = await createOrder(db, partner, input);
  assert.equal(duplicate.id, created.id);
  assert.equal(duplicate.idempotent, true);
  assert.equal((await listOrders(db, partner)).length, 1);

  assert.equal((await listOrders(db, admin, {}, true)).length, 1);
  await assert.rejects(
    () => updateOrderStatus(db, admin, created.id, "Отгружен"),
    (error) => error instanceof DomainError && error.code === "INVALID_STATUS_TRANSITION",
  );
  assert.equal((await getOrder(db, admin, created.id, true)).history.length, 1, "a rejected transition must not add history");

  await updateOrderStatus(db, admin, created.id, "Ожидает сборки");
  await updateOrderStatus(db, admin, created.id, "Готов к отгрузке");
  await updateOrderStatus(db, admin, created.id, "Отгружен");

  const updated = await getOrder(db, partner, created.id);
  assert.equal(updated.status, "Отгружен");
  assert.deepEqual(updated.history.map((entry) => entry.toStatus), [
    "Принят",
    "Ожидает сборки",
    "Готов к отгрузке",
    "Отгружен",
  ]);
  assert.deepEqual(updated.history.slice(1).map((entry) => entry.fromStatus), [
    "Принят",
    "Ожидает сборки",
    "Готов к отгрузке",
  ]);
  assert.ok(updated.history.every((entry) => !("changedByEmail" in entry)), "partner responses must not expose audit email addresses");
  assert.ok(updated.history.every((entry) => !Number.isNaN(Date.parse(entry.changedAt))));
  const adminView = await getOrder(db, admin, created.id, true);
  assert.ok(adminView.history.slice(1).every((entry) => entry.changedByEmail === admin.email));
  db.database.close();
});

test("ordinary users cannot read another user's orders, even in an accessible organization", async () => {
  const db = new TestD1();
  const catalog = await getCatalog(db, partner, "101");
  const product = catalog.products[0];
  const ownerOrder = await createOrder(db, partner, {
    organizationId: "101",
    idempotencyKey: "owner-order-idempotency",
    items: [{ productId: product.id, quantity: 1 }],
  });

  const colleague = { userId: "platform-colleague", email: "colleague@example.com", isAdmin: false };
  await getCatalog(db, colleague);
  await db.prepare("INSERT INTO user_organizations (user_id, organization_id) VALUES (?, ?)")
    .bind(colleague.userId, "101")
    .run();

  assert.deepEqual(await listOrders(db, colleague), []);
  await assert.rejects(
    () => getOrder(db, colleague, ownerOrder.id),
    (error) => error instanceof DomainError && error.status === 404 && error.code === "ORDER_NOT_FOUND",
  );
  assert.equal((await listOrders(db, admin, {}, true)).length, 1);
  db.database.close();
});

test("database seed is idempotent when initialization runs again", async () => {
  const database = new DatabaseSync(":memory:");
  await initializeDatabase(new TestD1(database));
  const before = {
    users: database.prepare("SELECT count(*) AS count FROM users").get().count,
    organizations: database.prepare("SELECT count(*) AS count FROM organizations").get().count,
    products: database.prepare("SELECT count(*) AS count FROM products").get().count,
    memberships: database.prepare("SELECT count(*) AS count FROM user_organizations").get().count,
  };
  await initializeDatabase(new TestD1(database));
  const after = {
    users: database.prepare("SELECT count(*) AS count FROM users").get().count,
    organizations: database.prepare("SELECT count(*) AS count FROM organizations").get().count,
    products: database.prepare("SELECT count(*) AS count FROM products").get().count,
    memberships: database.prepare("SELECT count(*) AS count FROM user_organizations").get().count,
  };
  assert.deepEqual(after, before);
  assert.deepEqual(after, { users: 1, organizations: 2, products: 7, memberships: 1 });
  database.close();
});

test("generated migration creates the same schema on clean databases", async () => {
  const migration = await readFile(new URL("../drizzle/0000_spotty_longshot.sql", import.meta.url), "utf8");
  const statements = migration.split("--> statement-breakpoint").map((sql) => sql.trim()).filter(Boolean);
  const buildSchema = () => {
    const database = new DatabaseSync(":memory:");
    database.exec("PRAGMA foreign_keys = ON");
    statements.forEach((sql) => database.exec(sql));
    const schema = database.prepare("SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").all();
    database.close();
    return schema;
  };
  assert.deepEqual(buildSchema(), buildSchema());
});
