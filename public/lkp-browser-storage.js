(function (global) {
  "use strict";

  const STORAGE_KEY = "lkp-digital-copy-state";
  const SCHEMA_VERSION = 11;
  const SESSION_KEY = "lkp-digital-copy-session";
  const migrations = {};
  const invoiceSequences = {
    "Пи Джи Групп": { key: "invoicePg", prefix: "ПГ" },
    "РР-Электро": { key: "invoiceRr", prefix: "РР" }
  };
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const subscribers = new Set();

  function demoState() {
    if (!global.LkpDemoData) throw new Error("Демонстрационные данные не загружены");
    return clone(global.LkpDemoData);
  }

  function nextId(state, kind) {
    if (!Number.isInteger(state.nextIds[kind])) state.nextIds[kind] = 1;
    const value = state.nextIds[kind];
    state.nextIds[kind] += 1;
    return String(value);
  }

  function accountingSystemFor(order) {
    if (order.type === "Авансовый платеж" || order.type === "Активация лицензий") return "PG";
    return order.vendor === "РР-Электро" ? "RR" : "PG";
  }

  function matchingContract(state, organizationId, operationType, vendor) {
    const type = operationType === "Покупка товара" ? "Договор поставки" : "Сублицензионный договор";
    const contractVendor = type === "Сублицензионный договор" ? "Пи Джи Групп" : vendor;
    return (state.contracts || []).find(item => item.organizationId === organizationId && item.vendor === contractVendor && item.type === type && item.isActive !== false && item.status !== "Закрыт");
  }

  function addMigratedDocument(state, order, type, number, activationNumber = "") {
    const existing = state.documents.find(item => item.orderNumber === order.number && item.type === type);
    if (existing) return existing;
    const id = `document-${nextId(state, "document")}`;
    const document = {
      id, type, number, filename: type === "УПД" ? `${number}.pdf` : `Счет-${number}.pdf`, createdAt: order.createdAt || new Date().toISOString(),
      orderNumber: order.number, activationNumber, accountingSystem: order.accountingSystem, isAvailable: true
    };
    state.documents.push(document);
    return document;
  }

  migrations[1] = state => {
    const demo = demoState();
    const demoOrderNumbers = new Set(demo.orders.map(order => order.number));
    state.schemaVersion = 2;
    state.nextIds = { ...demo.nextIds, ...(state.nextIds || {}), activation: demo.nextIds.activation };
    state.orders = [...demo.orders, ...(state.orders || []).filter(order => !demoOrderNumbers.has(order.number))];
    state.licenses = clone(demo.licenses);
    state.activations = clone(demo.activations);
    state.balances = clone(demo.balances);
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
    if (!linkedOrder && demoActivationOrder) { linkedOrder = clone(demoActivationOrder); state.orders.unshift(linkedOrder); }
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
    state.references ||= {};
    Object.entries(demo.references).forEach(([kind, items]) => { if (!Array.isArray(state.references[kind])) state.references[kind] = clone(items); });
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

  migrations[5] = state => {
    const demo = demoState();
    state.schemaVersion = 6;
    state.nextIds = { ...demo.nextIds, ...(state.nextIds || {}) };
    state.documents = Array.isArray(state.documents) ? state.documents : [];

    const previousContracts = Array.isArray(state.contracts) ? state.contracts : [];
    const canonicalIds = new Set(previousContracts.map(item => item.id));
    state.contracts = [...previousContracts, ...demo.contracts.filter(item => !canonicalIds.has(item.id)).map(clone)];

    if (!Array.isArray(state.balances)) {
      const legacyBalances = state.balances && typeof state.balances === "object" ? state.balances : {};
      state.balances = Object.entries(legacyBalances).flatMap(([organizationId, amount]) => {
        const contract = matchingContract(state, organizationId, "Авансовый платеж", "Пи Джи Групп");
        return contract ? [{ id: `balance-${organizationId}-${contract.id}`, organizationId, contractId: contract.id, amountCents: Math.max(0, Number(amount) || 0) * 100, updatedAt: new Date().toISOString() }] : [];
      });
    }

    (state.orders || []).forEach(order => {
      order.type ||= "Покупка товара";
      if (order.status === "Ожидает сборки") order.status = "Ожидание сборки";
      if (order.paymentStatus === "Не оплачен") order.paymentStatus = "Не оплачено";
      order.accountingSystem = accountingSystemFor(order);
      const contract = state.contracts.find(item => item.id === order.contractId && item.organizationId === order.organizationId) || matchingContract(state, order.organizationId, order.type, order.vendor);
      if (contract) { order.contractId = contract.id; order.agreement = contract.name; order.deliveryTerms = contract.paymentTerms; }
      order.documentIds = Array.isArray(order.documentIds) ? order.documentIds : [];
      if (order.invoiceNumber) {
        const invoice = addMigratedDocument(state, order, "Счёт на оплату", order.invoiceNumber, order.activationNumber || "");
        order.invoiceDocumentId = invoice.id;
        if (!order.documentIds.includes(invoice.id)) order.documentIds.push(invoice.id);
      }
      if (order.type === "Активация лицензий" && order.status === "Отгружен") {
        const updNumber = `УПД-${order.invoiceNumber || order.number}`;
        const upd = addMigratedDocument(state, order, "УПД", updNumber, order.activationNumber || "");
        order.updDocumentId = upd.id;
        if (!order.documentIds.includes(upd.id)) order.documentIds.push(upd.id);
      }
      if (order.type === "Авансовый платеж" && order.paymentStatus === "Оплачено") { order.status = "Принят"; order.balanceCreditedAt ||= order.createdAt; }
      if (order.paymentStatus === "Оплачено") order.paymentProcessedAt ||= order.createdAt;
    });

    (state.activations || []).forEach(activation => {
      const contract = state.contracts.find(item => item.id === activation.contractId && item.organizationId === activation.organizationId) || matchingContract(state, activation.organizationId, "Активация лицензий", "Пи Джи Групп");
      if (contract) activation.contractId = contract.id;
      if (activation.status === "Выполнена") {
        const order = state.orders.find(item => item.number === activation.orderNumber);
        if (order) order.activationNumber = activation.number;
        let licenseFile = state.documents.find(item => item.type === "Файл лицензий" && item.activationNumber === activation.number);
        if (!licenseFile) {
          licenseFile = { id: `document-${nextId(state, "document")}`, type: "Файл лицензий", filename: `Лицензии-${activation.number}.txt`, createdAt: activation.orderedAt || new Date().toISOString(), orderNumber: activation.orderNumber || "", activationNumber: activation.number, accountingSystem: "PG", isAvailable: true };
          state.documents.push(licenseFile);
        }
        activation.licenseFileDocumentId = licenseFile.id;
        if (contract?.paymentTerms === "Предоплата 100%") activation.balanceDebitedAt ||= activation.orderedAt;
      }
    });

    Object.entries({ invoicePg: /^ПГ-(\d+)$/, invoiceRr: /^РР-(\d+)$/ }).forEach(([key, pattern]) => {
      (state.documents || []).forEach(document => { const match = String(document.number || "").match(pattern); if (match) state.nextIds[key] = Math.max(Number(state.nextIds[key]) || 100, Number(match[1]) + 1); });
    });
    return state;
  };

  migrations[6] = state => {
    state.schemaVersion = 7;
    state.offerAcceptances = state.offerAcceptances && typeof state.offerAcceptances === "object" ? state.offerAcceptances : {};
    (state.products || []).forEach(product => {
      if (product.vendor === "РР-Электро") product.availableOrganizationIds = (product.availableOrganizationIds || []).filter(id => id !== "102");
    });
    (state.documents || []).forEach(document => {
      if (!["Счёт на оплату", "УПД"].includes(document.type)) return;
      const baseName = document.type === "УПД" ? (document.number || `УПД-${document.orderNumber}`) : `Счет-${document.number || document.orderNumber}`;
      document.filename = `${baseName}.pdf`;
    });
    return state;
  };

  migrations[7] = state => {
    const demo = demoState();
    state.schemaVersion = 8;
    state.offerAcceptances = state.offerAcceptances && typeof state.offerAcceptances === "object" ? state.offerAcceptances : {};
    state.references ||= {};
    state.references["contract-types"] = Array.isArray(state.references["contract-types"]) ? state.references["contract-types"] : [];
    const contractTypes = state.references["contract-types"];
    const genericSublicense = contractTypes.find(item => item.code === "sublicense" || item.name === "Сублицензионный договор");
    if (genericSublicense) {
      genericSublicense.name = "Сублицензионный договор — Предоплата 100%";
      genericSublicense.contractVersion = Number.isInteger(Number(genericSublicense.contractVersion)) ? Number(genericSublicense.contractVersion) : 1;
    }
    demo.references["contract-types"].forEach(item => {
      if (!contractTypes.some(existing => existing.name === item.name)) contractTypes.push(clone(item));
    });
    return state;
  };

  migrations[8] = state => {
    const demo = demoState();
    state.schemaVersion = 9;
    state.offerAcceptances = state.offerAcceptances && typeof state.offerAcceptances === "object" ? state.offerAcceptances : {};
    state.references ||= {};
    const contractTypes = Array.isArray(state.references["contract-types"]) ? state.references["contract-types"] : [];
    const sublicenseTypes = contractTypes.filter(item => item.code === "sublicense" || item.code === "sublicense-postpaid" || item.name === "Сублицензионный договор" || item.name?.startsWith("Сублицензионный договор —"));
    const sublicenseType = sublicenseTypes.find(item => item.code === "sublicense") || sublicenseTypes[0] || clone(demo.references["contract-types"].find(item => item.code === "sublicense"));
    sublicenseType.code = "sublicense";
    sublicenseType.name = "Сублицензионный договор";
    sublicenseType.contractVersion = Math.max(1, ...sublicenseTypes.map(item => Number(item.contractVersion) || 1));
    state.references["contract-types"] = [...contractTypes.filter(item => !sublicenseTypes.includes(item)), sublicenseType];

    const normalizePaymentTerms = value => String(value || "").replaceAll("Отсрочка 5 дней", "Постоплата 5 дней");
    (state.contracts || []).forEach(contract => {
      contract.paymentTerms = normalizePaymentTerms(contract.paymentTerms);
      contract.name = normalizePaymentTerms(contract.name);
      contract.description = normalizePaymentTerms(contract.description);
    });
    (state.orders || []).forEach(order => {
      order.deliveryTerms = normalizePaymentTerms(order.deliveryTerms);
      order.agreement = normalizePaymentTerms(order.agreement);
    });
    const deliveryTerms = state.references["delivery-terms"];
    if (Array.isArray(deliveryTerms)) deliveryTerms.forEach(item => { item.name = normalizePaymentTerms(item.name); });
    return state;
  };

  migrations[9] = state => {
    state.schemaVersion = 10;
    state.activationDrafts = state.activationDrafts && typeof state.activationDrafts === "object" ? state.activationDrafts : {};
    return state;
  };

  migrations[10] = state => {
    const demo = demoState();
    state.schemaVersion = 11;
    state.nextIds = { ...demo.nextIds, ...(state.nextIds || {}) };
    state.users = Array.isArray(state.users) ? state.users : clone(demo.users);
    return state;
  };

  function notify(reason = "change") {
    const change = { reason, storageKey: STORAGE_KEY };
    subscribers.forEach(listener => listener(change));
    if (typeof global.dispatchEvent === "function" && typeof global.CustomEvent === "function") global.dispatchEvent(new global.CustomEvent("lkp-digital-copy-change", { detail: change }));
  }

  function write(state, reason = "change") {
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    notify(reason);
    return clone(state);
  }

  function read() {
    const raw = global.localStorage.getItem(STORAGE_KEY);
    if (!raw) return write(demoState(), "initialize");
    try {
      let parsed = JSON.parse(raw);
      if (!parsed || !Number.isInteger(parsed.schemaVersion) || parsed.schemaVersion > SCHEMA_VERSION) return write(demoState(), "recover");
      let migrated = false;
      while (parsed.schemaVersion < SCHEMA_VERSION) {
        const migrate = migrations[parsed.schemaVersion];
        if (!migrate) return write(demoState(), "recover");
        parsed = migrate(parsed);
        migrated = true;
      }
      return migrated ? write(parsed, "migration") : parsed;
    } catch {
      return write(demoState(), "recover");
    }
  }

  function update(mutator, reason = "change") {
    const state = read();
    const result = mutator(state);
    write(state, reason);
    return clone(result);
  }

  function requiredText(value, label) {
    const text = String(value || "").trim();
    if (!text) throw new Error(`Заполните поле «${label}»`);
    return text;
  }

  const normalizeEmail = value => requiredText(value, "Email").toLowerCase();
  const nowAfter = value => new Date(Math.max(Date.now(), (Date.parse(value || "") || 0) + 1)).toISOString();
  function activeUserByEmail(state, email, exceptId = "") {
    const normalized = normalizeEmail(email);
    return (state.users || []).find(user => !user.deleted && user.id !== exceptId && String(user.email).toLowerCase() === normalized);
  }
  function requireUser(state, id) {
    const user = (state.users || []).find(item => item.id === id);
    if (!user || user.deleted) throw new Error("Пользователь недоступен");
    return user;
  }
  function requireOwner(state, id) {
    const user = requireUser(state, id);
    if (!user.isAdmin) throw new Error("Нет доступа");
    return user;
  }
  function requireAdminContext() {
    if (!/(^|\/)admin(?:\/|\/index\.html)?$/.test(global.location?.pathname || "")) throw new Error("Нет доступа");
  }
  function invalidate(user) { user.sessionVersion = Math.max(1, Number(user.sessionVersion) || 1) + 1; }
  function generatedPassword(user) { return `Demo${String(user.id).padStart(3, "0")}!${String(Date.now()).slice(-4)}`; }
  const getUsers = options => clone((read().users || []).filter(user => (!options?.partnerId || user.partnerId === options.partnerId) && (options?.includeDeleted || !user.deleted)));
  const getUser = id => clone((read().users || []).find(user => user.id === id) || null);
  function authenticate(email, password) {
    return update(state => {
      const user = activeUserByEmail(state, email);
      if (!user || user.password !== String(password || "")) throw new Error("Неверный Email или пароль");
      user.lastActivityAt = new Date().toISOString();
      return user;
    }, "user-auth");
  }
  function setCurrentSession(user) {
    if (!global.sessionStorage) return;
    global.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, partnerId: user.partnerId, sessionVersion: user.sessionVersion }));
  }
  function getCurrentUser() {
    if (!global.sessionStorage) return null;
    try {
      const session = JSON.parse(global.sessionStorage.getItem(SESSION_KEY) || "null");
      const user = session && (read().users || []).find(item => item.id === session.userId);
      if (!user || user.partnerId !== session.partnerId || user.deleted || user.sessionVersion !== session.sessionVersion) { global.sessionStorage.removeItem(SESSION_KEY); return null; }
      return clone(user);
    } catch { global.sessionStorage.removeItem(SESSION_KEY); return null; }
  }
  function logout() { if (global.sessionStorage) global.sessionStorage.removeItem(SESSION_KEY); }
  function login(email, password) { const user = authenticate(email, password); setCurrentSession(user); return user; }
  function updateOwnUser(actorId, input) {
    return update(state => { const user = requireUser(state, actorId); user.name = requiredText(input.name, "ФИО"); user.phone = String(input.phone || "").trim(); user.position = requiredText(input.position, "Должность"); user.updatedAt = nowAfter(user.updatedAt); return user; }, "user");
  }
  function changeOwnPassword(actorId, currentPassword, newPassword) {
    const user = update(state => { const item = requireUser(state, actorId); if (item.password !== String(currentPassword || "")) throw new Error("Неверный текущий пароль"); item.password = requiredText(newPassword, "Новый пароль"); invalidate(item); item.updatedAt = nowAfter(item.updatedAt); return item; }, "user-password");
    setCurrentSession(user);
    return user;
  }
  function createManager(input, actorId = "", admin = false) {
    return update(state => {
      const actor = admin ? null : requireOwner(state, actorId);
      const partnerId = admin ? requiredText(input.partnerId || state.partner.id, "Партнёр") : actor.partnerId;
      const email = normalizeEmail(input.email);
      if (activeUserByEmail(state, email)) throw new Error("Пользователь с таким Email уже существует");
      const timestamp = new Date().toISOString();
      const user = { id: nextId(state, "user"), partnerId, name: requiredText(input.name, "ФИО"), email, phone: String(input.phone || "").trim(), position: requiredText(input.position, "Должность"), isAdmin: false, locked: false, deleted: false, password: "", sessionVersion: 1, createdAt: timestamp, updatedAt: timestamp, lastActivityAt: "" };
      user.password = generatedPassword(user);
      state.users ||= []; state.users.push(user); return user;
    }, "user");
  }
  function updateManager(id, input, actorId = "", admin = false) {
    return update(state => {
      const actor = admin ? null : requireOwner(state, actorId); const user = requireUser(state, id);
      if (!admin && (user.partnerId !== actor.partnerId || (user.isAdmin && user.id !== actor.id))) throw new Error("Нет доступа");
      if (admin && input.email !== undefined) { const email = normalizeEmail(input.email); if (activeUserByEmail(state, email, id)) throw new Error("Пользователь с таким Email уже существует"); user.email = email; }
      if (admin && input.isAdmin !== undefined) {
        const nextIsAdmin = Boolean(input.isAdmin);
        if (!nextIsAdmin && user.isAdmin) throw new Error("Смените Владельца, назначив Администратором другого пользователя");
        if (nextIsAdmin && !user.isAdmin) {
          (state.users || []).filter(item => item.partnerId === user.partnerId && !item.deleted && item.isAdmin).forEach(owner => { owner.isAdmin = false; owner.updatedAt = nowAfter(owner.updatedAt); });
          user.isAdmin = true;
        }
      }
      user.name = requiredText(input.name, "ФИО"); user.phone = String(input.phone || "").trim(); user.position = requiredText(input.position, "Должность"); user.updatedAt = nowAfter(user.updatedAt); return user;
    }, "user");
  }
  function setManagerLocked(id, locked, actorId = "", admin = false) {
    return update(state => { const actor = admin ? null : requireOwner(state, actorId); const user = requireUser(state, id); if (user.isAdmin || (!admin && user.partnerId !== actor.partnerId)) throw new Error("Нет доступа"); user.locked = Boolean(locked); if (locked) invalidate(user); user.updatedAt = nowAfter(user.updatedAt); return user; }, "user");
  }
  function activateManager(id, actorId = "", admin = false) {
    return update(state => { const actor = admin ? null : requireOwner(state, actorId); const user = requireUser(state, id); if (user.isAdmin || (!admin && user.partnerId !== actor.partnerId)) throw new Error("Нет доступа"); user.locked = false; user.password = generatedPassword(user); invalidate(user); user.updatedAt = nowAfter(user.updatedAt); return user; }, "user");
  }
  function deleteManager(id, actorId = "", admin = false) {
    return update(state => { const actor = admin ? null : requireOwner(state, actorId); const user = requireUser(state, id); if (user.isAdmin || (!admin && user.partnerId !== actor.partnerId)) throw new Error("Нет доступа"); user.deleted = true; user.email = `user-${user.id}@deleted`; user.locked = true; invalidate(user); user.updatedAt = nowAfter(user.updatedAt); return user; }, "user");
  }
  function transferOwnership(partnerId, nextOwnerId) {
    return update(state => { const users = (state.users || []).filter(user => user.partnerId === partnerId && !user.deleted); const current = users.find(user => user.isAdmin); const next = users.find(user => user.id === nextOwnerId && !user.isAdmin); if (!current || !next) throw new Error("Выберите Менеджера"); current.isAdmin = false; next.isAdmin = true; current.updatedAt = nowAfter(current.updatedAt); next.updatedAt = nowAfter(next.updatedAt); return { previousOwner: current, owner: next }; }, "user");
  }

  const getOrganizations = options => clone(read().organizations.filter(item => options?.includeInactive || item.isActive));
  const getContacts = options => clone(read().contacts.filter(item => options?.includeInactive || item.isActive));
  const getProducts = options => clone(read().products.filter(item => options?.includeInactive || item.isActive));
  const getCart = () => clone(read().draftCart);
  const getCarts = () => clone(read().carts);
  const getLicenses = () => clone(read().licenses);
  const getActivations = () => clone(read().activations);
  const getActivation = id => clone(read().activations.find(item => item.id === id || item.number === id) || null);
  const getContracts = options => clone((read().contracts || []).filter(item => options?.includeInactive || item.isActive));
  const getDocuments = () => clone(read().documents || []);
  const getDocument = id => clone((read().documents || []).find(item => item.id === id) || null);
  const getOrderDocuments = number => clone((read().documents || []).filter(item => item.orderNumber === number && item.type !== "Файл лицензий"));
  const getBalanceRecords = () => clone(read().balances || []);
  const getBalances = () => Object.fromEntries((read().balances || []).map(item => [item.organizationId, item.amountCents / 100]));
  function normalizedActivationDraft(rows) {
    const seen = new Set();
    return (Array.isArray(rows) ? rows : []).flatMap(row => {
      const serial = String(typeof row === "string" ? row : row?.serial || "").trim();
      if (!/^\d{16}$/.test(serial) || seen.has(serial)) return [];
      seen.add(serial);
      const selectedLicenses = typeof row === "object" && Array.isArray(row.selectedLicenses)
        ? [...new Set(row.selectedLicenses.filter(key => ["service", "marking", "extended"].includes(key)))]
        : [];
      return [{ serial, selectedLicenses }];
    });
  }
  const getActivationDraft = organizationId => clone(normalizedActivationDraft(read().activationDrafts?.[organizationId] || []));

  function newestOrdersFirst(rows) {
    return rows.map((order, index) => ({ order, index, createdAt: Date.parse(order.createdAt || "") }))
      .sort((a, b) => Number.isFinite(b.createdAt) - Number.isFinite(a.createdAt) || (Number.isFinite(a.createdAt) && Number.isFinite(b.createdAt) && b.createdAt !== a.createdAt ? b.createdAt - a.createdAt : a.index - b.index))
      .map(item => item.order);
  }
  const getOrders = () => clone(newestOrdersFirst(read().orders));
  const getOrder = number => clone(read().orders.find(item => item.number === number) || null);

  function createOrganization(input) {
    return update(state => { const id = nextId(state, "organization"); const item = { id, publicId: id, name: requiredText(input.name, "Название"), inn: requiredText(input.inn, "ИНН"), city: String(input.city || "").trim(), phone: String(input.phone || "").trim(), email: String(input.email || "").trim(), isActive: input.isActive !== false }; state.organizations.push(item); return item; });
  }
  function updateOrganization(id, input) {
    return update(state => { const item = state.organizations.find(row => row.id === id); if (!item) throw new Error("Организация не найдена"); Object.assign(item, clone(input), { id: item.id, publicId: item.publicId }); item.name = requiredText(item.name, "Название"); item.inn = requiredText(item.inn, "ИНН"); return item; });
  }
  function removeOrganization(id) {
    return update(state => { const item = state.organizations.find(row => row.id === id); if (!item) throw new Error("Организация не найдена"); const used = state.orders.some(order => order.organizationId === id) || state.draftCart.some(row => row.organizationId === id); if (used) { item.isActive = false; return { deleted: false, archived: true }; } state.organizations = state.organizations.filter(row => row.id !== id); state.products.forEach(product => { product.availableOrganizationIds = product.availableOrganizationIds.filter(value => value !== id); }); return { deleted: true, archived: false }; });
  }
  function createContact(input, actorId = "") {
    return update(state => { requireOwner(state, actorId); const item = { id: nextId(state, "contact"), department: requiredText(input.department, "Отдел"), position: requiredText(input.position, "Должность"), fullName: requiredText(input.fullName, "ФИО"), phone: requiredText(input.phone, "Телефон"), email: requiredText(input.email, "E-mail"), isActive: true }; state.contacts.push(item); return item; });
  }
  function createProduct(input) {
    return update(state => { const code = requiredText(input.code, "Код"); if (state.products.some(item => item.code === code)) throw new Error("Товар с таким кодом уже существует"); const item = { code, name: requiredText(input.name, "Название"), groupName: requiredText(input.groupName, "Товарная группа"), vendor: requiredText(input.vendor, "Вендор"), rrpCents: Number(input.rrpCents) || 0, partnerPriceCents: Number(input.partnerPriceCents) || 0, priceCents: Number(input.priceCents) || 0, availableOrganizationIds: [...(input.availableOrganizationIds || [])], isActive: input.isActive !== false }; state.products.push(item); return item; });
  }
  function updateProduct(code, input) {
    return update(state => { const item = state.products.find(row => row.code === code); if (!item) throw new Error("Товар не найден"); Object.assign(item, clone(input), { code: item.code }); return item; });
  }
  function removeProduct(code) {
    return update(state => { const item = state.products.find(row => row.code === code); if (!item) throw new Error("Товар не найден"); const used = state.orders.some(order => order.items.some(row => (row.productCode || row.code) === code)) || state.draftCart.some(row => row.productCode === code); if (used) { item.isActive = false; return { deleted: false, archived: true }; } state.products = state.products.filter(row => row.code !== code); return { deleted: true, archived: false }; });
  }

  const saveCart = rows => update(state => { state.draftCart = clone(rows); return state.draftCart; }, "cart");
  const saveActivationDraft = (organizationId, rows) => update(state => { const draft = normalizedActivationDraft(rows); state.activationDrafts ||= {}; if (draft.length) state.activationDrafts[organizationId] = draft; else delete state.activationDrafts[organizationId]; return draft; }, "activation-draft");
  const clearActivationDraft = organizationId => saveActivationDraft(organizationId, []);
  const reserveNumbers = (kind, count) => update(state => Array.from({ length: count }, () => nextId(state, kind)), "reserve");
  const reserveInvoiceNumbers = vendors => update(state => vendors.map(vendor => { const sequence = invoiceSequences[vendor]; return sequence ? `${sequence.prefix}-${nextId(state, sequence.key)}` : ""; }), "reserve");
  const saveCheckout = (cartRecord, orderRecords) => update(state => { state.carts.unshift(clone(cartRecord)); state.orders.unshift(...clone(orderRecords)); state.draftCart = []; return { cart: cartRecord, orders: orderRecords }; }, "checkout");
  function createOrder(orderRecord) { return update(state => { if (state.orders.some(order => order.number === orderRecord.number)) throw new Error("Заказ с таким номером уже существует"); const item = { ...clone(orderRecord), createdAt: orderRecord.createdAt || new Date().toISOString() }; state.orders.unshift(item); return item; }, "order"); }
  function updateOrder(number, input) { return update(state => { const item = state.orders.find(row => row.number === number); if (!item) throw new Error("Заказ не найден"); const previous = item.status; Object.assign(item, clone(input), { number: item.number, cartNumber: item.cartNumber, organizationId: item.organizationId, vendor: item.vendor }); item.history ||= []; if (input.status && input.status !== previous) item.history.push({ fromStatus: previous, toStatus: input.status, changedAt: new Date().toISOString(), changedBy: "Админ-панель" }); return item; }, "order"); }
  function createActivation(input) { return update(state => { if (state.activations.some(item => item.number === input.number)) throw new Error("Активация с таким номером уже существует"); const item = { ...clone(input), id: input.id || input.number }; state.activations.unshift(item); return item; }, "activation"); }
  function updateActivation(id, input) { return update(state => { const item = state.activations.find(row => row.id === id || row.number === id); if (!item) throw new Error("Активация не найдена"); Object.assign(item, clone(input), { id: item.id, number: item.number, organizationId: item.organizationId }); return item; }, "activation"); }
  function updateLicense(id, input) { return update(state => { for (const activation of state.activations) for (const item of activation.items) { const license = item.licenseKeys.find(key => key.id === id); if (license) { Object.assign(license, clone(input), { id: license.id }); return license; } } throw new Error("Лицензия не найдена"); }, "license"); }
  function updateBalance(organizationId, value, contractId) { return update(state => { const contract = state.contracts.find(item => item.id === contractId) || matchingContract(state, organizationId, "Авансовый платеж", "Пи Джи Групп"); if (!contract) throw new Error("Нет действующего сублицензионного договора с предоплатой"); let item = state.balances.find(row => row.organizationId === organizationId && row.contractId === contract.id); if (!item) { item = { id: `balance-${organizationId}-${contract.id}`, organizationId, contractId: contract.id, amountCents: 0, updatedAt: new Date().toISOString() }; state.balances.push(item); } item.amountCents = Math.max(0, Number(value) || 0) * 100; item.updatedAt = new Date().toISOString(); return item.amountCents / 100; }, "balance"); }

  function referenceCollection(state, kind) { if (kind === "contracts") return state.contracts; const collection = state.references?.[kind]; if (!Array.isArray(collection)) throw new Error("Справочник не найден"); return collection; }
  const getReferenceItems = kind => clone(referenceCollection(read(), kind).sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, "ru") || a.code.localeCompare(b.code, "ru")));
  function createReferenceItem(kind, input) { return update(state => { const collection = referenceCollection(state, kind); const code = requiredText(input.code, "Код"); if (collection.some(item => item.code === code)) throw new Error("Запись с таким кодом уже существует"); const item = { id: `ref-${nextId(state, "reference")}`, kind, code, name: requiredText(input.name, "Название"), description: String(input.description || "").trim(), isActive: input.isActive !== false, updatedAt: new Date().toISOString() }; if (kind === "contract-types" && item.name === "Сублицензионный договор") item.contractVersion = Math.max(1, Number(input.contractVersion) || 1); collection.push(item); return item; }, "reference"); }
  function updateReferenceItem(kind, id, input) { return update(state => { const collection = referenceCollection(state, kind); const item = collection.find(row => row.id === id); if (!item) throw new Error("Запись справочника не найдена"); const nextCode = input.code === undefined ? item.code : requiredText(input.code, "Код"); if (collection.some(row => row.id !== id && row.code === nextCode)) throw new Error("Запись с таким кодом уже существует"); const nextUpdatedAt = new Date(Math.max(Date.now(), (Date.parse(item.updatedAt) || 0) + 1)).toISOString(); Object.assign(item, clone(input), { id: item.id, kind, code: nextCode, updatedAt: nextUpdatedAt }); item.name = requiredText(item.name, "Название"); item.description = String(item.description || "").trim(); item.isActive = item.isActive !== false; if (kind === "contract-types" && item.name === "Сублицензионный договор") item.contractVersion = Math.max(1, Number(item.contractVersion) || 1); return item; }, "reference"); }

  function subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener); }
  function resetDemoData() { global.localStorage.removeItem(STORAGE_KEY); global.localStorage.removeItem("lkp-digital-copy-legacy-state-v2"); global.localStorage.removeItem("lkp-digital-copy-state-v2"); return write(demoState(), "reset"); }
  if (typeof global.addEventListener === "function") global.addEventListener("storage", event => { if (event.key === STORAGE_KEY) notify("external"); });

  global.LkpBrowserStore = {
    STORAGE_KEY, SESSION_KEY, SCHEMA_VERSION, getState: () => clone(read()), transaction: (mutator, reason) => update(mutator, reason || "business"),
    getUsers, getUser, login, logout, getCurrentUser,
    updateOwnUser: input => updateOwnUser(getCurrentUser()?.id || "", input), changeOwnPassword: (currentPassword, newPassword) => changeOwnPassword(getCurrentUser()?.id || "", currentPassword, newPassword),
    createManager: input => createManager(input, getCurrentUser()?.id || "", false), updateManager: (id, input) => updateManager(id, input, getCurrentUser()?.id || "", false), setManagerLocked: (id, locked) => setManagerLocked(id, locked, getCurrentUser()?.id || "", false), activateManager: id => activateManager(id, getCurrentUser()?.id || "", false), deleteManager: id => deleteManager(id, getCurrentUser()?.id || "", false),
    adminCreateManager: input => { requireAdminContext(); return createManager(input, "", true); }, adminUpdateUser: (id, input) => { requireAdminContext(); return updateManager(id, input, "", true); }, adminSetManagerLocked: (id, locked) => { requireAdminContext(); return setManagerLocked(id, locked, "", true); }, adminActivateManager: id => { requireAdminContext(); return activateManager(id, "", true); }, adminDeleteManager: id => { requireAdminContext(); return deleteManager(id, "", true); }, transferOwnership: (partnerId, nextOwnerId) => { requireAdminContext(); return transferOwnership(partnerId, nextOwnerId); },
    getOrganizations, createOrganization, updateOrganization, removeOrganization, getContacts, createContact: input => createContact(input, getCurrentUser()?.id || ""),
    getProducts, createProduct, updateProduct, removeProduct, getCart, saveCart, getCarts, getOrders, getOrder,
    reserveNumbers, reserveInvoiceNumbers, saveCheckout, createOrder, updateOrder, getLicenses, getActivations, getActivation, createActivation, updateActivation, updateLicense,
    getBalances, getBalanceRecords, updateBalance, getActivationDraft, saveActivationDraft, clearActivationDraft, getContracts, getDocuments, getDocument, getOrderDocuments,
    getReferenceItems, createReferenceItem, updateReferenceItem, subscribe, resetDemoData
  };
})(typeof window === "undefined" ? globalThis : window);
