import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
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
import { createContact, getContact, listContacts } from "../db/contacts.ts";
import {
  createReferenceItem,
  getActivation,
  getReferenceItem,
  listActivations,
  listReferenceItems,
  updateReferenceItem,
} from "../db/admin.ts";
import {
  createAdminOrganization,
  createAdminProduct,
  deleteAdminOrganization,
  deleteAdminProduct,
  listAdminOrganizations,
  listAdminProducts,
  updateAdminOrganization,
  updateAdminProduct,
} from "../db/admin-data.ts";
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
  assert.deepEqual(catalog.organizations.map((organization) => organization.publicId), ["101"]);
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

test("catalog without organization returns all partner prices and organization catalogs remain scoped", async () => {
  const db = new TestD1();
  const fullCatalog = await getCatalog(db, partner);
  assert.equal(fullCatalog.products.length, 7);
  assert.ok(fullCatalog.products.every((product) => product.priceCents === product.partnerPriceCents));

  const goldCatalog = await getCatalog(db, partner, "101");
  assert.equal(goldCatalog.products.length, 7);
  assert.ok(goldCatalog.products.some((product) => product.priceCents !== product.partnerPriceCents));

  const betaUser = { userId: "platform-beta", email: "beta@example.com", isAdmin: false };
  await getCatalog(db, betaUser);
  await db.prepare("INSERT INTO user_organizations (user_id, organization_id) VALUES (?, ?)").bind(betaUser.userId, "102").run();
  const betaCatalog = await getCatalog(db, betaUser, "102");
  assert.equal(betaCatalog.products.length, 5);
  assert.ok(!betaCatalog.products.some((product) => ["AQSI-13", "RR-04F"].includes(product.code)));
  db.database.close();
});

test("contacts persist in D1 and cannot be read by another partner", async () => {
  const db = new TestD1();
  assert.equal((await listContacts(db, partner)).length, 2);
  const countBefore = db.database.prepare("SELECT count(*) AS count FROM contacts WHERE user_id = 'test-partner-user'").get().count;
  const created = await createContact(db, partner, {
    department: "Продажи",
    position: "Менеджер",
    fullName: "Тестовый Контакт",
    phone: "+7 900 300-30-30",
    email: "contact@example.com",
  });
  assert.equal((await getContact(db, partner, created.id)).email, "contact@example.com");
  assert.equal((await listContacts(db, partner)).length, 3);
  const countAfter = db.database.prepare("SELECT count(*) AS count FROM contacts WHERE user_id = 'test-partner-user'").get().count;
  assert.equal(countAfter - countBefore, 1, "one contact request must create one D1 row");
  assert.equal((await listContacts(db, partner)).filter((contact) => contact.id === created.id).length, 1, "refresh must return the contact once");

  const stranger = { userId: "platform-stranger", email: "stranger@example.com", isAdmin: false };
  assert.deepEqual(await listContacts(db, stranger), []);
  await assert.rejects(() => getContact(db, stranger, created.id), (error) => error instanceof DomainError && error.status === 404);
  db.database.close();
});

test("vendor blocks create separate idempotent orders and mixed vendor payloads are rejected", async () => {
  const db = new TestD1();
  const catalog = await getCatalog(db, partner, "101");
  const pg = catalog.products.find((product) => product.vendor === "Пи Джи Групп");
  const rr = catalog.products.find((product) => product.vendor === "РР-Электро");
  assert.ok(pg && rr);

  await assert.rejects(() => createOrder(db, partner, {
    organizationId: "101",
    idempotencyKey: "mixed-vendors",
    items: [{ productId: pg.id, quantity: 1 }, { productId: rr.id, quantity: 1 }],
  }), (error) => error instanceof DomainError && error.code === "MIXED_VENDOR_ORDER");

  const cartId = "cart-checkout-101-two-vendors";
  const pgInput = { organizationId: "101", cartId, idempotencyKey: "checkout-101-pg", items: [{ productId: pg.id, quantity: 1 }] };
  const rrInput = { organizationId: "101", cartId, idempotencyKey: "checkout-101-rr", items: [{ productId: rr.id, quantity: 1 }] };
  const pgOrder = await createOrder(db, partner, pgInput);
  const rrOrder = await createOrder(db, partner, rrInput);
  assert.equal(pgOrder.vendor, "Пи Джи Групп");
  assert.equal(rrOrder.vendor, "РР-Электро");
  assert.equal(pgOrder.cartId, cartId);
  assert.equal(rrOrder.cartId, cartId);
  assert.match(pgOrder.cartNumber, /^\d+$/);
  assert.equal(rrOrder.cartNumber, pgOrder.cartNumber);
  assert.notEqual(pgOrder.id, rrOrder.id);
  assert.equal((await createOrder(db, partner, pgInput)).id, pgOrder.id);
  assert.equal((await createOrder(db, partner, rrInput)).id, rrOrder.id);
  const orders = await listOrders(db, partner);
  assert.equal(orders.length, 2);
  const persistedOrderIds = db.database.prepare("SELECT id FROM orders WHERE user_id = ? ORDER BY id").all("test-partner-user").map((row) => row.id);
  assert.deepEqual(orders.map((order) => order.id).sort(), persistedOrderIds);
  assert.equal(new Set(orders.map((order) => order.cartId)).size, 1);
  assert.equal(new Set(orders.map((order) => order.cartNumber)).size, 1);
  const pgDetails = await getOrder(db, partner, pgOrder.id);
  assert.equal(pgDetails.vendor, "Пи Джи Групп");
  assert.equal(pgDetails.cartId, cartId);
  assert.equal(pgDetails.cartNumber, pgOrder.cartNumber);
  assert.equal(pgDetails.items.length, 1);
  assert.equal((await getOrder(db, partner, rrOrder.id)).vendor, "РР-Электро");
  await updateOrderStatus(db, admin, pgOrder.id, "Ожидает сборки");
  assert.equal((await getOrder(db, partner, pgOrder.id)).status, "Ожидает сборки");
  assert.equal((await getOrder(db, partner, rrOrder.id)).status, "Принят");
  db.database.close();
});

