import type { RequestActor } from "../lib/auth";
import {
  DomainError,
  initializeDatabase,
  normalizedText,
  type D1DatabaseLike,
} from "./service.ts";

function requireAdmin(actor: RequestActor) {
  if (!actor.isAdmin) throw new DomainError(403, "ADMIN_REQUIRED", "Требуются права администратора");
}

type OrganizationRow = {
  id: string;
  public_id: string;
  name: string;
  inn: string;
  city: string;
  phone: string;
  email: string;
  is_active: number;
};

function mapOrganization(row: OrganizationRow) {
  const { is_active: isActive, public_id: publicId, ...organization } = row;
  return { ...organization, publicId, isActive: isActive === 1 };
}

export type OrganizationInput = {
  name?: string;
  inn?: string;
  city?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
};

export async function listAdminOrganizations(db: D1DatabaseLike, actor: RequestActor) {
  requireAdmin(actor);
  await initializeDatabase(db);
  const rows = (await db.prepare(`SELECT id, public_id, name, inn, city, phone, email, is_active
      FROM organizations ORDER BY is_active DESC, name, id`).all<OrganizationRow>()).results ?? [];
  return rows.map(mapOrganization);
}

export async function getAdminOrganization(db: D1DatabaseLike, actor: RequestActor, id: string) {
  requireAdmin(actor);
  await initializeDatabase(db);
  const row = await db.prepare(`SELECT id, public_id, name, inn, city, phone, email, is_active
      FROM organizations WHERE id = ?`).bind(id).first<OrganizationRow>();
  if (!row) throw new DomainError(404, "ORGANIZATION_NOT_FOUND", "Организация не найдена");
  return mapOrganization(row);
}

function organizationValues(input: OrganizationInput, current?: ReturnType<typeof mapOrganization>) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_ORGANIZATION", "Данные организации должны быть объектом JSON");
  }
  const name = input.name === undefined && current ? current.name : normalizedText(input.name, "name", 240);
  const inn = input.inn === undefined && current ? current.inn : normalizedText(input.inn, "inn", 32);
  const city = input.city === undefined && current ? current.city : normalizedText(input.city, "city", 160);
  const phone = input.phone === undefined && current ? current.phone : normalizedText(input.phone, "phone", 64);
  const email = input.email === undefined && current ? current.email : normalizedText(input.email, "email", 320).toLowerCase();
  const isActive = input.isActive === undefined ? current?.isActive ?? true : input.isActive;
  if (!name || !inn || typeof isActive !== "boolean") {
    throw new DomainError(400, "ORGANIZATION_FIELDS_REQUIRED", "Укажите название, ИНН и корректное состояние");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new DomainError(400, "INVALID_ORGANIZATION_EMAIL", "Укажите корректный email организации");
  }
  return { name, inn, city, phone, email, isActive };
}

