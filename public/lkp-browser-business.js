(function (global) {
  "use strict";

  function checkout(input) {
    const store = global.LkpBrowserStore;
    const cart = store.getCart();
    if (!cart.length) throw new Error("Корзина пуста");
    const organizations = new Map(store.getOrganizations().map(item => [item.id, item]));
    const products = new Map(store.getProducts().map(item => [item.code, item]));
    const contracts = new Map(store.getContracts({ includeInactive: true }).map(item => [item.id, item]));
    const groups = new Map();

    cart.forEach(row => {
      const organization = organizations.get(row.organizationId);
      const product = products.get(row.productCode);
      if (!organization) throw new Error("Организация недоступна");
      if (!product || !product.availableOrganizationIds.includes(organization.id)) throw new Error(`Товар ${row.productCode} недоступен для выбранной организации`);
      const key = `${organization.id}|${product.vendor}`;
      if (!groups.has(key)) groups.set(key, { key, organization, vendor: product.vendor, items: [] });
      groups.get(key).items.push({ productCode: product.code, name: product.name, vendor: product.vendor, quantity: row.quantity, unitPriceCents: product.priceCents, lineTotalCents: product.priceCents * row.quantity });
    });

    const [cartNumber] = store.reserveNumbers("cart", 1);
    const orderNumbers = store.reserveNumbers("order", groups.size);
    const invoiceNumbers = store.reserveInvoiceNumbers([...groups.values()].map(group => group.vendor));
    const createdAt = new Date().toISOString();
    const orders = [...groups.values()].map((group, index) => {
      const contract = contracts.get(input.contractIds && input.contractIds[group.key]) || store.getContracts()[0];
      return {
        number: orderNumbers[index], cartNumber, organizationId: group.organization.id,
        vendor: group.vendor, status: "Принят", paymentStatus: "Не оплачен", invoiceNumber: invoiceNumbers[index],
        contractId: contract?.id || "", agreement: contract?.name || "Основной договор",
        contactName: input.contactName, contactPhone: input.contactPhone, contactEmail: input.contactEmail,
        deliveryTerms: input.deliveryTerms || "Предоплата 100%", comment: String(input.comments?.[group.key] ?? input.comment ?? "").trim(), createdAt,
        totalCents: group.items.reduce((sum, item) => sum + item.lineTotalCents, 0), items: group.items,
        history: [{ fromStatus: null, toStatus: "Принят", changedAt: createdAt, changedBy: "ЛКП" }]
      };
    });
    const cartRecord = { number: cartNumber, createdAt, orderNumbers: [...orderNumbers], totalCents: orders.reduce((sum, order) => sum + order.totalCents, 0) };
    return store.saveCheckout(cartRecord, orders);
  }

  global.LkpBusiness = { checkout };
})(typeof window === "undefined" ? globalThis : window);
