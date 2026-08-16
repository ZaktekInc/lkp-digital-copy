import type { RequestActor } from "../lib/auth";
import {
  DomainError,
  ensureUser,
  initializeDatabase,
  normalizedText,
  type D1DatabaseLike,
} from "./service.ts";

export type CreateContactInput = {
  department?: string;
  position?: string;
  fullName?: string;
  phone?: string;
  email?: string;
};

type ContactRow = {
  id: string;
  department: string;
  position: string;
  full_name: string;
  phone: string;
  email: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

function mapContact(row: ContactRow) {
  return {
    id: row.id,
    department: row.department,
    position: row.position,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listContacts(db: D1DatabaseLike, actor: RequestActor) {
  await initializeDatabase(db);
  const userId = await ensureUser(db, actor);
  const rows = (await db.prepare(`SELECT id, department, position, full_name, phone, email,
      is_active, created_at, updated_at
      FROM contacts WHERE user_id = ? AND is_active = 1
      ORDER BY full_name, id`).bind(userId).all<ContactRow>()).results ?? [];
  return rows.map(mapContact);
}

export async function getContact(db: D1DatabaseLike, actor: RequestActor, contactId: string) {
  await initializeDatabase(db);
  const userId = await ensureUser(db, actor);
  const row = await db.prepare(`SELECT id, department, position, full_name, phone, email,
      is_active, created_at, updated_at
      FROM contacts WHERE id = ? AND user_id = ? AND is_active = 1`)
    .bind(contactId, userId)
    .first<ContactRow>();
  if (!row) throw new DomainError(404, "CONTACT_NOT_FOUND", "Контакт не найден");
  return mapContact(row);
}

export async function createContact(
  db: D1DatabaseLike,
  actor: RequestActor,
  input: CreateContactInput,
) {
  await initializeDatabase(db);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_CONTACT", "Данные контакта должны быть объектом JSON");
  }
  const userId = await ensureUser(db, actor);
  const department = normalizedText(input.department, "department", 160);
  const position = normalizedText(input.position, "position", 160);
  const fullName = normalizedText(input.fullName, "fullName", 200);
  const phone = normalizedText(input.phone, "phone", 64);
  const email = normalizedText(input.email, "email", 320).toLowerCase();
  if (!department || !position || !fullName || !phone || !email) {
    throw new DomainError(400, "CONTACT_FIELDS_REQUIRED", "Заполните все поля контакта");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new DomainError(400, "INVALID_CONTACT_EMAIL", "Укажите корректный email контакта");
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO contacts (
      id, user_id, department, position, full_name, phone, email, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
    .bind(id, userId, department, position, fullName, phone, email, now, now)
    .run();
  return getContact(db, actor, id);
}