test("admin organization and product CRUD uses live catalog tables and archives linked history", async () => {
  const db = new TestD1();
  assert.equal((await listAdminOrganizations(db, admin)).length, 2);
  assert.equal((await listAdminProducts(db, admin)).length, 7);
  await assert.rejects(() => listAdminOrganizations(db, partner), (error) => error instanceof DomainError && error.status === 403);
  await assert.rejects(() => listAdminProducts(db, partner), (error) => error instanceof DomainError && error.status === 403);

  const catalog = await getCatalog(db, partner, "101");
  const product = catalog.products.find((item) => item.code === "AQSI-5F");
  assert.ok(product);
  const order = await createOrder(db, partner, {
    organizationId: "101",
    cartId: "cart-admin-live-data",
    idempotencyKey: "admin-live-data-order",
    items: [{ productId: product.id, quantity: 1 }],
  });

  const renamedOrganization = await updateAdminOrganization(db, admin, "101", { name: 'ООО "РОМАШКА"' });
  assert.equal(renamedOrganization.name, 'ООО "РОМАШКА"');
  assert.equal((await getCatalog(db, partner)).organizations[0].name, 'ООО "РОМАШКА"');

  const renamedProduct = await updateAdminProduct(db, admin, product.id, { name: "ПАК aQsi 5Ф обновлённый" });
  assert.equal(renamedProduct.name, "ПАК aQsi 5Ф обновлённый");
  assert.equal((await getCatalog(db, partner, "101")).products.find((item) => item.id === product.id).name, "ПАК aQsi 5Ф обновлённый");
  assert.equal((await getOrder(db, partner, order.id)).items[0].name, product.name, "historical order keeps its product snapshot");

  const productRemoval = await deleteAdminProduct(db, admin, product.id);
  assert.deepEqual({ deleted: productRemoval.deleted, archived: productRemoval.archived }, { deleted: false, archived: true });
  assert.equal((await getOrder(db, partner, order.id)).items.length, 1, "archiving a linked product must retain the order");

  const organizationRemoval = await deleteAdminOrganization(db, admin, "101");
  assert.deepEqual({ deleted: organizationRemoval.deleted, archived: organizationRemoval.archived }, { deleted: false, archived: true });
  assert.equal((await getOrder(db, partner, order.id)).organization.name, 'ООО "РОМАШКА"');

  const temporaryOrganization = await createAdminOrganization(db, admin, { name: "Временная организация", inn: "0000000000" });
  assert.equal(temporaryOrganization.publicId, "103");
  assert.match(temporaryOrganization.id, /^org-/);
  assert.equal((await deleteAdminOrganization(db, admin, temporaryOrganization.id)).deleted, true);
  const temporaryProduct = await createAdminProduct(db, admin, { code: "TEMP", name: "Временный товар", groupName: "ПАК", vendor: "Пи Джи Групп", rrpCents: 100, partnerPriceCents: 90 });
  assert.equal((await deleteAdminProduct(db, admin, temporaryProduct.id)).deleted, true);
  db.database.close();
});

