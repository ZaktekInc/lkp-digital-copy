      const root = document.getElementById("lkp-current-map");
      const content = root.querySelector("#lkp-content");
      const shell = root.querySelector(".lkp-shell");
      const side = root.querySelector(".lkp-side");
      let selectedLicenseOrg = 'ООО "ЗОЛОТОЙ СТАНДАРТ"';
      let pendingCartRemoval = null;
      let activationPreviewVisible = false;
      let lastCheckedSerial = "";
      let pendingActivationComment = "";
      let pendingActivationDeficit = 0;

      const activationDevices = [
        {
          serial: "1234567890123456", model: "aQsi 5Ф",
          licenses: {
            service: { available: true, selected: false, current: "Текущая до 05.10.2026", currentState: "expiring", next: "Новая до 05.10.2027", price: 2000 },
            marking: { available: true, selected: false, current: "Нет текущей подписки", currentState: "none", next: "Новая до 10.08.2027", price: 500 },
            extended: { available: false, selected: false, current: "Недоступно", next: "", price: 0 }
          }
        },
        {
          serial: "9876543210987654", model: "aQsi 6Ф",
          licenses: {
            service: { available: true, selected: false, current: "Истекла 01.08.2026", currentState: "expired", next: "Новая до 10.08.2027", price: 2000 },
            marking: { available: true, selected: false, current: "Текущая до 01.12.2026", currentState: "active", next: "Новая до 01.12.2027", price: 500 },
            extended: { available: true, selected: false, current: "Текущая до 10.03.2027", currentState: "active", over180: true, next: "Новая до 10.03.2028", price: 1000 }
          }
        }
      ];

      const organizations = [
        ["101", 'ООО "ЗОЛОТОЙ СТАНДАРТ"', "7724827983", "Санкт-Петербург", "3", "+7 800 555-35-36", "example1@mail.ru"],
        ["102", "ООО Бета", "7812345678", "Санкт-Петербург", "2", "+7 812 000-00-02", "info@beta.example"]
      ];
      const contacts = [
        ["Закупки", "Руководитель", "Иванов Иван", "+7 900 100-10-10", "ivanov@example.ru"],
        ["ИТ", "Инженер", "Петров Петр", "+7 900 200-20-20", "petrov@example.ru"]
      ];
      const orders = [
        ["12540", "ПГ-362", 'ООО "ЗОЛОТОЙ СТАНДАРТ"', "06.08.2026", "Отгружен", "Предоплата 100%", "4 000 ₽", "—", "Колесников В. В."],
        ["12518", "СЧ-9055", "ООО Бета", "04.08.2026", "Готов к отгрузке", "Отсрочка 5 дней", "142 000 ₽", "—", "Петров Петр"],
        ["12497", "СЧ-9024", 'ООО "ЗОЛОТОЙ СТАНДАРТ"', "01.08.2026", "Отгружен", "Предоплата 100%", "24 900 ₽", "✓", "Колесников В. В."],
        ["12480", "ПГ-098", "ООО Бета", "30.07.2026", "Отгружен", "Предоплата 100%", "10 000 ₽", "✓", "Петров Петр"]
      ];
      const orderTypes = { "12540": "Активация лицензий", "12518": "Покупка товара", "12497": "Покупка товара", "12480": "Авансовый платеж" };
      const activations = [
        ["123", "12540", 'ООО "ЗОЛОТОЙ СТАНДАРТ"', "Выполнена", "Пэй Киоск", "2", "4 000 ₽", "—", "06.08.2026", "123"],
        ["124", "12497", 'ООО "ЗОЛОТОЙ СТАНДАРТ"', "В работе", "Пи Джи Групп", "2", "24 900 ₽", "✓", "01.08.2026", "—"]
      ];
      const products = [
        { code: "AQSI-5F", name: "ПАК aQsi 5Ф", group: "ПАК", vendor: "Пи Джи Групп", rrp: 30000, partnerPrice: 25000, price: 23000, orgs: ['ООО "ЗОЛОТОЙ СТАНДАРТ"', "ООО Бета"] },
        { code: "AQSI-6F", name: "ПАК aQsi 6Ф", group: "ПАК", vendor: "Пи Джи Групп", rrp: 36000, partnerPrice: 31000, price: 28900, orgs: ['ООО "ЗОЛОТОЙ СТАНДАРТ"', "ООО Бета"] },
        { code: "AQSI-13", name: "ПАК aQsi 13", group: "ПАК", vendor: "Пи Джи Групп", rrp: 39000, partnerPrice: 34000, price: 31900, orgs: ['ООО "ЗОЛОТОЙ СТАНДАРТ"'] },
        { code: "AQSI-PS-5F", name: 'Адаптер питания для "aQsi-5Ф"', group: "Аксессуары", vendor: "Пи Джи Групп", rrp: 2500, partnerPrice: 2100, price: 1900, orgs: ['ООО "ЗОЛОТОЙ СТАНДАРТ"', "ООО Бета"] },
        { code: "AQSI-BAT-5F", name: 'Аккумулятор "для aQsi 5Ф"', group: "Аксессуары", vendor: "Пи Джи Групп", rrp: 3500, partnerPrice: 3000, price: 2700, orgs: ['ООО "ЗОЛОТОЙ СТАНДАРТ"', "ООО Бета"] },
        { code: "RR-01F", name: "ККТ РР-01Ф", group: "ККТ", vendor: "РР-Электро", rrp: 27000, partnerPrice: 23500, price: 21800, orgs: ['ООО "ЗОЛОТОЙ СТАНДАРТ"', "ООО Бета"] },
        { code: "RR-04F", name: "ККТ РР-04Ф", group: "ККТ", vendor: "РР-Электро", rrp: 32000, partnerPrice: 28500, price: 26400, orgs: ['ООО "ЗОЛОТОЙ СТАНДАРТ"'] }
      ];
      const quantities = Object.fromEntries(products.map(p => [p.code, 1]));
      const cart = [
        { key: 'ООО "ЗОЛОТОЙ СТАНДАРТ"|Пи Джи Групп|AQSI-5F', org: 'ООО "ЗОЛОТОЙ СТАНДАРТ"', vendor: "Пи Джи Групп", code: "AQSI-5F", name: "ПАК aQsi 5Ф", price: 23000, qty: 2 },
        { key: 'ООО "ЗОЛОТОЙ СТАНДАРТ"|Пи Джи Групп|AQSI-PS-5F', org: 'ООО "ЗОЛОТОЙ СТАНДАРТ"', vendor: "Пи Джи Групп", code: "AQSI-PS-5F", name: 'Адаптер питания для "aQsi-5Ф"', price: 1900, qty: 2 },
        { key: 'ООО "ЗОЛОТОЙ СТАНДАРТ"|РР-Электро|RR-01F', org: 'ООО "ЗОЛОТОЙ СТАНДАРТ"', vendor: "РР-Электро", code: "RR-01F", name: "ККТ РР-01Ф", price: 21800, qty: 1 }
      ];

      const storageKey = "lkp-digital-copy-state-v2";
      const orderDetails = {};
      const activationDetails = {};
      const createdCarts = [];
      const balances = { 'ООО "ЗОЛОТОЙ СТАНДАРТ"': 1000, "ООО Бета": 0 };
      const serverOrderNumbers = new Set();
      const catalogState = { loading: true, error: "", selectedOrg: "", selectedGroup: "" };
      let activePage = "catalog";
      let activeContext = null;
      let organizationAccessLoaded = false;
      let catalogRequestId = 0;
      let ordersLoadError = "";
      let orderDetailsError = "";
      let checkoutInProgress = false;
      let pendingCheckoutKey = "";
      function loadState() {
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
          if (!saved || typeof saved !== "object") return;
          const savedDetails = saved.orderDetails || {};
          (saved.orders || []).filter(order => !savedDetails[order[0]]?.serverId).forEach(order => { if (!orders.some(existing => existing[0] === order[0])) orders.unshift(order); });
          Object.assign(orderTypes, Object.fromEntries(Object.entries(saved.orderTypes || {}).filter(([number]) => !savedDetails[number]?.serverId)));
          Object.assign(orderDetails, Object.fromEntries(Object.entries(savedDetails).filter(([, details]) => !details?.serverId)));
          (saved.activations || []).forEach(activation => { if (!activations.some(existing => existing[0] === activation[0])) activations.unshift(activation); });
          Object.assign(activationDetails, saved.activationDetails || {});
          (saved.carts || []).filter(savedCart => !savedCart?.server).forEach(savedCart => createdCarts.push(savedCart));
          if (Array.isArray(saved.cart)) cart.splice(0, cart.length, ...saved.cart);
          cart.forEach(item => {
            const product = products.find(candidate => candidate.code === item.code);
            if (product) item.price = product.price;
          });
          Object.assign(quantities, saved.quantities || {});
          Object.assign(balances, saved.balances || {});
          orders.forEach(order => {
            const details = orderDetails[order[0]];
            if (details?.invoice) order[1] = details.invoice;
            else if (details && order[1]) details.invoice = order[1];
            const type = details?.type || orderTypes[order[0]];
            const paid = details?.payment === "Оплачено" || order[7] === "✓";
            if (type === "Активация лицензий" && paid) {
              order[4] = "Отгружен";
              if (details) details.status = "Отгружен";
            }
          });
        } catch {}
      }
      function saveState() {
        try {
          const browserOrderDetails = Object.fromEntries(Object.entries(orderDetails).filter(([, details]) => !details.serverId));
          const browserOrderTypes = Object.fromEntries(Object.entries(orderTypes).filter(([number]) => !serverOrderNumbers.has(number)));
          localStorage.setItem(storageKey, JSON.stringify({ orders: orders.filter(order => browserOrderDetails[order[0]]), orderTypes: browserOrderTypes, orderDetails: browserOrderDetails, activations: activations.filter(activation => activationDetails[activation[0]]), activationDetails, carts: createdCarts.filter(item => !item.server), cart, quantities, balances }));
        } catch {}
      }
      const randomNatural = (min, max, used) => { let value; do value = String(Math.floor(Math.random() * (max - min + 1)) + min); while (used.has(value)); return value; };
      const todayLabel = () => new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
      loadState();

      async function serverApi(url, options) {
        const response = await fetch(url, options);
        let payload = {};
        try { payload = await response.json(); } catch {}
        if (!response.ok) throw new Error(payload.error || `Ошибка сервера HTTP ${response.status}`);
        return payload;
      }

      function replaceOrganizations(rows) {
        organizations.splice(0, organizations.length, ...rows.map(org => [org.id, org.name, org.inn, org.city, "0", org.phone, org.email]));
        organizationAccessLoaded = true;
        const allowedNames = new Set(organizations.map(org => org[1]));
        for (let index = cart.length - 1; index >= 0; index -= 1) {
          if (!allowedNames.has(cart[index].org)) cart.splice(index, 1);
        }
        if (!allowedNames.has(selectedLicenseOrg)) selectedLicenseOrg = organizations[0]?.[1] || "";
        saveState();
      }

      const isOrganizationVisible = organizationName => organizationAccessLoaded && organizations.some(org => org[1] === organizationName);
      const visibleOrderRows = rows => rows.filter(order => isOrganizationVisible(order[2]));
      const visibleActivations = () => activations.filter(activation => isOrganizationVisible(activation[2]));

      function replaceCatalogProducts(payload, organizationName) {
        products.splice(0, products.length, ...(payload.products || []).map(product => ({
          id: product.id,
          code: product.code,
          name: product.name,
          group: product.group,
          vendor: product.vendor,
          rrp: product.rrpCents / 100,
          partnerPrice: product.partnerPriceCents / 100,
          price: product.priceCents / 100,
          orgs: [organizationName]
        })));
        products.forEach(product => { quantities[product.code] ||= 1; });
        cart.forEach(item => {
          const product = products.find(candidate => candidate.code === item.code);
          if (product && item.org === organizationName) { item.price = product.price; item.productId = product.id; }
        });
      }

      async function loadCatalog(organizationName = "") {
        const requestId = ++catalogRequestId;
        catalogState.loading = true;
        catalogState.error = "";
        catalogState.selectedOrg = organizationName;
        const organization = organizations.find(item => item[1] === organizationName);
        try {
          const query = organization ? `?organizationId=${encodeURIComponent(organization[0])}` : "";
          const payload = await serverApi(`/api/catalog${query}`);
          if (requestId !== catalogRequestId) return;
          replaceOrganizations(payload.organizations || []);
          if (organization) replaceCatalogProducts(payload, organizationName);
          else products.splice(0, products.length);
        } catch (error) {
          if (requestId !== catalogRequestId) return;
          catalogState.error = error instanceof Error ? error.message : "Не удалось загрузить каталог";
          products.splice(0, products.length);
        } finally {
          if (requestId === catalogRequestId) catalogState.loading = false;
        }
      }

      function serverOrderDetails(order) {
        return {
          serverId: order.id,
          number: order.number,
          type: "Покупка товара",
          status: order.status,
          payment: order.paymentStatus,
          date: new Intl.DateTimeFormat("ru-RU").format(new Date(order.createdAt)),
          invoice: order.invoiceNumber || "—",
          agreement: order.deliveryTerms,
          org: order.organization.name,
          name: order.contactName,
          phone: order.contactPhone,
          email: order.contactEmail,
          comment: order.comment,
          vendor: [...new Set((order.items || []).map(item => item.vendor))].join(", "),
          items: (order.items || []).map(item => ({ code: item.code, name: item.name, vendor: item.vendor, price: item.unitPriceCents / 100, qty: item.quantity })),
          total: order.totalCents / 100,
          history: order.history || []
        };
      }

      function upsertServerOrder(order) {
        const number = order.number;
        serverOrderNumbers.add(number);
        orderTypes[number] = "Покупка товара";
        const details = order.items ? serverOrderDetails(order) : { ...(orderDetails[number] || {}), serverId: order.id, number, type: "Покупка товара", status: order.status, payment: order.paymentStatus, date: new Intl.DateTimeFormat("ru-RU").format(new Date(order.createdAt)), invoice: order.invoiceNumber || "—", agreement: order.deliveryTerms, org: order.organization.name, name: order.contactName, phone: order.contactPhone, email: order.contactEmail, comment: order.comment, total: order.totalCents / 100 };
        orderDetails[number] = details;
        const row = [number, details.invoice || "—", details.org, details.date, details.status, details.agreement, rub(details.total), details.payment === "Оплачено" ? "✓" : "—", details.name];
        const existing = orders.findIndex(item => item[0] === number);
        if (existing >= 0) orders.splice(existing, 1, row); else orders.unshift(row);
        return number;
      }

      function removeServerOrder(number) {
        const index = orders.findIndex(order => order[0] === number);
        if (index >= 0) orders.splice(index, 1);
        delete orderDetails[number];
        delete orderTypes[number];
        serverOrderNumbers.delete(number);
      }

      async function refreshServerOrders() {
        try {
          const payload = await serverApi("/api/orders");
          const receivedNumbers = new Set((payload.orders || []).map(order => order.number));
          [...serverOrderNumbers].forEach(number => {
            if (!receivedNumbers.has(number)) removeServerOrder(number);
          });
          (payload.orders || []).forEach(upsertServerOrder);
          ordersLoadError = "";
          return true;
        } catch (error) {
          [...serverOrderNumbers].forEach(removeServerOrder);
          ordersLoadError = error instanceof Error ? error.message : "Не удалось загрузить заказы";
          return false;
        }
      }

      async function refreshServerOrder(number) {
        const details = orderDetails[number];
        if (!details?.serverId) return details;
        orderDetailsError = "";
        try {
          const payload = await serverApi(`/api/orders/${encodeURIComponent(details.serverId)}`);
          upsertServerOrder(payload.order);
          return orderDetails[number];
        } catch (error) {
          orderDetailsError = error instanceof Error ? error.message : "Не удалось обновить заказ";
          throw error;
        }
      }

      const esc = value => String(value).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
      const rub = value => new Intl.NumberFormat("ru-RU").format(value) + " ₽";
      const openDialog = dialog => { if (!dialog) return; if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", ""); };
      const closeDialog = dialog => { if (!dialog) return; if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open"); };
      const orgOptions = (selected = "") => `<option value="" ${selected ? "" : "selected"}>Организация</option>${organizations.map(o => `<option value="${esc(o[1])}" ${o[1] === selected ? "selected" : ""}>${esc(o[1])}</option>`).join("")}`;

      const breadcrumbMap = { profile: [["Профиль"]], organization: [["Профиль", "profile"], ["Организации", "profile"], ["Организация"]], contact: [["Профиль", "profile"], ["Контакты", "profile", "contacts"], ["Контактное лицо"]], orders: [["Заказы"]], order: [["Заказы", "orders"], ["Заказ №"]], activations: [["Лицензии"], ["Список активаций"]], activation: [["Лицензии"], ["Список активаций", "activations"], ["Активация №"]], "activate-org": [["Лицензии"], ["Активация лицензий"]], "activate-offer": [["Лицензии"], ["Активация лицензий", "activate-org"], ["Оферта"]], activate: [["Лицензии"], ["Активация лицензий", "activate-org"]], catalog: [["Интернет-магазин"], ["Каталог"]], cart: [["Интернет-магазин"], ["Каталог", "catalog"], ["Корзина"]], "cart-result": [["Интернет-магазин"], ["Каталог", "catalog"], ["Корзина", "cart"], ["Корзина №"]] };
      function breadcrumbs(page) { const items = breadcrumbMap[page] || [["ЛКП"]]; return `<nav class="breadcrumbs" aria-label="Хлебные крошки">${items.map((item, index) => { const [label, target, tab] = item; const separator = index ? `<span aria-hidden="true">/</span>` : ""; if (target) return `${separator}<button class="btn btn-ghost" type="button" data-page="${target}" ${tab ? `data-open-tab="${tab}"` : ""}>${label}</button>`; return `${separator}<span class="current">${label}</span>`; }).join("")}</nav>`; }

      function toolbar(id, options = {}) {
        const search = options.search !== false;
        const org = options.org !== false;
        const payment = options.payment === true;
        const extra = options.extra || "";
        return `<div class="table-toolbar" data-toolbar="${id}">
          ${search ? `<label class="filter-control" data-search-wrap><span class="sr-only">Поиск</span><input class="form-control" type="search" placeholder="Поиск" aria-label="Поиск" data-table-search="${id}"></label>` : ""}
          ${org ? `<div class="filter-add"><label class="filter-chip ${options.compactOrg ? "filter-chip-compact" : ""}"><span class="filter-plus" aria-hidden="true">+</span><span class="sr-only">Организация</span><select class="form-select" aria-label="Организация" data-table-org="${id}">${orgOptions(options.selectedOrg || "")}</select></label></div>` : ""}
          ${payment ? `<div class="filter-add"><label class="filter-chip"><span class="filter-plus" aria-hidden="true">+</span><span class="sr-only">Оплата</span><select class="form-select" aria-label="Оплата" data-table-payment="${id}"><option value="">Оплата</option><option value="✓">Оплачено</option><option value="—">Не оплачено</option></select></label></div>` : ""}
          ${extra}
          <div class="toolbar-spacer settings-wrap">
            <button class="btn btn-ghost" type="button" aria-label="Настройки таблицы" aria-expanded="false" data-settings="${id}"><i data-lucide="sliders-horizontal" aria-hidden="true"></i></button>
            <div class="card settings-panel" data-settings-panel="${id}" hidden>
              <label class="form-label">Столбцы<select class="form-select"><option>Все столбцы</option><option>Настроить отображение</option></select></label>
              <label class="form-label">Сортировка<select class="form-select"><option>По умолчанию</option><option>По возрастанию</option><option>По убыванию</option></select></label>
              <label class="form-label">Фильтры<select class="form-select"><option>Без дополнительных фильтров</option><option>Настроить фильтры</option></select></label>
              ${search ? `<div class="form-check"><input class="form-check-input" id="search-check-${id}" type="checkbox" checked data-search-toggle="${id}"><label class="form-check-label" for="search-check-${id}">Показывать строку поиска</label></div>` : ""}
            </div>
          </div>
        </div>`;
      }

      function dataTable(headers, rows, go, options = {}) {
        const id = options.id || "table";
        return `<section class="table-panel">${toolbar(id, options)}<div class="table-responsive"><table class="table table-sm" data-table="${id}">
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${rows.map((r, i) => {
            const org = options.rowOrg ? options.rowOrg(r) : "";
            return `<tr ${go ? `data-go="${go}"` : ""} data-index="${i}" data-org="${esc(org)}">${r.map(v => `<td>${v}</td>`).join("")}</tr>`;
          }).join("")}</tbody>
        </table></div></section>`;
      }

      const organizationTable = () => organizationAccessLoaded
        ? dataTable(["ID", "Название", "ИНН", "Город", "Договоры", "Телефон", "Email"], organizations, "organization", { id: "organizations", org: false, rowOrg: r => r[1] })
        : '<div class="panel muted-note">Проверяем доступные организации…</div>';
      const contactTable = () => dataTable(["Отдел", "Должность", "ФИО", "Телефон", "Email"], contacts, "contact", { id: "contacts", org: false });
      const orderTable = (rows = orders, id = "orders", selectedOrg = "", options = {}) => {
        const visibleRows = visibleOrderRows(rows);
        return `<section class="table-panel">${toolbar(id, { selectedOrg, org: options.org !== false, payment: options.payment === true })}<div class="table-responsive"><table class="table table-sm" data-table="${id}"><thead><tr><th>№ заказа</th><th>№ счета</th><th>Организация</th><th>Дата заказа</th><th>Статус заказа</th><th>Условия поставки</th><th>Стоимость</th><th>Оплата</th><th>Контактное лицо</th></tr></thead><tbody>${visibleRows.map((r, i) => `<tr data-go="order" data-index="${i}" data-order-number="${esc(r[0])}" data-org="${esc(r[2])}" data-payment="${esc(r[7])}"><td><span class="order-number"><span>${esc(r[0])}</span><span class="order-type">${esc(orderTypes[r[0]] || "Покупка товара")}</span></span></td>${r.slice(1).map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
      };
      function activationTable() {
        return `<section class="table-panel">${toolbar("activations")}<div class="table-responsive"><table class="table table-sm" data-table="activations">
          <thead><tr><th>№ активации</th><th>№ заказа</th><th>Организация</th><th>Статус активации</th><th>Вендор</th><th>Подписок</th><th>Стоимость</th><th>Оплата</th><th>Дата заказа</th><th>Комментарий</th><th><span class="sr-only">Файл лицензий</span></th></tr></thead>
          <tbody>${visibleActivations().map((a, i) => `<tr data-go="activation" data-index="${i}" data-org="${esc(a[2])}">${a.map(v => `<td>${esc(v)}</td>`).join("")}<td><button class="btn btn-ghost" type="button" aria-label="Скачать файл лицензий активации ${esc(a[0])}" data-download-license><i data-lucide="download" aria-hidden="true"></i></button></td></tr>`).join("")}</tbody>
        </table></div></section>`;
      }

      function plainTable(headers, rows, id) {
        return `${toolbar(id, { search: false, org: false })}<div class="table-responsive"><table class="table table-sm"><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      }

      function catalogTable(selectedOrg = "", selectedGroup = "") {
        if (catalogState.loading) return `<section class="table-panel"><div class="panel muted-note">Загрузка организаций и товаров из D1…</div></section>`;
        if (catalogState.error) return `<section class="table-panel"><div class="notice" role="alert">Не удалось загрузить каталог: ${esc(catalogState.error)}</div><button class="btn btn-primary" type="button" data-catalog-retry>Повторить</button></section>`;
        const groups = [...new Set(products.map(p => p.group))];
        const visible = products.filter(p => (!selectedOrg || p.orgs.includes(selectedOrg)) && (!selectedGroup || p.group === selectedGroup));
        const extra = `<div class="filter-add"><label class="filter-chip"><span class="filter-plus" aria-hidden="true">+</span><span class="sr-only">Группа товара</span><select class="form-select" aria-label="Группа товара" data-catalog-group><option value="" ${selectedGroup ? "" : "selected"}>Группа товара</option>${groups.map(g => `<option value="${esc(g)}" ${g === selectedGroup ? "selected" : ""}>${esc(g)}</option>`).join("")}</select></label></div>`;
        const pricePopover = product => `<span class="info-wrap"><button class="info-trigger" type="button" aria-label="Показать уровни цен для ${esc(product.name)}">?</button><span class="info-popover"><span class="price-group"><strong>Стоимость:</strong><span class="price-row"><span>РРЦ (Розница)</span><b>${rub(product.rrp)}</b></span><span class="price-row"><span>Партнер</span><b>${rub(product.partnerPrice)}</b></span><span class="price-row"><span>Постоянный партнер</span><b>${rub(product.price)}</b></span></span></span></span>`;
        return `<section class="table-panel">${toolbar("catalog", { selectedOrg, extra, compactOrg: true })}<div class="table-responsive"><table class="table table-sm catalog-table" data-table="catalog">
          <thead><tr><th>Код товара</th><th>Наименование</th><th>Товарная группа</th><th class="catalog-price">Ваша цена</th><th class="catalog-quantity">Количество</th></tr></thead>
          <tbody>${visible.map(p => {
            const cartKey = selectedOrg ? `${selectedOrg}|${p.vendor}|${p.code}` : "";
            const cartItem = cartKey ? cart.find(item => item.key === cartKey) : null;
            const inCart = Boolean(cartItem);
            const displayedQuantity = cartItem?.qty || quantities[p.code];
            return `<tr data-product="${esc(p.code)}" data-org="${esc(selectedOrg)}"><td>${esc(p.code)}</td><td>${esc(p.name)}</td><td>${esc(p.group)}</td><td class="catalog-price text-nowrap">${rub(p.price)} ${pricePopover(p)}</td><td class="product-action-cell"><span class="product-actions"><span class="qty"><button class="btn btn-ghost" type="button" aria-label="Уменьшить количество" data-qty-minus="${esc(p.code)}">−</button><input class="form-control qty-input" type="number" min="1" max="500" value="${displayedQuantity}" aria-label="Количество ${esc(p.name)}" data-qty-input="${esc(p.code)}"><button class="btn btn-ghost" type="button" aria-label="Увеличить количество" data-qty-plus="${esc(p.code)}">+</button></span><button class="btn ${inCart ? "btn-primary" : "btn-ghost"}" type="button" aria-label="${inCart ? "Удалить" : "Добавить"} ${esc(p.name)} ${inCart ? "из корзины" : "в корзину"}" data-cart-product="${esc(p.code)}" data-cart-remove="${inCart ? "true" : "false"}"><i data-lucide="shopping-cart" aria-hidden="true"></i></button></span></td></tr>`;
          }).join("") || `<tr><td colspan="5" class="text-muted">${selectedOrg ? "Для выбранной организации товары не найдены." : "Выберите организацию, чтобы увидеть доступные товары и цены."}</td></tr>`}</tbody>
        </table></div></section>`;
      }

      function cartTable(items, org, vendor, id) {
        const rows = items.map((item, index) => [String(index + 1), esc(item.name), rub(item.price), `<span class="qty"><button class="btn btn-ghost" type="button" aria-label="Уменьшить количество" data-cart-minus="${esc(item.key)}">−</button><input class="form-control qty-input" type="number" min="1" max="500" value="${item.qty}" aria-label="Количество ${esc(item.name)}" data-cart-input="${esc(item.key)}"><button class="btn btn-ghost" type="button" aria-label="Увеличить количество" data-cart-plus="${esc(item.key)}">+</button></span>`, rub(item.price * item.qty)]);
        return `<section class="table-panel">${toolbar(id, { search: false, org: false })}<div class="table-responsive"><table class="table table-sm cart-items"><colgroup><col><col><col><col><col></colgroup><thead><tr><th>№</th><th>Название</th><th>Цена</th><th>Количество</th><th>Сумма</th></tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
      }

      function renderCart() {
        if (!organizationAccessLoaded) return `<div class="page-head"><div class="page-title">Корзина</div></div><div class="panel muted-note">Проверяем доступные организации…</div>`;
        if (!cart.length) return `<div class="page-head"><div class="page-title">Корзина</div><button class="btn btn-primary" type="button" data-page="catalog">Каталог</button></div><div class="panel muted-note">Корзина пустая.</div>`;
        const byOrg = {};
        cart.forEach(item => {
          byOrg[item.org] ||= {};
          byOrg[item.org][item.vendor] ||= [];
          byOrg[item.org][item.vendor].push(item);
        });
        const body = Object.entries(byOrg).map(([org, vendors], oi) => {
          const orgItems = Object.values(vendors).flat();
          const orgTotal = orgItems.reduce((sum, i) => sum + i.price * i.qty, 0);
          const vendorHtml = Object.entries(vendors).map(([vendor, items], vi) => {
            const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
            const groupId = `cart-${oi}-${vi}`;
            return `<section class="vendor-block"><div class="vendor-head"><div class="page-title">${esc(vendor)}</div><label class="form-label">Договор<select class="form-select"><option>Основной договор</option><option>Другой активный договор</option></select></label></div>
              ${cartTable(items, org, vendor, groupId)}
              <div class="comment-line"><div class="comment-box"><div class="form-check"><input class="form-check-input" type="checkbox" id="comment-${groupId}" data-comment-toggle="${groupId}"><label class="form-check-label" for="comment-${groupId}">Добавить комментарий</label></div><textarea class="form-control" rows="2" placeholder="Комментарий к предварительному заказу" data-comment-box="${groupId}" hidden></textarea></div><div class="sum-block"><div class="label">Сумма по договору</div><div>${rub(total)}</div></div></div>
            </section>`;
          }).join("");
          return `<section class="cart-org"><div class="cart-org-head"><div class="page-title">${esc(org)}</div><div class="page-title">${rub(orgTotal)}</div></div><div class="cart-user"><div><div class="label">ФИО</div><div>Иванов Иван Иванович</div></div><div><div class="label">Email</div><div>example@mail.ru</div></div><div><div class="label">Телефон</div><div>+79876543210</div></div></div>${vendorHtml}</section>`;
        }).join("");
        const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        return `<div class="page-head"><div class="page-title">Корзина</div><button class="btn btn-primary" type="button" data-page="catalog">Каталог</button></div>${body}<div class="cart-bottom"><button class="btn btn-primary" type="button" data-checkout>Оформить заказ</button><div class="sum-block"><span class="page-title">Итого: ${rub(total)}</span></div></div><div class="notice" role="alert" data-checkout-error aria-live="assertive"></div><div class="cart-warning"><div class="page-title">Внимание!</div><div>Детали и адрес доставки после заказа будут обговорены с вашим менеджером</div></div>`;
      }

      async function createCartOrders() {
        if (!cart.length) return null;
        if (!organizationAccessLoaded) throw new Error("Список доступных организаций ещё не загружен");
        if (checkoutInProgress) return null;
        checkoutInProgress = true;
        pendingCheckoutKey ||= crypto.randomUUID();
        const cartNumber = randomNatural(653, 999, new Set(createdCarts.map(item => String(item.number))));
        const grouped = {};
        cart.forEach(item => { grouped[item.org] ||= { org: item.org, items: [] }; grouped[item.org].items.push({ ...item }); });
        try {
          const createdOrders = [];
          for (const group of Object.values(grouped)) {
            const organization = organizations.find(item => item[1] === group.org);
            if (!organization) throw new Error(`Организация «${group.org}» недоступна`);
            const catalog = await serverApi(`/api/catalog?organizationId=${encodeURIComponent(organization[0])}`);
            const byCode = new Map((catalog.products || []).map(product => [product.code, product]));
            const items = group.items.map(item => {
              const product = byCode.get(item.code);
              if (!product) throw new Error(`Товар ${item.code} недоступен для выбранной организации`);
              return { productId: product.id, quantity: item.qty };
            });
            const payload = await serverApi("/api/orders", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ organizationId: organization[0], idempotencyKey: `${pendingCheckoutKey}:${organization[0]}`, items, contactName: "Иванов Иван Иванович", contactPhone: "+7 987 654 32 10", contactEmail: "example@mail.ru", deliveryTerms: "Предоплата 100%" })
            });
            createdOrders.push(upsertServerOrder(payload.order));
          }
          const result = { number: cartNumber, date: todayLabel(), orders: createdOrders, server: true };
          createdCarts.unshift(result);
          cart.splice(0, cart.length);
          pendingCheckoutKey = "";
          saveState();
          return result;
        } finally {
          checkoutInProgress = false;
        }
      }

      function renderCartResult(cartResult) {
        const result = cartResult || createdCarts[0];
        if (!result) return `<div class="page-head"><div class="page-title">Корзина</div></div><div class="panel muted-note">Созданных заказов в этой корзине нет.</div>`;
        const cards = result.orders.map(number => {
          const details = orderDetails[number]; if (!details) return "";
          return `<section class="order-block cart-result-order"><div class="page-head"><div class="page-title"><a href="#" data-order-number="${esc(number)}">Заказ №${esc(number)}</a> на ${rub(details.total)}</div></div><div class="order-columns"><div><div class="order-field"><div class="label">Организация</div><div>${esc(details.org)}</div></div><div class="order-field"><div class="label">ФИО</div><div>${esc(details.name)}</div></div><div class="order-field"><div class="label">Телефон</div><div>${esc(details.phone)}</div></div><div class="order-field"><div class="label">E-mail</div><div><a href="mailto:${esc(details.email)}">${esc(details.email)}</a></div></div></div><div><div class="order-field"><div class="label">Статус заказа</div><div><strong>${esc(details.status)}</strong></div></div><div class="order-field"><div class="label">Тип заказа</div><div>${esc(details.type)}</div></div><div class="order-field"><div class="label">Статус оплаты</div><div>${esc(details.payment)}</div></div><div class="order-field"><div class="label">Дата заказа</div><div>${esc(details.date)}</div></div><div class="order-field"><div class="label">Номер счета</div><div>${esc(details.invoice || "—")}</div></div><div class="order-field"><div class="label">Договор</div><div>${esc(details.agreement)}</div></div></div></div></section>`;
        }).join("");
        return `<div class="page-head"><div class="page-title">Корзина № ${esc(result.number)}</div></div>${cards}<div class="simulator-note">Заказ сохранён в постоянной базе данных D1.</div>`;
      }

      const licenseKeys = ["service", "marking", "extended"];
      const licenseLabels = { service: "Сервис обновлений", marking: "Маркировка", extended: "Расширенный функционал" };
      const licenseHeaderPrices = { service: "2 000 ₽", marking: "500 ₽", extended: "1 000 ₽" };

      function activationTotal() {
        return activationDevices.reduce((sum, device) => sum + licenseKeys.reduce((inner, key) => {
          const license = device.licenses[key];
          return inner + (license.available && license.selected ? license.price : 0);
        }, 0), 0);
      }

      function allSelectedForColumn(key) {
        const available = activationDevices.map(device => device.licenses[key]).filter(license => license.available);
        return available.length > 0 && available.every(license => license.selected);
      }

      function allAvailableSelected() {
        const available = activationDevices.flatMap(device => licenseKeys.map(key => device.licenses[key])).filter(license => license.available);
        return available.length > 0 && available.every(license => license.selected);
      }

      function licenseCell(deviceIndex, key) {
        const license = activationDevices[deviceIndex].licenses[key];
        if (!license.available) return `<div class="checkbox-cell"><input class="form-check-input" type="checkbox" disabled aria-label="${licenseLabels[key]} недоступно"><span>Недоступно</span></div>`;
        const currentClass = `state-${license.currentState || "none"}`;
        return `<label class="checkbox-cell"><input class="form-check-input ${license.selected ? "is-checked" : ""}" type="checkbox" ${license.selected ? "checked" : ""} aria-checked="${license.selected}" data-license-cell="${key}" data-device-index="${deviceIndex}" aria-label="${licenseLabels[key]} для ${activationDevices[deviceIndex].serial}"><span class="${currentClass}">${license.current}${license.over180 ? `<span class="badge-180">180+</span>` : ""}</span><span class="license-new">${license.next}</span></label>`;
      }

      function licensePriceHelp() {
        return `<span class="info-wrap"><button class="info-trigger" type="button" aria-label="Показать цены лицензий">?</button><span class="info-popover"><span class="price-group"><strong>Сервис обновлений</strong><span class="price-row"><span>РРЦ (Розница)</span><b>4 000 ₽</b></span><span class="price-row"><span>Партнер</span><b>2 000 ₽</b></span><span class="price-row"><span>Постоянный партнер</span><b>2 000 ₽</b></span></span><span class="price-group"><strong>Маркировка</strong><span class="price-row"><span>РРЦ (Розница)</span><b>1 000 ₽</b></span><span class="price-row"><span>Партнер</span><b>500 ₽</b></span><span class="price-row"><span>Постоянный партнер</span><b>500 ₽</b></span></span><span class="price-group"><strong>Расширенный функционал</strong><span class="price-row"><span>РРЦ (Розница)</span><b>2 000 ₽</b></span><span class="price-row"><span>Партнер</span><b>1 000 ₽</b></span><span class="price-row"><span>Постоянный партнер</span><b>1 000 ₽</b></span></span></span></span>`;
      }

      function renderActivationPreviewTable() {
        const headers = licenseKeys.map(key => { const selected = allSelectedForColumn(key); return `<th><label class="license-choice"><input class="form-check-input ${selected ? "is-checked" : ""}" type="checkbox" ${selected ? "checked" : ""} aria-checked="${selected}" data-license-column="${key}" aria-label="Выбрать весь столбец ${licenseLabels[key]}"><span class="license-heading"><span>${licenseLabels[key]}</span><span class="license-column-price">${licenseHeaderPrices[key]}</span></span></label></th>`; }).join("");
        const rows = activationDevices.map((device, deviceIndex) => {
          const available = licenseKeys.map(key => device.licenses[key]).filter(license => license.available);
          const rowSelected = available.length > 0 && available.every(license => license.selected);
          const rowSum = licenseKeys.reduce((sum, key) => sum + (device.licenses[key].available && device.licenses[key].selected ? device.licenses[key].price : 0), 0);
          return `<tr><td><input class="form-check-input ${rowSelected ? "is-checked" : ""}" type="checkbox" ${rowSelected ? "checked" : ""} aria-checked="${rowSelected}" data-license-row="${deviceIndex}" aria-label="Выбрать строку ${device.serial}"></td><td><span class="stacked-value"><span>${device.serial}</span><span class="text-muted text-small">${device.model}</span></span></td>${licenseKeys.map(key => `<td>${licenseCell(deviceIndex, key)}</td>`).join("")}<td class="text-end text-nowrap">${rub(rowSum)} ${licensePriceHelp()}</td></tr>`;
        }).join("");
        const allSelected = allAvailableSelected();
        return `<div class="table-responsive"><table class="table table-sm"><thead><tr><th><input class="form-check-input ${allSelected ? "is-checked" : ""}" type="checkbox" ${allSelected ? "checked" : ""} aria-checked="${allSelected}" data-license-all aria-label="Выбрать все доступные ячейки"></th><th>Серийный номер</th>${headers}<th class="text-end">Сумма</th></tr></thead><tbody>${rows}</tbody></table></div><div class="mini-total">Итого: ${rub(activationTotal())}</div>`;
      }

      function licenseNomenclature(key) {
        const names = {
          service: "Лицензия: ПО «Кассовое ядро – МН». Сервис обновления (подписка на 12 месяцев), aQsi",
          marking: "Лицензия: ПО «Кассовое ядро – МН». Маркировка (подписка на 12 месяцев), aQsi",
          extended: "Лицензия: ПО «Кассовое ядро – МН». Расширенный функционал (подписка на 12 месяцев), aQsi"
        };
        return names[key];
      }

      function selectedLicenseItems() {
        return activationDevices.flatMap(device => licenseKeys.filter(key => device.licenses[key].available && device.licenses[key].selected).map(key => ({
          serial: device.serial, model: device.model, key, type: licenseLabels[key], name: licenseNomenclature(key), current: device.licenses[key].current, next: device.licenses[key].next,
          subscription: device.licenses[key].next.replace("Новая до ", ""), price: device.licenses[key].price, over180: Boolean(device.licenses[key].over180)
        })));
      }

      function createActivationRecord(comment = "") {
        const selected = selectedLicenseItems();
        if (!selected.length) return null;
        const activationNumber = randomNatural(125, 9999, new Set(activations.map(item => item[0])));
        const status = lastCheckedSerial === "0000000000000000" ? "Ошибка" : "В работе";
        const total = selected.reduce((sum, item) => sum + item.price, 0);
        if (status !== "Ошибка") balances[selectedLicenseOrg] = Math.max(0, (balances[selectedLicenseOrg] || 0) - total);
        const payment = status === "Ошибка" ? "—" : "Оплачено";
        const activation = [activationNumber, "—", selectedLicenseOrg, status, "Пэй Киоск", String(selected.length), rub(total), status === "Ошибка" ? "—" : "✓", todayLabel(), comment || "—"];
        activations.unshift(activation); activationDetails[activationNumber] = { licenses: selected, payment, simulator: "ФР-Крипто", comment: comment || "", total }; saveState(); return activation;
      }

      function completeActivation(activationNumber) {
        const activation = activations.find(item => item[0] === activationNumber);
        const details = activationDetails[activationNumber];
        if (!activation || !details || activation[3] !== "В работе") return activation;
        const orderNumber = randomNatural(13000, 99999, new Set(orders.map(item => item[0])));
        const invoice = `ПГ-${randomNatural(100, 999, new Set())}`;
        const total = details.total || details.licenses.reduce((sum, item) => sum + item.price, 0);
        const order = [orderNumber, invoice, activation[2], todayLabel(), "Отгружен", "Предоплата 100%", rub(total), "✓", "Иванов Иван Иванович"];
        orders.unshift(order); orderTypes[orderNumber] = "Активация лицензий";
        orderDetails[orderNumber] = { number: orderNumber, type: "Активация лицензий", status: "Отгружен", payment: "Оплачено", date: todayLabel(), invoice, agreement: "Сублицензионный договор (Предоплата 100%) от 15.12.2025", org: activation[2], name: "Иванов Иван Иванович", phone: "+7 987 654 32 10", email: "aqaglobal+testZS@aqsi.ru", comment: `Активация № ${activationNumber}`, vendor: "Пи Джи Групп", items: details.licenses.map(item => ({ name: item.name || `${item.type} — ${item.model}`, price: item.price, qty: 1 })), total };
        activation[1] = orderNumber; activation[3] = "Выполнена"; activation[7] = "✓"; details.payment = "Оплачено"; saveState(); return activation;
      }

      function createAdvanceOrder(amount) {
        const number = randomNatural(13000, 99999, new Set(orders.map(item => item[0])));
        const invoice = `ПГ-${randomNatural(100, 999, new Set())}`;
        const order = [number, invoice, selectedLicenseOrg, todayLabel(), "Принят", "Предоплата 100%", rub(amount), "✓", "Иванов Иван Иванович"];
        orders.unshift(order); orderTypes[number] = "Авансовый платеж";
        balances[selectedLicenseOrg] = (balances[selectedLicenseOrg] || 0) + amount;
        orderDetails[number] = { number, type: "Авансовый платеж", status: "Принят", payment: "Оплачено", date: todayLabel(), invoice, agreement: "Сублицензионный договор (Предоплата 100%) от 15.12.2025", org: selectedLicenseOrg, name: "Иванов Иван Иванович", phone: "+7 987 654 32 10", email: "aqaglobal+testZS@aqsi.ru", vendor: "Пи Джи Групп", items: [{ name: "Авансовый платеж", price: amount, qty: 1 }], total: amount };
        saveState(); return order;
      }