export async function createAdminOrganization(db: D1DatabaseLike, actor: RequestActor, input: OrganizationInput) {
  requireAdmin(actor);
  await initializeDatabase(db);
  const values = organizationValues(input);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const maximum = await db.prepare("SELECT MAX(CAST(public_id AS INTEGER)) AS value FROM organizations WHERE public_id <> '' AND public_id NOT GLOB '*[^0-9]*'").first<{ value: number | null }>();
    const publicId = String(Math.max(102, Number(maximum?.value ?? 0)) + 1);
    const id = `org-${crypto.randomUUID()}`;
    try {
      await db.prepare(`INSERT INTO organizations (id, public_id, name, inn, city, phone, email, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, publicId, values.name, values.inn, values.city, values.phone, values.email, values.isActive ? 1 : 0).run();
      return getAdminOrganization(db, actor, id);
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  throw new DomainError(500, "ORGANIZATION_ID_UNAVAILABLE", "Не удалось назначить короткий ID организации");
}

export async function updateAdminOrganization(db: D1DatabaseLike, actor: RequestActor, id: string, input: OrganizationInput) {
  const current = await getAdminOrganization(db, actor, id);
  const values = organizationValues(input, current);
  await db.prepare(`UPDATE organizations SET name = ?, inn = ?, city = ?, phone = ?, email = ?, is_active = ?
      WHERE id = ?`).bind(values.name, values.inn, values.city, values.phone, values.email, values.isActive ? 1 : 0, id).run();
  return getAdminOrganization(db, actor, id);
}

export async function deleteAdminOrganization(db: D1DatabaseLike, actor: RequestActor, id: string) {
  const current = await getAdminOrganization(db, actor, id);
  const counts = await Promise.all([
    db.prepare("SELECT count(*) AS count FROM orders WHERE organization_id = ?").bind(id).first<{ count: number }>(),
    db.prepare("SELECT count(*) AS count FROM activations WHERE organization_id = ?").bind(id).first<{ count: number }>(),
    db.prepare("SELECT count(*) AS count FROM user_organizations WHERE organization_id = ?").bind(id).first<{ count: number }>(),
    db.prepare("SELECT count(*) AS count FROM organization_products WHERE organization_id = ?").bind(id).first<{ count: number }>(),
  ]);
  if (counts.some((row) => Number(row?.count ?? 0) > 0)) {
    await db.prepare("UPDATE organizations SET is_active = 0 WHERE id = ?").bind(id).run();
    return { deleted: false, archived: true, organization: await getAdminOrganization(db, actor, id) };
  }
  await db.prepare("DELETE FROM organizations WHERE id = ?").bind(id).run();
  return { deleted: true, archived: false, organization: current };
}

type ProductRow = {
  id: string;
  code: string;
  name: string;
  group_name: string;
  vendor: string;
  rrp_cents: number;
  partner_price_cents: number;
  is_active: number;
};

function mapProduct(row: ProductRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    groupName: row.group_name,
    vendor: row.vendor,
    rrpCents: row.rrp_cents,
    partnerPriceCents: row.partner_price_cents,
    isActive: row.is_active === 1,
  };
}

export type ProductInput = {
  code?: string;
  name?: string;
  groupName?: string;
  vendor?: string;
  rrpCents?: number;
  partnerPriceCents?: number;
  isActive?: boolean;
};

export async function listAdminProducts(db: D1DatabaseLike, actor: RequestActor) {
  requireAdmin(actor);
  await initializeDatabase(db);
  const rows = (await db.prepare(`SELECT id, code, name, group_name, vendor, rrp_cents, partner_price_cents, is_active
      FROM products ORDER BY is_active DESC, name, code`).all<ProductRow>()).results ?? [];
  return rows.map(mapProduct);
}

export async function getAdminProduct(db: D1DatabaseLike, actor: RequestActor, id: string) {
  requireAdmin(actor);
  await initializeDatabase(db);
  const row = await db.prepare(`SELECT id, code, name, group_name, vendor, rrp_cents, partner_price_cents, is_active
      FROM products WHERE id = ?`).bind(id).first<ProductRow>();
  if (!row) throw new DomainError(404, "PRODUCT_NOT_FOUND", "Товар не найден");
  return mapProduct(row);
}

function cents(value: unknown, field: string, fallback?: number) {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new DomainError(400, "INVALID_PRODUCT_PRICE", `${field} должен быть целым количеством копеек`);
  }
  return value;
}

function productValues(input: ProductInput, current?: ReturnType<typeof mapProduct>) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_PRODUCT", "Данные товара должны быть объектом JSON");
  }
  const code = input.code === undefined && current ? current.code : normalizedText(input.code, "code", 120);
  const name = input.name === undefined && current ? current.name : normalizedText(input.name, "name", 240);
  const groupName = input.groupName === undefined && current ? current.groupName : normalizedText(input.groupName, "groupName", 160);
  const vendor = input.vendor === undefined && current ? current.vendor : normalizedText(input.vendor, "vendor", 160);
  const rrpCents = cents(input.rrpCents, "rrpCents", current?.rrpCents);
  const partnerPriceCents = cents(input.partnerPriceCents, "partnerPriceCents", current?.partnerPriceCents);
  const isActive = input.isActive === undefined ? current?.isActive ?? true : input.isActive;
  if (!code || !name || !groupName || !vendor || typeof isActive !== "boolean") {
    throw new DomainError(400, "PRODUCT_FIELDS_REQUIRED", "Заполните код, название, группу, вендора, цены и состояние");
  }
  return { code, name, groupName, vendor, rrpCents, partnerPriceCents, isActive };
}

export async function createAdminProduct(db: D1DatabaseLike, actor: RequestActor, input: ProductInput) {
  requireAdmin(actor);
  await initializeDatabase(db);
  const values = productValues(input);
  const duplicate = await db.prepare("SELECT id FROM products WHERE code = ?").bind(values.code).first<{ id: string }>();
  if (duplicate) throw new DomainError(409, "PRODUCT_CODE_EXISTS", "Товар с таким кодом уже существует");
  const id = `product-${crypto.randomUUID()}`;
  await db.prepare(`INSERT INTO products (id, code, name, group_name, vendor, rrp_cents, partner_price_cents, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, values.code, values.name, values.groupName, values.vendor, values.rrpCents, values.partnerPriceCents, values.isActive ? 1 : 0).run();
  return getAdminProduct(db, actor, id);
}

export async function updateAdminProduct(db: D1DatabaseLike, actor: RequestActor, id: string, input: ProductInput) {
  const current = await getAdminProduct(db, actor, id);
  const values = productValues(input, current);
  const duplicate = await db.prepare("SELECT id FROM products WHERE code = ? AND id <> ?").bind(values.code, id).first<{ id: string }>();
  if (duplicate) throw new DomainError(409, "PRODUCT_CODE_EXISTS", "Товар с таким кодом уже существует");
  await db.prepare(`UPDATE products SET code = ?, name = ?, group_name = ?, vendor = ?, rrp_cents = ?, partner_price_cents = ?, is_active = ?
      WHERE id = ?`).bind(values.code, values.name, values.groupName, values.vendor, values.rrpCents, values.partnerPriceCents, values.isActive ? 1 : 0, id).run();
  return getAdminProduct(db, actor, id);
}

export async function deleteAdminProduct(db: D1DatabaseLike, actor: RequestActor, id: string) {
  const current = await getAdminProduct(db, actor, id);
  const used = await db.prepare("SELECT count(*) AS count FROM order_items WHERE product_id = ?").bind(id).first<{ count: number }>();
  if (Number(used?.count ?? 0) > 0) {
    await db.prepare("UPDATE products SET is_active = 0 WHERE id = ?").bind(id).run();
    return { deleted: false, archived: true, product: await getAdminProduct(db, actor, id) };
  }
  await db.batch([
    db.prepare("DELETE FROM organization_products WHERE product_id = ?").bind(id),
    db.prepare("DELETE FROM products WHERE id = ?").bind(id),
  ]);
  return { deleted: true, archived: false, product: current };
}