test("administrator can maintain reference items and read seeded activations", async () => {
  const db = new TestD1();
  assert.equal((await listReferenceItems(db, admin, "vendors")).length, 3);
  const created = await createReferenceItem(db, admin, "vendors", { code: "test", name: "Тест", description: "Проверка" });
  const updated = await updateReferenceItem(db, admin, "vendors", created.id, { name: "Тестовая запись", isActive: false });
  assert.equal(updated.isActive, false);
  assert.equal((await getReferenceItem(db, admin, "vendors", created.id)).name, "Тестовая запись");
  await assert.rejects(() => listReferenceItems(db, partner, "vendors"), (error) => error instanceof DomainError && error.status === 403);
  await assert.rejects(() => listReferenceItems(db, admin, "counterparties"), (error) => error instanceof DomainError && error.status === 404);
  await assert.rejects(() => listReferenceItems(db, admin, "products"), (error) => error instanceof DomainError && error.status === 404);

  const activations = await listActivations(db, admin);
  assert.equal(activations.length, 2);
  const activation = await getActivation(db, admin, activations[0].id);
  assert.equal(activation.items.length, 2);
  assert.ok(activation.items.every((item) => item.licenseKeys.length === 1));
  await assert.rejects(() => listActivations(db, partner), (error) => error instanceof DomainError && error.status === 403);
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
  assert.deepEqual(after, { users: 2, organizations: 2, products: 7, memberships: 1 });
  database.close();
});

test("generated migration creates the same schema on clean databases", async () => {
  const migrationDirectory = new URL("../drizzle/", import.meta.url);
  const migrationFiles = (await readdir(migrationDirectory)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort();
  const migrations = await Promise.all(migrationFiles.map((file) => readFile(new URL(file, migrationDirectory), "utf8")));
  const statements = migrations.flatMap((migration) => migration.split("--> statement-breakpoint").map((sql) => sql.trim()).filter(Boolean));
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

test("latest migration backfills short organization IDs and shared cart numbers", async () => {
  const migrationDirectory = new URL("../drizzle/", import.meta.url);
  const migrationFiles = (await readdir(migrationDirectory)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort();
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const file of migrationFiles.slice(0, -1)) {
    const migration = await readFile(new URL(file, migrationDirectory), "utf8");
    migration.split("--> statement-breakpoint").map((sql) => sql.trim()).filter(Boolean).forEach((sql) => database.exec(sql));
  }
  database.prepare("INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)").run("user", "user@example.com", "now", "now");
  database.prepare("INSERT INTO organizations (id, name, inn) VALUES (?, ?, ?)").run("101", "One", "1");
  database.prepare("INSERT INTO organizations (id, name, inn) VALUES (?, ?, ?)").run("102", "Two", "2");
  database.prepare("INSERT INTO organizations (id, name, inn) VALUES (?, ?, ?)").run("org-technical", "Three", "3");
  const insertOrder = database.prepare(`INSERT INTO orders (
    id, number, organization_id, user_id, cart_id, vendor, status, delivery_terms,
    contact_name, contact_phone, contact_email, total_cents, idempotency_key, created_at, updated_at
  ) VALUES (?, ?, '101', 'user', 'shared-cart', ?, 'Принят', 'Предоплата', 'Иван', '+7', 'user@example.com', 100, ?, 'now', 'now')`);
  insertOrder.run("order-1", "1", "Vendor 1", "key-1");
  insertOrder.run("order-2", "2", "Vendor 2", "key-2");
  const latestMigration = await readFile(new URL(migrationFiles.at(-1), migrationDirectory), "utf8");
  latestMigration.split("--> statement-breakpoint").map((sql) => sql.trim()).filter(Boolean).forEach((sql) => database.exec(sql));
  assert.deepEqual(database.prepare("SELECT id, public_id FROM organizations ORDER BY public_id").all().map((row) => ({ ...row })), [
    { id: "101", public_id: "101" },
    { id: "102", public_id: "102" },
    { id: "org-technical", public_id: "103" },
  ]);
  assert.deepEqual(database.prepare("SELECT DISTINCT cart_number FROM orders").all().map((row) => ({ ...row })), [{ cart_number: "653" }]);
  database.close();
});

test("runtime initialization upgrades a legacy organizations table additively", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec("CREATE TABLE organizations (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL)");
  database.prepare("INSERT INTO organizations (id, name) VALUES (?, ?)").run("legacy", "Legacy organization");
  await initializeDatabase(new TestD1(database));
  const columns = database.prepare('PRAGMA table_info("organizations")').all().map((column) => column.name);
  assert.ok(["public_id", "inn", "city", "phone", "email", "is_active"].every((column) => columns.includes(column)));
  assert.equal(database.prepare("SELECT public_id FROM organizations WHERE id = 'legacy'").get().public_id, "103");
  assert.equal(database.prepare("SELECT name FROM organizations WHERE id = 'legacy'").get().name, "Legacy organization");
  database.close();
});
