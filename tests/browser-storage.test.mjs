import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const scripts = ["public/lkp-demo-data.js", "public/lkp-browser-storage.js", "public/lkp-browser-business.js"]
  .map((file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
}

function browserContext(localStorage = memoryStorage()) {
  const context = vm.createContext({ localStorage, console });
  context.window = context;
  context.globalThis = context;
  scripts.forEach((source) => vm.runInContext(source, context));
  return context;
}

const checkoutInput = {
  contactName: "Иванов Иван Иванович",
  contactPhone: "+7 987 654 32 10",
  contactEmail: "example@mail.ru",
  comment: "Общий комментарий"
};

function oneLicense(priceCents = 100000) {
  return [{ model: "aQsi 5Ф", licenseType: "Сервис обновлений", subscriptionEnd: "20.08.2027", priceCents, serialNumber: "1234567890123456" }];
}

test("schema version 5 migrates to rich contracts, documents and contract balances without losing user data", () => {
  const localStorage = memoryStorage();
  const seed = browserContext();
  const oldState = JSON.parse(JSON.stringify(seed.LkpDemoData));
  oldState.schemaVersion = 5;
  oldState.contracts = [{ id: "ref-contract-main", kind: "contracts", code: "main", name: "Основной договор", description: "", isActive: true }];
  oldState.balances = { "101": 7777 };
  delete oldState.documents;
  delete oldState.nextIds.document;
  const userOrder = { ...oldState.orders[1], number: "77777", type: "Покупка товара", vendor: "Пи Джи Групп", status: "Ожидает сборки", paymentStatus: "Не оплачен", invoiceNumber: "ПГ-105", contractId: "" };
  oldState.orders.unshift(userOrder);
  localStorage.setItem("lkp-digital-copy-state", JSON.stringify(oldState));

  const context = browserContext(localStorage);
  const migrated = context.LkpBrowserStore.getState();
  const order = context.LkpBrowserStore.getOrder("77777");
  assert.equal(migrated.schemaVersion, 10);
  assert.ok(context.LkpBrowserStore.getContracts().some((item) => item.id === "contract-101-supply-pg"));
  assert.equal(context.LkpBrowserStore.getBalanceRecords()[0].amountCents, 777700);
  assert.equal(order.status, "Ожидание сборки");
  assert.equal(order.paymentStatus, "Не оплачено");
  assert.equal(order.contractId, "contract-101-supply-pg");
  assert.equal(context.LkpBrowserStore.getOrderDocuments("77777").filter((item) => item.type === "Счёт на оплату").length, 1);
  assert.equal(context.LkpBrowserStore.getOrder("12540").activationNumber, "123");
  assert.equal(context.LkpBrowserStore.getActivation("123").orderNumber, "12540");
});

test("schema version 6 adds offer acceptances, PDF names and the current Beta catalog rule", () => {
  const localStorage = memoryStorage();
  const seed = browserContext();
  const oldState = JSON.parse(JSON.stringify(seed.LkpDemoData));
  oldState.schemaVersion = 6;
  delete oldState.offerAcceptances;
  oldState.products.find((item) => item.code === "RR-01F").availableOrganizationIds.push("102");
  oldState.documents.find((item) => item.type === "Счёт на оплату").filename = "invoice.txt";
  localStorage.setItem("lkp-digital-copy-state", JSON.stringify(oldState));

  const context = browserContext(localStorage);
  const migrated = context.LkpBrowserStore.getState();
  assert.equal(migrated.schemaVersion, 10);
  assert.equal(JSON.stringify(migrated.offerAcceptances), "{}");
  assert.equal(context.LkpBrowserStore.getProducts().find((item) => item.code === "RR-01F").availableOrganizationIds.includes("102"), false);
  assert.match(context.LkpBrowserStore.getDocuments().find((item) => item.type === "Счёт на оплату").filename, /\.pdf$/);
});

test("checkout creates one cart and one strictly contracted order per organization and vendor", () => {
  const context = browserContext();
  const created = context.LkpBusiness.checkout(checkoutInput);
  assert.equal(created.cart.number, "653");
  assert.equal(created.orders.length, 2);
  assert.deepEqual([...created.orders.map((order) => order.vendor)].sort(), ["Пи Джи Групп", "РР-Электро"]);
  assert.ok(created.orders.every((order) => order.type === "Покупка товара" && order.paymentStatus === "Не оплачено" && order.status === "Принят"));
  assert.equal(created.orders.find((order) => order.vendor === "Пи Джи Групп").contractId, "contract-101-supply-pg");
  assert.equal(created.orders.find((order) => order.vendor === "РР-Электро").contractId, "contract-101-supply-rr");
  assert.equal(created.orders.find((order) => order.vendor === "Пи Джи Групп").accountingSystem, "PG");
  assert.equal(created.orders.find((order) => order.vendor === "РР-Электро").accountingSystem, "RR");
  assert.equal(created.orders.find((order) => order.vendor === "Пи Джи Групп").invoiceNumber, "ПГ-100");
  assert.equal(created.orders.find((order) => order.vendor === "РР-Электро").invoiceNumber, "РР-100");
  assert.ok(created.orders.every((order) => context.LkpBrowserStore.getOrderDocuments(order.number).filter((item) => item.type === "Счёт на оплату").length === 1));
  assert.equal(context.LkpBrowserStore.getCart().length, 0);
  assert.equal(context.LkpBrowserStore.getCarts().length, 1);
});

test("invoice sequences remain independent and invoices are idempotent across reloads", () => {
  const localStorage = memoryStorage();
  const first = browserContext(localStorage);
  const created = first.LkpBusiness.checkout(checkoutInput);
  const pg = created.orders.find((order) => order.accountingSystem === "PG");
  first.LkpBusiness.ensureInvoice(pg.number);
  first.LkpBusiness.ensureInvoice(pg.number);
  assert.equal(first.LkpBrowserStore.getOrderDocuments(pg.number).filter((item) => item.type === "Счёт на оплату").length, 1);

  first.LkpBrowserStore.saveCart([{ key: "101|Пи Джи Групп|AQSI-6F", organizationId: "101", vendor: "Пи Джи Групп", productCode: "AQSI-6F", quantity: 1 }]);
  const refreshed = browserContext(localStorage);
  const second = refreshed.LkpBusiness.checkout(checkoutInput);
  assert.equal(second.orders[0].invoiceNumber, "ПГ-101");
  assert.equal(refreshed.LkpBrowserStore.getState().nextIds.invoiceRr, 101);
});

test("cart quantity stays within 1..500 and removal affects only the selected row", () => {
  const context = browserContext();
  const before = context.LkpBrowserStore.getCart();
  const key = before[0].key;
  context.LkpBusiness.setCartQuantity(key, 1);
  assert.equal(context.LkpBrowserStore.getCart().find((item) => item.key === key).quantity, 1);
  context.LkpBusiness.setCartQuantity(key, 500);
  assert.equal(context.LkpBrowserStore.getCart().find((item) => item.key === key).quantity, 500);
  assert.throws(() => context.LkpBusiness.setCartQuantity(key, 0), /от 1 до 500/);
  assert.throws(() => context.LkpBusiness.setCartQuantity(key, 501), /от 1 до 500/);
  assert.throws(() => context.LkpBusiness.setCartQuantity(key, 2.5), /целым/);
  const unchanged = JSON.stringify(context.LkpBrowserStore.getCart());
  assert.equal(JSON.stringify(context.LkpBrowserStore.getCart()), unchanged, "cancel means no remove operation is called");
  const removed = context.LkpBrowserStore.getCart()[1];
  context.LkpBusiness.removeCartItem(removed.key);
  const after = context.LkpBrowserStore.getCart();
  assert.equal(after.length, before.length - 1);
  assert.equal(after.some((item) => item.key === removed.key), false);
  assert.equal(after.some((item) => item.key === key), true);
});

test("ООО Бета has only PG products and RR remains unavailable", () => {
  const context = browserContext();
  const rrProduct = context.LkpBrowserStore.getProducts().find((item) => item.code === "RR-01F");
  assert.equal(rrProduct.availableOrganizationIds.includes("102"), false);
  assert.equal(context.LkpBusiness.getPurchaseAvailability("102", "РР-Электро").canPurchase, false);
});

test("product payment, readiness and UPD transitions are shared and idempotent", () => {
  const context = browserContext();
  const created = context.LkpBusiness.checkout(checkoutInput);
  const pg = created.orders.find((order) => order.accountingSystem === "PG");
  const rr = created.orders.find((order) => order.accountingSystem === "RR");

  context.LkpBusiness.processPayment(pg.number);
  context.LkpBusiness.processPayment(pg.number);
  assert.equal(context.LkpBrowserStore.getOrder(pg.number).paymentStatus, "Оплачено");
  assert.equal(context.LkpBrowserStore.getOrder(pg.number).status, "Ожидание сборки");
  assert.equal(context.LkpBrowserStore.getOrder(pg.number).history.filter((item) => item.toStatus === "Ожидание сборки").length, 1);
  context.LkpBusiness.postUpd(pg.number);
  context.LkpBusiness.postUpd(pg.number);
  assert.equal(context.LkpBrowserStore.getOrder(pg.number).status, "Отгружен");
  assert.equal(context.LkpBrowserStore.getOrderDocuments(pg.number).filter((item) => item.type === "УПД").length, 1);
  assert.throws(() => context.LkpBusiness.cancelOrder(pg.number), /Нельзя отменить заказ с проведённой УПД/);

  context.LkpBusiness.processPayment(rr.number);
  context.LkpBusiness.markReadyToShip(rr.number);
  assert.equal(context.LkpBrowserStore.getOrder(rr.number).status, "Готов к отгрузке");
  context.LkpBusiness.cancelOrder(rr.number);
  assert.equal(context.LkpBrowserStore.getOrder(rr.number).status, "Отменен");
});

test("advance order creates an invoice but credits balance only once after payment and keeps accepted status", () => {
  const context = browserContext();
  const initial = context.LkpBrowserStore.getBalances()["101"];
  const order = context.LkpBusiness.createAdvanceOrder({ organizationId: "101", amountCents: 250000 });
  assert.equal(order.status, "Принят");
  assert.equal(order.paymentStatus, "Не оплачено");
  assert.equal(context.LkpBrowserStore.getBalances()["101"], initial);
  assert.equal(context.LkpBrowserStore.getOrderDocuments(order.number).filter((item) => item.type === "Счёт на оплату").length, 1);
  context.LkpBusiness.processPayment(order.number);
  context.LkpBusiness.processPayment(order.number);
  const paid = context.LkpBrowserStore.getOrder(order.number);
  assert.equal(paid.status, "Принят");
  assert.equal(paid.paymentStatus, "Оплачено");
  assert.equal(context.LkpBrowserStore.getBalances()["101"], initial + 2500);
});

test("prepaid activation debits balance once and creates one paid shipped accounting order with invoice and UPD", () => {
  const context = browserContext();
  const initial = context.LkpBrowserStore.getBalances()["101"];
  const activation = context.LkpBusiness.createActivation({ organizationId: "101", items: oneLicense() });
  assert.equal(context.LkpBrowserStore.getBalances()["101"], initial);
  context.LkpBusiness.completeActivation(activation.number);
  context.LkpBusiness.completeActivation(activation.number);
  const completed = context.LkpBrowserStore.getActivation(activation.number);
  const order = context.LkpBrowserStore.getOrder(completed.orderNumber);
  assert.equal(completed.status, "Выполнена");
  assert.equal(completed.paymentStatus, "Оплачено");
  assert.equal(context.LkpBrowserStore.getBalances()["101"], initial - 1000);
  assert.equal(order.type, "Активация лицензий");
  assert.equal(order.accountingSystem, "PG");
  assert.equal(order.status, "Отгружен");
  assert.equal(order.paymentStatus, "Оплачено");
  assert.equal(context.LkpBrowserStore.getOrders().filter((item) => item.activationNumber === activation.number).length, 1);
  assert.equal(context.LkpBrowserStore.getOrderDocuments(order.number).filter((item) => item.type === "Счёт на оплату").length, 1);
  assert.equal(context.LkpBrowserStore.getOrderDocuments(order.number).filter((item) => item.type === "УПД").length, 1);
});

test("postpaid activation never uses balance and later payment updates both order and activation", () => {
  const context = browserContext();
  const before = context.LkpBrowserStore.getBalanceRecords().filter((item) => item.organizationId === "102");
  const activation = context.LkpBusiness.createActivation({ organizationId: "102", items: oneLicense(900000) });
  context.LkpBusiness.completeActivation(activation.number);
  const completed = context.LkpBrowserStore.getActivation(activation.number);
  const order = context.LkpBrowserStore.getOrder(completed.orderNumber);
  assert.equal(completed.paymentStatus, "Не оплачено");
  assert.equal(order.paymentStatus, "Не оплачено");
  assert.equal(order.status, "Отгружен");
  assert.deepEqual(context.LkpBrowserStore.getBalanceRecords().filter((item) => item.organizationId === "102"), before);
  context.LkpBusiness.processPayment(order.number);
  context.LkpBusiness.processPayment(order.number);
  assert.equal(context.LkpBrowserStore.getOrder(order.number).paymentStatus, "Оплачено");
  assert.equal(context.LkpBrowserStore.getOrder(order.number).status, "Отгружен");
  assert.equal(context.LkpBrowserStore.getActivation(activation.number).paymentStatus, "Оплачено");
  assert.deepEqual(context.LkpBrowserStore.getBalanceRecords().filter((item) => item.organizationId === "102"), before);
});

test("license file contains the selected activation keys and is unavailable before completion", () => {
  const context = browserContext();
  const activation = context.LkpBusiness.createActivation({ organizationId: "101", items: oneLicense() });
  assert.equal(context.LkpBrowserStore.getDocuments().some((item) => item.activationNumber === activation.number && item.type === "Файл лицензий"), false);
  context.LkpBusiness.completeActivation(activation.number);
  const completed = context.LkpBrowserStore.getActivation(activation.number);
  const content = context.LkpBusiness.documentText(completed.licenseFileDocumentId);
  assert.match(content, new RegExp(`Активация № ${activation.number}`));
  assert.match(content, /1234567890123456/);
  assert.match(content, new RegExp(`DEMO-${activation.number}-1`));
});

test("invoice and UPD are empty PDF downloads while the license file stays text", () => {
  const context = browserContext();
  const invoice = context.LkpBrowserStore.getDocuments().find((item) => item.type === "Счёт на оплату");
  const upd = context.LkpBrowserStore.getDocuments().find((item) => item.type === "УПД");
  const license = context.LkpBrowserStore.getDocuments().find((item) => item.type === "Файл лицензий");
  assert.match(invoice.filename, /\.pdf$/);
  assert.match(upd.filename, /\.pdf$/);
  assert.equal(context.LkpBusiness.documentText(invoice.id), "");
  assert.equal(context.LkpBusiness.documentText(upd.id), "");
  assert.match(license.filename, /\.txt$/);
  assert.equal(context.LkpBrowserStore.getOrderDocuments("12540").some((item) => item.type === "Файл лицензий"), false);
});

test("offer acceptance is tied to the current sublicensing contract type version", () => {
  const context = browserContext();
  const initialStatus = context.LkpBusiness.getOfferStatus("101");
  assert.equal(initialStatus.version, "1");
  assert.equal(initialStatus.isAccepted, false);
  assert.equal(initialStatus.hasPreviousAcceptance, false);
  const accepted = context.LkpBusiness.acceptOffer("101");
  assert.equal(context.LkpBusiness.getOfferStatus("101").isAccepted, true);
  context.LkpBrowserStore.updateReferenceItem("contracts", accepted.contract.id, { description: "Новая редакция" });
  assert.equal(context.LkpBusiness.getOfferStatus("101").isAccepted, true);
  const contractType = context.LkpBrowserStore.getReferenceItems("contract-types").find((item) => item.name === "Сублицензионный договор");
  context.LkpBrowserStore.updateReferenceItem("contract-types", contractType.id, { contractVersion: 2 });
  assert.equal(context.LkpBusiness.getOfferStatus("101").isAccepted, false);
  assert.equal(context.LkpBusiness.getOfferStatus("101").hasPreviousAcceptance, true);
});

test("accounting routing excludes advances and licenses from RR", () => {
  const context = browserContext();
  const created = context.LkpBusiness.checkout(checkoutInput);
  const advance = context.LkpBusiness.createAdvanceOrder({ organizationId: "101", amountCents: 100000 });
  const activation = context.LkpBusiness.createActivation({ organizationId: "101", items: oneLicense() });
  context.LkpBusiness.completeActivation(activation.number);
  const pgNumbers = context.LkpBusiness.getAccountingOrders("PG").map((order) => order.number);
  const rrOrders = context.LkpBusiness.getAccountingOrders("RR");
  assert.ok(pgNumbers.includes(advance.number));
  assert.ok(pgNumbers.includes(context.LkpBrowserStore.getActivation(activation.number).orderNumber));
  assert.ok(pgNumbers.includes(created.orders.find((order) => order.accountingSystem === "PG").number));
  assert.ok(rrOrders.every((order) => order.type === "Покупка товара" && order.vendor === "РР-Электро"));
});

test("reset restores the complete canonical v10 state", () => {
  const context = browserContext();
  context.LkpBrowserStore.updateOrganization("102", { name: "ООО Альфа" });
  context.LkpBusiness.checkout(checkoutInput);
  context.LkpBrowserStore.resetDemoData();
  assert.equal(context.LkpBrowserStore.getState().schemaVersion, 10);
  assert.equal(context.LkpBrowserStore.getOrganizations().find((item) => item.id === "102").name, "ООО Бета");
  assert.equal(context.LkpBrowserStore.getOrders().length, 2);
  assert.equal(context.LkpBrowserStore.getDocuments().length, 4);
  assert.equal(context.LkpBrowserStore.getBalances()["101"], 6000);
});
