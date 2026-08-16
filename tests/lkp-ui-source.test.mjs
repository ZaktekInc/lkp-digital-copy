import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../public/lkp.html", import.meta.url), "utf8");
const dataScript = await readFile(new URL("../public/lkp-data.js", import.meta.url), "utf8");
const script = await readFile(new URL("../public/lkp.js", import.meta.url), "utf8");
const style = await readFile(new URL("../public/lkp.css", import.meta.url), "utf8");
const adminPanel = await readFile(new URL("../app/admin/admin-panel.tsx", import.meta.url), "utf8");
const source = `${html}\n${style}\n${dataScript}\n${script}`;

test("keeps the main LKP prototype script syntactically valid", () => {
  assert.match(source, /<script src="\/lkp-data\.js"><\/script>/);
  assert.match(source, /<script src="\/lkp\.js"><\/script>/);
  assert.doesNotThrow(() => new Function(dataScript));
  assert.doesNotThrow(() => new Function(script));
});

test("uses compact filter controls without duplicated visible labels", () => {
  assert.match(source, /class="filter-control" data-search-wrap/);
  assert.match(source, /class="filter-add"/);
  assert.match(source, /class="filter-chip"/);
  assert.doesNotMatch(source, />Поиск<input/);
  assert.doesNotMatch(source, />Организация<select/);
  assert.doesNotMatch(source, />Оплата<select/);
});

test("keeps license choices visibly synchronized with their state", () => {
  assert.match(source, /class="form-check-input \$\{license\.selected \? "is-checked" : ""\}"/);
  assert.match(source, /aria-checked="\$\{license\.selected\}"/);
  assert.match(source, /background-image: url\("data:image\/svg\+xml/);
  assert.match(source, /data-license-cell/);
  assert.match(source, /license\.selected = !license\.selected/);
});

test("keeps the current catalog, activation and navigation labels", () => {
  assert.match(source, />Каталог<\/button>/);
  assert.doesNotMatch(source, /Вернуться в каталог/);
  assert.match(source, /placeholder="Проверить серийный номер"/);
  assert.match(source, /data-lucide="file"/);
  assert.match(source, /service: "2 000 ₽", marking: "500 ₽", extended: "1 000 ₽"/);
  assert.match(source, /class="btn special-action" data-order-number/);
  assert.match(source, /class="btn btn-primary" data-page="activations"/);
  assert.doesNotMatch(source, /Админ-панель/);
  assert.doesNotMatch(source, /href="\/admin"/);
});

test("keeps invoices, permanent-partner prices and paid activation order status synchronized", () => {
  assert.match(source, /<th>№ счета<\/th>/);
  assert.match(source, /details\?\.invoice \|\| \(licenseOrder \? "ПГ-362" : o\[1\]\)/);
  assert.match(source, /type === "Активация лицензий" && paid/);
  assert.match(source, /status: "Отгружен", payment: "Оплачено"/);
  assert.match(source, /rrp: 30000, partnerPrice: 25000, price: 23000/);
  assert.match(source, /pricePopover\(p\)/);
  assert.match(source, /class="catalog-price">Ваша цена<\/th><th class="catalog-quantity">Количество/);
});

test("connects the existing LKP screens to the protected D1 order flow", () => {
  assert.match(source, /serverApi\(`\/api\/catalog/);
  assert.match(source, /serverApi\("\/api\/orders"/);
  assert.match(source, /idempotencyKey/);
  assert.match(source, /Заказ сохранён в постоянной базе данных D1/);
  assert.match(source, /refreshServerOrder/);
  assert.match(source, /visibleOrderRows/);
  assert.match(source, /visibleActivations/);
  assert.match(source, /organizationAccessLoaded/);
  assert.match(source, /filter\(order => !savedDetails\[order\[0\]\]\?\.serverId && !isBrowserProductOrder\(order\[0\]\)\)/);
  assert.match(source, /ordersLoadError/);
  assert.match(source, /orderDetailsError/);
});

test("loads persistent contacts, shows the full catalog and splits checkout by organization and vendor", () => {
  assert.match(source, /serverApi\("\/api\/contacts"/);
  assert.match(source, /createServerContact/);
  assert.match(source, /contactForm\.dataset\.submitBound !== "true"/);
  assert.match(source, /contactForm\.dataset\.submitBound = "true"/);
  assert.match(source, /refreshContacts\(\)/);
  assert.match(source, /replaceCatalogProducts\(payload/);
  assert.match(source, /const groupKey = `\$\{item\.org\}\|\$\{item\.vendor\}`/);
  assert.match(source, /cartId: pendingCheckoutKey/);
  assert.match(source, /idempotencyKey: `\$\{pendingCheckoutKey\}:\$\{organizationId\}:\$\{group\.vendor\}`/);
  assert.match(source, /serverOrderNumbers\.has\(order\[0\]\) \|\| isOrganizationVisible/);
  assert.match(source, /replaceServerProductOrders\(Array\.isArray\(payload\.orders\) \? payload\.orders : \[\]\)/);
  assert.match(source, /productNumbers\.forEach\(removeServerOrder\)/);
  assert.doesNotMatch(source, /receivedNumbers/);
  assert.match(source, /isBrowserProductOrder/);
  assert.match(source, /if \(hadPersistentProductOrders\) saveState\(\)/);
  assert.doesNotMatch(source, /\["12518", "СЧ-9055"/);
  assert.doesNotMatch(source, /\["12497", "СЧ-9024"/);
  assert.match(source, /cartNumber: order\.cartNumber \|\| ""/);
  assert.match(source, /number: orderDetails\[createdOrders\[0\]\]\?\.cartNumber/);
  assert.match(source, /\/api\/orders\/\$\{encodeURIComponent\(details\.serverId\)\}/);
});

test("keeps status history out of the partner order card", () => {
  assert.doesNotMatch(script, /История статусов/);
  assert.doesNotMatch(script, /changedByEmail/);
});

test("admin data section keeps all 16 tiles in fixed order with an adaptive grid", () => {
  const titles = [
    "Партнёры", "Контрагенты", "Заказы", "Список продукции", "Виды цен", "Статусы партнёров", "Вендоры", "Условия поставки",
    "Типы договоров", "Договоры", "Категории", "Товарные группы", "Статусы заказов", "Модели", "Лицензии", "События",
  ];
  let cursor = -1;
  titles.forEach((title) => {
    const next = adminPanel.indexOf(`title: "${title}"`);
    assert.ok(next > cursor, `${title} must retain its position`);
    cursor = next;
  });
  assert.match(adminPanel, /grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8/);
});
