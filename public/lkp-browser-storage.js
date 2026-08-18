(function (global) {
  "use strict";

  const STORAGE_KEY = "lkp-digital-copy-state";
  const SCHEMA_VERSION = 5;
  const migrations = {};
  const invoiceSequences = {
    "Пи Джи Групп": { key: "invoicePg", prefix: "ПГ" },
    "РР-Электро": { key: "invoiceRr", prefix: "РР" }
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const subscribers = new Set();

  function demoState() {
    if (!global.LkpDemoData) throw new Error("Демонстрационные данные не загружены");
    return clone(global.LkpDemoData);
  }

  migrations[1] = state => {
    const demo = demoState();
    const demoOrderNumbers = new Set(demo.orders.map(order => order.number));
    state.schemaVersion = 2;
    state.nextIds = { ...demo.nextIds, ...(state.nextIds || {}), activation: demo.nextIds.activation };
    state.orders = [...demo.orders, ...(state.orders || []).filter(order => !demoOrderNumbers.has(order.number))];
    state.licenses = demo.licenses;
    state.activations = demo.activations;
    state.balances = demo.balances;
    delete state.legacy;
    return state;
  };

  migrations[2] = state => {
    const demo = demoState();
    const demoActivationOrder = demo.orders.find(order => order.number === "12540");
    state.schemaVersion = 3;
    state.orders ||= [];
    state.activations ||= [];

    const demoActivation = state.activations.find(item => item.number === "123");
    let linkedOrder = state.orders.find(order => order.number === "12540");
    if (!linkedOrder && demoActivationOrder) {
      linkedOrder = clone(demoActivationOrder);
      state.orders.unshift(linkedOrder);
    }
    if (linkedOrder) linkedOrder.activationNumber = "123";
    if (demoActivation) demoActivation.orderNumber = "12540";

    state.activations.forEach(activation => {
      if (!activation.orderNumber || activation.orderNumber === "—") return;
      const order = state.orders.find(item => item.number === activation.orderNumber);
      if (order && order.type === "Активация лицензий") order.activationNumber = activation.number;
    });
    return state;
  };

  migrations[3] = state => {
    const demo = demoState();
    state.schemaVersion = 4;
    state.nextIds = { ...demo.nextIds, ...(state.nextIds || {}) };
    if (!Number.isInteger(state.nextIds.reference)) state.nextIds.reference = demo.nextIds.reference;
    state.references ||= {};
    Object.entries(demo.references).forEach(([kind, items]) => {
      if (!Array.isArray(state.references[kind])) state.references[kind] = clone(items);
    });
    if (!Array.isArray(state.contracts)) state.contracts = clone(demo.contracts);
    return state;
  };

  migrations[4] = state => {
    const demo = demoState();
    state.schemaVersion = 5;
    state.nextIds = { ...demo.nextIds, ...(state.nextIds || {}) };

    Object.values(invoiceSequences).forEach(sequence => {
      const initial = Number(demo.nextIds[sequence.key]) || 100;
      state.nextIds[sequence.key] = Math.max(initial, Number(state.nextIds[sequence.key]) || 0);
    });

    (state.orders || []).forEach(order => {
      const sequence = invoiceSequences[order.vendor];
      if (!sequence || (order.type && order.type !== "Покупка товара")) return;
      const match = String(order.invoiceNumber || "").match(new RegExp(`^${sequence.prefix}-(\\d+)$`));
      if (match) state.nextIds[sequence.key] = Math.max(state.nextIds[sequence.key], Number(match[1]) + 1);
    });

    [...(state.orders || [])].reverse().forEach(order => {
      const sequence = invoiceSequences[order.vendor];
      if (!sequence || order.invoiceNumber || (order.type && order.type !== "Покупка товара")) return;
      order.invoiceNumber = `${sequence.prefix}-${nextId(state, sequence.key)}`;
    });
    return state;
  };

  function notify(reason = "change") {
    const change = { reason, storageKey: STORAGE_KEY };
    subscribers.forEach(listener => listener(change));
    if (typeof global.dispatchEvent === "function" && typeof global.CustomEvent === "function") {
      global.dispatchEvent(new global.CustomEvent("lkp-digital-copy-change", { detail: change }));
    }
  }

  function write(state, reason) {
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    notify(reason);
    return clone(state);
  }

  function read() {
    const raw = global.localStorage.getItem(STORAGE_KEY);
    if (!raw) return write(demoState());
    try {
      let parsed = JSON.parse(raw);
      if (!parsed || !Number.isInteger(parsed.schemaVersion) || parsed.schemaVersion > SCHEMA_VERSION) return write(demoState());
      let migrated = false;
      while (parsed.schemaVersion < SCHEMA_VERSION) {
        const migrate = migrations[parsed.schemaVersion];
        if (!migrate) return write(demoState());
        parsed = migrate(parsed);
        migrated = true;
      }
      return migrated ? write(parsed, "migration") : parsed;
    } catch {
      return write(demoState());
    }
  }

  function update(mutator) {
    const state = read();
    const result = mutator(state);
    write(state);
    return clone(result);
  }

  function requiredText(value, label) {
    const text = String(value || "").trim();
    if (!text) throw new Error(`Заполните поле «${label}»`);
    return text;
  }

  function nextId(state, kind) {
    const value = state.nextIds[kind];
    state.nextIds[kind] += 1;
    return String(value);
  }

  function getOrganizations(options) {
    const rows = read().organizations;
    return clone(options && options.includeInactive ? rows : rows.filter(item => item.isActive));
  }

  function createOrganization(input) {
    return update(state => {
      const id = nextId(state, "organization");
      const organization = { id, publicId: id, name: requiredText(input.name, "Название"), inn: requiredText(input.inn, "ИНН"), city: String(input.city || "").trim(), phone: String(input.phone || "").trim(), email: String(input.email || "").trim(), isActive: input.isActive !== false };
      state.organizations.push(organization);
      return organization;
    });
  }

  function updateOrganization(id, input) {
    return update(state => {
      const item = state.organizations.find(row => row.id === id);
      if (!item) throw new Error("Организация не найдена");
      Object.assign(item, input, { id: item.id, publicId: item.publicId });
      item.name = requiredText(item.name, "Название");
      item.inn = requiredText(item.inn, "ИНН");
      return item;
    });
  }

  function removeOrganization(id) {
    return update(state => {
      const item = state.organizations.find(row => row.id === id);
      if (!item) throw new Error("Организация не найдена");
      const used = state.orders.some(order => order.organizationId === id) || state.draftCart.some(row => row.organizationId === id);
      if (used) { item.isActive = false; return { deleted: false, archived: true }; }
      state.organizations = state.organizations.filter(row => row.id !== id);
      state.products.forEach(product => { product.availableOrganizationIds = product.availableOrganizationIds.filter(value => value !== id); });
      return { deleted: true, archived: false };
    });
  }

  function getContacts(options) {
    const rows = read().contacts;
    return clone(options && options.includeInactive ? rows : rows.filter(item => item.isActive));
  }

  function createContact(input) {
    return update(state => {
      const contact = { id: nextId(state, "contact"), department: requiredText(input.department, "Отдел"), position: requiredText(input.position, "Должность"), fullName: requiredText(input.fullName, "ФИО"), phone: requiredText(input.phone, "Телефон"), email: requiredText(input.email, "E-mail"), isActive: true };
      state.contacts.push(contact);
      return contact;
    });
  }

  function getProducts(options) {
    const rows = read().products;
    return clone(options && options.includeInactive ? rows : rows.filter(item => item.isActive));
  }

  function createProduct(input) {
    return update(state => {
      const code = requiredText(input.code, "Код");
      if (state.products.some(item => item.code === code)) throw new Error("Товар с таким кодом уже существует");
      const product = { code, name: requiredText(input.name, "Название"), groupName: requiredText(input.groupName, "Товарная группа"), vendor: requiredText(input.vendor, "Вендор"), rrpCents: Number(input.rrpCents) || 0, partnerPriceCents: Number(input.partnerPriceCents) || 0, priceCents: Number(input.priceCents) || 0, availableOrganizationIds: Array.isArray(input.availableOrganizationIds) ? [...input.availableOrganizationIds] : [], isActive: input.isActive !== false };
      state.products.push(product);
      return product;
    });
  }

  function updateProduct(code, input) {
    return update(state => {
      const item = state.products.find(row => row.code === code);
      if (!item) throw new Error("Товар не найден");
      Object.assign(item, input, { code: item.code });
      item.name = requiredText(item.name, "Название");
      item.groupName = requiredText(item.groupName, "Товарная группа");
      item.vendor = requiredText(item.vendor, "Вендор");
      item.availableOrganizationIds = Array.isArray(item.availableOrganizationIds) ? [...item.availableOrganizationIds] : [];
      return item;
    });
  }

  function removeProduct(code) {
    return update(state => {
      const item = state.products.find(row => row.code === code);
      if (!item) throw new Error("Товар не найден");
      const used = state.orders.some(order => order.items.some(row => row.productCode === code)) || state.draftCart.some(row => row.productCode === code);
      if (used) { item.isActive = false; return { deleted: false, archived: true }; }
      state.products = state.products.filter(row => row.code !== code);
      return { deleted: true, archived: false };
    });
  }

  const getCart = () => clone(read().draftCart);
  const saveCart = rows => update(state => { state.draftCart = clone(rows); return state.draftCart; });
  const getCarts = () => clone(read().carts);
  function newestOrdersFirst(rows) {
    return rows.map((order, index) => ({ order, index, createdAt: Date.parse(order.createdAt || "") }))
      .sort((left, right) => {
        const leftHasDate = Number.isFinite(left.createdAt);
        const rightHasDate = Number.isFinite(right.createdAt);
        if (leftHasDate && rightHasDate && left.createdAt !== right.createdAt) return right.createdAt - left.createdAt;
        if (leftHasDate !== rightHasDate) return leftHasDate ? -1 : 1;
        return left.index - right.index;
      })
      .map(item => item.order);
  }

  const getOrders = () => clone(newestOrdersFirst(read().orders));
  const getOrder = number => clone(read().orders.find(item => item.number === number) || null);
  const getLicenses = () => clone(read().licenses);
  const getActivations = () => clone(read().activations);
  const getActivation = id => clone(read().activations.find(item => item.id === id || item.number === id) || null);
  const getBalances = () => clone(read().balances);
  const getContracts = options => clone((read().contracts || []).filter(item => options && options.includeInactive ? true : item.isActive));

  function referenceCollection(state, kind) {
    if (kind === "contracts") return state.contracts;
    const collection = state.references && state.references[kind];
    if (!Array.isArray(collection)) throw new Error("Справочник не найден");
    return collection;
  }

  function getReferenceItems(kind) {
    return clone(referenceCollection(read(), kind).sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, "ru") || a.code.localeCompare(b.code, "ru")));
  }

  function createReferenceItem(kind, input) {
    return update(state => {
      const collection = referenceCollection(state, kind);
      const code = requiredText(input.code, "Код");
      if (collection.some(item => item.code === code)) throw new Error("Запись с таким кодом уже существует");
      const item = {
        id: `ref-${nextId(state, "reference")}`, kind, code,
        name: requiredText(input.name, "Название"), description: String(input.description || "").trim(),
        isActive: input.isActive !== false, updatedAt: new Date().toISOString()
      };
      collection.push(item);
      return item;
    });
  }

  function updateReferenceItem(kind, id, input) {
    return update(state => {
      const collection = referenceCollection(state, kind);
      const item = collection.find(row => row.id === id);
      if (!item) throw new Error("Запись справочника не найдена");
      const nextCode = input.code === undefined ? item.code : requiredText(input.code, "Код");
      if (collection.some(row => row.id !== id && row.code === nextCode)) throw new Error("Запись с таким кодом уже существует");
      Object.assign(item, clone(input), { id: item.id, kind, code: nextCode, updatedAt: new Date().toISOString() });
      item.name = requiredText(item.name, "Название");
      item.description = String(item.description || "").trim();
      item.isActive = item.isActive !== false;
      return item;
    });
  }

  function reserveNumbers(kind, count) {
    return update(state => Array.from({ length: count }, () => nextId(state, kind)));
  }

  function reserveInvoiceNumbers(vendors) {
    return update(state => vendors.map(vendor => {
      const sequence = invoiceSequences[vendor];
      return sequence ? `${sequence.prefix}-${nextId(state, sequence.key)}` : "";
    }));
  }

  function saveCheckout(cartRecord, orderRecords) {
    return update(state => {
      state.carts.unshift(clone(cartRecord));
      state.orders.unshift(...clone(orderRecords));
      state.draftCart = [];
      return { cart: cartRecord, orders: orderRecords };
    });
  }

  function createOrder(orderRecord) {
    return update(state => {
      if (state.orders.some(order => order.number === orderRecord.number)) throw new Error("Заказ с таким номером уже существует");
      const order = { ...clone(orderRecord), createdAt: orderRecord.createdAt || new Date().toISOString() };
      state.orders.unshift(order);
      return order;
    });
  }

  function updateOrder(number, input) {
    return update(state => {
      const order = state.orders.find(row => row.number === number);
      if (!order) throw new Error("Заказ не найден");
      const previous = order.status;
      Object.assign(order, input, { number: order.number, cartNumber: order.cartNumber, organizationId: order.organizationId, vendor: order.vendor });
      if (input.status && input.status !== previous) order.history.push({ fromStatus: previous, toStatus: input.status, changedAt: new Date().toISOString(), changedBy: "Админ-панель" });
      return order;
    });
  }

  function createActivation(input) {
    return update(state => {
      if (state.activations.some(item => item.number === input.number)) throw new Error("Активация с таким номером уже существует");
      const activation = { ...clone(input), id: input.id || input.number };
      state.activations.unshift(activation);
      return activation;
    });
  }

  function updateActivation(id, input) {
    return update(state => {
      const activation = state.activations.find(item => item.id === id || item.number === id);
      if (!activation) throw new Error("Активация не найдена");
      Object.assign(activation, clone(input), { id: activation.id, number: activation.number, organizationId: activation.organizationId });
      return activation;
    });
  }

  function updateLicense(id, input) {
    return update(state => {
      for (const activation of state.activations) {
        for (const item of activation.items) {
          const license = item.licenseKeys.find(key => key.id === id);
          if (license) { Object.assign(license, clone(input), { id: license.id }); return license; }
        }
      }
      throw new Error("Лицензия не найдена");
    });
  }

  function updateBalance(organizationId, value) {
    return update(state => {
      state.balances[organizationId] = Math.max(0, Number(value) || 0);
      return state.balances[organizationId];
    });
  }

  function subscribe(listener) {
    subscribers.add(listener);
    return () => { subscribers.delete(listener); };
  }

  function resetDemoData() {
    global.localStorage.removeItem(STORAGE_KEY);
    global.localStorage.removeItem("lkp-digital-copy-legacy-state-v2");
    global.localStorage.removeItem("lkp-digital-copy-state-v2");
    return write(demoState(), "reset");
  }

  if (typeof global.addEventListener === "function") {
    global.addEventListener("storage", event => {
      if (event.key === STORAGE_KEY) notify("external");
    });
  }

  global.LkpBrowserStore = {
    STORAGE_KEY, SCHEMA_VERSION, getState: () => clone(read()),
    getOrganizations, createOrganization, updateOrganization, removeOrganization,
    getContacts, createContact,
    getProducts, createProduct, updateProduct, removeProduct,
    getCart, saveCart, getCarts, getOrders, getOrder, reserveNumbers, reserveInvoiceNumbers, saveCheckout, createOrder, updateOrder,
    getLicenses, getActivations, getActivation, createActivation, updateActivation, updateLicense,
    getBalances, updateBalance, getContracts, getReferenceItems, createReferenceItem, updateReferenceItem,
    subscribe, resetDemoData
  };
})(typeof window === "undefined" ? globalThis : window);
