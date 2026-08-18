"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type ReferenceItem = BrowserReferenceItem;

export default function ReferencePanel({ kind, title }: { kind: string; title: string }) {
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [selected, setSelected] = useState<ReferenceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    try {
      const next = window.LkpBrowserStore.getReferenceItems(kind);
      setItems(next);
      setSelected((current) => current ? next.find((item) => item.id === current.id) || null : null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить справочник");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    const initialLoad = window.setTimeout(load, 0);
    const unsubscribe = window.LkpBrowserStore.subscribe(load);
    return () => { window.clearTimeout(initialLoad); unsubscribe(); };
  }, [load]);

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSaving(true);
    setError("");
    try {
      window.LkpBrowserStore.createReferenceItem(kind, {
        code: String(values.get("code") || ""),
        name: String(values.get("name") || ""),
        description: String(values.get("description") || ""),
        isActive: true,
      });
      form.reset();
      load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось создать запись");
    } finally {
      setSaving(false);
    }
  }

  async function updateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const values = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const item = window.LkpBrowserStore.updateReferenceItem(kind, selected.id, {
        code: String(values.get("code") || ""),
        name: String(values.get("name") || ""),
        description: String(values.get("description") || ""),
        isActive: values.get("isActive") === "on",
      });
      setSelected(item);
      load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось сохранить запись");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#dce3ec] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-[#65758b]">Справочник</p><h2 className="text-xl font-bold">{title}</h2></div>
        <button type="button" onClick={load} className="rounded-lg border border-[#b8c7da] px-4 py-2 text-sm font-semibold">Обновить</button>
      </div>
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800" role="alert">{error}</div>}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="overflow-x-auto rounded-lg border border-[#e5eaf1]">
          {loading ? <p className="p-5 text-[#65758b]">Загрузка…</p> : items.length === 0 ? <p className="p-5 text-[#65758b]">Записей пока нет.</p> : (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#f5f7fa] text-[#526176]"><tr><th className="px-4 py-3">Код</th><th className="px-4 py-3">Название</th><th className="px-4 py-3">Статус</th></tr></thead>
              <tbody>{items.map((item) => <tr key={item.id} onClick={() => setSelected(item)} className={`cursor-pointer border-t border-[#edf0f4] hover:bg-[#f7faff] ${selected?.id === item.id ? "bg-[#edf5ff]" : ""}`}><td className="px-4 py-3 font-mono text-xs">{item.code}</td><td className="px-4 py-3 font-semibold">{item.name}</td><td className="px-4 py-3">{item.isActive ? "Активна" : "Неактивна"}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="space-y-5">
          <form key={`create-${kind}`} onSubmit={createItem} className="space-y-3 rounded-lg bg-[#f5f7fa] p-4">
            <h3 className="font-semibold">Новая запись</h3>
            <label className="block text-sm">Код<input required name="code" className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label>
            <label className="block text-sm">Название<input required name="name" className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label>
            <label className="block text-sm">Описание<textarea name="description" className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label>
            <button disabled={saving} className="rounded-lg bg-[#1769c2] px-4 py-2 font-semibold text-white disabled:opacity-50">Добавить</button>
          </form>
          {selected && <form key={selected.id} onSubmit={updateItem} className="space-y-3 rounded-lg border border-[#e5eaf1] p-4">
            <h3 className="font-semibold">Редактирование</h3>
            <label className="block text-sm">Код<input required name="code" defaultValue={selected.code} className="mt-1 w-full rounded-lg border border-[#b8c7da] px-3 py-2" /></label>
            <label className="block text-sm">Название<input required name="name" defaultValue={selected.name} className="mt-1 w-full rounded-lg border border-[#b8c7da] px-3 py-2" /></label>
            <label className="block text-sm">Описание<textarea name="description" defaultValue={selected.description} className="mt-1 w-full rounded-lg border border-[#b8c7da] px-3 py-2" /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={selected.isActive} /> Активна</label>
            <button disabled={saving} className="rounded-lg bg-[#1769c2] px-4 py-2 font-semibold text-white disabled:opacity-50">Сохранить</button>
          </form>}
        </div>
      </div>
    </section>
  );
}
