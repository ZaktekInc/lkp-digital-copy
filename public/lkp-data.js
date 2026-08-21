/* Global declarations in this classic script are consumed by lkp.js. */
/* eslint-disable @typescript-eslint/no-unused-vars */
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

      const browserStore = window.LkpBrowserStore;
      const browserBusiness = window.LkpBusiness;
      const clone = value => JSON.parse(JSON.stringify(value));
      const activationDevices = [];
      const organizations = [];
      const contacts = [];
      const orders = [];
      const orderTypes = {};
      const activations = [];
      const contracts = [];
      const products = [];
      const quantities = {};
      const cart = [];

      const orderDetails = {};
      const activationDetails = {};
      const createdCarts = [];
      const balances = {};
      const storedOrderNumbers = new Set();
      const catalogState = { loading: true, error: "", selectedOrg: "", selectedGroup: "" };
      let activePage = "catalog";
      let activeContext = null;
      const restorablePages = new Set(["login", "profile", "organization", "contact", "orders", "order", "activations", "activation", "activate-org", "activate-offer", "activate", "catalog", "cart", "cart-result"]);
      let organizationAccessLoaded = false;
      let catalogRequestId = 0;
      let ordersLoadError = "";
      let orderDetailsError = "";
      let contactsLoadError = "";
      let checkoutInProgress = false;
      let currentUser = null;

      function navigationLocation() {
        try { return window.parent && window.parent !== window ? window.parent.location : window.location; }
        catch { return window.location; }
      }

      function navigationHistory() {
        try { return window.parent && window.parent !== window ? window.parent.history : window.history; }
        catch { return window.history; }
      }

      function navigationToken(page, context) {
        if (page === "order" || page === "activation") return context?.[0] || "";
        if (page === "organization") return organizations[Number(context)]?.[7] || "";
        if (page === "contact") return Number.isInteger(Number(context)) ? String(context) : "";
        if (page === "cart-result") return context?.number || "";
        if (page === "profile") return typeof context === "string" ? context : "";
        if (page === "activate" || page === "activate-offer") return selectedLicenseOrg || "";
        return "";
      }

      function persistNavigation(page, context) {
        if (!restorablePages.has(page)) return;
        const params = new URLSearchParams({ lkp: page });
        const token = navigationToken(page, context);
        if (token) params.set("context", token);
        const location = navigationLocation();
        const hash = `#${params.toString()}`;
        if (location.hash !== hash) navigationHistory().replaceState(null, "", `${location.pathname}${location.search}${hash}`);
      }

      function restoreNavigation() {
        const params = new URLSearchParams(navigationLocation().hash.replace(/^#/, ""));
        const page = params.get("lkp") || "catalog";
        const token = params.get("context") || "";
        if (!restorablePages.has(page)) return { page: "catalog", context: null };
        if (page === "order") return orders.some(order => order[0] === token) ? { page, context: orders.find(order => order[0] === token) } : { page: "orders", context: null };
        if (page === "activation") return activations.some(item => item[0] === token) ? { page, context: activations.find(item => item[0] === token) } : { page: "activations", context: null };
        if (page === "organization") {
          const index = organizations.findIndex(item => item[7] === token);
          return index >= 0 ? { page, context: index } : { page: "profile", context: null };
        }
        if (page === "contact") {
          const index = Number.parseInt(token, 10);
          return Number.isInteger(index) && contacts[index] ? { page, context: index } : { page: "profile", context: "contacts" };
        }
        if (page === "cart-result") return { page, context: createdCarts.find(item => item.number === token) || null };
        if ((page === "activate" || page === "activate-offer") && token) selectedLicenseOrg = token;
        return { page, context: page === "profile" ? token : page === "activate" ? selectedLicenseOrg : null };
      }
      function syncLicenseData(organizationRecords) {
        const namesById = new Map(organizationRecords.map(org => [org.id, org.name]));
        const records = browserStore.getActivations();
        activations.splice(0, activations.length, ...records.map(item => [
          item.number, item.orderNumber || "—", namesById.get(item.organizationId) || "Архивная организация", item.status, item.vendor,
          String(item.items.length), rub(item.totalCents / 100), item.paymentStatus === "Оплачено" ? "✓" : "—",
          new Intl.DateTimeFormat("ru-RU").format(new Date(item.orderedAt)), item.comment || "—"
        ]));
        Object.keys(activationDetails).forEach(key => delete activationDetails[key]);
        records.forEach(item => {
          const licenseFile = item.licenseFileDocumentId ? browserStore.getDocument(item.licenseFileDocumentId) : null;
          activationDetails[item.number] = {
            licenses: item.items.flatMap(license => (license.licenseKeys.length ? license.licenseKeys : [{ serialNumber: "" }]).map(key => ({ serial: key.serialNumber, model: license.model, type: license.licenseType, subscription: license.subscriptionEnd, price: license.priceCents / 100, licenseKey: key.licenseKey, licenseStatus: key.status }))),
            payment: item.paymentStatus, simulator: item.simulator, comment: item.comment, total: item.totalCents / 100,
            licenseFileDocumentId: licenseFile?.isAvailable ? licenseFile.id : ""
          };
        });
        Object.keys(balances).forEach(key => delete balances[key]);
        const storedBalances = browserStore.getBalances();
        organizationRecords.forEach(org => { balances[org.name] = storedBalances[org.id] || 0; });
      }

      function syncBrowserData() {
        const organizationRecords = browserStore.getOrganizations();
        const contractRecords = browserStore.getContracts();
        const allContractRecords = browserStore.getContracts({ includeInactive: true });
        contracts.splice(0, contracts.length, ...contractRecords);
        organizations.splice(0, organizations.length, ...organizationRecords.map(org => [org.publicId, org.name, org.inn, org.city, String(allContractRecords.filter(contract => contract.organizationId === org.id).length), org.phone, org.email, org.id]));
        organizationAccessLoaded = true;
        const namesById = new Map(organizationRecords.map(org => [org.id, org.name]));
        const productRecords = browserStore.getProducts();
        products.splice(0, products.length, ...productRecords.map(product => ({
          id: product.code, code: product.code, name: product.name, group: product.groupName, vendor: product.vendor,
          rrp: product.rrpCents / 100, partnerPrice: product.partnerPriceCents / 100, price: product.priceCents / 100,
          orgs: product.availableOrganizationIds.map(id => namesById.get(id)).filter(Boolean)
        })));
        products.forEach(product => { quantities[product.code] ||= 1; });
        replaceContacts(browserStore.getContacts());
        cart.splice(0, cart.length, ...browserStore.getCart().map(row => {
          const product = productRecords.find(item => item.code === row.productCode);
          const org = namesById.get(row.organizationId);
          return product && org ? { key: `${org}|${product.vendor}|${product.code}`, storageKey: row.key, organizationId: row.organizationId, org, vendor: product.vendor, code: product.code, name: product.name, price: product.priceCents / 100, qty: row.quantity } : null;
        }).filter(Boolean));
        createdCarts.splice(0, createdCarts.length, ...browserStore.getCarts().map(item => ({ number: item.number, date: new Intl.DateTimeFormat("ru-RU").format(new Date(item.createdAt)), orders: item.orderNumbers })));
        replaceStoredOrders(browserStore.getOrders());
        syncLicenseData(organizationRecords);
        const allowedNames = new Set(organizations.map(org => org[1]));
        if (!allowedNames.has(selectedLicenseOrg)) selectedLicenseOrg = organizations[0]?.[1] || "";
        if (activePage === "activate") restoreActivationDraft(selectedLicenseOrg);
      }

      function sublicenseContractForOrganization(organizationName) {
        const organizationId = organizations.find(item => item[1] === organizationName)?.[7];
        return contracts.find(contract => contract.organizationId === organizationId && contract.type === "Сублицензионный договор" && contract.vendor === "Пи Джи Групп" && contract.isActive !== false && contract.status !== "Закрыт");
      }

      function saveCartToStore() {
        browserStore.saveCart(cart.map(item => ({ key: `${item.organizationId || organizations.find(org => org[1] === item.org)?.[7]}|${item.vendor}|${item.code}`, organizationId: item.organizationId || organizations.find(org => org[1] === item.org)?.[7], vendor: item.vendor, productCode: item.code, quantity: item.qty })));
      }

      function saveState() {
        try { saveCartToStore(); syncBrowserData(); } catch {}
      }
      const randomNatural = (min, max, used) => { let value; do value = String(Math.floor(Math.random() * (max - min + 1)) + min); while (used.has(value)); return value; };
      const todayLabel = () => new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
      const isOrganizationVisible = organizationName => organizationAccessLoaded && organizations.some(org => org[1] === organizationName);
      const visibleOrderRows = rows => rows.filter(order => storedOrderNumbers.has(order[0]));
      const visibleActivations = () => activations.filter(activation => isOrganizationVisible(activation[2]));

      async function loadCatalog(organizationName = "") {
        const requestId = ++catalogRequestId;
        catalogState.loading = true;
        catalogState.error = "";
        catalogState.selectedOrg = organizationName;
        try {
          if (requestId !== catalogRequestId) return;
          syncBrowserData();
        } catch (error) {
          if (requestId !== catalogRequestId) return;
          catalogState.error = error instanceof Error ? error.message : "Не удалось загрузить данные браузера";
        } finally {
          if (requestId === catalogRequestId) catalogState.loading = false;
        }
      }

      function serverOrderDetails(order) {
        const organization = browserStore.getOrganizations({ includeInactive: true }).find(item => item.id === order.organizationId);
        const contract = browserStore.getContracts({ includeInactive: true }).find(item => item.id === order.contractId);
        const documents = browserStore.getOrderDocuments(order.number);
        return {
           number: order.number,
           type: order.type || "Покупка товара",
           activationNumber: order.activationNumber || "",
          status: order.status,
          payment: order.paymentStatus,
          date: new Intl.DateTimeFormat("ru-RU").format(new Date(order.createdAt)),
          invoice: order.invoiceNumber || "—",
          contractId: order.contractId || "",
          agreement: contract?.name || order.agreement || order.deliveryTerms,
          org: organization?.name || "Архивная организация",
          name: order.contactName,
          phone: order.contactPhone,
          email: order.contactEmail,
          comment: order.comment,
          cartId: order.cartNumber || "",
          cartNumber: order.cartNumber || "",
          vendor: order.vendor,
          accountingSystem: order.accountingSystem || browserBusiness.accountingSystemFor(order),
          documents,
          items: (order.items || []).map(item => ({ code: item.productCode || item.code || "", name: item.name, vendor: item.vendor, price: item.unitPriceCents / 100, qty: item.quantity })),
          total: order.totalCents / 100,
          history: (order.history || []).map(item => ({ ...item, changedByEmail: item.changedBy }))
        };
      }

      function upsertStoredOrder(order) {
        const number = order.number;
        storedOrderNumbers.add(number);
        orderTypes[number] = order.type || "Покупка товара";
        const details = serverOrderDetails(order);
        orderDetails[number] = details;
        const row = [number, details.invoice || "—", details.org, details.date, details.status, details.agreement, rub(details.total), details.payment === "Оплачено" ? "✓" : "—", details.name];
        const existing = orders.findIndex(item => item[0] === number);
        if (existing >= 0) orders.splice(existing, 1, row); else orders.push(row);
        return number;
      }

      function removeStoredOrder(number) {
        const index = orders.findIndex(order => order[0] === number);
        if (index >= 0) orders.splice(index, 1);
        delete orderDetails[number];
        delete orderTypes[number];
        storedOrderNumbers.delete(number);
      }

      function replaceStoredOrders(storedOrders) {
        [...storedOrderNumbers].forEach(removeStoredOrder);
        storedOrders.forEach(upsertStoredOrder);
      }

      async function refreshServerOrders() {
        try {
          syncBrowserData();
          ordersLoadError = "";
          return true;
        } catch (error) {
          replaceStoredOrders([]);
          ordersLoadError = error instanceof Error ? error.message : "Не удалось загрузить заказы";
          return false;
        }
      }

      async function refreshServerOrder(number) {
        orderDetailsError = "";
        const order = browserStore.getOrder(number);
        if (order) upsertStoredOrder(order);
        return orderDetails[number];
      }

      function replaceContacts(rows) {
        contacts.splice(0, contacts.length, ...rows.map(contact => [
          contact.department,
          contact.position,
          contact.fullName,
          contact.phone,
          contact.email
        ]));
      }

      async function refreshContacts() {
        try {
          replaceContacts(browserStore.getContacts());
          contactsLoadError = "";
          return true;
        } catch (error) {
          contacts.splice(0, contacts.length);
          contactsLoadError = error instanceof Error ? error.message : "Не удалось загрузить контакты";
          return false;
        }
      }

      async function createServerContact(input) {
        const contact = browserStore.createContact(input);
        await refreshContacts();
        return contact;
      }

      const esc = value => String(value).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
      const rub = value => new Intl.NumberFormat("ru-RU").format(value) + " ₽";
      const userRole = user => user.isAdmin ? "Владелец" : "Менеджер";
      const userDate = value => value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
      function usersTable() {
        const users = currentUser ? browserStore.getUsers({ partnerId: currentUser.partnerId }) : [];
        return `${currentUser?.isAdmin ? '<div class="page-head users-page-actions"><span></span><button class="btn btn-primary" type="button" data-add-user>Добавить пользователя +</button></div>' : ""}<section class="table-panel">${toolbar("users", { org: false })}<div class="table-responsive"><table class="table table-sm" data-table="users"><thead><tr><th>ФИО</th><th>Контакты</th><th>Роль</th><th>Дата создания</th><th>Дата изменения</th><th>Последняя активность</th><th><span class="sr-only">Редактирование</span></th></tr></thead><tbody>${users.map(user => `<tr data-user-search="${esc([user.name, user.email, user.phone, user.position].join(" ").toLowerCase())}"><td><span class="stacked-value"><strong>${esc(user.name)}</strong><span class="text-muted text-small">${esc(user.position)}</span></span></td><td><span class="stacked-value"><span>${esc(user.phone || "—")}</span><span class="text-muted text-small">${esc(user.email)}</span></span></td><td>${userRole(user)}</td><td>${userDate(user.createdAt)}</td><td>${userDate(user.updatedAt)}</td><td>${userDate(user.lastActivityAt)}</td><td>${currentUser.isAdmin ? `<button class="btn btn-ghost" type="button" data-edit-user="${esc(user.id)}" aria-label="Редактировать пользователя ${esc(user.name)}"><i data-lucide="pencil" aria-hidden="true"></i></button>` : ""}</td></tr>`).join("")}</tbody></table></div></section>`;
      }
      function profileTabHtml(tab) {
        if (tab === "orgs") return organizationTable();
        if (tab === "users") return usersTable();
        if (tab === "contacts") return `${currentUser?.isAdmin ? '<div class="page-head"><span></span><button class="btn btn-primary" data-add-contact>Добавить контакт</button></div>' : ""}${contactsLoadError ? `<div class="notice" role="alert">${esc(contactsLoadError)}</div>` : ""}${contactTable()}`;
        return `<section class="manager panel profile-user-card"><h2>${esc(currentUser.name)}</h2><div class="manager-grid"><div class="key-value"><div class="label">Email</div><div>${esc(currentUser.email)}</div></div><div class="key-value"><div class="label">Телефон</div><div>${esc(currentUser.phone || "—")}</div></div><div class="key-value"><div class="label">Должность</div><div>${esc(currentUser.position)}</div></div><div class="key-value"><div class="label">Роль</div><div>${userRole(currentUser)}</div></div></div><div class="profile-actions"><button class="btn btn-primary" type="button" data-edit-own>Редактировать данные</button><button class="btn" type="button" data-change-password>Изменить пароль</button></div></section>`;
      }
      function profileDialogs() {
        return `<dialog class="form-dialog" data-own-dialog><div class="dialog-head"><h2>Редактировать данные</h2></div><form data-own-form><label class="form-label">ФИО *<input class="form-control" required name="name" value="${esc(currentUser.name)}"></label><div class="form-fields-row"><label class="form-label">Email<input class="form-control" type="email" value="${esc(currentUser.email)}" readonly></label><label class="form-label">Телефон<input class="form-control" name="phone" value="${esc(currentUser.phone)}"></label></div><label class="form-label">Должность *<input class="form-control" required name="position" value="${esc(currentUser.position)}"></label><label class="form-label">Роль<input class="form-control" value="${userRole(currentUser)}" readonly></label><div class="notice" data-own-error></div><div class="dialog-actions"><span class="dialog-actions-right"><button class="btn" type="button" data-close-own>Отмена</button><button class="btn btn-primary">Сохранить</button></span></div></form></dialog><dialog class="form-dialog" data-password-dialog><div class="dialog-head"><h2>Изменить пароль</h2></div><form data-password-form><label class="form-label">Текущий пароль *<input class="form-control" type="password" required name="currentPassword"></label><label class="form-label">Новый пароль *<input class="form-control" type="password" required name="newPassword"></label><label class="form-label">Подтверждение нового пароля *<input class="form-control" type="password" required name="confirmation"></label><div class="notice" data-password-error></div><div class="dialog-actions dialog-actions-split"><button class="btn" type="button" data-close-password>Отмена</button><button class="btn btn-primary">Сохранить</button></div></form></dialog><dialog class="form-dialog" data-user-dialog><div class="dialog-head"><h2 data-user-dialog-title>Пользователь</h2></div><form data-user-form><input type="hidden" name="id"><label class="form-label">ФИО *<input class="form-control" required name="name"></label><div class="form-fields-row"><label class="form-label">Email *<input class="form-control" type="email" required name="email"></label><label class="form-label">Телефон<input class="form-control" name="phone"></label></div><label class="form-label">Должность *<input class="form-control" required name="position"></label><label class="form-label">Роль<input class="form-control" name="role" value="Менеджер" readonly></label><div class="notice" data-user-error></div><div class="dialog-actions user-dialog-actions"><button class="btn action-danger" type="button" data-delete-user hidden>Удалить</button><span class="dialog-actions-right"><button class="btn" type="button" data-close-user>Отмена</button><button class="btn btn-primary" data-user-submit>Сохранить</button></span></div></form></dialog><dialog class="confirm-dialog" data-credentials-dialog><div class="page-title">Не удалось отправить письмо. Данные для входа:</div><div class="notice" data-credentials></div><div class="dialog-actions"><button class="btn btn-primary" type="button" data-close-credentials>ОК</button></div></dialog>`;
      }
      function bindProfileUsers() {
        const ownDialog = content.querySelector("[data-own-dialog]");
        const passwordDialog = content.querySelector("[data-password-dialog]");
        const userDialog = content.querySelector("[data-user-dialog]");
        const credentialsDialog = content.querySelector("[data-credentials-dialog]");
        const showCredentials = user => { const node = content.querySelector("[data-credentials]"); if (node) node.innerHTML = `<p><strong>Ссылка:</strong> ${esc(navigationLocation().origin + navigationLocation().pathname)}</p><p><strong>Логин:</strong> ${esc(user.email)}</p><p><strong>Пароль:</strong> ${esc(user.password)}</p>`; openDialog(credentialsDialog); };
        content.querySelector("[data-edit-own]")?.addEventListener("click", () => openDialog(ownDialog));
        content.querySelector("[data-change-password]")?.addEventListener("click", () => openDialog(passwordDialog));
        content.querySelectorAll("[data-close-own]").forEach(button => button.addEventListener("click", () => closeDialog(ownDialog)));
        content.querySelectorAll("[data-close-password]").forEach(button => button.addEventListener("click", () => closeDialog(passwordDialog)));
        content.querySelectorAll("[data-close-user]").forEach(button => button.addEventListener("click", () => closeDialog(userDialog)));
        content.querySelectorAll("[data-close-credentials]").forEach(button => button.addEventListener("click", () => { closeDialog(credentialsDialog); render("profile", "users"); }));
        content.querySelector("[data-own-form]")?.addEventListener("submit", event => { event.preventDefault(); const form = event.currentTarget; try { browserStore.updateOwnUser({ name: form.elements.name.value, phone: form.elements.phone.value, position: form.elements.position.value }); render("profile", "profile"); } catch (error) { content.querySelector("[data-own-error]").textContent = error.message || "Не удалось сохранить данные"; } });
        content.querySelector("[data-password-form]")?.addEventListener("submit", event => { event.preventDefault(); const form = event.currentTarget; const error = content.querySelector("[data-password-error]"); if (form.elements.newPassword.value !== form.elements.confirmation.value) { error.textContent = "Новый пароль и подтверждение не совпадают"; return; } try { browserStore.changeOwnPassword(form.elements.currentPassword.value, form.elements.newPassword.value); render("profile", "profile"); } catch (caught) { error.textContent = caught.message || "Не удалось изменить пароль"; } });
        const prepareUserDialog = user => { const form = content.querySelector("[data-user-form]"); form.reset(); form.elements.id.value = user?.id || ""; form.elements.name.value = user?.name || ""; form.elements.email.value = user?.email || ""; form.elements.phone.value = user?.phone || ""; form.elements.position.value = user?.position || ""; form.elements.role.value = user ? userRole(user) : "Менеджер"; form.elements.email.readOnly = Boolean(user); content.querySelector("[data-user-dialog-title]").textContent = user ? "Редактирование пользователя" : "Добавить Менеджера"; content.querySelector("[data-user-submit]").textContent = user ? "Сохранить" : "Добавить"; content.querySelector("[data-delete-user]").hidden = !user || user.isAdmin; content.querySelector("[data-user-error]").textContent = ""; openDialog(userDialog); };
        content.querySelector("[data-add-user]")?.addEventListener("click", () => prepareUserDialog(null));
        content.querySelectorAll("[data-edit-user]").forEach(button => button.addEventListener("click", () => prepareUserDialog(browserStore.getUser(button.dataset.editUser))));
        content.querySelector("[data-user-form]")?.addEventListener("submit", event => { event.preventDefault(); const form = event.currentTarget; try { const input = { name: form.elements.name.value, email: form.elements.email.value, phone: form.elements.phone.value, position: form.elements.position.value }; if (form.elements.id.value) { browserStore.updateManager(form.elements.id.value, input); render("profile", "users"); } else { const created = browserStore.createManager(input); closeDialog(userDialog); showCredentials(created); } } catch (error) { content.querySelector("[data-user-error]").textContent = error.message || "Не удалось сохранить пользователя"; } });
        content.querySelector("[data-delete-user]")?.addEventListener("click", () => { const form = content.querySelector("[data-user-form]"); const user = browserStore.getUser(form.elements.id.value); if (!user || !window.confirm(`Вы действительно хотите удалить пользователя ${user.name}?`)) return; browserStore.deleteManager(user.id); render("profile", "users"); });
      }
      const booleanFlag = value => `<span class="boolean-flag ${value ? "is-yes" : "is-no"}" role="img" aria-label="${value ? "Да" : "Нет"}">${value ? "✓" : "−"}</span>`;
      syncBrowserData();
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
        ? dataTable(["ID", "Название", "ИНН", "Город", "Договоры", "Телефон", "Email"], organizations.map(organization => organization.slice(0, 7)), "organization", { id: "organizations", org: false, rowOrg: r => r[1] })
        : '<div class="panel muted-note">Проверяем доступные организации…</div>';
      const contactTable = () => dataTable(["Отдел", "Должность", "ФИО", "Телефон", "Email"], contacts, "contact", { id: "contacts", org: false });
      const orderTable = (rows = orders, id = "orders", selectedOrg = "", options = {}) => {
        const visibleRows = visibleOrderRows(rows);
        return `<section class="table-panel">${toolbar(id, { selectedOrg, org: options.org !== false, payment: options.payment === true })}<div class="table-responsive"><table class="table table-sm" data-table="${id}"><thead><tr><th>№ заказа</th><th>№ счета</th><th>Организация</th><th>Дата заказа</th><th>Статус заказа</th><th>Условия поставки</th><th>Стоимость</th><th>Оплата</th><th>Контактное лицо</th></tr></thead><tbody>${visibleRows.map((r, i) => { const advance = (orderTypes[r[0]] || "") === "Авансовый платеж"; return `<tr data-go="order" data-index="${i}" data-order-number="${esc(r[0])}" data-org="${esc(r[2])}" data-payment="${esc(r[7])}"><td><span class="order-number"><span>${esc(r[0])}</span><span class="order-type ${advance ? "is-advance" : ""}">${esc(orderTypes[r[0]] || "Покупка товара")}</span></span></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td><td>${esc(r[5])}</td><td class="${advance ? "advance-amount" : ""}">${esc(r[6])}</td><td>${booleanFlag(r[7] === "✓")}</td><td>${esc(r[8])}</td></tr>`; }).join("")}</tbody></table></div></section>`;
      };
      function activationTable() {
        return `<section class="table-panel">${toolbar("activations")}<div class="table-responsive"><table class="table table-sm" data-table="activations">
          <thead><tr><th>№ активации</th><th>№ заказа</th><th>Организация</th><th>Статус активации</th><th>Вендор</th><th>Подписок</th><th>Стоимость</th><th>Оплата</th><th>Дата заказа</th><th>Комментарий</th><th><span class="sr-only">Файл лицензий</span></th></tr></thead>
          <tbody>${visibleActivations().map((a, i) => `<tr data-go="activation" data-index="${i}" data-org="${esc(a[2])}">${a.slice(0, 7).map(v => `<td>${esc(v)}</td>`).join("")}<td>${booleanFlag(a[7] === "✓")}</td>${a.slice(8).map(v => `<td>${esc(v)}</td>`).join("")}<td>${activationDetails[a[0]]?.licenseFileDocumentId ? `<button class="btn btn-ghost" type="button" aria-label="Скачать файл лицензий активации ${esc(a[0])}" data-download-license data-activation-number="${esc(a[0])}"><i data-lucide="download" aria-hidden="true"></i></button>` : ""}</td></tr>`).join("")}</tbody>
        </table></div></section>`;
      }

      function plainTable(headers, rows, id) {
        return `${toolbar(id, { search: false, org: false })}<div class="table-responsive"><table class="table table-sm"><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      }

      function catalogTable(selectedOrg = "", selectedGroup = "") {
        if (catalogState.loading) return `<section class="table-panel"><div class="panel muted-note">Загрузка организаций и товаров из browser storage…</div></section>`;
        if (catalogState.error) return `<section class="table-panel"><div class="notice" role="alert">Не удалось загрузить каталог: ${esc(catalogState.error)}</div><button class="btn btn-primary" type="button" data-catalog-retry>Повторить</button></section>`;
        const groups = [...new Set(products.map(p => p.group))];
        const visible = products.filter(p => (!selectedOrg || selectedOrg.includes("ЗОЛОТОЙ СТАНДАРТ") || p.vendor === "Пи Джи Групп") && (!selectedGroup || p.group === selectedGroup));
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
        const rows = items.map((item, index) => { const storageKey = item.storageKey || item.key; return [String(index + 1), esc(item.name), rub(item.price), `<span class="qty"><button class="btn btn-ghost" type="button" aria-label="Уменьшить количество" data-cart-minus="${esc(storageKey)}">−</button><input class="form-control qty-input" type="number" min="1" max="500" step="1" value="${item.qty}" aria-label="Количество ${esc(item.name)}" data-cart-input="${esc(storageKey)}"><button class="btn btn-ghost" type="button" aria-label="Увеличить количество" data-cart-plus="${esc(storageKey)}">+</button></span>`, rub(item.price * item.qty), `<button class="btn cart-remove-button" type="button" aria-label="Удалить ${esc(item.name)} из корзины" data-cart-remove-item="${esc(storageKey)}"><i data-lucide="x" aria-hidden="true"></i></button>`]; });
        return `<section class="table-panel">${toolbar(id, { search: false, org: false })}<div class="table-responsive"><table class="table table-sm cart-items"><colgroup><col><col><col><col><col><col></colgroup><thead><tr><th>№</th><th>Название</th><th>Цена</th><th>Количество</th><th>Сумма</th><th><span class="sr-only">Удаление</span></th></tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
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
            const organizationId = organizations.find(item => item[1] === org)?.[7] || "";
            const matchingContracts = contracts.filter(contract => contract.organizationId === organizationId && contract.vendor === vendor && contract.type === "Договор поставки" && contract.isActive !== false && contract.status !== "Закрыт");
            const contractOptions = matchingContracts.map(contract => `<option value="${esc(contract.id)}">${esc(contract.name)}</option>`).join("");
            const contractControl = matchingContracts.length ? `<label class="form-label">Договор<select class="form-select" data-cart-contract data-organization-id="${esc(organizationId)}" data-vendor="${esc(vendor)}">${contractOptions}</select></label>` : `<div class="notice">Нет действующего договора поставки с ${esc(vendor)}</div>`;
            return `<section class="vendor-block"><div class="vendor-head"><div class="page-title">${esc(vendor)}</div>${contractControl}</div>
              ${cartTable(items, org, vendor, groupId)}
              <div class="comment-line"><div class="comment-box"><div class="form-check"><input class="form-check-input" type="checkbox" id="comment-${groupId}" data-comment-toggle="${groupId}"><label class="form-check-label" for="comment-${groupId}">Добавить комментарий</label></div><textarea class="form-control" rows="2" placeholder="Комментарий к предварительному заказу" data-comment-box="${groupId}" data-comment-organization-id="${esc(organizationId)}" data-comment-vendor="${esc(vendor)}" hidden></textarea></div><div class="sum-block"><div class="label">Сумма по договору</div><div>${rub(total)}</div></div></div>
            </section>`;
          }).join("");
          return `<section class="cart-org"><div class="cart-org-head"><div class="page-title">${esc(org)}</div><div class="page-title">${rub(orgTotal)}</div></div><div class="cart-user"><div><div class="label">ФИО</div><div>Иванов Иван Иванович</div></div><div><div class="label">Email</div><div>example@mail.ru</div></div><div><div class="label">Телефон</div><div>+79876543210</div></div></div>${vendorHtml}</section>`;
        }).join("");
        const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        const checkoutBlocked = cart.some(item => !browserBusiness.getPurchaseAvailability(item.organizationId, item.vendor).canPurchase);
        return `<div class="page-head"><div class="page-title">Корзина</div><button class="btn btn-primary" type="button" data-page="catalog">Каталог</button></div>${body}<div class="cart-bottom"><button class="btn btn-primary" type="button" data-checkout ${checkoutBlocked ? "disabled" : ""}>Оформить заказ</button><div class="sum-block"><span class="page-title">Итого: ${rub(total)}</span></div></div><div class="notice" role="alert" data-checkout-error aria-live="assertive"></div><div class="cart-warning"><div class="page-title">Внимание!</div><div>Детали и адрес доставки после заказа будут обговорены с вашим менеджером</div></div><dialog class="confirm-dialog" data-cart-remove-dialog><div class="page-title">Подтвердите</div><div class="notice">Удалить товар из корзины?</div><div class="confirm-actions"><button class="btn btn-primary" type="button" data-cart-remove-confirm>OK</button><button class="btn" type="button" data-cart-remove-cancel>Отмена</button></div></dialog>`;
      }

      async function createCartOrders() {
        if (!cart.length) return null;
        if (!organizationAccessLoaded) throw new Error("Список доступных организаций ещё не загружен");
        if (checkoutInProgress) return null;
        checkoutInProgress = true;
        try {
          saveCartToStore();
          const contractIds = {};
          content.querySelectorAll("[data-cart-contract]").forEach(select => { contractIds[`${select.dataset.organizationId}|${select.dataset.vendor}`] = select.value; });
          const comments = {};
          content.querySelectorAll("[data-comment-box]").forEach(textarea => {
            const value = textarea.value.trim();
            if (value) comments[`${textarea.dataset.commentOrganizationId}|${textarea.dataset.commentVendor}`] = value;
          });
          const created = browserBusiness.checkout({ contactName: "Иванов Иван Иванович", contactPhone: "+7 987 654 32 10", contactEmail: "example@mail.ru", deliveryTerms: "Предоплата 100%", contractIds, comments });
          const result = { number: created.cart.number, date: todayLabel(), orders: created.orders.map(order => order.number) };
          syncBrowserData();
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
          return `<section class="order-block cart-result-order"><div class="page-head"><div class="page-title"><a href="#" data-order-number="${esc(number)}">Заказ №${esc(number)}</a> на ${rub(details.total)}</div></div><div class="order-columns"><div><div class="order-field"><div class="label">Организация</div><div>${esc(details.org)}</div></div><div class="order-field"><div class="label">ФИО</div><div>${esc(details.name)}</div></div><div class="order-field"><div class="label">Телефон</div><div>${esc(details.phone)}</div></div><div class="order-field"><div class="label">E-mail</div><div><a href="mailto:${esc(details.email)}">${esc(details.email)}</a></div></div>${details.comment ? `<div class="order-field"><div>Комментарий: ${esc(details.comment)}</div></div>` : ""}</div><div><div class="order-field"><div class="label">Статус заказа</div><div><strong>${esc(details.status)}</strong></div></div><div class="order-field"><div class="label">Тип заказа</div><div>${esc(details.type)}</div></div><div class="order-field"><div class="label">Статус оплаты</div><div>${esc(details.payment)}</div></div><div class="order-field"><div class="label">Дата заказа</div><div>${esc(details.date)}</div></div><div class="order-field"><div class="label">Номер счета</div><div>${esc(details.invoice || "—")}</div></div><div class="order-field"><div class="label">Договор</div><div>${esc(details.agreement)}</div></div></div></div></section>`;
        }).join("");
        return `<div class="page-head"><div class="page-title">Корзина № ${esc(result.number)}</div></div>${cards}<div class="simulator-note">Корзина и заказы сохранены в browser storage.</div>`;
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

      function applySerialDemoState(device, serial) {
        const lastDigit = Number(serial.slice(-1));
        const dayOffsets = { 2: -90, 3: -15, 4: 15, 5: 45, 6: 90, 7: 150, 8: 210, 9: 300 };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentEnd = lastDigit <= 1 ? null : new Date(today);
        if (currentEnd) currentEnd.setDate(currentEnd.getDate() + dayOffsets[lastDigit]);
        const nextEnd = new Date(currentEnd && currentEnd > today ? currentEnd : today);
        nextEnd.setDate(nextEnd.getDate() + 365);
        const twoMonthsFromToday = new Date(today);
        twoMonthsFromToday.setMonth(twoMonthsFromToday.getMonth() + 2);
        const over180Date = new Date(today);
        over180Date.setDate(over180Date.getDate() + 180);
        const over180 = Boolean(currentEnd && currentEnd > over180Date);
        const currentState = !currentEnd ? "none" : currentEnd < today ? "expired" : currentEnd < twoMonthsFromToday ? "expiring" : "active";
        const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
        const demoState = {
          current: currentEnd ? `Текущая до ${dateFormatter.format(currentEnd)}` : "Нет текущей подписки",
          currentState,
          next: `Новая до ${dateFormatter.format(nextEnd)}`,
          over180
        };
        licenseKeys.forEach(key => {
          const license = device.licenses[key];
          if (license.available) Object.assign(license, demoState);
        });
      }

      function restoreActivationDraft(organizationName) {
        const organizationId = organizations.find(item => item[1] === organizationName)?.[7];
        const rows = organizationId ? browserStore.getActivationDraft(organizationId) : [];
        const storedLicenses = browserStore.getLicenses();
        const template = clone(storedLicenses[0]);
        if (!rows.length) {
          activationDevices.splice(0, activationDevices.length, ...storedLicenses.map(device => {
            const next = clone(device);
            Object.values(next.licenses).forEach(license => { license.selected = false; });
            return next;
          }));
          lastCheckedSerial = "";
          activationPreviewVisible = false;
          return;
        }
        activationDevices.splice(0, activationDevices.length, ...rows.map(row => {
          const serial = typeof row === "string" ? row : row.serial;
          const selectedLicenses = typeof row === "string" ? [] : row.selectedLicenses || [];
          const device = clone(template);
          device.serial = serial;
          applySerialDemoState(device, serial);
          licenseKeys.forEach(key => { device.licenses[key].selected = selectedLicenses.includes(key); });
          return device;
        }));
        lastCheckedSerial = activationDevices[0]?.serial || "";
        activationPreviewVisible = activationDevices.length > 0;
      }

      function saveActivationDraft() {
        const organizationId = organizations.find(item => item[1] === selectedLicenseOrg)?.[7];
        if (organizationId) browserStore.saveActivationDraft(organizationId, activationDevices.map(device => ({
          serial: device.serial,
          selectedLicenses: licenseKeys.filter(key => device.licenses[key].available && device.licenses[key].selected)
        })));
      }

      function activationDeviceSelection(device) {
        const available = licenseKeys.map(key => device.licenses[key]).filter(license => license.available);
        const selectedCount = available.filter(license => license.selected).length;
        return { any: selectedCount > 0, all: available.length > 0 && selectedCount === available.length, partial: selectedCount > 0 && selectedCount < available.length };
      }

      function selectedActivationDeviceCount() {
        return activationDevices.filter(device => activationDeviceSelection(device).all).length;
      }

      function licensePriceHelp() {
        return `<span class="info-wrap"><button class="info-trigger" type="button" aria-label="Показать цены лицензий">?</button><span class="info-popover"><span class="price-group"><strong>Сервис обновлений</strong><span class="price-row"><span>РРЦ (Розница)</span><b>4 000 ₽</b></span><span class="price-row"><span>Партнер</span><b>2 000 ₽</b></span><span class="price-row"><span>Постоянный партнер</span><b>2 000 ₽</b></span></span><span class="price-group"><strong>Маркировка</strong><span class="price-row"><span>РРЦ (Розница)</span><b>1 000 ₽</b></span><span class="price-row"><span>Партнер</span><b>500 ₽</b></span><span class="price-row"><span>Постоянный партнер</span><b>500 ₽</b></span></span><span class="price-group"><strong>Расширенный функционал</strong><span class="price-row"><span>РРЦ (Розница)</span><b>2 000 ₽</b></span><span class="price-row"><span>Партнер</span><b>1 000 ₽</b></span><span class="price-row"><span>Постоянный партнер</span><b>1 000 ₽</b></span></span></span></span>`;
      }

      function renderActivationPreviewTable() {
        const headers = licenseKeys.map(key => { const selected = allSelectedForColumn(key); return `<th><label class="license-choice"><input class="form-check-input ${selected ? "is-checked" : ""}" type="checkbox" ${selected ? "checked" : ""} aria-checked="${selected}" data-license-column="${key}" aria-label="Выбрать весь столбец ${licenseLabels[key]}"><span class="license-heading"><span>${licenseLabels[key]}</span><span class="license-column-price">${licenseHeaderPrices[key]}</span></span></label></th>`; }).join("");
        const rows = activationDevices.map((device, deviceIndex) => {
          const rowSum = licenseKeys.reduce((sum, key) => sum + (device.licenses[key].available && device.licenses[key].selected ? device.licenses[key].price : 0), 0);
          const selection = activationDeviceSelection(device);
          return `<tr class="activation-device-row${selection.any ? " is-selected" : ""}" aria-selected="${selection.any}"><td><input class="form-check-input ${selection.all ? "is-checked" : selection.partial ? "is-indeterminate" : ""}" type="checkbox" ${selection.all ? "checked" : ""} aria-checked="${selection.partial ? "mixed" : selection.all}" data-license-device-select="${deviceIndex}" ${selection.partial ? "data-indeterminate" : ""} aria-label="Выбрать все подписки для серийного номера ${device.serial}"></td><td><span class="stacked-value"><span>${device.serial}</span><span class="text-muted text-small">${device.model}</span></span></td>${licenseKeys.map(key => `<td>${licenseCell(deviceIndex, key)}</td>`).join("")}<td class="text-end text-nowrap">${rub(rowSum)} ${licensePriceHelp()}</td></tr>`;
        }).join("");
        return `<div class="table-responsive activation-table-responsive"><table class="table table-sm activation-preview-table"><thead><tr><th><span class="sr-only">Выбор подписок строки</span></th><th>Серийный номер</th>${headers}<th class="text-end">Сумма</th></tr></thead><tbody>${rows}</tbody></table></div><div class="mini-total">Итого: ${rub(activationTotal())}</div>`;
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
        const organizationId = organizations.find(item => item[1] === selectedLicenseOrg)?.[7];
        if (!organizationId) throw new Error("Организация не найдена");
        const activation = browserBusiness.createActivation({
          organizationId, vendor: "Пэй Киоск", comment, isError: lastCheckedSerial === "0000000000000000",
          items: selected.map(item => ({ model: item.model, licenseType: item.type, subscriptionEnd: item.subscription, priceCents: item.price * 100, serialNumber: item.serial }))
        });
        syncBrowserData();
        return activations.find(item => item[0] === activation.number) || null;
      }

      function completeActivation(activationNumber) {
        browserBusiness.completeActivation(activationNumber);
        syncBrowserData();
        return activations.find(item => item[0] === activationNumber) || null;
      }

      function createAdvanceOrder(amount) {
        const organizationId = organizations.find(item => item[1] === selectedLicenseOrg)?.[7];
        if (!organizationId) throw new Error("Организация не найдена");
        const order = browserBusiness.createAdvanceOrder({ organizationId, amountCents: amount * 100 });
        syncBrowserData();
        return orders.find(item => item[0] === order.number) || null;
      }

