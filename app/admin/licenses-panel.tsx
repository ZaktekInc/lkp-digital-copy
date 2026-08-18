"use client";

import { useCallback, useEffect, useState } from "react";

type ActivationSummary = {
  id: string;
  number: string;
  organization: { id: string; name: string };
  status: string;
  createdAt: string;
};

type ActivationDetails = ActivationSummary & {
  vendor: string;
  paymentStatus: string;
  comment: string;
  items: Array<{ id: string; model: string; licenseType: string; subscriptionEnd: string; priceCents: number; licenseKeys: Array<{ id: string; serialNumber: string; status: string }> }>;
};

function browserActivations(): ActivationDetails[] {
  const organizationNames = new Map(window.LkpBrowserStore.getOrganizations({ includeInactive: true }).map((item) => [item.id, item.name]));
  return window.LkpBrowserStore.getActivations().map((item) => ({
    id: item.id,
    number: item.number,
    organization: { id: item.organizationId, name: organizationNames.get(item.organizationId) || "Архивная организация" },
    status: item.status,
    createdAt: item.orderedAt,
    vendor: item.vendor,
    paymentStatus: item.paymentStatus,
    comment: item.comment,
    items: item.items,
  }));
}

export default function LicensesPanel() {
  const [items, setItems] = useState<ActivationSummary[]>([]);
  const [selected, setSelected] = useState<ActivationDetails | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    try {
      const next = browserActivations();
      setItems(next);
      setSelected((current) => current ? next.find((item) => item.id === current.id) || null : null);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить активации");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(load, 0);
    const unsubscribe = window.LkpBrowserStore.subscribe((change) => {
      if (change.reason === "reset") { setSelected(null); setNotice(""); }
      load();
    });
    return () => { window.clearTimeout(initialLoad); unsubscribe(); };
  }, [load]);

  function open(id: string) {
    setError("");
    setSelected(browserActivations().find((item) => item.id === id) || null);
  }

  function save() {
    if (!selected) return;
    setError("");
    setNotice("");
    try {
      window.LkpBrowserStore.updateActivation(selected.id, { status: selected.status, comment: selected.comment });
      setNotice("Изменения сохранены в общем browser storage.");
      open(selected.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось сохранить активацию");
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
      <div className="rounded-xl border border-[#dce3ec] bg-white shadow-sm">
        <div className="border-b border-[#e5eaf1] p-5"><p className="text-sm text-[#65758b]">Общие данные browser storage</p><h2 className="text-xl font-bold">Лицензии и активации</h2></div>
        {error && <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800" role="alert">{error}</div>}
        {loading ? <p className="p-5 text-[#65758b]">Загрузка…</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f5f7fa] text-[#526176]"><tr><th className="px-4 py-3">Активация</th><th className="px-4 py-3">Организация</th><th className="px-4 py-3">Статус</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => open(item.id)} className={`cursor-pointer border-t border-[#edf0f4] hover:bg-[#f7faff] ${selected?.id === item.id ? "bg-[#edf5ff]" : ""}`}><td className="px-4 py-3 font-semibold text-[#1769c2]">{item.number}</td><td className="px-4 py-3">{item.organization.name}</td><td className="px-4 py-3">{item.status}</td></tr>)}</tbody></table></div>}
      </div>
      <aside className="rounded-xl border border-[#dce3ec] bg-white p-5 shadow-sm">
        {!selected ? <p className="text-[#65758b]">Выберите активацию в таблице.</p> : <div className="space-y-4"><div><p className="text-sm text-[#65758b]">Активация</p><h3 className="text-xl font-bold">{selected.number}</h3><p>{selected.organization.name}</p></div><div className="rounded-lg bg-[#f5f7fa] p-3"><label className="block text-sm text-[#65758b]">Статус<select value={selected.status} onChange={(event) => setSelected({ ...selected, status: event.target.value })} className="mt-1 w-full rounded-lg border border-[#b8c7da] bg-white px-3 py-2 text-[#172238]"><option>В работе</option><option>Выполнена</option><option>Ошибка</option></select></label><span className="mt-3 block text-sm text-[#65758b]">Вендор</span><strong className="block">{selected.vendor}</strong><span className="mt-3 block text-sm text-[#65758b]">Оплата</span><strong className="block">{selected.paymentStatus}</strong></div><label className="block text-sm">Комментарий<textarea value={selected.comment} onChange={(event) => setSelected({ ...selected, comment: event.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-[#b8c7da] px-3 py-2" /></label><button type="button" onClick={save} className="rounded-lg bg-[#1769c2] px-4 py-2 text-sm font-semibold text-white">Сохранить</button>{notice && <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" role="status">{notice}</p>}<div><h4 className="mb-2 font-semibold">Позиции и ключи</h4><div className="space-y-3">{selected.items.map((item) => <div key={item.id} className="rounded-lg border border-[#e5eaf1] p-3 text-sm"><strong>{item.model}</strong><p className="text-[#65758b]">{item.licenseType}</p><p className="mt-2">Ключей: {item.licenseKeys.length}</p>{item.licenseKeys.map((key) => <p key={key.id} className="text-[#65758b]">{key.serialNumber} · {key.status}</p>)}</div>)}</div></div></div>}
      </aside>
    </section>
  );
}
