import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../public/lkp.html", import.meta.url), "utf8");
const dataScript = await readFile(new URL("../public/lkp-data.js", import.meta.url), "utf8");
const script = await readFile(new URL("../public/lkp.js", import.meta.url), "utf8");
const demoScript = await readFile(new URL("../public/lkp-demo-data.js", import.meta.url), "utf8");
const storageScript = await readFile(new URL("../public/lkp-browser-storage.js", import.meta.url), "utf8");
const businessScript = await readFile(new URL("../public/lkp-browser-business.js", import.meta.url), "utf8");
const style = await readFile(new URL("../public/lkp.css", import.meta.url), "utf8");
const adminStyle = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const adminPanel = await readFile(new URL("../app/admin/admin-panel.tsx", import.meta.url), "utf8");
const licensesPanel = await readFile(new URL("../app/admin/licenses-panel.tsx", import.meta.url), "utf8");
const referencePanel = await readFile(new URL("../app/admin/reference-panel.tsx", import.meta.url), "utf8");
const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
const viteConfig = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
const homePage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const adminPage = await readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
const rootLayout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const accountingPanel = await readFile(new URL("../app/accounting-panel.tsx", import.meta.url), "utf8");
const oneCPgPage = await readFile(new URL("../app/1cpg/page.tsx", import.meta.url), "utf8");
const oneCRrPage = await readFile(new URL("../app/1crr/page.tsx", import.meta.url), "utf8");
const source = `${html}\n${style}\n${demoScript}\n${storageScript}\n${businessScript}\n${dataScript}\n${script}`;

test("keeps the main LKP prototype script syntactically valid", () => {
  assert.match(source, /<script src="\.\/lkp-data\.js"><\/script>/);
  assert.match(source, /<script src="\.\/lkp-browser-storage\.js"><\/script>/);
  assert.match(source, /<script src="\.\/lkp-browser-business\.js"><\/script>/);
  assert.doesNotThrow(() => new Function(demoScript));
  assert.doesNotThrow(() => new Function(storageScript));
  assert.doesNotThrow(() => new Function(businessScript));
  assert.match(source, /<script src="\.\/lkp\.js"><\/script>/);
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
  assert.doesNotMatch(`${html}\n${dataScript}\n${script}`, /Админ-панель/);
  assert.doesNotMatch(html, /href="\/admin"/);
});

test("keeps invoices, permanent-partner prices and activation accounting synchronized", () => {
  assert.match(source, /<th>№ счета<\/th>/);
  assert.match(source, /details\?\.invoice \|\| \(licenseOrder \? "ПГ-362" : o\[1\]\)/);
  assert.match(source, /type: "Активация лицензий"/);
  assert.match(source, /status: "Отгружен", paymentStatus: "Оплачено"/);
  assert.match(dataScript, /browserBusiness\.createActivation/);
  assert.match(dataScript, /browserBusiness\.completeActivation\(activationNumber\)/);
  assert.match(businessScript, /ensureInvoiceInState\(state, order\)/);
  assert.match(businessScript, /ensureUpdInState\(state, order, now\)/);
  assert.match(source, /rrpCents: 3000000, partnerPriceCents: 2500000, priceCents: 2300000/);
  assert.match(source, /pricePopover\(p\)/);
  assert.match(source, /class="catalog-price">Ваша цена<\/th><th class="catalog-quantity">Количество/);
});

