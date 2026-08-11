import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../public/lkp.html", import.meta.url), "utf8");
const dataScript = await readFile(new URL("../public/lkp-data.js", import.meta.url), "utf8");
const script = await readFile(new URL("../public/lkp.js", import.meta.url), "utf8");
const style = await readFile(new URL("../public/lkp.css", import.meta.url), "utf8");
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
