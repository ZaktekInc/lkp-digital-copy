"use client";

import { useCallback, useEffect, useState } from "react";
import BooleanFlag from "./boolean-flag";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const money = (cents: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(cents / 100);

export default function AccountingPanel({ system }: { system: "PG" | "RR" }) {
  const theme = system === "PG"
    ? { accent: "#173f72", softAccent: "#e7edf5", badge: "Контур ПГ" }
    : { accent: "#7a2432", softAccent: "#f4e7e9", badge: "Контур РР" };
  const [orders, setOrders] = useState<BrowserOrder[]>([]);
  const [organizations, setOrganizations] = useState<Map<string, string>>(new Map());
  const [contracts, setContracts] = useState<Map<string, string>>(new Map());
  const [selectedNumber, setSelectedNumber] = useState("");
  const [error, setError] = useState("");

  const selected = orders.find((order) => order.number === selectedNumber) || orders[0] || null;
  const documents = selected ? window.LkpBrowserStore.getOrderDocuments(selected.number) : [];
  const upd = documents.find((document) => document.type === "УПД");

  const load = useCallback(() => {
    const next = window.LkpBusiness.getAccountingOrders(system);
    setOrders(next);
    setOrganizations(new Map(window.LkpBrowserStore.getOrganizations({ includeInactive: true }).map((item) => [item.id, item.name])));
    setContracts(new Map(window.LkpBrowserStore.getContracts({ includeInactive: true }).map((item) => [item.id, item.name])));
    setSelectedNumber((current) => next.some((order) => order.number === current) ? current : next[0]?.number || "");
  }, [system]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    const unsubscribe = window.LkpBrowserStore.subscribe(load);
    return () => { window.clearTimeout(timer); unsubscribe(); };
  }, [load]);

  function run(action: "payment" | "upd") {
    if (!selected) return;
    setError("");
    try {
      if (action === "payment") window.LkpBusiness.processPayment(selected.number);
      else window.LkpBusiness.postUpd(selected.number);
      load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Операция не выполнена");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f1df] text-[#302b22]">
      <header className="border-b border-t-4 border-[#d4c38e] bg-[#fff0a8] px-6 py-5" style={{ borderTopColor: theme.accent }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div><div className="mb-1 flex flex-wrap items-center gap-2"><p className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accent }}>Технический симулятор</p><span className="rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ backgroundColor: theme.accent }}>{theme.badge}</span></div><h1 className="text-2xl font-bold" style={{ color: theme.accent }}>1С {system === "PG" ? "Пи Джи Групп" : "РР-Электро"}</h1></div>
          <nav className="flex flex-wrap gap-2"><a className="rounded-lg border border-[#b9aa7d] bg-[#fff8d6] px-3 py-2 text-sm font-semibold" href={`${basePath}/`}>ЛКП</a><a className="rounded-lg border border-[#b9aa7d] bg-[#fff8d6] px-3 py-2 text-sm font-semibold" href={`${basePath}/admin/`}>Admin</a><a className="rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: theme.accent, color: theme.accent, backgroundColor: theme.softAccent }} href={`${basePath}/${system === "PG" ? "1crr" : "1cpg"}/`}>1С {system === "PG" ? "РР" : "ПГ"}</a></nav>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-[#d4c9a8] bg-[#fffdf6] shadow-sm">
          <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead className="bg-[#f3e3a4] text-[#5f5641]"><tr><th className="p-3">№ заказа</th><th className="p-3">Тип</th><th className="p-3">Организация</th><th className="p-3">Договор</th><th className="p-3">Сумма</th><th className="p-3">№ счёта</th><th className="p-3">Оплата</th><th className="p-3">Статус</th><th className="p-3">УПД</th></tr></thead>
            <tbody>{orders.map((order) => { const orderDocuments = window.LkpBrowserStore.getOrderDocuments(order.number); return <tr key={order.number} onClick={() => setSelectedNumber(order.number)} className="cursor-pointer border-t border-[#e5dcc1] hover:bg-[#fff8dc]" style={selected?.number === order.number ? { backgroundColor: theme.softAccent } : undefined}><td className="p-3 font-semibold" style={{ color: theme.accent }}>{order.number}</td><td className="p-3">{order.type || "Покупка товара"}</td><td className="p-3">{organizations.get(order.organizationId) || "—"}</td><td className="p-3">{contracts.get(order.contractId || "") || "—"}</td><td className="p-3 whitespace-nowrap">{money(order.totalCents)}</td><td className="p-3">{order.invoiceNumber || "—"}</td><td className="p-3"><BooleanFlag value={order.paymentStatus === "Оплачено"} label={order.paymentStatus} /></td><td className="p-3">{order.status}</td><td className="p-3"><BooleanFlag value={orderDocuments.some((item) => item.type === "УПД")} label={orderDocuments.some((item) => item.type === "УПД") ? "УПД проведена" : "УПД не проведена"} /></td></tr>; })}</tbody>
          </table></div>{orders.length === 0 && <p className="p-6 text-[#746b57]">Заказов этого бухгалтерского контура нет.</p>}
        </section>
        <aside className="rounded-xl border border-[#d4c9a8] bg-[#fffdf6] p-5 shadow-sm">
          {!selected ? <p className="text-[#746b57]">Выберите заказ.</p> : <div className="space-y-5">
            <div><p className="text-sm text-[#746b57]">Заказ</p><h2 className="text-xl font-bold" style={{ color: theme.accent }}>№ {selected.number}</h2><p>{organizations.get(selected.organizationId)}</p></div>
            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-[#f8efd0] p-4 text-sm"><div><dt className="text-[#746b57]">Тип</dt><dd className="font-semibold">{selected.type || "Покупка товара"}</dd></div><div><dt className="text-[#746b57]">Статус</dt><dd className="font-semibold">{selected.status}</dd></div><div><dt className="text-[#746b57]">Оплата</dt><dd className="font-semibold">{selected.paymentStatus}</dd></div><div><dt className="text-[#746b57]">Счёт</dt><dd className="font-semibold">{selected.invoiceNumber}</dd></div><div className="col-span-2"><dt className="text-[#746b57]">Договор</dt><dd className="font-semibold">{contracts.get(selected.contractId || "") || selected.agreement}</dd></div>{selected.activationNumber && <div className="col-span-2"><dt className="text-[#746b57]">Связанная активация</dt><dd className="font-semibold">№ {selected.activationNumber}</dd></div>}</dl>
            <div><h3 className="mb-2 font-semibold">Позиции</h3><div className="space-y-2">{selected.items.map((item, index) => <div key={`${selected.number}-${index}`} className="rounded-lg border border-[#ded2af] p-3 text-sm"><strong>{item.name}</strong><div className="mt-1 flex justify-between text-[#746b57]"><span>{item.quantity} × {money(item.unitPriceCents)}</span><span>{money(item.lineTotalCents)}</span></div></div>)}</div><p className="mt-2 text-right font-bold">Итого: {money(selected.totalCents)}</p></div>
            <div><h3 className="mb-2 font-semibold">Документы</h3><div className="flex flex-wrap gap-2">{documents.map((document) => <button key={document.id} type="button" onClick={() => window.LkpBusiness.downloadDocument(document.id)} className="rounded-lg border border-[#b9aa7d] bg-[#fff8d6] px-3 py-2 text-sm font-semibold">{document.type}: {document.number || document.filename}</button>)}</div></div>
            <div className="flex flex-wrap gap-2">{selected.paymentStatus !== "Оплачено" && <button type="button" onClick={() => run("payment")} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: theme.accent }}>Провести поступление денег</button>}{(selected.type || "Покупка товара") === "Покупка товара" && !upd && ["Ожидание сборки", "Готов к отгрузке"].includes(selected.status) && <button type="button" onClick={() => run("upd")} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: theme.accent }}>Провести УПД</button>}</div>
          </div>}
        </aside>
      </div>
    </main>
  );
}
