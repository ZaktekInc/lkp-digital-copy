import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const scripts = ["public/lkp-demo-data.js", "public/lkp-browser-storage.js", "public/lkp-browser-business.js"]
  .map((file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function browserContext(localStorage = memoryStorage()) {
  const context = vm.createContext({ localStorage, console });
  context.window = context;
  context.globalThis = context;
  scripts.forEach((source) => vm.runInContext(source, context));
  return context;
}

test("schema version 1 is upgraded once with shared license data", () => {
  const localStorage = memoryStorage();
  const seedContext = browserContext();
  const oldState = JSON.parse(JSON.stringify(seedContext.LkpDemoData));
  oldState.schemaVersion = 1;
  delete oldState.licenses;
  delete oldState.activations;
  delete oldState.balances;
  localStorage.setItem("lkp-digital-copy-state", JSON.stringify(oldState));

  const migrated = browserContext(localStorage);
  assert.equal(migrated.LkpBrowserStore.getState().schemaVersion, 5);
  assert.equal(migrated.LkpBrowserStore.getLicenses().length, 2);
  assert.equal(migrated.LkpBrowserStore.getActivations().length, 2);
  assert.equal(JSON.parse(localStorage.getItem("lkp-digital-copy-state")).schemaVersion, 5);
});

test("schema version 2 repairs the demo activation order in the common order collection", () => {
  const localStorage = memoryStorage();
  const seedContext = browserContext();
  const oldState = JSON.parse(JSON.stringify(seedContext.LkpDemoData));
  oldState.schemaVersion = 2;
  oldState.orders = oldState.orders.filter((order) => order.number !== "12540");
  localStorage.setItem("lkp-digital-copy-state", JSON.stringify(oldState));

  const migrated = browserContext(localStorage);
  const activation = migrated.LkpBrowserStore.getActivation("123");
  const order = migrated.LkpBrowserStore.getOrder("12540");
  assert.equal(migrated.LkpBrowserStore.getState().schemaVersion, 5);
  assert.equal(activation.orderNumber, "12540");
  assert.equal(order.type, "Активация лицензий");
  assert.equal(order.activationNumber, "123");
  assert.equal(order.organizationId, activation.organizationId);
  assert.equal(migrated.LkpBrowserStore.getOrder("12480").type, "Авансовый платеж");
});

test("schema version 3 adds references and contracts without replacing browser-only data", () => {
  const localStorage = memoryStorage();
  const seedContext = browserContext();
  const oldState = JSON.parse(JSON.stringify(seedContext.LkpDemoData));
  oldState.schemaVersion = 3;
  delete oldState.references;
  delete oldState.contracts;
  delete oldState.nextIds.reference;
  oldState.balances["101"] = 7777;
  oldState.orders.unshift({ ...oldState.orders[1], number: "77777", type: "Покупка товара" });
  localStorage.setItem("lkp-digital-copy-state", JSON.stringify(oldState));

  const migrated = browserContext(localStorage);
  assert.equal(migrated.LkpBrowserStore.getState().schemaVersion, 5);
  assert.equal(migrated.LkpBrowserStore.getReferenceItems("vendors").length, 3);
  assert.deepEqual([...migrated.LkpBrowserStore.getContracts().map((item) => item.name)], ["Основной договор", "Другой активный договор"]);
  assert.equal(migrated.LkpBrowserStore.getBalances()["101"], 7777);
  assert.ok(migrated.LkpBrowserStore.getOrder("77777"));
  assert.equal(migrated.LkpBrowserStore.getActivation("123").orderNumber, "12540");
  assert.equal(migrated.LkpBrowserStore.getOrder("12540").activationNumber, "123");
});

test("schema version 4 adds vendor invoice counters without replacing browser orders", () => {
  const localStorage = memoryStorage();
  const seedContext = browserContext();
  const oldState = JSON.parse(JSON.stringify(seedContext.LkpDemoData));
  oldState.schemaVersion = 4;
  delete oldState.nextIds.invoicePg;
  delete oldState.nextIds.invoiceRr;
  const userOrder = { ...oldState.orders[1], number: "77778", type: "Покупка товара", vendor: "Пи Джи Групп" };
  delete userOrder.invoiceNumber;
  const invoicedOrder = { ...userOrder, number: "77779", invoiceNumber: "ПГ-105" };
  oldState.orders.unshift(userOrder, invoicedOrder);
  localStorage.setItem("lkp-digital-copy-state", JSON.stringify(oldState));

  const migrated = browserContext(localStorage);
  assert.equal(migrated.LkpBrowserStore.getState().schemaVersion, 5);
  assert.equal(migrated.LkpBrowserStore.getOrder("77779").invoiceNumber, "ПГ-105");
  assert.equal(migrated.LkpBrowserStore.getOrder("77778").invoiceNumber, "ПГ-106");
  assert.equal(migrated.LkpBrowserStore.getState().nextIds.invoicePg, 107);
  assert.equal(migrated.LkpBrowserStore.getActivation("123").orderNumber, "12540");
});

test("storage initializes once, persists shared entities, and resets demo data", () => {
  const localStorage = memoryStorage();
  const first = browserContext(localStorage);
  assert.equal(first.LkpBrowserStore.getState().schemaVersion, 5);
  const demoOrderNumbers = first.LkpBrowserStore.getOrders().map((item) => item.number);
  const demoActivationOrder = first.LkpBrowserStore.getOrder("12540");
  const demoActivation = first.LkpBrowserStore.getActivation("124");
  const demoLicense = first.LkpBrowserStore.getActivation("123").items[0].licenseKeys[0];
  const demoVendor = first.LkpBrowserStore.getReferenceItems("vendors")[0];
  const demoContract = first.LkpBrowserStore.getContracts()[0];
  const demoBalance = first.LkpBrowserStore.getBalances()["101"];
  const notifications = [];
  first.LkpBrowserStore.subscribe((change) => notifications.push(change.reason));
  first.LkpBrowserStore.updateOrganization("102", { name: "ООО Альфа" });
  first.LkpBrowserStore.updateProduct("AQSI-5F", { name: "ПАК aQsi 5Ф — обновлён" });
  first.LkpBrowserStore.createContact({ department: "Продажи", position: "Менеджер", fullName: "Сидоров Сидор", phone: "+7 900 300-30-30", email: "sidorov@example.ru" });
  first.LkpBrowserStore.updateActivation("124", { status: "Ошибка", comment: "Изменено в Admin" });
  first.LkpBrowserStore.updateLicense(demoLicense.id, { status: "Отозвана" });
  first.LkpBrowserStore.updateReferenceItem("vendors", demoVendor.id, { name: "Изменённый вендор" });
  first.LkpBrowserStore.updateReferenceItem("contracts", demoContract.id, { description: "Изменённый договор" });
  first.LkpBrowserStore.updateBalance("101", 4321);
  const created = first.LkpBusiness.checkout({ contactName: "Иванов Иван Иванович", contactPhone: "+7 987 654 32 10", contactEmail: "example@mail.ru", deliveryTerms: "Предоплата 100%" });

  const refreshed = browserContext(localStorage);
  assert.equal(refreshed.LkpBrowserStore.getOrganizations().find((item) => item.id === "102").name, "ООО Альфа");
  assert.equal(refreshed.LkpBrowserStore.getProducts().find((item) => item.code === "AQSI-5F").name, "ПАК aQsi 5Ф — обновлён");
  assert.equal(refreshed.LkpBrowserStore.getContacts().filter((item) => item.email === "sidorov@example.ru").length, 1);
  assert.equal(refreshed.LkpBrowserStore.getActivation("124").status, "Ошибка");
  assert.equal(refreshed.LkpBrowserStore.getActivation("123").items[0].licenseKeys[0].status, "Отозвана");
  assert.equal(refreshed.LkpBrowserStore.getActivation("123").orderNumber, "12540");
  assert.equal(refreshed.LkpBrowserStore.getOrder("12540").activationNumber, "123");
  assert.equal(refreshed.LkpBrowserStore.getOrders().filter((order) => order.number === "12540").length, 1);
  assert.equal(refreshed.LkpBrowserStore.getReferenceItems("vendors").find((item) => item.id === demoVendor.id).name, "Изменённый вендор");
  assert.equal(refreshed.LkpBrowserStore.getContracts({ includeInactive: true }).find((item) => item.id === demoContract.id).description, "Изменённый договор");
  assert.equal(refreshed.LkpBrowserStore.getBalances()["101"], 4321);
  assert.ok(refreshed.LkpBrowserStore.getOrder(created.orders[0].number));

  refreshed.LkpBrowserStore.resetDemoData();
  assert.equal(refreshed.LkpBrowserStore.getOrganizations().find((item) => item.id === "102").name, "ООО Бета");
  assert.deepEqual([...refreshed.LkpBrowserStore.getOrders().map((item) => item.number)], [...demoOrderNumbers]);
  assert.equal(refreshed.LkpBrowserStore.getOrder(created.orders[0].number), null);
  assert.equal(refreshed.LkpBrowserStore.getActivation("124").status, demoActivation.status);
  assert.equal(refreshed.LkpBrowserStore.getActivation("124").comment, demoActivation.comment);
  assert.equal(refreshed.LkpBrowserStore.getActivation("123").items[0].licenseKeys[0].status, demoLicense.status);
  assert.equal(refreshed.LkpBrowserStore.getActivation("123").orderNumber, demoActivationOrder.number);
  assert.equal(refreshed.LkpBrowserStore.getOrder(demoActivationOrder.number).activationNumber, "123");
  assert.equal(refreshed.LkpBrowserStore.getLicenses().length, 2);
  assert.equal(refreshed.LkpBrowserStore.getReferenceItems("vendors").find((item) => item.id === demoVendor.id).name, demoVendor.name);
  assert.equal(refreshed.LkpBrowserStore.getContracts()[0].description, demoContract.description);
  assert.equal(refreshed.LkpBrowserStore.getBalances()["101"], demoBalance);
  assert.equal(refreshed.LkpBrowserStore.getOrder("12480").type, "Авансовый платеж");

  first.LkpBrowserStore.resetDemoData();
  assert.equal(notifications.at(-1), "reset");
});

test("checkout creates one cart and one order per organization and vendor", () => {
  const context = browserContext();
  const contract = context.LkpBrowserStore.getContracts()[0];
  const created = context.LkpBusiness.checkout({ contactName: "Иванов Иван Иванович", contactPhone: "+7 987 654 32 10", contactEmail: "example@mail.ru", deliveryTerms: "Предоплата 100%", comment: "Общий комментарий", contractIds: { "101|Пи Джи Групп": contract.id, "101|РР-Электро": contract.id } });

  assert.equal(created.cart.number, "653");
  assert.equal(created.orders.length, 2);
  assert.deepEqual([...created.orders.map((order) => order.vendor)].sort(), ["Пи Джи Групп", "РР-Электро"]);
  assert.equal(new Set(created.orders.map((order) => order.organizationId)).size, 1);
  assert.ok(created.orders.every((order) => order.contractId === contract.id && order.agreement === contract.name));
  assert.ok(created.orders.every((order) => order.comment === "Общий комментарий"));
  assert.equal(created.orders.find((order) => order.vendor === "Пи Джи Групп").invoiceNumber, "ПГ-100");
  assert.equal(created.orders.find((order) => order.vendor === "РР-Электро").invoiceNumber, "РР-100");
  assert.equal(context.LkpBrowserStore.getCart().length, 0);
  assert.equal(context.LkpBrowserStore.getCarts().length, 1);
  assert.equal(context.LkpBrowserStore.getOrders().length, 4);

  const [changed, unchanged] = created.orders;
  context.LkpBrowserStore.updateOrder(changed.number, { status: "Готов к отгрузке" });
  assert.equal(context.LkpBrowserStore.getOrder(changed.number).status, "Готов к отгрузке");
  assert.equal(context.LkpBrowserStore.getOrder(unchanged.number).status, "Принят");
});

test("vendor invoice sequences persist independently across reloads", () => {
  const localStorage = memoryStorage();
  const first = browserContext(localStorage);
  first.LkpBusiness.checkout({ contactName: "Иванов", contactPhone: "+7 900 000-00-00", contactEmail: "test@example.ru" });
  first.LkpBrowserStore.saveCart([{ key: "101|Пи Джи Групп|AQSI-6F", organizationId: "101", vendor: "Пи Джи Групп", productCode: "AQSI-6F", quantity: 1 }]);

  const refreshed = browserContext(localStorage);
  const second = refreshed.LkpBusiness.checkout({ contactName: "Иванов", contactPhone: "+7 900 000-00-00", contactEmail: "test@example.ru" });
  assert.equal(second.orders[0].invoiceNumber, "ПГ-101");
  assert.equal(browserContext(localStorage).LkpBrowserStore.getOrder(second.orders[0].number).invoiceNumber, "ПГ-101");

  refreshed.LkpBrowserStore.resetDemoData();
  const afterReset = refreshed.LkpBusiness.checkout({ contactName: "Иванов", contactPhone: "+7 900 000-00-00", contactEmail: "test@example.ru" });
  assert.equal(afterReset.orders.find((order) => order.vendor === "Пи Джи Групп").invoiceNumber, "ПГ-100");
  assert.equal(afterReset.orders.find((order) => order.vendor === "РР-Электро").invoiceNumber, "РР-100");
});

test("orders are exposed newest first without sorting the canonical state array", () => {
  const context = browserContext();
  const template = context.LkpBrowserStore.getOrder("12480");
  context.LkpBrowserStore.createOrder({ ...template, number: "future", type: "Покупка товара", createdAt: "2030-01-01T00:00:00.000Z" });
  context.LkpBrowserStore.createOrder({ ...template, number: "past", type: "Покупка товара", createdAt: "2020-01-01T00:00:00.000Z" });

  assert.equal(context.LkpBrowserStore.getState().orders[0].number, "past");
  assert.equal(context.LkpBrowserStore.getOrders()[0].number, "future");
});

test("demo advance, paid activation and reset balance stay mathematically consistent", () => {
  const context = browserContext();
  const advance = context.LkpBrowserStore.getOrder("12480");
  const activationOrder = context.LkpBrowserStore.getOrder("12540");
  const activation = context.LkpBrowserStore.getActivation("123");

  assert.equal(advance.organizationId, activation.organizationId);
  assert.equal(advance.totalCents / 100 - activation.totalCents / 100, context.LkpBrowserStore.getBalances()[activation.organizationId]);
  assert.equal(activation.paymentStatus, "Оплачено");
  assert.equal(activationOrder.paymentStatus, "Оплачено");
  assert.equal(activation.status, "Выполнена");

  context.LkpBrowserStore.updateBalance(activation.organizationId, 0);
  context.LkpBrowserStore.resetDemoData();
  assert.equal(context.LkpBrowserStore.getBalances()[activation.organizationId], 6000);
});
