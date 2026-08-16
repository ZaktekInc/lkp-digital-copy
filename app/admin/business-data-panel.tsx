"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type OrganizationItem = {
  id: string;
  publicId: string;
  name: string;
  inn: string;
  city: string;
  phone: string;
  email: string;
  isActive: boolean;
};

type ProductItem = {
  id: string;
  code: string;
  name: string;
  groupName: string;
  vendor: string;
  rrpCents: number;
  partnerPriceCents: number;
  isActive: boolean;
};

type BusinessItem = OrganizationItem | ProductItem;
type Entity = "organizations" | "products";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

function productPayload(values: FormData) {
  const toCents = (name: string) => {
    const rubles = Number(values.get(name));
    return Number.isFinite(rubles) ? Math.round(rubles * 100) : Number.NaN;
  };
  return {
    code: values.get("code"),
    name: values.get("name"),
    groupName: values.get("groupName"),
    vendor: values.get("vendor"),
    rrpCents: toCents("rrp"),
    partnerPriceCents: toCents("partnerPrice"),
    isActive: values.get("isActive") === "on",
  };
}

function organizationPayload(values: FormData) {
  return {
    name: values.get("name"),
    inn: values.get("inn"),
    city: values.get("city"),
    phone: values.get("phone"),
    email: values.get("email"),
    isActive: values.get("isActive") === "on",
  };
}

export default function BusinessDataPanel({ entity, title }: { entity: Entity; title: string }) {
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [selected, setSelected] = useState<BusinessItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next: BusinessItem[] = entity === "organizations"
        ? (await api<{ organizations: OrganizationItem[] }>("/api/admin/organizations")).organizations
        : (await api<{ products: ProductItem[] }>("/api/admin/products")).products;
      setItems(next);
      setSelected((current) => current ? next.find((item) => item.id === current.id) || null : null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    let cancelled = false;
    const request = entity === "organizations"
      ? api<{ organizations: OrganizationItem[] }>("/api/admin/organizations").then((payload) => payload.organizations)
      : api<{ products: ProductItem[] }>("/api/admin/products").then((payload) => payload.products);
    void request.then((next) => {
      if (cancelled) return;
      setItems(next);
      setLoading(false);
    }).catch((requestError) => {
      if (cancelled) return;
      setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить данные");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [entity]);

  async function save(event: FormEvent<HTMLFormElement>, mode: "create" | "update") {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const body = entity === "organizations" ? organizationPayload(values) : productPayload(values);
    const url = mode === "create" ? `/api/admin/${entity}` : `/api/admin/${entity}/${encodeURIComponent(selected!.id)}`;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api(url, { method: mode === "create" ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (mode === "create") form.reset();
      setNotice(mode === "create" ? "Запись создана." : "Изменения сохранены.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось сохранить данные");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ deleted: boolean; archived: boolean }>(`/api/admin/${entity}/${encodeURIComponent(selected.id)}`, { method: "DELETE" });
      setNotice(result.archived ? "Запись используется и перенесена в архив." : "Неиспользуемая запись удалена.");
      setSelected(null);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось удалить запись");
    } finally {
      setSaving(false);
    }
  }

  const isOrganizations = entity === "organizations";

  return (
    <section className="rounded-xl border border-[#dce3ec] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-[#65758b]">Рабочие данные D1</p><h2 className="text-xl font-bold">{title}</h2></div><button type="button" onClick={() => void load()} className="rounded-lg border border-[#b8c7da] px-4 py-2 text-sm font-semibold">Обновить</button></div>
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800" role="alert">{error}</div>}
      {notice && <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900" role="status">{notice}</div>}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <div className="overflow-x-auto rounded-lg border border-[#e5eaf1]">
          {loading ? <p className="p-5 text-[#65758b]">Загрузка…</p> : items.length === 0 ? <p className="p-5 text-[#65758b]">Записей пока нет.</p> : <table className="w-full border-collapse text-left text-sm"><thead className="bg-[#f5f7fa] text-[#526176]"><tr>{isOrganizations && <th className="px-4 py-3">ID</th>}<th className="px-4 py-3">{isOrganizations ? "ИНН" : "Код"}</th><th className="px-4 py-3">Название</th><th className="px-4 py-3">{isOrganizations ? "Город" : "Вендор"}</th><th className="px-4 py-3">Статус</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => setSelected(item)} className={`cursor-pointer border-t border-[#edf0f4] hover:bg-[#f7faff] ${selected?.id === item.id ? "bg-[#edf5ff]" : ""}`}>{isOrganizations && <td className="px-4 py-3 font-semibold">{(item as OrganizationItem).publicId}</td>}<td className="px-4 py-3">{isOrganizations ? (item as OrganizationItem).inn : (item as ProductItem).code}</td><td className="px-4 py-3 font-semibold">{item.name}</td><td className="px-4 py-3">{isOrganizations ? (item as OrganizationItem).city : (item as ProductItem).vendor}</td><td className="px-4 py-3">{item.isActive ? "Активна" : "Неактивна"}</td></tr>)}</tbody></table>}
        </div>
        <div className="space-y-5">
          <form key={`create-${entity}`} onSubmit={(event) => void save(event, "create")} className="space-y-3 rounded-lg bg-[#f5f7fa] p-4"><h3 className="font-semibold">Новая запись</h3>{isOrganizations ? <OrganizationFields /> : <ProductFields />}<label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked /> Активна</label><button disabled={saving} className="rounded-lg bg-[#1769c2] px-4 py-2 font-semibold text-white disabled:opacity-50">Добавить</button></form>
          {selected && <form key={selected.id} onSubmit={(event) => void save(event, "update")} className="space-y-3 rounded-lg border border-[#e5eaf1] p-4"><h3 className="font-semibold">Редактирование</h3>{isOrganizations ? <OrganizationFields item={selected as OrganizationItem} /> : <ProductFields item={selected as ProductItem} />}<label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={selected.isActive} /> Активна</label><div className="flex flex-wrap gap-2"><button disabled={saving} className="rounded-lg bg-[#1769c2] px-4 py-2 font-semibold text-white disabled:opacity-50">Сохранить</button><button disabled={saving} type="button" onClick={() => void remove()} className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700 disabled:opacity-50">Удалить</button></div></form>}
        </div>
      </div>
    </section>
  );
}

function OrganizationFields({ item }: { item?: OrganizationItem }) {
  return <><label className="block text-sm">Название<input required name="name" defaultValue={item?.name} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">ИНН<input required name="inn" defaultValue={item?.inn} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Город<input name="city" defaultValue={item?.city} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Телефон<input name="phone" defaultValue={item?.phone} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Email<input type="email" name="email" defaultValue={item?.email} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label></>;
}

function ProductFields({ item }: { item?: ProductItem }) {
  return <><label className="block text-sm">Код<input required name="code" defaultValue={item?.code} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Название<input required name="name" defaultValue={item?.name} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Товарная группа<input required name="groupName" defaultValue={item?.groupName} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Вендор<input required name="vendor" defaultValue={item?.vendor} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">РРЦ, ₽<input required type="number" min="0" step="0.01" name="rrp" defaultValue={item ? item.rrpCents / 100 : undefined} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Партнёрская цена, ₽<input required type="number" min="0" step="0.01" name="partnerPrice" defaultValue={item ? item.partnerPriceCents / 100 : undefined} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label></>;
}
