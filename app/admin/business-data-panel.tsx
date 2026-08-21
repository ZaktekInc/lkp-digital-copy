"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import BooleanFlag from "../boolean-flag";

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
  code: string;
  name: string;
  groupName: string;
  vendor: string;
  rrpCents: number;
  partnerPriceCents: number;
  priceCents: number;
  availableOrganizationIds: string[];
  isActive: boolean;
};

type BusinessItem = OrganizationItem | ProductItem;
type Entity = "organizations" | "products";

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
    priceCents: toCents("price"),
    availableOrganizationIds: values.getAll("availableOrganizationIds").map(String),
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
  const [creating, setCreating] = useState(false);
  const [organizations, setOrganizations] = useState<BrowserOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    try {
      const next: BusinessItem[] = entity === "organizations"
        ? window.LkpBrowserStore.getOrganizations({ includeInactive: true })
        : window.LkpBrowserStore.getProducts({ includeInactive: true });
      setItems(next);
      setOrganizations(window.LkpBrowserStore.getOrganizations({ includeInactive: true }));
      setSelected((current) => current ? next.find((item) => entity === "organizations" ? (item as OrganizationItem).id === (current as OrganizationItem).id : (item as ProductItem).code === (current as ProductItem).code) || null : null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    const initialLoad = window.setTimeout(load, 0);
    const unsubscribe = window.LkpBrowserStore.subscribe((change) => {
      if (change.reason === "reset") { setSelected(null); setNotice(""); }
      load();
    });
    return () => { window.clearTimeout(initialLoad); unsubscribe(); };
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>, mode: "create" | "update") {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const body = entity === "organizations" ? organizationPayload(values) : productPayload(values);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (entity === "organizations") {
        if (mode === "create") window.LkpBrowserStore.createOrganization(body as Partial<BrowserOrganization>);
        else window.LkpBrowserStore.updateOrganization((selected as OrganizationItem).id, body as Partial<BrowserOrganization>);
      } else {
        if (mode === "create") window.LkpBrowserStore.createProduct(body as BrowserProduct);
        else window.LkpBrowserStore.updateProduct((selected as ProductItem).code, body as Partial<BrowserProduct>);
      }
      if (mode === "create") { form.reset(); setCreating(false); }
      setNotice(mode === "create" ? "Запись создана." : "Изменения сохранены.");
      load();
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
      const result = entity === "organizations"
        ? window.LkpBrowserStore.removeOrganization((selected as OrganizationItem).id)
        : window.LkpBrowserStore.removeProduct((selected as ProductItem).code);
      setNotice(result.archived ? "Запись используется и перенесена в архив." : "Неиспользуемая запись удалена.");
      setSelected(null);
      load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось удалить запись");
    } finally {
      setSaving(false);
    }
  }

  const isOrganizations = entity === "organizations";

  return (
    <section className="rounded-xl border border-[#dce3ec] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-[#65758b]">Общие данные browser storage</p><h2 className="text-xl font-bold">{title}</h2></div><div className="flex gap-2"><button type="button" onClick={load} className="rounded-lg border border-[#b8c7da] px-4 py-2 text-sm font-semibold">Обновить</button><button type="button" onClick={() => { setCreating(true); setSelected(null); }} className="rounded-lg bg-[#1769c2] px-4 py-2 text-sm font-semibold text-white">Добавить</button></div></div>
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800" role="alert">{error}</div>}
      {notice && <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900" role="status">{notice}</div>}
      <div className={`mt-5 grid gap-5 ${creating || selected ? "lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]" : ""}`}>
        <div className="overflow-x-auto rounded-lg border border-[#e5eaf1]">
          {loading ? <p className="p-5 text-[#65758b]">Загрузка…</p> : items.length === 0 ? <p className="p-5 text-[#65758b]">Записей пока нет.</p> : <table className="w-full border-collapse text-left text-sm"><thead className="bg-[#f5f7fa] text-[#526176]"><tr>{isOrganizations && <th className="px-4 py-3">ID</th>}<th className="px-4 py-3">{isOrganizations ? "ИНН" : "Код"}</th><th className="px-4 py-3">Название</th><th className="px-4 py-3">{isOrganizations ? "Город" : "Вендор"}</th><th className="px-4 py-3">Статус</th></tr></thead><tbody>{items.map((item) => { const key = isOrganizations ? (item as OrganizationItem).id : (item as ProductItem).code; const selectedKey = selected ? (isOrganizations ? (selected as OrganizationItem).id : (selected as ProductItem).code) : ""; return <tr key={key} onClick={() => { setSelected(item); setCreating(false); }} className={`cursor-pointer border-t border-[#edf0f4] hover:bg-[#f7faff] ${selectedKey === key ? "bg-[#edf5ff]" : ""}`}>{isOrganizations && <td className="px-4 py-3 font-semibold">{(item as OrganizationItem).publicId}</td>}<td className="px-4 py-3">{isOrganizations ? (item as OrganizationItem).inn : (item as ProductItem).code}</td><td className="px-4 py-3 font-semibold">{item.name}</td><td className="px-4 py-3">{isOrganizations ? (item as OrganizationItem).city : (item as ProductItem).vendor}</td><td className="px-4 py-3"><BooleanFlag value={item.isActive} label={item.isActive ? "Активна" : "Неактивна"} /></td></tr>; })}</tbody></table>}
        </div>
        {(creating || selected) && <div className="space-y-5">
          {creating && <form key={`create-${entity}`} onSubmit={(event) => void save(event, "create")} className="space-y-3 rounded-lg bg-[#f5f7fa] p-4"><h3 className="font-semibold">Новая запись</h3>{isOrganizations ? <OrganizationFields /> : <ProductFields organizations={organizations} />}<label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked /> Активна</label><div className="flex gap-2"><button disabled={saving} className="rounded-lg bg-[#1769c2] px-4 py-2 font-semibold text-white disabled:opacity-50">Добавить</button><button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-[#b8c7da] px-4 py-2">Отмена</button></div></form>}
          {selected && <form key={isOrganizations ? (selected as OrganizationItem).id : (selected as ProductItem).code} onSubmit={(event) => void save(event, "update")} className="space-y-3 rounded-lg border border-[#e5eaf1] p-4"><h3 className="font-semibold">Редактирование</h3>{isOrganizations ? <OrganizationFields item={selected as OrganizationItem} /> : <ProductFields item={selected as ProductItem} organizations={organizations} />}<label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={selected.isActive} /> Активна</label><div className="flex flex-wrap gap-2"><button disabled={saving} className="rounded-lg bg-[#1769c2] px-4 py-2 font-semibold text-white disabled:opacity-50">Сохранить</button><button disabled={saving} type="button" onClick={() => void remove()} className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700 disabled:opacity-50">Удалить</button></div></form>}
        </div>}
      </div>
    </section>
  );
}

function OrganizationFields({ item }: { item?: OrganizationItem }) {
  return <><label className="block text-sm">Название<input required name="name" defaultValue={item?.name} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">ИНН<input required name="inn" defaultValue={item?.inn} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Город<input name="city" defaultValue={item?.city} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Телефон<input name="phone" defaultValue={item?.phone} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Email<input type="email" name="email" defaultValue={item?.email} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label></>;
}

function ProductFields({ item, organizations }: { item?: ProductItem; organizations: BrowserOrganization[] }) {
  return <><label className="block text-sm">Код<input required name="code" readOnly={Boolean(item)} defaultValue={item?.code} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2 read-only:bg-slate-100" /></label><label className="block text-sm">Название<input required name="name" defaultValue={item?.name} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Товарная группа<input required name="groupName" defaultValue={item?.groupName} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Вендор<input required name="vendor" defaultValue={item?.vendor} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">РРЦ, ₽<input required type="number" min="0" step="0.01" name="rrp" defaultValue={item ? item.rrpCents / 100 : undefined} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Партнёрская цена, ₽<input required type="number" min="0" step="0.01" name="partnerPrice" defaultValue={item ? item.partnerPriceCents / 100 : undefined} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><label className="block text-sm">Цена продажи, ₽<input required type="number" min="0" step="0.01" name="price" defaultValue={item ? item.priceCents / 100 : undefined} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2" /></label><fieldset className="space-y-2 rounded-lg border border-[#dce3ec] p-3"><legend className="px-1 text-sm">Доступность</legend>{organizations.filter((organization) => organization.isActive).map((organization) => <label key={organization.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="availableOrganizationIds" value={organization.id} defaultChecked={item?.availableOrganizationIds.includes(organization.id) ?? true} /> {organization.name}</label>)}</fieldset></>;
}
