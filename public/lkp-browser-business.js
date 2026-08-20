(function (global) {
  "use strict";

  const PRODUCT_ORDER = "Покупка товара";
  const ADVANCE_ORDER = "Авансовый платеж";
  const ACTIVATION_ORDER = "Активация лицензий";
  const PAID = "Оплачено";
  const UNPAID = "Не оплачено";

  function store() {
    if (!global.LkpBrowserStore) throw new Error("Browser storage не загружен");
    return global.LkpBrowserStore;
  }

  function nextId(state, kind) {
    if (!Number.isInteger(state.nextIds[kind])) state.nextIds[kind] = 1;
    const value = state.nextIds[kind];
    state.nextIds[kind] += 1;
    return String(value);
  }

  function accountingSystemFor(order) {
    if (order.type === ADVANCE_ORDER || order.type === ACTIVATION_ORDER) return "PG";
    return order.vendor === "РР-Электро" ? "RR" : "PG";
  }

  function activeContract(state, organizationId, operationType, vendor, requestedId) {
    const contractType = operationType === PRODUCT_ORDER ? "Договор поставки" : "Сублицензионный договор";
    const contractVendor = contractType === "Сублицензионный договор" ? "Пи Джи Групп" : vendor;
    const matches = item => item.organizationId === organizationId && item.vendor === contractVendor && item.type === contractType && item.isActive !== false && item.status !== "Закрыт";
    const requested = requestedId ? state.contracts.find(item => item.id === requestedId) : null;
    if (requested && !matches(requested)) throw new Error(`Выбранный договор не подходит для операции «${operationType}»`);
    const contract = requested || state.contracts.find(matches);
    if (!contract) {
      if (operationType === PRODUCT_ORDER) throw new Error(`Нет действующего договора поставки с ${vendor}`);
      throw new Error("Нет действующего сублицензионного договора");
    }
    return contract;
  }

  function findBalance(state, organizationId, contractId, create = false) {
    let balance = state.balances.find(item => item.organizationId === organizationId && item.contractId === contractId);
    if (!balance && create) {
      balance = { id: `balance-${organizationId}-${contractId}`, organizationId, contractId, amountCents: 0, updatedAt: new Date().toISOString() };
      state.balances.push(balance);
    }
    return balance;
  }

  function addHistory(order, status, changedBy, at) {
    if (order.status === status) return;
    order.history ||= [];
    order.history.push({ fromStatus: order.status, toStatus: status, changedAt: at, changedBy });
    order.status = status;
  }

  function addDocumentId(order, id) {
    order.documentIds ||= [];
    if (!order.documentIds.includes(id)) order.documentIds.push(id);
  }

  function ensureInvoiceInState(state, order) {
    let document = state.documents.find(item => item.orderNumber === order.number && item.type === "Счёт на оплату");
    if (document) {
      order.invoiceNumber = document.number;
      order.invoiceDocumentId = document.id;
      addDocumentId(order, document.id);
      return document;
    }
    const accountingSystem = order.accountingSystem || accountingSystemFor(order);
    const key = accountingSystem === "RR" ? "invoiceRr" : "invoicePg";
    const prefix = accountingSystem === "RR" ? "РР" : "ПГ";
    const number = order.invoiceNumber || `${prefix}-${nextId(state, key)}`;
    document = {
      id: `document-${nextId(state, "document")}`, type: "Счёт на оплату", number, filename: `Счет-${number}.pdf`, createdAt: order.createdAt || new Date().toISOString(),
      orderNumber: order.number, activationNumber: order.activationNumber || "", accountingSystem, isAvailable: true
    };
    state.documents.push(document);
    order.accountingSystem = accountingSystem;
    order.invoiceNumber = number;
    order.invoiceDocumentId = document.id;
    addDocumentId(order, document.id);
    return document;
  }

  function ensureUpdInState(state, order, createdAt = new Date().toISOString()) {
    let document = state.documents.find(item => item.orderNumber === order.number && item.type === "УПД");
    if (document) {
      order.updDocumentId = document.id;
      addDocumentId(order, document.id);
      return document;
    }
    const accountingSystem = order.accountingSystem || accountingSystemFor(order);
    const key = accountingSystem === "RR" ? "updRr" : "updPg";
    const prefix = accountingSystem === "RR" ? "РР" : "ПГ";
    const number = `УПД-${prefix}-${nextId(state, key)}`;
    document = {
      id: `document-${nextId(state, "document")}`, type: "УПД", number, filename: `${number}.pdf`, createdAt,
      orderNumber: order.number, activationNumber: order.activationNumber || "", accountingSystem, isAvailable: true
    };
    state.documents.push(document);
    order.updDocumentId = document.id;
    addDocumentId(order, document.id);
    return document;
  }

  function ensureLicenseFileInState(state, activation, order) {
    let document = state.documents.find(item => item.activationNumber === activation.number && item.type === "Файл лицензий");
    if (!document) {
      document = {
        id: `document-${nextId(state, "document")}`, type: "Файл лицензий", filename: `Лицензии-${activation.number}.txt`, createdAt: new Date().toISOString(),
        orderNumber: order?.number || activation.orderNumber || "", activationNumber: activation.number, accountingSystem: "PG", isAvailable: activation.status === "Выполнена"
      };
      state.documents.push(document);
    }
    document.isAvailable = activation.status === "Выполнена";
    document.orderNumber = order?.number || document.orderNumber;
    activation.licenseFileDocumentId = document.id;
    return document;
  }

  function normalizedQuantity(value) {
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) throw new Error("Количество должно быть целым числом от 1 до 500");
    return quantity;
  }

  function setCartQuantity(key, value) {
    const quantity = normalizedQuantity(value);
    return store().transaction(state => {
      const item = state.draftCart.find(row => row.key === key);
      if (!item) throw new Error("Товар не найден в корзине");
      item.quantity = quantity;
      return item;
    }, "cart-quantity");
  }

  function removeCartItem(key) {
    return store().transaction(state => {
      const index = state.draftCart.findIndex(row => row.key === key);
      if (index < 0) throw new Error("Товар не найден в корзине");
      return state.draftCart.splice(index, 1)[0];
    }, "cart-remove");
  }

  function getPurchaseAvailability(organizationId, vendor) {
    const state = store().getState();
    const contract = state.contracts.find(item => item.organizationId === organizationId && item.vendor === vendor && item.type === "Договор поставки" && item.isActive !== false && item.status !== "Закрыт");
    return contract ? { canPurchase: true, contract } : { canPurchase: false, contract: null, reason: `Нет действующего договора поставки с ${vendor}` };
  }

  function checkout(input = {}) {
    return store().transaction(state => {
      if (!state.draftCart.length) throw new Error("Корзина пуста");
      const organizations = new Map(state.organizations.filter(item => item.isActive).map(item => [item.id, item]));
      const products = new Map(state.products.filter(item => item.isActive).map(item => [item.code, item]));
      const groups = new Map();

      state.draftCart.forEach(row => {
        const organization = organizations.get(row.organizationId);
        const product = products.get(row.productCode);
        if (!organization) throw new Error("Организация недоступна");
        if (!product || !product.availableOrganizationIds.includes(organization.id)) throw new Error(`Товар ${row.productCode} недоступен для выбранной организации`);
        const quantity = normalizedQuantity(row.quantity);
        const key = `${organization.id}|${product.vendor}`;
        if (!groups.has(key)) groups.set(key, { key, organization, vendor: product.vendor, items: [] });
        groups.get(key).items.push({ productCode: product.code, code: product.code, name: product.name, vendor: product.vendor, quantity, unitPriceCents: product.priceCents, lineTotalCents: product.priceCents * quantity });
      });

      const createdAt = new Date().toISOString();
      const cartNumber = nextId(state, "cart");
      const orders = [...groups.values()].map(group => {
        const contract = activeContract(state, group.organization.id, PRODUCT_ORDER, group.vendor, input.contractIds?.[group.key]);
        const order = {
          number: nextId(state, "order"), cartNumber, organizationId: group.organization.id, vendor: group.vendor, type: PRODUCT_ORDER,
          accountingSystem: group.vendor === "РР-Электро" ? "RR" : "PG", contractId: contract.id, status: "Принят", paymentStatus: UNPAID,
          invoiceNumber: "", invoiceDocumentId: "", updDocumentId: "", documentIds: [], agreement: contract.name, deliveryTerms: contract.paymentTerms,
          contactName: String(input.contactName || ""), contactPhone: String(input.contactPhone || ""), contactEmail: String(input.contactEmail || ""),
          comment: String(input.comments?.[group.key] ?? input.comment ?? "").trim(), createdAt,
          totalCents: group.items.reduce((sum, item) => sum + item.lineTotalCents, 0), items: group.items,
          history: [{ fromStatus: null, toStatus: "Принят", changedAt: createdAt, changedBy: "ЛКП" }]
        };
        ensureInvoiceInState(state, order);
        return order;
      });
      const cartRecord = { number: cartNumber, createdAt, orderNumbers: orders.map(order => order.number), totalCents: orders.reduce((sum, order) => sum + order.totalCents, 0) };
      state.carts.unshift(cartRecord);
      state.orders.unshift(...orders);
      state.draftCart = [];
      return { cart: cartRecord, orders };
    }, "checkout");
  }

  function ensureInvoice(orderNumber) {
    return store().transaction(state => {
      const order = state.orders.find(item => item.number === orderNumber);
      if (!order) throw new Error("Заказ не найден");
      return ensureInvoiceInState(state, order);
    }, "invoice");
  }

  function processPayment(orderNumber) {
    return store().transaction(state => {
      const order = state.orders.find(item => item.number === orderNumber);
      if (!order) throw new Error("Заказ не найден");
      if (order.paymentStatus === PAID) return order;
      const now = new Date().toISOString();
      order.paymentStatus = PAID;
      order.paymentProcessedAt ||= now;
      if (order.type === PRODUCT_ORDER) addHistory(order, "Ожидание сборки", "1С", now);
      if (order.type === ADVANCE_ORDER && !order.balanceCreditedAt) {
        const contract = activeContract(state, order.organizationId, ADVANCE_ORDER, "Пи Джи Групп", order.contractId);
        if (contract.paymentTerms !== "Предоплата 100%") throw new Error("Аванс доступен только для договора с предоплатой");
        const balance = findBalance(state, order.organizationId, contract.id, true);
        balance.amountCents += order.totalCents;
        balance.updatedAt = now;
        order.balanceCreditedAt = now;
      }
      if (order.type === ACTIVATION_ORDER && order.activationNumber) {
        const activation = state.activations.find(item => item.number === order.activationNumber);
        if (activation) activation.paymentStatus = PAID;
      }
      return order;
    }, "payment");
  }

  function postUpd(orderNumber) {
    return store().transaction(state => {
      const order = state.orders.find(item => item.number === orderNumber);
      if (!order) throw new Error("Заказ не найден");
      if (order.type !== PRODUCT_ORDER) throw new Error("УПД проводится вручную только для товарного заказа");
      if (order.updDocumentId) return order;
      if (!["Ожидание сборки", "Готов к отгрузке"].includes(order.status)) throw new Error("УПД можно провести после оплаты товарного заказа");
      const now = new Date().toISOString();
      ensureUpdInState(state, order, now);
      addHistory(order, "Отгружен", "1С", now);
      return order;
    }, "upd");
  }

  function markReadyToShip(orderNumber) {
    return store().transaction(state => {
      const order = state.orders.find(item => item.number === orderNumber);
      if (!order) throw new Error("Заказ не найден");
      if (order.type !== PRODUCT_ORDER || order.status !== "Ожидание сборки") return order;
      addHistory(order, "Готов к отгрузке", "Админ-панель", new Date().toISOString());
      return order;
    }, "ready-to-ship");
  }

  function cancelOrder(orderNumber) {
    return store().transaction(state => {
      const order = state.orders.find(item => item.number === orderNumber);
      if (!order) throw new Error("Заказ не найден");
      if (state.documents.some(document => document.orderNumber === orderNumber && document.type === "УПД")) throw new Error("Нельзя отменить заказ с проведённой УПД");
      addHistory(order, "Отменен", "Админ-панель", new Date().toISOString());
      return order;
    }, "cancel-order");
  }

  function getOfferStatus(organizationId) {
    const state = store().getState();
    const contract = activeContract(state, organizationId, ACTIVATION_ORDER, "Пи Джи Групп");
    const contractType = (state.references?.["contract-types"] || []).find(item => item.name === contract.type);
    if (!contractType) throw new Error("Тип сублицензионного договора не найден");
    const version = String(contractType.contractVersion);
    const acceptedVersion = state.offerAcceptances?.[contract.id];
    return { contract, version, isAccepted: String(acceptedVersion) === version, hasPreviousAcceptance: acceptedVersion !== undefined };
  }

  function acceptOffer(organizationId) {
    return store().transaction(state => {
      const contract = activeContract(state, organizationId, ACTIVATION_ORDER, "Пи Джи Групп");
      const contractType = (state.references?.["contract-types"] || []).find(item => item.name === contract.type);
      if (!contractType) throw new Error("Тип сублицензионного договора не найден");
      const version = String(contractType.contractVersion);
      state.offerAcceptances ||= {};
      state.offerAcceptances[contract.id] = version;
      return { contract, version, isAccepted: true, hasPreviousAcceptance: true };
    }, "offer-acceptance");
  }

  function createAdvanceOrder(input) {
    const amountCents = Number(input.amountCents);
    if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error("Укажите сумму аванса");
    return store().transaction(state => {
      const contract = activeContract(state, input.organizationId, ADVANCE_ORDER, "Пи Джи Групп", input.contractId);
      if (contract.paymentTerms !== "Предоплата 100%") throw new Error("Авансовый платёж доступен только по договору с предоплатой 100%");
      const createdAt = new Date().toISOString();
      const order = {
        number: nextId(state, "order"), cartNumber: "", organizationId: input.organizationId, vendor: "Пи Джи Групп", type: ADVANCE_ORDER, accountingSystem: "PG",
        contractId: contract.id, status: "Принят", paymentStatus: UNPAID, invoiceNumber: "", invoiceDocumentId: "", updDocumentId: "", documentIds: [],
        agreement: contract.name, deliveryTerms: contract.paymentTerms, contactName: String(input.contactName || "Иванов Иван Иванович"),
        contactPhone: String(input.contactPhone || "+7 987 654 32 10"), contactEmail: String(input.contactEmail || "example@mail.ru"), comment: String(input.comment || ""),
        createdAt, totalCents: amountCents, items: [{ code: "ADVANCE", name: ADVANCE_ORDER, vendor: "Пи Джи Групп", quantity: 1, unitPriceCents: amountCents, lineTotalCents: amountCents }],
        history: [{ fromStatus: null, toStatus: "Принят", changedAt: createdAt, changedBy: "ЛКП" }]
      };
      ensureInvoiceInState(state, order);
      state.orders.unshift(order);
      return order;
    }, "advance-order");
  }

  function createActivation(input) {
    if (!Array.isArray(input.items) || !input.items.length) throw new Error("Не выбраны лицензии");
    return store().transaction(state => {
      const contract = activeContract(state, input.organizationId, ACTIVATION_ORDER, "Пи Джи Групп", input.contractId);
      const totalCents = input.items.reduce((sum, item) => sum + Number(item.priceCents || 0), 0);
      if (contract.paymentTerms === "Предоплата 100%") {
        const balance = findBalance(state, input.organizationId, contract.id, false);
        if (!balance || balance.amountCents < totalCents) throw new Error("Недостаточно средств на балансе");
      }
      const number = nextId(state, "activation");
      const isError = input.isError === true;
      const activation = {
        id: number, number, orderNumber: "", organizationId: input.organizationId, contractId: contract.id, status: isError ? "Ошибка" : "В работе", vendor: input.vendor || "Пэй Киоск",
        totalCents, paymentStatus: UNPAID, orderedAt: new Date().toISOString(), comment: String(input.comment || ""), simulator: "ФР-Крипто",
        items: input.items.map((item, index) => ({
          id: `${number}-${index + 1}`, model: item.model, licenseType: item.licenseType, subscriptionEnd: item.subscriptionEnd, priceCents: item.priceCents,
          licenseKeys: isError ? [] : [{ id: `key-${number}-${index + 1}`, serialNumber: item.serialNumber, licenseKey: `DEMO-${number}-${index + 1}`, status: "Активна" }]
        }))
      };
      state.activations.unshift(activation);
      const usedSerials = new Set(input.items.map(item => String(item.serialNumber || "").trim()).filter(Boolean));
      const draft = state.activationDrafts?.[input.organizationId];
      if (Array.isArray(draft) && usedSerials.size) {
        const remaining = draft.filter(row => !usedSerials.has(String(typeof row === "string" ? row : row?.serial || "").trim()));
        if (remaining.length) state.activationDrafts[input.organizationId] = remaining;
        else delete state.activationDrafts[input.organizationId];
      }
      return activation;
    }, "activation-create");
  }

  function completeActivation(activationNumber) {
    return store().transaction(state => {
      const activation = state.activations.find(item => item.number === activationNumber);
      if (!activation) throw new Error("Активация не найдена");
      if (activation.status === "Ошибка") return activation;
      const existingOrder = activation.orderNumber ? state.orders.find(item => item.number === activation.orderNumber) : state.orders.find(item => item.activationNumber === activation.number);
      if (activation.status === "Выполнена" && existingOrder) return activation;
      const contract = activeContract(state, activation.organizationId, ACTIVATION_ORDER, "Пи Джи Групп", activation.contractId);
      const now = new Date().toISOString();
      const prepaid = contract.paymentTerms === "Предоплата 100%";
      if (prepaid && !activation.balanceDebitedAt) {
        const balance = findBalance(state, activation.organizationId, contract.id, false);
        if (!balance || balance.amountCents < activation.totalCents) throw new Error("Недостаточно средств на балансе");
        balance.amountCents -= activation.totalCents;
        balance.updatedAt = now;
        activation.balanceDebitedAt = now;
      }
      activation.status = "Выполнена";
      activation.paymentStatus = prepaid ? PAID : UNPAID;
      let order = existingOrder;
      if (!order) {
        order = {
          number: nextId(state, "order"), cartNumber: "", organizationId: activation.organizationId, vendor: activation.vendor, type: ACTIVATION_ORDER, activationNumber: activation.number,
          accountingSystem: "PG", contractId: contract.id, status: "Принят", paymentStatus: prepaid ? PAID : UNPAID, invoiceNumber: "", invoiceDocumentId: "", updDocumentId: "", documentIds: [],
          agreement: contract.name, deliveryTerms: contract.paymentTerms, contactName: "Иванов Иван Иванович", contactPhone: "+7 987 654 32 10", contactEmail: "example@mail.ru",
          comment: `Активация № ${activation.number}`, createdAt: now, totalCents: activation.totalCents,
          items: activation.items.map((item, index) => ({ code: `LICENSE-${index + 1}`, name: `${item.licenseType} — ${item.model}`, vendor: activation.vendor, quantity: 1, unitPriceCents: item.priceCents, lineTotalCents: item.priceCents })),
          history: [{ fromStatus: null, toStatus: "Принят", changedAt: now, changedBy: "ЛКП" }]
        };
        if (prepaid) order.paymentProcessedAt = now;
        state.orders.unshift(order);
      }
      activation.orderNumber = order.number;
      order.activationNumber = activation.number;
      ensureInvoiceInState(state, order);
      ensureUpdInState(state, order, now);
      addHistory(order, "Отгружен", "1С ПГ", now);
      ensureLicenseFileInState(state, activation, order);
      return activation;
    }, "activation-complete");
  }

  function getAccountingOrders(accountingSystem) {
    return store().getOrders().filter(order => (order.accountingSystem || accountingSystemFor(order)) === accountingSystem && (accountingSystem !== "RR" || (order.type || PRODUCT_ORDER) === PRODUCT_ORDER));
  }

  function documentText(documentId) {
    const document = store().getDocument(documentId);
    if (!document || !document.isAvailable) throw new Error("Документ недоступен");
    if (["Счёт на оплату", "УПД"].includes(document.type)) return "";
    if (document.type === "Файл лицензий") {
      const activation = store().getActivation(document.activationNumber);
      if (!activation || activation.status !== "Выполнена") throw new Error("Файл лицензий доступен только для выполненной активации");
      const lines = activation.items.flatMap(item => item.licenseKeys.map(key => `${key.serialNumber}; ${item.model}; ${item.licenseType}; ${key.licenseKey}; ${key.status}`));
      return [`Активация № ${activation.number}`, "Серийный номер; Модель; Тип лицензии; Ключ; Статус", ...lines].join("\n");
    }
    const order = store().getOrder(document.orderNumber);
    return [`${document.type} ${document.number || ""}`.trim(), `Заказ № ${document.orderNumber}`, `Сумма: ${order?.totalCents || 0} коп.`, `Создан: ${document.createdAt}`].join("\n");
  }

  function downloadDocument(documentId) {
    const document = store().getDocument(documentId);
    const content = documentText(documentId);
    if (typeof global.Blob !== "function" || !global.document || !global.URL) return { filename: document.filename, content };
    const isPdf = ["Счёт на оплату", "УПД"].includes(document.type);
    const blob = new global.Blob([content], { type: isPdf ? "application/pdf" : "text/plain;charset=utf-8" });
    const url = global.URL.createObjectURL(blob);
    const link = global.document.createElement("a");
    link.href = url;
    link.download = document.filename || `${document.number || document.id}.${isPdf ? "pdf" : "txt"}`;
    link.click();
    global.URL.revokeObjectURL(url);
    return { filename: link.download, content };
  }

  global.LkpBusiness = {
    checkout, setCartQuantity, removeCartItem, getPurchaseAvailability, ensureInvoice, processPayment, postUpd, markReadyToShip, cancelOrder,
    createAdvanceOrder, createActivation, completeActivation, getAccountingOrders, getOfferStatus, acceptOffer, documentText, downloadDocument, accountingSystemFor
  };
})(typeof window === "undefined" ? globalThis : window);
