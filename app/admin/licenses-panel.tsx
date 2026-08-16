"use client";

import { useEffect, useState } from "react";

type ActivationSummary = {
  id: string;
  number: string;
  organization: { id: string; name: string };
  status: string;
  createdAt: string;
};

type ActivationDetails = ActivationSummary & {
  vendor: string;
  items: Array<{ id: string; model: string; licenseType: string; subscriptionEnd: string; priceCents: number; licenseKeys: Array<{ id: string; serialNumber: string; status: string }> }>;
};

async function api<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

export default function LicensesPanel() {
  const [items, setItems] = useState<ActivationSummary[]>([]);
  const [selected, setSelected] = useState<ActivationDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api<{ activations: ActivationSummary[] }>("/api/admin/activations").then((payload) => {
      setItems(payload.activations);
      setLoading(false);
    }).catch((requestError) => {
      setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить активации");
      setLoading(false);
    });
  }, []);

  async function open(id: string) {
    setError("");
    try {
      const payload = await api<{ activation: ActivationDetails }>(`/api/admin/activations/${encodeURIComponent(id)}`);
      setSelected(payload.activation);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось открыть активацию");
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
      <div className="rounded-xl border border-[#dce3ec] bg-white shadow-sm">
        <div className="border-b border-[#e5eaf1] p-5"><p className="text-sm text-[#65758b]">Данные D1</p><h2 className="text-xl font-bold">Лицензии и активации</h2></div>
        {error && <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800" role="alert">{error}</div>}
        {loading ? <p className="p-5 text-[#65758b]">Загрузка…</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f5f7fa] text-[#526176]"><tr><th className="px-4 py-3">Активация</th><th className="px-4 py-3">Организация</th><th className="px-4 py-3">Статус</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => void open(item.id)} className={`cursor-pointer border-t border-[#edf0f4] hover:bg-[#f7faff] ${selected?.id === item.id ? "bg-[#edf5ff]" : ""}`}><td className="px-4 py-3 font-semibold text-[#1769c2]">{item.number}</td><td className="px-4 py-3">{item.organization.name}</td><td className="px-4 py-3">{item.status}</td></tr>)}</tbody></table></div>}
      </div>
      <aside className="rounded-xl border border-[#dce3ec] bg-white p-5 shadow-sm">
        {!selected ? <p className="text-[#65758b]">Выберите активацию в таблице.</p> : <div className="space-y-4"><div><p className="text-sm text-[#65758b]">Активация</p><h3 className="text-xl font-bold">{selected.number}</h3><p>{selected.organization.name}</p></div><div className="rounded-lg bg-[#f5f7fa] p-3"><span className="text-sm text-[#65758b]">Статус</span><strong className="block">{selected.status}</strong><span className="mt-2 block text-sm text-[#65758b]">Вендор</span><strong className="block">{selected.vendor}</strong></div><div><h4 className="mb-2 font-semibold">Позиции и ключи</h4><div className="space-y-3">{selected.items.map((item) => <div key={item.id} className="rounded-lg border border-[#e5eaf1] p-3 text-sm"><strong>{item.model}</strong><p className="text-[#65758b]">{item.licenseType}</p><p className="mt-2">Ключей: {item.licenseKeys.length}</p>{item.licenseKeys.map((key) => <p key={key.id} className="text-[#65758b]">{key.serialNumber} · {key.status}</p>)}</div>)}</div></div></div>}
      </aside>
    </section>
  );
}
