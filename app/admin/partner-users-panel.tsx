"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const dateTime = (value: string) => value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
const role = (user: BrowserUser) => user.isAdmin ? "Владелец" : "Менеджер";

export default function PartnerUsersPanel() {
  const [users, setUsers] = useState<BrowserUser[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<BrowserUser | null>(null);
  const load = useCallback(() => setUsers(window.LkpBrowserStore.getUsers({ partnerId: "1", includeDeleted: true })), []);
  const selected = useMemo(() => users.find((user) => user.id === selectedId) ?? null, [users, selectedId]);

  useEffect(() => { const timer = window.setTimeout(load, 0); const unsubscribe = window.LkpBrowserStore.subscribe(load); return () => { window.clearTimeout(timer); unsubscribe(); }; }, [load]);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const data = new FormData(event.currentTarget);
    const input = { partnerId: "1", name: String(data.get("name") || ""), email: String(data.get("email") || ""), phone: String(data.get("phone") || ""), position: String(data.get("position") || ""), isAdmin: selected ? data.get("isAdmin") === "on" : false };
    try {
      if (selected) window.LkpBrowserStore.adminUpdateUser(selected.id, input);
      else setCredentials(window.LkpBrowserStore.adminCreateManager(input));
      setCreating(false); setSelectedId(""); load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось сохранить пользователя"); }
  }

  function remove(user: BrowserUser) {
    if (!window.confirm(`Вы действительно хотите удалить пользователя ${user.name}?`)) return;
    try { window.LkpBrowserStore.adminDeleteManager(user.id); setSelectedId(""); load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось удалить пользователя"); }
  }

  return <div className="space-y-6">
    <section className="rounded-xl border border-[#dce3ec] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-[#65758b]">Партнёр</p><h2 className="text-xl font-bold">ООО «Партнер»</h2></div><button type="button" onClick={() => { setCreating(true); setSelectedId(""); }} className="rounded-lg bg-[#1769c2] px-4 py-2 font-semibold text-white">Добавить Менеджера</button></div>
      {credentials && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm"><strong>Не удалось отправить письмо. Данные для входа:</strong><p className="mt-2">Ссылка: {window.location.origin}{process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/</p><p>Логин: {credentials.email}</p><p>Пароль: {credentials.password}</p><button type="button" className="mt-2 underline" onClick={() => setCredentials(null)}>Закрыть</button></div>}
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800" role="alert">{error}</div>}
      <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f5f7fa] text-[#526176]"><tr><th className="px-3 py-3">ФИО</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Телефон</th><th className="px-3 py-3">Должность</th><th className="px-3 py-3">Роль</th><th className="px-3 py-3">Demo-пароль</th><th className="px-3 py-3">Даты</th><th className="px-3 py-3">Действия</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-[#edf0f4]"><td className="px-3 py-3 font-semibold">{user.name}{user.deleted && <span className="ml-2 rounded bg-red-100 px-2 py-1 text-xs text-red-700">Удалён</span>}</td><td className="px-3 py-3">{user.email}</td><td className="px-3 py-3">{user.phone || "—"}</td><td className="px-3 py-3">{user.position}</td><td className="px-3 py-3">{role(user)}</td><td className="px-3 py-3 font-mono">{user.password || "—"}</td><td className="px-3 py-3 whitespace-nowrap text-xs"><div>Создан: {dateTime(user.createdAt)}</div><div>Изменён: {dateTime(user.updatedAt)}</div><div>Активность: {dateTime(user.lastActivityAt)}</div></td><td className="px-3 py-3">{!user.deleted && <div className="flex flex-wrap gap-2"><button className="text-[#1769c2] underline" type="button" onClick={() => { setSelectedId(user.id); setCreating(false); }}>Редактировать</button>{!user.isAdmin && <button className="text-red-700 underline" type="button" onClick={() => remove(user)}>Удалить</button>}</div>}</td></tr>)}</tbody></table></div>
    </section>

    {(creating || selected) && <section className="rounded-xl border border-[#dce3ec] bg-white p-5 shadow-sm"><h3 className="text-lg font-bold">{selected ? "Редактирование пользователя" : "Новый Менеджер"}</h3><form key={selected?.id || "new"} onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm">ФИО *<input required name="name" defaultValue={selected?.name} className="mt-1 w-full rounded-lg border border-[#b8c7da] px-3 py-2" /></label><label className="text-sm">Email *<input required type="email" name="email" defaultValue={selected?.email} className="mt-1 w-full rounded-lg border border-[#b8c7da] px-3 py-2" /></label><label className="text-sm">Телефон<input name="phone" defaultValue={selected?.phone} className="mt-1 w-full rounded-lg border border-[#b8c7da] px-3 py-2" /></label><label className="text-sm">Должность *<input required name="position" defaultValue={selected?.position} className="mt-1 w-full rounded-lg border border-[#b8c7da] px-3 py-2" /></label>{selected && <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="isAdmin" defaultChecked={selected.isAdmin} /> Администратор</label>}<div className="flex gap-2 md:col-span-2"><button className="rounded-lg bg-[#1769c2] px-4 py-2 font-semibold text-white">Сохранить</button><button type="button" onClick={() => { setCreating(false); setSelectedId(""); }} className="rounded-lg border border-[#b8c7da] px-4 py-2">Отмена</button></div></form></section>}
  </div>;
}
