import type { RequestActor } from "../lib/auth";
import {
  DomainError,
  initializeDatabase,
  normalizedText,
  type D1DatabaseLike,
} from "./service.ts";

export const REFERENCE_KINDS = [
  "partners",
  "price-types",
  "partner-statuses",
  "vendors",
  "delivery-terms",
  "contract-types",
  "contracts",
  "categories",
  "product-groups",
  "order-statuses",
  "models",
] as const;

export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

type ReferenceRow = {
  id: string;
  kind: string;
  code: string;
  name: string;
  description: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

function requireAdmin(actor: RequestActor) {
  if (!actor.isAdmin) throw new DomainError(403, "ADMIN_REQUIRED", "Требуются права администратора");
}

function requireKind(kind: string): ReferenceKind {
  if (!REFERENCE_KINDS.includes(kind as ReferenceKind)) {
    throw new DomainError(404, "REFERENCE_NOT_FOUND", "Справочник не найден");
  }
  return kind as ReferenceKind;
}

function mapReference(row: ReferenceRow) {
  return {
    id: row.id,
    kind: row.kind,
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listReferenceItems(db: D1DatabaseLike, actor: RequestActor, rawKind: string) {
  requireAdmin(actor);
  await initializeDatabase(db);
  const kind = requireKind(rawKind);
  const rows = (await db.prepare(`SELECT id, kind, code, name, description, is_active, created_at, updated_at
      FROM reference_items WHERE kind = ? ORDER BY is_active DESC, name, code`)
    .bind(kind).all<ReferenceRow>()).results ?? [];
  return rows.map(mapReference);
}

export async function getReferenceItem(db: D1DatabaseLike, actor: RequestActor, rawKind: string, id: string) {
  requireAdmin(actor);
  await initializeDatabase(db);
  const kind = requireKind(rawKind);
  const row = await db.prepare(`SELECT id, kind, code, name, description, is_active, created_at, updated_at
      FROM reference_items WHERE kind = ? AND id = ?`).bind(kind, id).first<ReferenceRow>();
  if (!row) throw new DomainError(404, "REFERENCE_ITEM_NOT_FOUND", "Запись справочника не найдена");
  return mapReference(row);
}

export async function createReferenceItem(
  db: D1DatabaseLike,
  actor: RequestActor,
  rawKind: string,
  input: { code?: string; name?: string; description?: string },
) {
  requireAdmin(actor);
  await initializeDatabase(db);
  const kind = requireKind(rawKind);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_REFERENCE_ITEM", "Данные записи должны быть объектом JSON");
  }
  const code = normalizedText(input.code, "code", 120);
  const name = normalizedText(input.name, "name", 240);
  const description = normalizedText(input.description, "description", 1000);
  if (!code || !name) throw new DomainError(400, "REFERENCE_FIELDS_REQUIRED", "Укажите код и название");
  const duplicate = await db.prepare("SELECT id FROM reference_items WHERE kind = ? AND code = ?")
    .bind(kind, code).first<{ id: string }>();
  if (duplicate) throw new DomainError(409, "REFERENCE_CODE_EXISTS", "Запись с таким кодом уже существует");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO reference_items (
      id, kind, code, name, description, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`)
    .bind(id, kind, code, name, description, now, now).run();
  return getReferenceItem(db, actor, kind, id);
}

export async function updateReferenceItem(
  db: D1DatabaseLike,
  actor: RequestActor,
  rawKind: string,
  id: string,
  input: { code?: string; name?: string; description?: string; isActive?: boolean },
) {
  requireAdmin(actor);
  await initializeDatabase(db);
  const kind = requireKind(rawKind);
  const current = await getReferenceItem(db, actor, kind, id);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_REFERENCE_ITEM", "Данные записи должны быть объектом JSON");
  }
  const code = input.code === undefined ? current.code : normalizedText(input.code, "code", 120);
  const name = input.name === undefined ? current.name : normalizedText(input.name, "name", 240);
  const description = input.description === undefined ? current.description : normalizedText(input.description, "description", 1000);
  const isActive = input.isActive === undefined ? current.isActive : input.isActive;
  if (!code || !name || typeof isActive !== "boolean") {
    throw new DomainError(400, "INVALID_REFERENCE_ITEM", "Укажите корректные код, название и состояние");
  }
  const duplicate = await db.prepare("SELECT id FROM reference_items WHERE kind = ? AND code = ? AND id <> ?")
    .bind(kind, code, id).first<{ id: string }>();
  if (duplicate) throw new DomainError(409, "REFERENCE_CODE_EXISTS", "Запись с таким кодом уже существует");
  await db.prepare(`UPDATE reference_items SET code = ?, name = ?, description = ?, is_active = ?, updated_at = ?
      WHERE kind = ? AND id = ?`)
    .bind(code, name, description, isActive ? 1 : 0, new Date().toISOString(), kind, id).run();
  return getReferenceItem(db, actor, kind, id);
}

type ActivationRow = {
  id: string;
  number: string;
  order_number: string;
  organization_id: string;
  organization_name: string;
  status: string;
  vendor: string;
  total_cents: number;
  payment_status: string;
  ordered_at: string;
  comment: string;
};

function mapActivation(row: ActivationRow) {
  return {
    id: row.id,
    number: row.number,
    orderNumber: row.order_number,
    organization: { id: row.organization_id, name: row.organization_name },
    status: row.status,
    vendor: row.vendor,
    totalCents: row.total_cents,
    paymentStatus: row.payment_status,
    orderedAt: row.ordered_at,
    comment: row.comment,
  };
}

export async function listActivations(db: D1DatabaseLike, actor: RequestActor) {
  requireAdmin(actor);
  await initializeDatabase(db);
  const rows = (await db.prepare(`SELECT a.*, o.name AS organization_name
      FROM activations a JOIN organizations o ON o.id = a.organization_id
      WHERE a.is_active = 1 ORDER BY a.ordered_at DESC, a.number DESC`).all<ActivationRow>()).results ?? [];
  return rows.map(mapActivation);
}

export async function getActivation(db: D1DatabaseLike, actor: RequestActor, id: string) {
  requireAdmin(actor);
  await initializeDatabase(db);
  const row = await db.prepare(`SELECT a.*, o.name AS organization_name
      FROM activations a JOIN organizations o ON o.id = a.organization_id
      WHERE a.id = ? AND a.is_active = 1`).bind(id).first<ActivationRow>();
  if (!row) throw new DomainError(404, "ACTIVATION_NOT_FOUND", "Активация не найдена");
  type ActivationItemRow = { id: string; model: string; license_type: string; subscription_end: string; price_cents: number; license_key_id: string | null; serial_number: string | null; license_status: string | null };
  const rows = (await db.prepare(`SELECT ai.id, ai.model, ai.license_type, ai.subscription_end, ai.price_cents,
      lk.id AS license_key_id, lk.serial_number, lk.status AS license_status
      FROM activation_items ai LEFT JOIN license_keys lk ON lk.activation_item_id = ai.id
      WHERE ai.activation_id = ? ORDER BY ai.rowid, lk.rowid`).bind(id).all<ActivationItemRow>()).results ?? [];
  const items = new Map<string, {
    id: string;
    model: string;
    licenseType: string;
    subscriptionEnd: string;
    priceCents: number;
    licenseKeys: Array<{ id: string; serialNumber: string; status: string }>;
  }>();
  rows.forEach((item) => {
    const current = items.get(item.id) ?? {
      id: item.id,
      model: item.model,
      licenseType: item.license_type,
      subscriptionEnd: item.subscription_end,
      priceCents: item.price_cents,
      licenseKeys: [],
    };
    if (item.license_key_id) current.licenseKeys.push({
      id: item.license_key_id,
      serialNumber: item.serial_number ?? "",
      status: item.license_status ?? "",
    });
    items.set(item.id, current);
  });
  return { ...mapActivation(row), items: [...items.values()] };
}