test("keeps production export static and compatible with the GitHub Pages base path", () => {
  assert.match(nextConfig, /output: "export"/);
  assert.match(nextConfig, /trailingSlash: true/);
  assert.match(viteConfig, /NEXT_PUBLIC_BASE_PATH/);
  assert.match(viteConfig, /base: pagesBasePath \? `\$\{pagesBasePath\}\//);
  assert.match(homePage, /src=\{`\$\{basePath\}\/lkp\.html`\}/);
  assert.match(homePage, /export const dynamic = "force-static"/);
  assert.match(adminPage, /export const dynamic = "force-static"/);
  assert.match(adminPanel, /href=\{`\$\{basePath\}\/`\}/);
  assert.match(rootLayout, /src=\{`\$\{basePath\}\/lkp-demo-data\.js`\}/);
  assert.match(rootLayout, /export const dynamic = "force-static"/);
  assert.match(html, /href="\.\/lkp\.css"/);
  assert.doesNotMatch(html, /(?:src|href)="\/lkp/);
});

test("connects the existing LKP screens to the shared browser order flow", () => {
  assert.match(source, /const browserStore = window\.LkpBrowserStore/);
  assert.match(source, /const browserBusiness = window\.LkpBusiness/);
  assert.match(source, /browserBusiness\.checkout/);
  assert.match(source, /Корзина и заказы сохранены в browser storage/);
  assert.doesNotMatch(dataScript, /fetch\(/);
  assert.doesNotMatch(dataScript, /\/api\/catalog/);
  assert.doesNotMatch(dataScript, /\/api\/orders/);
  assert.match(source, /refreshServerOrder/);
  assert.match(source, /visibleOrderRows/);
  assert.match(source, /visibleActivations/);
  assert.match(source, /organizationAccessLoaded/);
  assert.match(source, /schemaVersion: 10/);
  assert.match(source, /lkp-digital-copy-state/);
  assert.match(source, /ordersLoadError/);
  assert.match(source, /orderDetailsError/);
});

test("checkout comments, button feedback and navigation restoration are wired into the current UI", () => {
  assert.match(dataScript, /data-comment-organization-id/);
  assert.match(dataScript, /comments\[`\$\{textarea\.dataset\.commentOrganizationId\}\|\$\{textarea\.dataset\.commentVendor\}`\] = value/);
  assert.match(businessScript, /input\.comments\?\.\[group\.key\] \?\? input\.comment/);
  assert.match(style, /\.btn:not\(:disabled\):active/);
  assert.match(adminStyle, /button:not\(:disabled\):active/);
  assert.match(dataScript, /function persistNavigation\(page, context\)/);
  assert.match(dataScript, /function restoreNavigation\(\)/);
  assert.match(script, /const restoredNavigation = restoreNavigation\(\)/);
  assert.match(script, /render\(restoredNavigation\.page, restoredNavigation\.context\)/);
});

test("loads persistent contacts, shows the full catalog and splits checkout by organization and vendor", () => {
  assert.match(source, /browserStore\.getContacts\(\)/);
  assert.match(source, /browserStore\.createContact\(input\)/);
  assert.match(source, /createServerContact/);
  assert.match(source, /contactForm\.dataset\.submitBound !== "true"/);
  assert.match(source, /contactForm\.dataset\.submitBound = "true"/);
  assert.match(source, /refreshContacts\(\)/);
  assert.match(source, /syncBrowserData\(\)/);
  assert.match(source, /const key = `\$\{organization\.id\}\|\$\{product\.vendor\}`/);
  assert.match(businessScript, /state\.carts\.unshift\(cartRecord\)/);
  assert.match(businessScript, /state\.orders\.unshift\(\.\.\.orders\)/);
  assert.match(source, /replaceStoredOrders\(browserStore\.getOrders\(\)\)/);
  assert.match(source, /visibleOrderRows = rows => rows\.filter\(order => storedOrderNumbers\.has\(order\[0\]\)\)/);
  assert.match(source, /storedOrders\.forEach\(upsertStoredOrder\)/);
  assert.doesNotMatch(source, /\["12518", "СЧ-9055"/);
  assert.doesNotMatch(source, /\["12497", "СЧ-9024"/);
  assert.match(source, /cartNumber: order\.cartNumber \|\| ""/);
  assert.match(source, /number: created\.cart\.number/);
});

test("keeps activation orders in state.orders and links the LKP list and card explicitly", () => {
  assert.match(demoScript, /number: "12540"[\s\S]+?type: "Активация лицензий"[\s\S]+?activationNumber: "123"/);
  assert.match(demoScript, /id: "123", number: "123", orderNumber: "12540"/);
  assert.match(storageScript, /const demoActivationOrder = demo\.orders\.find\(order => order\.number === "12540"\)/);
  assert.match(storageScript, /state\.orders\.unshift\(linkedOrder\)/);
  assert.match(dataScript, /activationNumber: order\.activationNumber \|\| ""/);
  assert.match(businessScript, /type: ACTIVATION_ORDER, activationNumber: activation\.number/);
  assert.match(script, /a\[0\] === details\?\.activationNumber \|\| a\[1\] === o\[0\]/);
  assert.match(adminPanel, /type: order\.type \|\| "Покупка товара"/);
  assert.doesNotMatch(source, /licenseOrders\s*=/);
});

test("keeps status history out of the partner order card", () => {
  assert.doesNotMatch(script, /История статусов/);
  assert.doesNotMatch(script, /changedByEmail/);
});

test("admin data section keeps business tiles in fixed order without an events journal", () => {
  const titles = [
    "Партнёры", "Контрагенты", "Заказы", "Список продукции", "Виды цен", "Статусы партнёров", "Вендоры", "Условия поставки",
    "Типы договоров", "Договоры", "Категории", "Товарные группы", "Статусы заказов", "Модели", "Лицензии",
  ];
  let cursor = -1;
  titles.forEach((title) => {
    const next = adminPanel.indexOf(`title: "${title}"`);
    assert.ok(next > cursor, `${title} must retain its position`);
    cursor = next;
  });
  assert.match(adminPanel, /grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8/);
  assert.doesNotMatch(adminPanel, /title: "События"/);
});

test("references, contracts, balances and advance orders use the shared browser state", () => {
  assert.match(demoScript, /const contracts = \[/);
  assert.match(demoScript, /balances: \[\{/);
  assert.match(demoScript, /documents: \[/);
  assert.match(demoScript, /references: \{/);
  assert.match(storageScript, /migrations\[3\] = state =>/);
  assert.match(storageScript, /getReferenceItems, createReferenceItem, updateReferenceItem/);
  assert.match(referencePanel, /window\.LkpBrowserStore\.getReferenceItems\(kind\)/);
  assert.match(referencePanel, /window\.LkpBrowserStore\.subscribe\(load\)/);
  assert.match(dataScript, /browserStore\.getContracts\(\)/);
  assert.match(businessScript, /function activeContract/);
  assert.match(businessScript, /function createAdvanceOrder/);
  assert.match(dataScript, /browserStore\.getBalances\(\)/);
  assert.doesNotMatch(dataScript, /browserStore\.updateBalance/);
  assert.match(demoScript, /number: "12480"[^\n]+type: "Авансовый платеж"/);
});

test("frontend runtime has no fetch to legacy business APIs", () => {
  const runtimeSource = `${dataScript}\n${script}\n${businessScript}\n${adminPanel}\n${licensesPanel}\n${referencePanel}`;
  assert.doesNotMatch(runtimeSource, /fetch\s*\(/);
  assert.doesNotMatch(runtimeSource, /\/api\/(?:admin\/references|catalog|contacts|orders|organizations|products|activations|contracts|balances|advance)/);
});

test("LKP and Admin licenses use the same browser storage and centralized reset notification", () => {
  assert.match(dataScript, /browserStore\.getActivations\(\)/);
  assert.match(dataScript, /browserStore\.getLicenses\(\)/);
  assert.match(licensesPanel, /window\.LkpBrowserStore\.getActivations\(\)/);
  assert.match(licensesPanel, /window\.LkpBrowserStore\.updateActivation/);
  assert.match(licensesPanel, /window\.LkpBrowserStore\.subscribe/);
  assert.doesNotMatch(licensesPanel, /fetch\(/);
  assert.doesNotMatch(licensesPanel, /\/api\/admin\/activations/);
  assert.match(storageScript, /write\(demoState\(\), "reset"\)/);
});

test("cart UI uses shared quantity and removal operations with the required confirmation", () => {
  assert.match(dataScript, /data-cart-minus/);
  assert.match(dataScript, /data-cart-plus/);
  assert.match(dataScript, /data-cart-input/);
  assert.match(dataScript, /data-cart-remove-item/);
  assert.match(dataScript, /<div class="page-title">Подтвердите<\/div><div class="notice">Удалить товар из корзины\?<\/div>/);
  assert.match(script, /browserBusiness\.setCartQuantity/);
  assert.match(script, /browserBusiness\.removeCartItem/);
});

test("keeps offer versions, PDF downloads and uniform boolean flags in the shared UI", () => {
  assert.match(businessScript, /function getOfferStatus/);
  assert.match(businessScript, /function acceptOffer/);
  assert.match(businessScript, /application\/pdf/);
  assert.match(script, /browserBusiness\.acceptOffer/);
  assert.match(dataScript, /boolean-flag/);
  assert.match(accountingPanel, /<BooleanFlag/);
  assert.match(adminPanel, /document\.type === "УПД"/);
});

test("exports both accounting routes and keeps their operations in the shared business layer", () => {
  assert.match(oneCPgPage, /<AccountingPanel system="PG" \/>/);
  assert.match(oneCRrPage, /<AccountingPanel system="RR" \/>/);
  assert.match(accountingPanel, /getAccountingOrders\(system\)/);
  assert.match(accountingPanel, /LkpBusiness\.processPayment/);
  assert.match(accountingPanel, /LkpBusiness\.postUpd/);
  assert.match(accountingPanel, /Провести поступление денег/);
  assert.match(accountingPanel, /Провести УПД/);
  assert.match(accountingPanel, /NEXT_PUBLIC_BASE_PATH/);
});
