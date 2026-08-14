"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const statuses = ["Принят", "Ожидает сборки", "Готов к отгрузке", "Отгружен"];

const transitions: Record<string, string[]> = {
  "Принят": ["Ожидает сборки", "Готов к отгрузке"],
  "Ожидает сборки": ["Готов к отгрузке"],
  "Готов к отгрузке": ["Отгружен"],
  "Отгружен": [],
};

type OrderSummary = {
  id: string;
  number: string;
  organization: { id: string; name: string };
  status: string;
  totalCents: number;
  createdAt: string;
};

type OrderDetails = OrderSummary & {
  paymentStatus: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  deliveryTerms: string;
  comment: string;
  items: Array<{
    id: string;
    code: string;
    name: string;
    vendor: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  history: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changedAt: string;
    changedByEmail: string;
  }>;
};

const money = (cents: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(cents / 100);

const dateTime = (value: string) => new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "short",
}).format(new Date(value));

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

export default function AdminPanel() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selected, setSelected] = useState<OrderDetails | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const organizations = useMemo(() => {
    const values = new Map<string, string>();
    orders.forEach((order) => values.set(order.organization.id, order.organization.name));
    return [...values.entries()].sort((a, b) => a[1].localeCompare(b[1], "ru"));
  }, [orders]);

  async function loadOrders() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (organizationId) params.set("organizationId", organizationId);
    if (status) params.set("status", status);
    try {
      const payload = await api<{ orders: OrderSummary[] }>(`/api/admin/orders?${params}`);
      setOrders(payload.orders);
      if (selected && !payload.orders.some((order) => order.id === selected.id)) setSelected(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (organizationId) params.set("organizationId", organizationId);
    if (status) params.set("status", status);
    void api<{ orders: OrderSummary[] }>(`/api/admin/orders?${params}`).then((payload) => {
      if (cancelled) return;
      setOrders(payload.orders);
      setSelected((current) => current && payload.orders.some((order) => order.id === current.id) ? current : null);
      setError("");
      setLoading(false);
    }).catch((requestError) => {
      if (cancelled) return;
      setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить заказы");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [organizationId, status]);

  async function openOrder(id: string) {
    setError("");
    try {
      const payload = await api<{ order: OrderDetails }>(`/api/admin/orders/${encodeURIComponent(id)}`);
      setSelected(payload.order);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось открыть заказ");
    }
  }

  async function changeStatus(nextStatus: string) {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const payload = await api<{ order: OrderDetails }>(`/api/admin/orders/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      setSelected(payload.order);
      setOrders((current) => current.map((order) => order.id === payload.order.id ? { ...order, status: payload.order.status } : order));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось изменить статус");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#172238]">
      <header className="border-b border-[#dce3ec] bg-white px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2764b8]">Цифровая копия ЛКП</p>
            <h1 className="mt-1 text-2xl font-bold">Админ-панель заказов</h1>
          </div>
          <Link className="rounded-lg border border-[#b8c7da] px-4 py-2 text-sm font-semibold hover:bg-[#eef3f9]" href="/">Перейти в ЛКП</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
        <section className="rounded-xl border border-[#dce3ec] bg-white shadow-sm">
          <div className="flex flex-wrap gap-3 border-b border-[#e5eaf1] p-4">
            <select className="rounded-lg border border-[#b8c7da] bg-white px-3 py-2" aria-label="Организация" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
              <option value="">Все организации</option>
              {organizations.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <select className="rounded-lg border border-[#b8c7da] bg-white px-3 py-2" aria-label="Статус" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Все статусы</option>
              {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <button className="rounded-lg bg-[#1769c2] px-4 py-2 font-semibold text-white hover:bg-[#1059a7]" type="button" onClick={() => void loadOrders()}>Обновить</button>
          </div>

          {error && <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800" role="alert">{error}</div>}
          {loading ? <p className="p-6 text-[#65758b]">Загрузка заказов…</p> : orders.length === 0 ? <p className="p-6 text-[#65758b]">Заказы не найдены.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#f5f7fa] text-[#526176]"><tr><th className="px-4 py-3">Заказ</th><th className="px-4 py-3">Организация</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3">Сумма</th><th className="px-4 py-3">Дата</th></tr></thead>
                <tbody>{orders.map((order) => (
                  <tr key={order.id} className={`cursor-pointer border-t border-[#edf0f4] hover:bg-[#f7faff] ${selected?.id === order.id ? "bg-[#edf5ff]" : ""}`} onClick={() => void openOrder(order.id)}>
                    <td className="px-4 py-3 font-semibold text-[#1769c2]">{order.number}</td><td className="px-4 py-3">{order.organization.name}</td><td className="px-4 py-3">{order.status}</td><td className="px-4 py-3 whitespace-nowrap">{money(order.totalCents)}</td><td className="px-4 py-3 whitespace-nowrap">{dateTime(order.createdAt)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-[#dce3ec] bg-white p-5 shadow-sm">
          {!selected ? <p className="text-[#65758b]">Выберите заказ в таблице.</p> : (
            <div className="space-y-5">
              <div><p className="text-sm text-[#65758b]">Заказ</p><h2 className="text-xl font-bold">{selected.number}</h2><p className="mt-1">{selected.organization.name}</p></div>
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-[#f5f7fa] p-4 text-sm"><div><span className="text-[#65758b]">Статус</span><strong className="block">{selected.status}</strong></div><div><span className="text-[#65758b]">Сумма</span><strong className="block">{money(selected.totalCents)}</strong></div></div>
              <div><h3 className="mb-2 font-semibold">Сменить статус</h3><div className="flex flex-wrap gap-2">{(transitions[selected.status] || []).map((next) => <button key={next} type="button" disabled={saving} onClick={() => void changeStatus(next)} className="rounded-lg bg-[#1769c2] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{next}</button>)}{(transitions[selected.status] || []).length === 0 && <span className="text-sm text-[#65758b]">Финальный статус</span>}</div></div>
              <div><h3 className="mb-2 font-semibold">Позиции</h3><div className="space-y-2">{selected.items.map((item) => <div key={item.id} className="rounded-lg border border-[#e5eaf1] p-3 text-sm"><strong>{item.name}</strong><div className="mt-1 flex justify-between text-[#65758b]"><span>{item.quantity} × {money(item.unitPriceCents)}</span><span>{money(item.lineTotalCents)}</span></div></div>)}</div></div>
              <div><h3 className="mb-2 font-semibold">История</h3><ol className="space-y-3">{selected.history.map((entry) => <li key={entry.id} className="border-l-2 border-[#8db9e8] pl-3 text-sm"><strong>{entry.toStatus}</strong><div className="text-[#65758b]">{dateTime(entry.changedAt)} · {entry.changedByEmail}</div></li>)}</ol></div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
