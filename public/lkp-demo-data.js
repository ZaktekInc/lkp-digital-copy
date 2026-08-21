(function (global) {
  "use strict";

  const organizationA = 'ООО "ЗОЛОТОЙ СТАНДАРТ"';
  const referenceUpdatedAt = "2026-08-01T00:00:00.000Z";
  const reference = (kind, code, name, description = "") => ({ id: `ref-${kind}-${code}`, kind, code, name, description, isActive: true, updatedAt: referenceUpdatedAt });
  const contract = (id, number, organizationId, vendor, type, paymentTerms, date) => ({
    id, number, organizationId, vendor, type, paymentTerms, date, status: "Действует", isActive: true,
    name: `${type} (${paymentTerms}) № ${number} от ${date}`,
    description: `${vendor} · ${paymentTerms}`, kind: "contracts", code: id, updatedAt: referenceUpdatedAt
  });
  const contracts = [
    contract("contract-101-supply-pg", "ПГ-П-101", "101", "Пи Джи Групп", "Договор поставки", "Предоплата 100%", "15.12.2025"),
    contract("contract-101-supply-rr", "РР-П-101", "101", "РР-Электро", "Договор поставки", "Предоплата 100%", "15.12.2025"),
    contract("contract-101-sublicense-prepaid", "ПГ-СЛ-101", "101", "Пи Джи Групп", "Сублицензионный договор", "Предоплата 100%", "15.12.2025"),
    contract("contract-102-supply-pg", "ПГ-П-102", "102", "Пи Джи Групп", "Договор поставки", "Предоплата 100%", "20.01.2026"),
    contract("contract-102-sublicense-postpaid", "ПГ-СЛ-102", "102", "Пи Джи Групп", "Сублицензионный договор", "Постоплата 5 дней", "20.01.2026")
  ];
  const activationAgreement = contracts[2].name;

  global.LkpDemoData = {
    schemaVersion: 11,
    activationDrafts: {},
    nextIds: { organization: 103, contact: 203, user: 3, cart: 653, order: 1001, activation: 125, reference: 1000, document: 1000, invoicePg: 100, invoiceRr: 100, updPg: 100, updRr: 100 },
    partner: { id: "1", name: "ООО «Партнер»", status: "Постоянный партнер" },
    users: [
      { id: "1", partnerId: "1", name: "Иван Петров", email: "owner@demo.aqsi.ru", phone: "+7 900 100-00-01", position: "Владелец компании", isAdmin: true, locked: false, deleted: false, password: "Owner123!", sessionVersion: 1, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z", lastActivityAt: "2026-08-01T00:00:00.000Z" },
      { id: "2", partnerId: "1", name: "Мария Соколова", email: "manager@demo.aqsi.ru", phone: "+7 900 100-00-02", position: "Менеджер", isAdmin: false, locked: false, deleted: false, password: "Manager123!", sessionVersion: 1, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z", lastActivityAt: "2026-08-01T00:00:00.000Z" }
    ],
    organizations: [
      { id: "101", publicId: "101", name: organizationA, inn: "7724827983", city: "Санкт-Петербург", phone: "+7 800 555-35-36", email: "example1@mail.ru", isActive: true },
      { id: "102", publicId: "102", name: "ООО Бета", inn: "7812345678", city: "Санкт-Петербург", phone: "+7 812 000-00-02", email: "info@beta.example", isActive: true }
    ],
    contacts: [
      { id: "201", department: "Закупки", position: "Руководитель", fullName: "Иванов Иван", phone: "+7 900 100-10-10", email: "ivanov@example.ru", isActive: true },
      { id: "202", department: "ИТ", position: "Инженер", fullName: "Петров Петр", phone: "+7 900 200-20-20", email: "petrov@example.ru", isActive: true }
    ],
    products: [
      { code: "AQSI-5F", name: "ПАК aQsi 5Ф", groupName: "ПАК", vendor: "Пи Джи Групп", rrpCents: 3000000, partnerPriceCents: 2500000, priceCents: 2300000, availableOrganizationIds: ["101", "102"], isActive: true },
      { code: "AQSI-6F", name: "ПАК aQsi 6Ф", groupName: "ПАК", vendor: "Пи Джи Групп", rrpCents: 3600000, partnerPriceCents: 3100000, priceCents: 2890000, availableOrganizationIds: ["101", "102"], isActive: true },
      { code: "AQSI-13", name: "ПАК aQsi 13", groupName: "ПАК", vendor: "Пи Джи Групп", rrpCents: 3900000, partnerPriceCents: 3400000, priceCents: 3190000, availableOrganizationIds: ["101"], isActive: true },
      { code: "AQSI-PS-5F", name: 'Адаптер питания для "aQsi-5Ф"', groupName: "Аксессуары", vendor: "Пи Джи Групп", rrpCents: 250000, partnerPriceCents: 210000, priceCents: 190000, availableOrganizationIds: ["101", "102"], isActive: true },
      { code: "AQSI-BAT-5F", name: 'Аккумулятор "для aQsi 5Ф"', groupName: "Аксессуары", vendor: "Пи Джи Групп", rrpCents: 350000, partnerPriceCents: 300000, priceCents: 270000, availableOrganizationIds: ["101", "102"], isActive: true },
      { code: "RR-01F", name: "ККТ РР-01Ф", groupName: "ККТ", vendor: "РР-Электро", rrpCents: 2700000, partnerPriceCents: 2350000, priceCents: 2180000, availableOrganizationIds: ["101"], isActive: true },
      { code: "RR-04F", name: "ККТ РР-04Ф", groupName: "ККТ", vendor: "РР-Электро", rrpCents: 3200000, partnerPriceCents: 2850000, priceCents: 2640000, availableOrganizationIds: ["101"], isActive: true }
    ],
    draftCart: [
      { key: "101|Пи Джи Групп|AQSI-5F", organizationId: "101", vendor: "Пи Джи Групп", productCode: "AQSI-5F", quantity: 2 },
      { key: "101|Пи Джи Групп|AQSI-PS-5F", organizationId: "101", vendor: "Пи Джи Групп", productCode: "AQSI-PS-5F", quantity: 2 },
      { key: "101|РР-Электро|RR-01F", organizationId: "101", vendor: "РР-Электро", productCode: "RR-01F", quantity: 1 }
    ],
    carts: [],
    contracts,
    balances: [{ id: "balance-101-sublicense-prepaid", organizationId: "101", contractId: "contract-101-sublicense-prepaid", amountCents: 600000, updatedAt: "2026-08-06T00:00:00.000Z" }],
    offerAcceptances: {},
    documents: [
      { id: "document-invoice-12540", type: "Счёт на оплату", number: "ПГ-362", filename: "Счет-ПГ-362.pdf", createdAt: "2026-08-06T00:00:00.000Z", orderNumber: "12540", activationNumber: "123", accountingSystem: "PG", isAvailable: true },
      { id: "document-upd-12540", type: "УПД", number: "УПД-ПГ-362", filename: "УПД-ПГ-362.pdf", createdAt: "2026-08-06T00:00:00.000Z", orderNumber: "12540", activationNumber: "123", accountingSystem: "PG", isAvailable: true },
      { id: "document-license-123", type: "Файл лицензий", filename: "Лицензии-123.txt", createdAt: "2026-08-06T00:00:00.000Z", orderNumber: "12540", activationNumber: "123", accountingSystem: "PG", isAvailable: true },
      { id: "document-invoice-12480", type: "Счёт на оплату", number: "ПГ-098", filename: "Счет-ПГ-098.pdf", createdAt: "2026-07-30T00:00:00.000Z", orderNumber: "12480", activationNumber: "", accountingSystem: "PG", isAvailable: true }
    ],
    orders: [
      {
        number: "12540", cartNumber: "", organizationId: "101", vendor: "Пэй Киоск", type: "Активация лицензий", activationNumber: "123", accountingSystem: "PG",
        contractId: "contract-101-sublicense-prepaid", status: "Отгружен", paymentStatus: "Оплачено", invoiceNumber: "ПГ-362", invoiceDocumentId: "document-invoice-12540",
        updDocumentId: "document-upd-12540", documentIds: ["document-invoice-12540", "document-upd-12540"], deliveryTerms: "Предоплата 100%", agreement: activationAgreement,
        contactName: "Колесников В. В.", contactPhone: "+7 987 654 32 10", contactEmail: "example@mail.ru", comment: "Активация № 123",
        createdAt: "2026-08-06T00:00:00.000Z", totalCents: 400000, paymentProcessedAt: "2026-08-06T00:00:00.000Z",
        items: [
          { code: "LICENSE-SERVICE", name: "Сервис обновлений — aQsi 5Ф", vendor: "Пэй Киоск", quantity: 1, unitPriceCents: 200000, lineTotalCents: 200000 },
          { code: "LICENSE-EXTENDED", name: "Расширенный функционал — aQsi 5Ф", vendor: "Пэй Киоск", quantity: 1, unitPriceCents: 200000, lineTotalCents: 200000 }
        ],
        history: [{ fromStatus: null, toStatus: "Отгружен", changedAt: "2026-08-06T00:00:00.000Z", changedBy: "Демо" }]
      },
      {
        number: "12480", cartNumber: "", organizationId: "101", vendor: "Пи Джи Групп", type: "Авансовый платеж", accountingSystem: "PG",
        contractId: "contract-101-sublicense-prepaid", status: "Принят", paymentStatus: "Оплачено", invoiceNumber: "ПГ-098", invoiceDocumentId: "document-invoice-12480",
        updDocumentId: "", documentIds: ["document-invoice-12480"], balanceCreditedAt: "2026-07-30T00:00:00.000Z", deliveryTerms: "Предоплата 100%", agreement: activationAgreement,
        contactName: "Петров Петр", contactPhone: "+7 987 654 32 10", contactEmail: "example@mail.ru", comment: "", createdAt: "2026-07-30T00:00:00.000Z", totalCents: 1000000,
        items: [{ code: "ADVANCE", name: "Авансовый платеж", vendor: "Пи Джи Групп", quantity: 1, unitPriceCents: 1000000, lineTotalCents: 1000000 }],
        history: [{ fromStatus: null, toStatus: "Принят", changedAt: "2026-07-30T00:00:00.000Z", changedBy: "Демо" }]
      }
    ],
    licenses: [
      { serial: "1234567890123456", model: "aQsi 5Ф", licenses: { service: { available: true, current: "Текущая до 05.10.2026", currentState: "expiring", next: "Новая до 05.10.2027", price: 2000 }, marking: { available: true, current: "Нет текущей подписки", currentState: "none", next: "Новая до 10.08.2027", price: 500 }, extended: { available: false, current: "Недоступно", next: "", price: 0 } } },
      { serial: "9876543210987654", model: "aQsi 6Ф", licenses: { service: { available: true, current: "Истекла 01.08.2026", currentState: "expired", next: "Новая до 10.08.2027", price: 2000 }, marking: { available: true, current: "Текущая до 01.12.2026", currentState: "active", next: "Новая до 01.12.2027", price: 500 }, extended: { available: true, current: "Текущая до 10.03.2027", currentState: "active", over180: true, next: "Новая до 10.03.2028", price: 1000 } } }
    ],
    activations: [
      {
        id: "123", number: "123", orderNumber: "12540", organizationId: "101", contractId: "contract-101-sublicense-prepaid", status: "Выполнена", vendor: "Пэй Киоск",
        totalCents: 400000, paymentStatus: "Оплачено", orderedAt: "2026-08-06T00:00:00.000Z", comment: "123", simulator: "ФР-Крипто",
        balanceDebitedAt: "2026-08-06T00:00:00.000Z", licenseFileDocumentId: "document-license-123",
        items: [
          { id: "123-service", model: "aQsi 5Ф", licenseType: "Сервис обновлений", subscriptionEnd: "07.08.2027", priceCents: 200000, licenseKeys: [{ id: "key-123-service", serialNumber: "1234567890123456", licenseKey: "DEMO-123-SERVICE", status: "Активна" }] },
          { id: "123-extended", model: "aQsi 5Ф", licenseType: "Расширенный функционал", subscriptionEnd: "07.08.2027", priceCents: 200000, licenseKeys: [{ id: "key-123-extended", serialNumber: "1234567890123456", licenseKey: "DEMO-123-EXTENDED", status: "Активна" }] }
        ]
      },
      {
        id: "124", number: "124", orderNumber: "", organizationId: "101", contractId: "contract-101-sublicense-prepaid", status: "В работе", vendor: "Пи Джи Групп",
        totalCents: 2490000, paymentStatus: "Не оплачено", orderedAt: "2026-08-01T00:00:00.000Z", comment: "", simulator: "ФР-Крипто",
        items: [
          { id: "124-service", model: "aQsi 5Ф", licenseType: "Сервис обновлений", subscriptionEnd: "01.08.2027", priceCents: 200000, licenseKeys: [{ id: "key-124-service", serialNumber: "9876543210987654", licenseKey: "DEMO-124-SERVICE", status: "Активна" }] },
          { id: "124-marking", model: "aQsi 5Ф", licenseType: "Маркировка", subscriptionEnd: "01.08.2027", priceCents: 2290000, licenseKeys: [{ id: "key-124-marking", serialNumber: "9876543210987654", licenseKey: "DEMO-124-MARKING", status: "Активна" }] }
        ]
      }
    ],
    references: {
      partners: [reference("partners", "partner", "ООО «Партнер»", "Постоянный партнер")],
      "price-types": [reference("price-types", "rrp", "РРЦ (Розница)"), reference("price-types", "partner", "Партнер"), reference("price-types", "permanent-partner", "Постоянный партнер")],
      "partner-statuses": [reference("partner-statuses", "permanent", "Постоянный партнер")],
      vendors: [reference("vendors", "pg-group", "Пи Джи Групп"), reference("vendors", "rr-electro", "РР-Электро"), reference("vendors", "pay-kiosk", "Пэй Киоск")],
      "delivery-terms": [reference("delivery-terms", "prepayment-100", "Предоплата 100%"), reference("delivery-terms", "deferment-5", "Постоплата 5 дней")],
      "contract-types": [reference("contract-types", "supply", "Договор поставки"), { ...reference("contract-types", "sublicense", "Сублицензионный договор"), contractVersion: 1 }],
      categories: [reference("categories", "cash-equipment", "Кассовое оборудование")],
      "product-groups": [reference("product-groups", "pak", "ПАК"), reference("product-groups", "accessories", "Аксессуары"), reference("product-groups", "kkt", "ККТ")],
      "order-statuses": [reference("order-statuses", "status-1", "Принят"), reference("order-statuses", "status-2", "Ожидание сборки"), reference("order-statuses", "status-3", "Готов к отгрузке"), reference("order-statuses", "status-4", "Отгружен"), reference("order-statuses", "status-5", "Отменен")],
      models: [reference("models", "aqsi-5f", "aQsi 5Ф"), reference("models", "aqsi-6f", "aQsi 6Ф"), reference("models", "aqsi-13", "aQsi 13"), reference("models", "rr-01f", "РР-01Ф"), reference("models", "rr-04f", "РР-04Ф")]
    }
  };
})(typeof window === "undefined" ? globalThis : window);
