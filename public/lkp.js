      const LOGIN_CREDENTIALS_KEY = "lkp-digital-copy-login-credentials";
      function savedLoginCredentials() { try { const value = JSON.parse(window.localStorage.getItem(LOGIN_CREDENTIALS_KEY) || "null"); return value && typeof value.email === "string" && typeof value.password === "string" ? value : { email: "", password: "" }; } catch { return { email: "", password: "" }; } }
      function saveLoginCredentials(email, password) { window.localStorage.setItem(LOGIN_CREDENTIALS_KEY, JSON.stringify({ email, password })); }
      function render(page, context) {
        currentUser = browserStore.getCurrentUser();
        if (page !== "login" && !currentUser) { page = "login"; context = null; }
        if (page === "login" && currentUser) { page = "profile"; context = "profile"; }
        activePage = page;
        activeContext = context ?? null;
        persistNavigation(page, activeContext);
        let html = "";
        shell.classList.toggle("login-mode", page === "login");
        if (page === "login") {
          const savedCredentials = savedLoginCredentials();
          html = `<section class="login-page"><h1 class="login-stand-title"><span>Цифровая копия</span><span>личного кабинета партнера</span></h1><div class="login-shell"><h2 class="login-title">Вход</h2><form data-login-form><label class="form-label">Ваш логин*<input class="form-control" type="email" autocomplete="username" placeholder="Email" required value="${esc(savedCredentials.email)}" data-login-email></label><label class="form-label">Ваш пароль*<span class="password-field"><input class="form-control" type="password" autocomplete="current-password" placeholder="Пароль" required value="${esc(savedCredentials.password)}" data-login-password><button class="password-toggle" type="button" aria-label="Показать пароль" aria-pressed="false" data-password-toggle><i data-lucide="eye" aria-hidden="true"></i></button></span></label><label class="login-consent"><input class="form-check-input" type="checkbox" required data-login-consent><span>Нажимая кнопку &quot;Войти&quot;, вы даете согласие на <a href="https://aqsi.ru/policy/" target="_blank" rel="noopener noreferrer">обработку персональных данных</a> и подтверждаете, что ознакомлены и согласны с условиями <a href="https://aqsi.ru/lkp-agreement/" target="_blank" rel="noopener noreferrer">пользовательского соглашения</a></span></label><div class="notice" role="alert" data-login-error></div><button class="login-forgot" type="button" data-forgot-password>Забыли пароль?</button><div class="notice" role="status" data-login-notice></div><div class="login-actions"><button class="btn login-submit" type="submit" data-login disabled>Войти</button></div></form></div></section>`;
        } else if (page === "profile") {
          const tab = ["profile", "orgs", "users", "contacts"].includes(context) ? context : "profile";
          html = `<div class="page-head"><div class="page-title">Профиль партнера</div></div><div class="partner-line"><span>ООО «Партнер»</span><span class="viz-badge">Постоянный партнер</span></div><section class="manager panel"><div class="manager-grid"><div class="key-value"><div class="label">Персональный менеджер</div><div>Смирнов Алексей</div></div><div class="key-value"><div class="label">Телефон</div><div>+7 987 654-32-10</div></div><div class="key-value"><div class="label">Email</div><div><a href="mailto:example@mail.ru">example@mail.ru</a></div></div></div></section><div class="tabs"><button class="btn ${tab === "profile" ? "btn-primary" : ""}" data-tab="profile">Профиль</button><button class="btn ${tab === "orgs" ? "btn-primary" : ""}" data-tab="orgs">Организации</button><button class="btn ${tab === "users" ? "btn-primary" : ""}" data-tab="users">Пользователи</button><button class="btn ${tab === "contacts" ? "btn-primary" : ""}" data-tab="contacts">Контакты</button></div><div id="profile-tab">${profileTabHtml(tab)}</div>${profileDialogs()}<dialog class="form-dialog" data-contact-dialog><div class="dialog-head"><h2>Создать контактное лицо</h2><button class="btn btn-ghost" type="button" aria-label="Закрыть" data-close-contact><i data-lucide="x" aria-hidden="true"></i></button></div><form class="contact-form-grid" data-contact-form><label class="form-label contact-full">ФИО *<input class="form-control" required data-contact-full-name></label><label class="form-label">Должность *<input class="form-control" required data-contact-position></label><label class="form-label">E-mail *<input class="form-control" type="email" required data-contact-email></label><label class="form-label">Телефон *<input class="form-control" type="tel" required data-contact-phone></label><label class="form-label">Отдел *<input class="form-control" required data-contact-department></label><div class="notice contact-full" role="alert" data-contact-error aria-live="assertive"></div><div class="dialog-actions contact-full"><button class="btn btn-primary" type="submit">Сохранить</button></div></form></dialog>`;
        } else if (page === "organization") {
          const org = organizations[context || 0];
          const filtered = orders.filter(r => r[2] === org[1]);
          html = `<div class="page-head"><div class="page-title">${esc(org[1])}</div></div><div class="org-details-grid"><section class="org-card panel"><h3>Организация</h3><div class="key-value"><span class="label">ИНН:</span><span>7724827983</span></div><div class="key-value"><span class="label">Тип:</span><span>Юр. лицо</span></div><div class="key-value"><span class="label">КПП:</span><span>771601001</span></div><div class="key-value"><span class="label">ОГРН:</span><span>Нет данных</span></div><div class="key-value"><span class="label">ОКПО:</span><span>Нет данных</span></div></section><section class="org-card panel"><h3>Контакты</h3><div class="key-value"><span class="label">Фактический адрес:</span><span>190121, Город Санкт-Петербург, ул Почтамтская, д. 19, литера А</span></div><div class="key-value"><span class="label">Юридический адрес:</span><span>190121, Город Санкт-Петербург, ул Почтамтская, д. 19, литера А</span></div><div class="key-value"><span class="label">Телефон:</span><span>+7 800 555-35-36</span></div><div class="key-value"><span class="label">E-mail:</span><a href="mailto:example1@mail.ru">example1@mail.ru</a></div></section><section class="org-card panel"><h3>Банковские реквизиты</h3><div class="key-value"><span class="label">БИК:</span><span>044525225</span></div><div class="key-value"><span class="label">Корреспондентский счет:</span><span>ПАО Сбербанк<br>30101810400000000225</span></div><div class="key-value"><span class="label">Расчетный счет:</span><span>40702810457895841914</span></div></section><section class="org-card panel"><h3>ЭДО</h3><div class="key-value"><span class="label">Идентификатор:</span><span>Нет данных</span></div><div class="key-value"><span class="label">Организация использует ЭДО:</span><span>Нет данных</span></div></section></div><div class="page-head"><div class="page-title">Заказы</div></div>${orderTable(filtered, "organization-orders", org[1], { org: false, payment: true })}`;
        } else if (page === "contact") {
          const c = contacts[context || 0];
          html = `<div class="page-head"><div class="page-title">Редактирование контакта</div></div><div class="details panel"><div class="key-value"><div class="label">Отдел</div><div>${c[0]}</div></div><div class="key-value"><div class="label">Должность</div><div>${c[1]}</div></div><div class="key-value"><div class="label">ФИО</div><div>${c[2]}</div></div><div class="key-value"><div class="label">Телефон</div><div>${c[3]}</div></div><div class="key-value"><div class="label">Email</div><div>${c[4]}</div></div></div>`;
        } else if (page === "orders") {
          html = `<div class="page-head"><div class="page-title">Заказы</div></div>${ordersLoadError ? `<div class="notice" role="alert">${esc(ordersLoadError)}</div>` : ""}${orderTable()}`;
        } else if (page === "order") {
          const o = context || orders[0];
          const details = orderDetails[o[0]] || null;
          const linked = activations.find(a => a[0] === details?.activationNumber || a[1] === o[0]);
          const licenseOrder = linked || o[0] === "12540" || details?.type === "Активация лицензий";
          const advanceOrder = o[0] === "12480" || details?.type === "Авансовый платеж";
          const items = details?.items ? details.items.map((item, index) => [String(index + 1), esc(item.name), rub(item.price), String(item.qty), rub(item.price * item.qty)]) : advanceOrder
            ? [["1", "Авансовый платеж", "10 000 ₽", "1", "10 000 ₽"]]
            : licenseOrder
              ? [["1", "Сервис обновлений — aQsi 5Ф", "2 000 ₽", "1", "2 000 ₽"], ["2", "Расширенный функционал — aQsi 5Ф", "2 000 ₽", "1", "2 000 ₽"]]
              : [["1", "ПАК aQsi 5Ф", "24 500 ₽", "1", "24 500 ₽"]];
          const visibleDocuments = (details?.documents || []).filter(document => document.type !== "Файл лицензий" && !(licenseOrder && details?.agreement?.includes("Предоплата 100%") && document.type === "Счёт на оплату"));
          html = `<div class="page-head"><div class="page-title">Заказ № ${esc(o[0])}</div></div>${orderDetailsError ? `<div class="notice" role="alert">${esc(orderDetailsError)}</div>` : ""}
            <div class="order-columns">
              <section class="order-block"><h3>Контакт</h3>
                <div class="order-field"><div class="label">Организация</div><div>${esc(details?.org || 'ООО "ЗОЛОТОЙ СТАНДАРТ"')}</div></div><div class="order-field"><div class="label">ФИО</div><div>${esc(details?.name || "Колесников В. В.")}</div></div><div class="order-field"><div class="label">Телефон</div><div>${esc(details?.phone || "+7 996 965-09-07")}</div></div><div class="order-field"><div class="label">E-mail</div><div><a href="mailto:${esc(details?.email || "aqaglobal+testzs@aqsi.ru")}">${esc(details?.email || "aqaglobal+testzs@aqsi.ru")}</a></div></div><div class="order-field"><div class="label">Комментарий</div><div>${esc(details?.comment || (licenseOrder ? `Активация № ${linked?.[0] || "421"}` : "—"))}</div></div>
              </section>
              <section class="order-block"><h3>Заказ</h3>
                <div class="order-field"><div class="label">Статус заказа</div><div>${esc(details?.status || "Отгружен")}</div></div>
                ${details?.cartNumber ? `<div class="order-field"><div class="label">Номер корзины</div><div>${esc(details.cartNumber)}</div></div>` : ""}
                <div class="order-field"><div class="label">Тип заказа</div><div>${esc(details?.type || (advanceOrder ? "Авансовый платеж" : licenseOrder ? "Активация лицензий" : "Покупка товара"))}</div></div><div class="order-field"><div class="label">Статус оплаты</div><div>${esc(details?.payment || "Оплачено")}</div></div><div class="order-field"><div class="label">Дата заказа</div><div>${esc(details?.date || "06.08.2026")}</div></div><div class="order-field"><div class="label">Номер счёта</div><div>${esc(details?.invoice || (licenseOrder ? "ПГ-362" : o[1]))}</div></div><div class="order-field"><div class="label">Договор</div><div>${esc(details?.agreement || "Сублицензионный договор (Предоплата 100%) от 15.12.2025")}</div></div>
              </section>
            </div>
            <section class="mini-section"><h3>Вендор: ${esc(details?.vendor || (advanceOrder ? "Пи Джи Групп" : licenseOrder ? "Пэй Киоск" : "Пи Джи Групп"))}</h3>${plainTable(["№", "Наименование", "Цена", "Количество", "Сумма"], items, "order-items")}<div class="mini-total">Итого: ${details ? rub(details.total) : advanceOrder ? "10 000 ₽" : licenseOrder ? "4 000 ₽" : "24 500 ₽"}</div></section>
            ${linked ? `<section class="mini-section"><h3>Связанные лицензии</h3>${toolbar("order-linked-licenses", { search: false, org: false })}<div class="table-responsive"><table class="table table-sm"><thead><tr><th>№ активации</th><th>Статус активации</th><th>Вендор</th><th>Лицензий</th><th>Стоимость</th><th><span class="sr-only">Файл лицензий</span></th></tr></thead><tbody><tr data-go="activation-linked" data-index="0"><td>${esc(linked[0])}</td><td>${esc(linked[3])}</td><td>${esc(linked[4])}</td><td>${esc(linked[5])}</td><td>${esc(linked[6])}</td><td>${activationDetails[linked[0]]?.licenseFileDocumentId ? `<button class="btn btn-ghost" type="button" aria-label="Скачать файл лицензий" data-download-license data-activation-number="${esc(linked[0])}"><i data-lucide="download" aria-hidden="true"></i></button>` : ""}</td></tr></tbody></table></div></section>` : ""}
            <section class="mini-section"><h3>Документы</h3><div class="documents">${visibleDocuments.length ? visibleDocuments.map(document => `<button class="btn" type="button" data-doc-download="${esc(document.id)}"><i data-lucide="file-text" aria-hidden="true"></i>${esc(document.filename || document.number)}</button>`).join("") : '<span class="text-muted">Нет доступных файлов</span>'}</div><div class="text-small text-muted" data-doc-status aria-live="polite"></div></section>`;
        } else if (page === "activations") {
          html = `<div class="page-head"><div class="page-title">Список активаций</div><div class="viz-row"><button class="btn special-action" type="button" data-instruction>Инструкция</button><button class="btn special-action" type="button" data-prices>Цены</button><button class="btn btn-primary" data-page="activate-org">Активация лицензий</button></div></div><div class="info-block"><h4>Методы установки лицензий:</h4><p><strong>aQsi</strong> — происходит автоматически. <a href="https://aqsi.ru/support/podgotovka-kassyi-aqsi-k-rabote-s-nds-22/" target="_blank" rel="noopener noreferrer"><strong>Инструкция</strong></a> по подготовке ККТ к работе с новыми ставками НДС.</p><p><strong>РР-Электро</strong> — скачайте файл лицензий в формате .slf и установите на устройство согласно <a href="https://knowledge-base.aqsi.ru/pages/viewpage.action?pageId=164560900" target="_blank" rel="noopener noreferrer"><strong>инструкции</strong></a>.</p><p><strong>PayOnline</strong> — скачайте файл лицензий в формате .slf и установите на устройство согласно <a href="https://knowledge-base.aqsi.ru/pages/viewpage.action?pageId=165281793" target="_blank" rel="noopener noreferrer"><strong>инструкции</strong></a>.</p></div><div class="notice" data-instruction-note aria-live="polite"></div>${activationTable()}<dialog class="price-dialog" data-prices-dialog><div class="dialog-head"><div class="page-title">Цены на лицензии</div><button class="btn btn-ghost" type="button" aria-label="Закрыть" data-close-prices><i data-lucide="x" aria-hidden="true"></i></button></div><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Наименование</th><th>РРЦ (Розница)</th><th>Партнер</th><th>Постоянный партнер</th></tr></thead><tbody><tr><td>Сервис обновлений</td><td>4 000 ₽</td><td>2 000 ₽</td><td>2 000 ₽</td></tr><tr><td>Маркировка</td><td>1 000 ₽</td><td>500 ₽</td><td>500 ₽</td></tr><tr><td>Расширенный функционал</td><td>2 000 ₽</td><td>1 000 ₽</td><td>1 000 ₽</td></tr></tbody></table></div></dialog>`;
        } else if (page === "activation") {
          const a = context || activations[0];
          const details = activationDetails[a[0]] || null;
          const licenseRows = details?.licenses?.length ? details.licenses.map(item => [`<span class="stacked-value"><span>${esc(item.serial)}</span><span class="text-muted text-small">${esc(item.model)}</span></span>`, esc(item.type), esc(item.subscription), rub(item.price)]) : [[`<span class="stacked-value"><span>1234567890123456</span><span class="text-muted text-small">aQsi 5Ф</span></span>`, "Сервис обновлений", "07.08.2027", "2 000 ₽"], [`<span class="stacked-value"><span>1234567890123456</span><span class="text-muted text-small">aQsi 5Ф</span></span>`, "Расширенный функционал", "07.08.2027", "2 000 ₽"]];
          const activationComment = details?.comment || (a[9] === "—" ? "" : a[9]);
          html = `<div class="page-head"><div class="page-title">Активация № ${esc(a[0])} (${esc(a[3])})</div><div class="viz-row">${a[1] !== "—" ? `<button class="btn special-action" data-order-number="${esc(a[1])}">Перейти в заказ</button>` : ""}<button class="btn btn-primary" data-page="activations">Список активаций</button></div></div>
            <div class="activation-details panel"><div class="activation-detail"><div class="label">Организация</div><div>${esc(a[2])}</div></div><div class="activation-detail"><div class="label">Вендор</div><div>${esc(a[4])}</div></div><div class="activation-detail"><div class="label">Сумма</div><div>${esc(a[6])}</div></div><div class="activation-detail"><div class="label">Статус оплаты</div><div>${esc(details?.payment || "В ожидании")}</div></div></div>
            ${a[3] === "В работе" ? `<div class="activation-status-action"><button class="btn btn-primary" type="button" data-update-activation-status="${esc(a[0])}">Обновить статус</button></div>` : ""}
            <div class="viz-row">${details?.licenseFileDocumentId ? `<button class="btn" type="button" data-download-license data-activation-number="${esc(a[0])}"><i data-lucide="download" aria-hidden="true"></i>Скачать файл лицензий</button>` : ""}<button class="btn" type="button" data-edit-activation-comment>${activationComment ? `Комментарий: ${esc(activationComment)}` : "Добавить комментарий"}</button></div>
            <section class="mini-section">${plainTable(["Серийный номер", "Тип лицензии", "Подписка", "Цена"], licenseRows, "activation-licenses")}</section>
            <dialog class="form-dialog" data-activation-comment-dialog><div class="dialog-head"><h2>${activationComment ? "Редактировать комментарий" : "Добавить комментарий"}</h2><button class="btn btn-ghost" type="button" aria-label="Закрыть" data-close-activation-comment><i data-lucide="x" aria-hidden="true"></i></button></div><label class="form-label">Комментарий<textarea class="form-control" rows="4" data-activation-comment-input>${esc(activationComment)}</textarea></label><div class="dialog-actions"><button class="btn btn-primary" type="button" data-save-activation-comment="${esc(a[0])}">Сохранить</button><button class="btn" type="button" data-close-activation-comment>Отмена</button></div></dialog>`;
        } else if (page === "activate-org") {
          html = `<div class="page-head"><div class="page-title">Выберите организацию</div></div>${!organizationAccessLoaded ? '<div class="notice">Проверяем доступные организации…</div>' : organizations.length ? `<div class="viz-grid choice-grid">${organizations.map(org => { const contract = sublicenseContractForOrganization(org[1]); const prepaid = contract?.paymentTerms === "Предоплата 100%"; const paymentTerms = contract?.paymentTerms === "Постоплата 5 дней" ? contract.paymentTerms : ""; return `<button class="btn card org-choice" type="button" data-select-license-org="${esc(org[1])}"><span class="org-choice-layout"><span class="org-choice-main"><span class="page-title">${esc(org[1])}</span><span class="org-inn">${esc(org[2])}</span></span>${prepaid ? `<span class="org-choice-balance"><span class="label">Баланс</span><strong>${rub(balances[org[1]] || 0)}</strong></span>` : paymentTerms ? `<span class="org-choice-balance"><strong>${esc(paymentTerms)}</strong></span>` : ""}</span></button>`; }).join("")}</div>` : '<div class="notice">Нет доступных организаций.</div>'}`;
        } else if (page === "activate-offer") {
          const organizationId = organizations.find(org => org[1] === selectedLicenseOrg)?.[7];
          const offerStatus = organizationId ? browserBusiness.getOfferStatus(organizationId) : null;
          if (offerStatus?.isAccepted) return render("activate", selectedLicenseOrg);
          html = `<div class="page-head"><div class="page-title">Оферта сублицензионного договора</div></div><div class="offer-copy"><div class="form-check"><input class="form-check-input" id="offer-accept" type="checkbox" data-offer-check><label class="form-check-label" for="offer-accept">Нажимая кнопку "Продолжить", вы подтверждаете, что ознакомлены и согласны с условиями <a href="https://aqsi.ru/lkp-oferta/" target="_blank" rel="noopener noreferrer"><strong>оферты сублицензионного договора</strong></a>${offerStatus?.hasPreviousAcceptance ? " в новой редакции" : ""}.</label></div></div><button class="btn btn-primary" type="button" data-offer-continue disabled>Продолжить</button>`;
        } else if (page === "activate") {
          activationPreviewVisible = false;
          const org = context || 'ООО "ЗОЛОТОЙ СТАНДАРТ"';
          selectedLicenseOrg = org;
          restoreActivationDraft(org);
          const currentBalance = balances[org] || 0;
          const licenseContract = sublicenseContractForOrganization(org);
          const prepaidLicenseContract = licenseContract?.paymentTerms === "Предоплата 100%";
          html = `<div class="page-head"><div class="page-title">Активация лицензий</div><button class="btn btn-primary" type="button" data-page="activations">Список активаций</button></div>
            <div class="activation-top"><div class="activation-organization"><span class="label">Организация:</span> <strong>${esc(org)}</strong></div>${prepaidLicenseContract ? `<div class="balance-amount panel activation-balance-card"><span><span class="label">Баланс:</span> <strong data-page-balance>${rub(currentBalance)}</strong></span><button class="btn special-action" type="button" data-top-up>Пополнить</button></div>` : ""}</div><div class="info-block"><p><strong>Активировать</strong> означает сгенерировать лицензию и купить. <strong>Заказ, Счет, УПД</strong> создаются автоматически после успешной активации.</p></div>
            <section class="table-panel activation-serial-panel"><div class="activation-serial-toolbar"><div class="serial-line"><label class="serial-field"><span class="sr-only">Серийный номер</span><input class="form-control" type="text" inputmode="numeric" maxlength="16" placeholder="Проверить серийный номер" data-serial-input></label><button class="btn btn-primary" type="button" aria-label="Проверить серийный номер" data-check-serial><i data-lucide="arrow-right" aria-hidden="true"></i></button><input type="file" accept=".txt,text/plain" data-serial-file hidden><button class="btn" type="button" aria-label="Загрузить файл" data-upload-serials><i data-lucide="file" aria-hidden="true"></i></button></div><button class="btn btn-ghost serial-example-download" type="button" data-download-serial-example>Скачать пример файла<i data-lucide="download" aria-hidden="true"></i></button></div><div class="activation-table-heading" data-activation-vendor ${activationPreviewVisible && activationDevices.length ? "" : "hidden"}><strong>Вендор: Пэй Киоск</strong></div><div class="notice" data-serial-notice aria-live="polite"></div>
              <div data-license-preview ${activationPreviewVisible ? "" : "hidden"}><div data-license-table>${renderActivationPreviewTable()}</div></div>
            </section><div class="action-row actions-always"><div class="left-actions"><button class="btn action-outline" type="button" data-create-activation disabled>Активировать</button><button class="btn danger-outline" type="button" data-delete-activation disabled><i data-lucide="trash-2" aria-hidden="true"></i>Удалить</button></div></div>
            <dialog class="confirm-dialog" data-delete-serials-dialog><div class="page-title">Подтвердите</div><div class="notice" data-delete-serials-text></div><div class="confirm-actions"><button class="btn btn-primary" type="button" data-delete-serials-confirm>OK</button><button class="btn" type="button" data-delete-serials-cancel>Отмена</button></div></dialog>
            <dialog class="form-dialog" data-over180-dialog><div class="dialog-head"><h2>Внимание!</h2></div><p>Срок действия текущей лицензии для указанных ниже СН более 180 дней:</p><div class="table-responsive"><table class="table table-sm modal-table"><thead><tr><th>Серийный номер</th><th>Лицензия</th><th>Текущая подписка</th><th>Новая подписка</th></tr></thead><tbody data-over180-body></tbody></table></div><div class="dialog-info">Вы уверены, что хотите активировать подписку на эти серийные номера?</div><div class="dialog-actions"><button class="btn btn-primary" type="button" data-over180-ok>ОК</button><button class="btn action-outline" type="button" data-over180-cancel>Отмена</button></div></dialog>
            <dialog class="form-dialog" data-activation-confirm-dialog><div class="dialog-head"><h2>Новая активация</h2></div><div class="table-responsive"><table class="table table-sm modal-table"><thead><tr><th>№</th><th>Наименование номенклатуры</th><th>Цена</th><th>Количество</th><th>Сумма</th></tr></thead><tbody data-activation-confirm-body></tbody></table></div><div class="mini-total">Итого: <span data-activation-confirm-total>0 ₽</span></div><label class="form-label activation-comment">Комментарий<textarea class="form-control" rows="3" placeholder="Комментарий" data-new-activation-comment></textarea></label><div class="muted-note">Комментарий можно редактировать после активации лицензий</div><div class="dialog-info">Новый заказ будет создан сразу после успешной активации лицензий, обычно не более 15 минут. Данные по заказу будут отправлены на вашу почту.</div><div class="dialog-actions"><button class="btn btn-primary" type="button" data-confirm-activation>ОК</button><button class="btn action-outline" type="button" data-cancel-activation>Отмена</button></div></dialog>
            <dialog class="form-dialog" data-insufficient-dialog><div class="dialog-head"><h2>Недостаточно средств для активации</h2></div><p>Недостаточно средств на балансе организации для активации лицензий</p><p>Необходимо пополнить баланс на сумму: <strong data-deficit-amount>0 ₽</strong></p><p><strong>Хотите пополнить сейчас?</strong></p><div class="dialog-actions"><button class="btn special-action" type="button" data-insufficient-topup>Пополнить</button><button class="btn action-outline" type="button" data-insufficient-cancel>Отмена</button></div></dialog>
            <dialog class="form-dialog" data-balance-dialog><div class="dialog-head"><h2>Пополнение баланса</h2><button class="btn btn-ghost" type="button" aria-label="Закрыть" data-close-balance><i data-lucide="x" aria-hidden="true"></i></button></div><p>Укажите сумму пополнения</p><h3>Организация: ${esc(org)}</h3><div class="balance-grid"><div class="panel"><div class="label">Текущий баланс</div><h3 data-current-balance>${rub(currentBalance)}</h3></div><div class="panel"><div class="label">Баланс после пополнения</div><h3 data-balance-after>${rub(currentBalance)}</h3></div></div><label class="form-label">Сумма пополнения<input class="form-control" type="number" min="1" max="10000000" placeholder="Сумма пополнения ₽ (до 10 000 000 ₽)" data-top-up-amount></label><p class="muted-note">Для пополнения баланса на указанную сумму будет сформирован заказ в личном кабинете.</p><div class="dialog-actions"><button class="btn btn-primary" type="button" data-create-top-up disabled>Сформировать заказ</button><button class="btn" type="button" data-close-balance>Отмена</button></div></dialog>`;
        } else if (page === "catalog") {
          const cartAvailable = organizationAccessLoaded && cart.length > 0;
          html = `<div class="page-head"><div class="page-title">Каталог</div><button class="btn catalog-cart ${cartAvailable ? "btn-primary" : ""}" type="button" data-open-cart ${cartAvailable ? "" : "disabled"}><i data-lucide="shopping-cart" aria-hidden="true"></i>Корзина <span data-cart-count>${cart.reduce((sum, item) => sum + item.qty, 0)}</span></button></div><div id="catalog-table">${catalogTable(catalogState.selectedOrg, catalogState.selectedGroup)}</div><div class="notice" data-catalog-notice aria-live="polite"></div><dialog class="confirm-dialog" data-remove-dialog><div class="page-title">Удаление товара</div><div class="notice">Вы уверены, что хотите удалить товар из корзины?</div><div class="confirm-actions"><button class="btn" type="button" data-remove-cancel>Отмена</button><button class="btn btn-primary" type="button" data-remove-confirm>Удалить</button></div></dialog><dialog class="confirm-dialog" data-org-required-dialog><div class="page-title">Организация не выбрана</div><div class="notice">Для добавления товара в корзину необходимо выбрать организацию</div><div class="confirm-actions"><button class="btn btn-primary" type="button" data-org-required-ok>ОК</button></div></dialog>`;
        } else if (page === "cart") {
          html = renderCart();
        } else if (page === "cart-result") {
          html = renderCartResult(context);
        }
        if (page !== "login" && page !== "profile") html = breadcrumbs(page) + html;
        content.innerHTML = html;
        bindContent();
        if (page === "profile" && context === "contacts") content.querySelector('[data-tab="contacts"]')?.click();
        updateCartControls();
      }

      function applyTableFilter(id) {
        const table = content.querySelector(`[data-table="${id}"]`);
        if (!table) return;
        const search = content.querySelector(`[data-table-search="${id}"]`);
        const org = content.querySelector(`[data-table-org="${id}"]`);
        const payment = content.querySelector(`[data-table-payment="${id}"]`);
        const query = search ? search.value.trim().toLowerCase() : "";
        const selectedOrg = org ? org.value : "";
        const selectedPayment = payment ? payment.value : "";
        table.querySelectorAll("tbody tr").forEach(row => {
          const matchesSearch = !query || row.textContent.toLowerCase().includes(query);
          const matchesOrg = !selectedOrg || !row.dataset.org || row.dataset.org === selectedOrg;
          const matchesPayment = !selectedPayment || row.dataset.payment === selectedPayment;
          row.hidden = !(matchesSearch && matchesOrg && matchesPayment);
        });
      }

      function bindToolbar() {
        content.querySelectorAll("[data-settings]").forEach(button => button.addEventListener("click", () => {
          const id = button.dataset.settings;
          const panel = content.querySelector(`[data-settings-panel="${id}"]`);
          const open = button.getAttribute("aria-expanded") === "true";
          button.setAttribute("aria-expanded", String(!open));
          panel.hidden = open;
        }));
        content.querySelectorAll("[data-table-search]").forEach(input => input.addEventListener("input", () => applyTableFilter(input.dataset.tableSearch)));
        content.querySelectorAll("[data-table-org]").forEach(select => select.addEventListener("change", () => {
          if (select.dataset.tableOrg === "catalog") {
            const group = content.querySelector("[data-catalog-group]");
            catalogState.selectedGroup = group ? group.value : "";
            void loadCatalog(select.value).then(() => {
              if (activePage === "catalog") render("catalog");
            });
            render("catalog");
          } else applyTableFilter(select.dataset.tableOrg);
        }));
        content.querySelectorAll("[data-table-payment]").forEach(select => select.addEventListener("change", () => applyTableFilter(select.dataset.tablePayment)));
        content.querySelectorAll("[data-search-toggle]").forEach(check => check.addEventListener("change", () => {
          const wrap = content.querySelector(`[data-toolbar="${check.dataset.searchToggle}"] [data-search-wrap]`);
          if (wrap) wrap.hidden = !check.checked;
        }));
      }

      function bindCatalog() {
        const retry = content.querySelector("[data-catalog-retry]");
        if (retry) retry.addEventListener("click", () => {
          void loadCatalog(catalogState.selectedOrg).then(() => { if (activePage === "catalog") render("catalog"); });
          render("catalog");
        });
        const syncCatalogQuantity = (code, rawValue) => {
          const value = Math.max(1, Math.min(500, Number.parseInt(rawValue, 10) || 1)); quantities[code] = value;
          const input = content.querySelector(`[data-qty-input="${code}"]`); if (input) input.value = value;
          const orgSelect = content.querySelector('[data-table-org="catalog"]'); const product = products.find(item => item.code === code);
          if (orgSelect?.value && product) { const existing = cart.find(item => item.key === `${orgSelect.value}|${product.vendor}|${code}`); if (existing) existing.qty = value; }
          saveState(); updateCartControls();
        };
        const group = content.querySelector("[data-catalog-group]");
        if (group) group.addEventListener("change", () => {
          const org = content.querySelector('[data-table-org="catalog"]');
          catalogState.selectedGroup = group.value;
          content.querySelector("#catalog-table").innerHTML = catalogTable(org ? org.value : "", group.value);
          bindContent();
        });
        content.querySelectorAll("[data-qty-minus]").forEach(button => button.addEventListener("click", () => {
          const code = button.dataset.qtyMinus;
          syncCatalogQuantity(code, quantities[code] - 1);
        }));
        content.querySelectorAll("[data-qty-plus]").forEach(button => button.addEventListener("click", () => {
          const code = button.dataset.qtyPlus;
          syncCatalogQuantity(code, quantities[code] + 1);
        }));
        content.querySelectorAll("[data-qty-input]").forEach(input => input.addEventListener("input", () => syncCatalogQuantity(input.dataset.qtyInput, input.value)));
        content.querySelectorAll("[data-cart-product]").forEach(button => button.addEventListener("click", () => {
          const org = content.querySelector('[data-table-org="catalog"]');
          const notice = content.querySelector("[data-catalog-notice]");
          if (!org || !org.value) {
            const requiredDialog = content.querySelector("[data-org-required-dialog]");
            if (requiredDialog) { if (typeof requiredDialog.showModal === "function") requiredDialog.showModal(); else requiredDialog.setAttribute("open", ""); }
            return;
          }
          const product = products.find(p => p.code === button.dataset.cartProduct);
          if (!product) return;
          const key = `${org.value}|${product.vendor}|${product.code}`;
          const existing = cart.find(item => item.key === key);
          if (existing && button.dataset.cartRemove === "true") {
            const group = content.querySelector("[data-catalog-group]");
            pendingCartRemoval = { key, org: org.value, group: group ? group.value : "" };
            const dialog = content.querySelector("[data-remove-dialog]");
            if (dialog) {
              if (typeof dialog.showModal === "function") dialog.showModal();
              else dialog.setAttribute("open", "");
            }
            return;
          } else if (existing) {
            existing.qty = Math.min(500, existing.qty + quantities[product.code]);
            if (notice) notice.textContent = "Количество товара в корзине обновлено";
          } else {
            cart.push({ key, org: org.value, vendor: product.vendor, code: product.code, name: product.name, price: product.price, qty: quantities[product.code] });
            if (notice) notice.textContent = "Товар добавлен в корзину";
          }
          saveState();
          const group = content.querySelector("[data-catalog-group]");
          const catalogArea = content.querySelector("#catalog-table");
          if (catalogArea) {
            catalogArea.innerHTML = catalogTable(org.value, group ? group.value : "");
            bindContent();
          }
          updateCartControls();
        }));
        const removeDialog = content.querySelector("[data-remove-dialog]");
        if (removeDialog && !removeDialog.dataset.bound) {
          removeDialog.dataset.bound = "true";
          const closeDialog = () => {
            if (typeof removeDialog.close === "function") removeDialog.close();
            else removeDialog.removeAttribute("open");
          };
          const cancel = removeDialog.querySelector("[data-remove-cancel]");
          if (cancel) cancel.addEventListener("click", () => { pendingCartRemoval = null; closeDialog(); });
          const confirm = removeDialog.querySelector("[data-remove-confirm]");
          if (confirm) confirm.addEventListener("click", () => {
            if (!pendingCartRemoval) return closeDialog();
            const index = cart.findIndex(item => item.key === pendingCartRemoval.key);
            if (index >= 0) cart.splice(index, 1);
            saveState();
            const notice = content.querySelector("[data-catalog-notice]");
            if (notice) notice.textContent = "Товар удален из корзины";
            const catalogArea = content.querySelector("#catalog-table");
            if (catalogArea) catalogArea.innerHTML = catalogTable(pendingCartRemoval.org, pendingCartRemoval.group);
            pendingCartRemoval = null;
            closeDialog();
            bindContent();
            updateCartControls();
          });
        }
        const orgRequiredDialog = content.querySelector("[data-org-required-dialog]");
        if (orgRequiredDialog && !orgRequiredDialog.dataset.bound) { orgRequiredDialog.dataset.bound = "true"; orgRequiredDialog.addEventListener("cancel", event => event.preventDefault()); const ok = orgRequiredDialog.querySelector("[data-org-required-ok]"); if (ok) ok.addEventListener("click", () => { if (typeof orgRequiredDialog.close === "function") orgRequiredDialog.close(); else orgRequiredDialog.removeAttribute("open"); }); }
        const openCart = content.querySelector("[data-open-cart]");
        if (openCart) openCart.addEventListener("click", () => { if (cart.length) render("cart"); });
      }

      function bindCart() {
        content.querySelectorAll("[data-cart-minus]").forEach(button => button.addEventListener("click", () => {
          const item = cart.find(i => (i.storageKey || i.key) === button.dataset.cartMinus);
          if (!item) return;
          browserBusiness.setCartQuantity(item.storageKey || item.key, Math.max(1, item.qty - 1));
          syncBrowserData();
          render("cart");
        }));
        content.querySelectorAll("[data-cart-plus]").forEach(button => button.addEventListener("click", () => {
          const item = cart.find(i => (i.storageKey || i.key) === button.dataset.cartPlus);
          if (!item) return;
          browserBusiness.setCartQuantity(item.storageKey || item.key, Math.min(500, item.qty + 1));
          syncBrowserData();
          render("cart");
        }));
        content.querySelectorAll("[data-cart-input]").forEach(input => input.addEventListener("change", () => {
          const item = cart.find(i => (i.storageKey || i.key) === input.dataset.cartInput);
          if (!item) return;
          const value = Number(input.value);
          if (!Number.isInteger(value) || value < 1 || value > 500) { input.value = String(item.qty); return; }
          browserBusiness.setCartQuantity(item.storageKey || item.key, value);
          syncBrowserData();
          render("cart");
        }));
        const removeDialog = content.querySelector("[data-cart-remove-dialog]");
        let pendingRemovalKey = "";
        content.querySelectorAll("[data-cart-remove-item]").forEach(button => button.addEventListener("click", () => {
          pendingRemovalKey = button.dataset.cartRemoveItem;
          openDialog(removeDialog);
        }));
        const removeConfirm = content.querySelector("[data-cart-remove-confirm]");
        if (removeConfirm) removeConfirm.addEventListener("click", () => {
          if (pendingRemovalKey) browserBusiness.removeCartItem(pendingRemovalKey);
          pendingRemovalKey = "";
          closeDialog(removeDialog);
          syncBrowserData();
          render("cart");
        });
        const removeCancel = content.querySelector("[data-cart-remove-cancel]");
        if (removeCancel) removeCancel.addEventListener("click", () => { pendingRemovalKey = ""; closeDialog(removeDialog); });
        content.querySelectorAll("[data-comment-toggle]").forEach(check => check.addEventListener("change", () => {
          const box = content.querySelector(`[data-comment-box="${check.dataset.commentToggle}"]`);
          if (box) box.hidden = !check.checked;
        }));
        const checkout = content.querySelector("[data-checkout]");
        if (checkout) checkout.addEventListener("click", async () => {
          checkout.disabled = true;
          const errorBox = content.querySelector("[data-checkout-error]");
          if (errorBox) errorBox.textContent = "";
          try {
            const result = await createCartOrders();
            if (result) render("cart-result", result);
          } catch (error) {
            if (errorBox) errorBox.textContent = error instanceof Error ? error.message : "Не удалось оформить заказ";
            checkout.disabled = false;
          }
        });
      }

      function bindLicenseCheckboxes() {
        const tableArea = content.querySelector("[data-license-table]");
        if (!tableArea) return;
        tableArea.querySelectorAll("[data-indeterminate]").forEach(check => { check.indeterminate = true; });
        const refresh = () => {
          tableArea.innerHTML = renderActivationPreviewTable();
          bindLicenseCheckboxes();
          updateActivationActions();
        };
        tableArea.querySelectorAll("[data-license-cell]").forEach(check => check.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          const device = activationDevices[Number(check.dataset.deviceIndex)];
          const license = device && device.licenses[check.dataset.licenseCell];
          if (license && license.available) license.selected = !license.selected;
          saveActivationDraft();
          refresh();
        }));
        tableArea.querySelectorAll("[data-license-device-select]").forEach(check => check.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          const device = activationDevices[Number(check.dataset.licenseDeviceSelect)];
          if (!device) return;
          const available = licenseKeys.map(key => device.licenses[key]).filter(license => license.available);
          const shouldSelect = !available.every(license => license.selected);
          available.forEach(license => { license.selected = shouldSelect; });
          saveActivationDraft();
          refresh();
        }));
        tableArea.querySelectorAll("[data-license-column]").forEach(check => check.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          const key = check.dataset.licenseColumn;
          const available = activationDevices.map(device => device.licenses[key]).filter(license => license.available);
          const shouldSelect = !available.every(license => license.selected);
          available.forEach(license => { license.selected = shouldSelect; });
          saveActivationDraft();
          refresh();
        }));
      }
      function updateActivationActions() { const activateButton = content.querySelector("[data-create-activation]"); const deleteButton = content.querySelector("[data-delete-activation]"); if (activateButton) activateButton.disabled = !activationPreviewVisible || activationTotal() <= 0; if (deleteButton) deleteButton.disabled = selectedActivationDeviceCount() === 0; }

      function updateCartControls() {
        const cartAvailable = organizationAccessLoaded && cart.length > 0;
        root.querySelectorAll("[data-cart-menu]").forEach(button => { button.disabled = !cartAvailable; });
        const button = content.querySelector("[data-open-cart]");
        if (button) {
          button.disabled = !cartAvailable;
          button.classList.toggle("btn-primary", cartAvailable);
          const count = button.querySelector("[data-cart-count]");
          if (count) count.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
        }
      }

      function bindContent() {
        content.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => {
          const tab = button.dataset.openTab;
          render(button.dataset.page);
          if (button.dataset.page === "orders") void refreshServerOrders().then(() => { if (activePage === "orders") render("orders"); });
          if (tab) { const tabButton = content.querySelector(`[data-tab="${tab}"]`); if (tabButton) tabButton.click(); }
        }));
        content.querySelectorAll("[data-download-license]").forEach(button => button.addEventListener("click", event => {
          event.stopPropagation();
          const row = button.closest("tr[data-go]");
          const activationNumber = button.dataset.activationNumber || (activePage === "activation" ? activeContext?.[0] : row?.cells?.[0]?.textContent?.trim());
          const documentId = activationDetails[activationNumber]?.licenseFileDocumentId;
          if (documentId) browserBusiness.downloadDocument(documentId);
        }));
        content.querySelectorAll("tr[data-go]").forEach(row => row.addEventListener("click", async () => {
          const idx = Number(row.dataset.index || 0);
          if (row.dataset.go === "organization") render("organization", idx);
          if (row.dataset.go === "contact") render("contact", idx);
          if (row.dataset.go === "order") {
            const order = orders.find(o => o[0] === row.dataset.orderNumber) || orders[idx];
            if (orderDetails[order?.[0]]?.serverId) {
              try { await refreshServerOrder(order[0]); } catch {}
            }
            render("order", orders.find(o => o[0] === order?.[0]) || order);
          }
          if (row.dataset.go === "activation") render("activation", visibleActivations()[idx]);
          if (row.dataset.go === "activation-linked") render("activation", activations.find(a => a[0] === row.cells[0].textContent) || activations[0]);
        }));
        const tabs = content.querySelectorAll("[data-tab]");
        tabs.forEach(button => button.addEventListener("click", () => render("profile", button.dataset.tab)));
        bindProfileUsers();
        const addContact = content.querySelector("[data-add-contact]"); const contactDialog = content.querySelector("[data-contact-dialog]"); if (addContact && contactDialog) addContact.addEventListener("click", () => { if (typeof contactDialog.showModal === "function") contactDialog.showModal(); else contactDialog.setAttribute("open", ""); }); content.querySelectorAll("[data-close-contact]").forEach(button => button.addEventListener("click", () => { if (!contactDialog) return; if (typeof contactDialog.close === "function") contactDialog.close(); else contactDialog.removeAttribute("open"); })); const contactForm = content.querySelector("[data-contact-form]"); if (contactForm && contactDialog && contactForm.dataset.submitBound !== "true") { contactForm.dataset.submitBound = "true"; contactForm.addEventListener("submit", async event => { event.preventDefault(); const submit = contactForm.querySelector('[type="submit"]'); const errorArea = contactForm.querySelector("[data-contact-error]"); if (submit) submit.disabled = true; if (errorArea) errorArea.textContent = ""; try { await createServerContact({ fullName: contactForm.querySelector("[data-contact-full-name]").value, position: contactForm.querySelector("[data-contact-position]").value, email: contactForm.querySelector("[data-contact-email]").value, phone: contactForm.querySelector("[data-contact-phone]").value, department: contactForm.querySelector("[data-contact-department]").value }); if (typeof contactDialog.close === "function") contactDialog.close(); else contactDialog.removeAttribute("open"); render("profile"); const contactsTab = content.querySelector('[data-tab="contacts"]'); if (contactsTab) contactsTab.click(); } catch (error) { if (errorArea) errorArea.textContent = error instanceof Error ? error.message : "Не удалось сохранить контакт"; } finally { if (submit) submit.disabled = false; } }); }
        content.querySelectorAll("[data-order-number]").forEach(orderButton => orderButton.addEventListener("click", async event => {
          event.preventDefault();
          const number = orderButton.dataset.orderNumber;
          if (orderDetails[number]?.serverId) {
            try { await refreshServerOrder(number); } catch {}
          }
          render("order", orders.find(order => order[0] === number) || orders[0]);
        }));
        const editActivationComment = content.querySelector("[data-edit-activation-comment]");
        const activationCommentDialog = content.querySelector("[data-activation-comment-dialog]");
        if (editActivationComment) editActivationComment.addEventListener("click", () => openDialog(activationCommentDialog));
        content.querySelectorAll("[data-close-activation-comment]").forEach(button => button.addEventListener("click", () => closeDialog(activationCommentDialog)));
        const saveActivationComment = content.querySelector("[data-save-activation-comment]");
        if (saveActivationComment) saveActivationComment.addEventListener("click", () => {
          const activationNumber = saveActivationComment.dataset.saveActivationComment;
          const input = content.querySelector("[data-activation-comment-input]");
          const value = input ? input.value.trim() : "";
          browserStore.updateActivation(activationNumber, { comment: value }); syncBrowserData(); const updated = activations.find(item => item[0] === activationNumber); if (updated) render("activation", updated);
        });
        const updateActivationStatus = content.querySelector("[data-update-activation-status]");
        if (updateActivationStatus) updateActivationStatus.addEventListener("click", () => { const activation = completeActivation(updateActivationStatus.dataset.updateActivationStatus); if (activation) render("activation", activation); });
        content.querySelectorAll("[data-select-license-org]").forEach(button => button.addEventListener("click", () => {
          selectedLicenseOrg = button.dataset.selectLicenseOrg;
          const organizationId = organizations.find(org => org[1] === selectedLicenseOrg)?.[7];
          render(organizationId && browserBusiness.getOfferStatus(organizationId).isAccepted ? "activate" : "activate-offer", selectedLicenseOrg);
        }));
        const offerCheck = content.querySelector("[data-offer-check]");
        const offerContinue = content.querySelector("[data-offer-continue]");
        if (offerCheck && offerContinue) {
          offerCheck.addEventListener("change", () => { offerContinue.disabled = !offerCheck.checked; });
          offerContinue.addEventListener("click", () => { if (offerCheck.checked) { const organizationId = organizations.find(org => org[1] === selectedLicenseOrg)?.[7]; if (organizationId) browserBusiness.acceptOffer(organizationId); render("activate", selectedLicenseOrg); } });
        }
        const addSerials = serials => {
          const preview = content.querySelector("[data-license-preview]");
          if (!preview || !serials.length) return { added: [], duplicateCount: 0 };
          const template = clone(activationDevices[0]);
          if (!activationPreviewVisible) activationDevices.splice(0, activationDevices.length);
          const existingSerials = new Set(activationDevices.map(device => device.serial));
          const added = [];
          let duplicateCount = 0;
          serials.forEach(serial => {
            if (existingSerials.has(serial)) { duplicateCount += 1; return; }
            existingSerials.add(serial);
            const device = clone(template);
            device.serial = serial;
            applySerialDemoState(device, serial);
            licenseKeys.forEach(key => { device.licenses[key].selected = false; });
            activationDevices.unshift(device);
            added.push(serial);
          });
          if (!added.length) return { added, duplicateCount };
          saveActivationDraft();
          lastCheckedSerial = added[added.length - 1];
          preview.hidden = false;
          activationPreviewVisible = true;
          const vendor = content.querySelector("[data-activation-vendor]");
          if (vendor) vendor.hidden = false;
          const tableArea = content.querySelector("[data-license-table]");
          if (tableArea) tableArea.innerHTML = renderActivationPreviewTable();
          bindLicenseCheckboxes();
          updateActivationActions();
          if (window.lucide) window.lucide.createIcons({ attrs: { width: 16, height: 16 } });
          return { added, duplicateCount };
        };
        const checkSerial = content.querySelector("[data-check-serial]");
        if (checkSerial) checkSerial.addEventListener("click", () => {
          const input = content.querySelector("[data-serial-input]");
          const notice = content.querySelector("[data-serial-notice]");
          const valid = input && /^\d{16}$/.test(input.value.trim());
          if (!valid) {
            if (notice) notice.textContent = "Серийный номер должен содержать 16 цифр";
            return;
          }
          if (input) {
            const result = addSerials([input.value.trim()]);
            if (notice) notice.textContent = result.duplicateCount ? "Серийный номер уже добавлен" : "";
            input.value = "";
          }
        });
        const serialFile = content.querySelector("[data-serial-file]");
        const uploadSerials = content.querySelector("[data-upload-serials]");
        if (uploadSerials && serialFile) uploadSerials.addEventListener("click", () => serialFile.click());
        if (serialFile) serialFile.addEventListener("change", async () => {
          const notice = content.querySelector("[data-serial-notice]");
          const file = serialFile.files?.[0];
          if (!file) return;
          const lines = (await file.text()).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
          const serials = lines.filter(line => /^\d{16}$/.test(line));
          addSerials(serials);
          if (notice) notice.textContent = serials.length === lines.length ? "" : "Некорректные строки пропущены: серийный номер должен содержать 16 цифр";
          serialFile.value = "";
        });
        const downloadSerialExample = content.querySelector("[data-download-serial-example]");
        if (downloadSerialExample) downloadSerialExample.addEventListener("click", () => {
          const blob = new Blob(["1234567890123451\n2345678901234563\n3456789012345675\n4567890123456787\n5678901234567899"], { type: "text/plain;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "serial-numbers-example.txt";
          link.click();
          URL.revokeObjectURL(url);
        });
        const prices = content.querySelector("[data-prices]");
        const priceDialog = content.querySelector("[data-prices-dialog]");
        if (prices && priceDialog) prices.addEventListener("click", () => {
          if (typeof priceDialog.showModal === "function") priceDialog.showModal();
          else priceDialog.setAttribute("open", "");
        });
        const closePrices = content.querySelector("[data-close-prices]");
        if (closePrices && priceDialog) closePrices.addEventListener("click", () => {
          if (typeof priceDialog.close === "function") priceDialog.close();
          else priceDialog.removeAttribute("open");
        });
        const instruction = content.querySelector("[data-instruction]");
        if (instruction) instruction.addEventListener("click", () => {
          const note = content.querySelector("[data-instruction-note]");
          if (note) note.textContent = "Инструкция открывается на внешнем сайте в новой вкладке.";
        });
        content.querySelectorAll("[data-doc-download]").forEach(button => button.addEventListener("click", () => {
          const status = content.querySelector("[data-doc-status]");
          browserBusiness.downloadDocument(button.dataset.docDownload);
          if (status) status.textContent = "Скачивание документа началось";
        }));
        const login = content.querySelector("[data-login]");
        const loginForm = content.querySelector("[data-login-form]");
        const loginConsent = content.querySelector("[data-login-consent]");
        if (loginConsent && login) loginConsent.addEventListener("change", () => { login.disabled = !loginConsent.checked; });
        const passwordToggle = content.querySelector("[data-password-toggle]");
        const loginPassword = content.querySelector("[data-login-password]");
        if (passwordToggle && loginPassword) passwordToggle.addEventListener("click", () => { const visible = loginPassword.type === "text"; loginPassword.type = visible ? "password" : "text"; passwordToggle.setAttribute("aria-label", visible ? "Показать пароль" : "Скрыть пароль"); passwordToggle.setAttribute("aria-pressed", String(!visible)); passwordToggle.innerHTML = `<i data-lucide="${visible ? "eye" : "eye-off"}" aria-hidden="true"></i>`; if (window.lucide) window.lucide.createIcons({ attrs: { width: 16, height: 16 } }); });
        content.querySelector("[data-forgot-password]")?.addEventListener("click", () => { const notice = content.querySelector("[data-login-notice]"); if (notice) notice.textContent = "Заглушка для восстановления пароля"; });
        if (loginForm) loginForm.addEventListener("submit", event => { event.preventDefault(); if (!loginConsent?.checked) return; const email = content.querySelector("[data-login-email]"); const password = content.querySelector("[data-login-password]"); const error = content.querySelector("[data-login-error]"); try { browserStore.login(email?.value, password?.value); saveLoginCredentials(email.value, password.value); render("profile", "profile"); } catch (caught) { if (error) error.textContent = caught.message || "Не удалось войти"; } });
        const createActivation = content.querySelector("[data-create-activation]");
        const over180Dialog = content.querySelector("[data-over180-dialog]");
        const activationConfirmDialog = content.querySelector("[data-activation-confirm-dialog]");
        const insufficientDialog = content.querySelector("[data-insufficient-dialog]");
        const balanceDialog = content.querySelector("[data-balance-dialog]");
        const fillActivationConfirmation = () => {
          const selected = selectedLicenseItems(); const body = content.querySelector("[data-activation-confirm-body]"); const total = selected.reduce((sum, item) => sum + item.price, 0);
          if (body) body.innerHTML = selected.map((item, index) => `<tr><td>${index + 1}</td><td><span class="stacked-value"><span>${esc(item.name)}</span><span class="text-muted text-small">${esc(item.serial)}</span></span></td><td>${rub(item.price)}</td><td>1</td><td>${rub(item.price)}</td></tr>`).join("");
          const totalNode = content.querySelector("[data-activation-confirm-total]"); if (totalNode) totalNode.textContent = rub(total);
        };
        const openActivationConfirmation = () => { fillActivationConfirmation(); openDialog(activationConfirmDialog); };
        if (createActivation) createActivation.addEventListener("click", () => {
          const selected = selectedLicenseItems(); if (!selected.length) return; const over180 = selected.filter(item => item.over180);
          if (over180.length) { const body = content.querySelector("[data-over180-body]"); if (body) body.innerHTML = over180.map(item => `<tr><td>${esc(item.serial)}</td><td>${esc(item.name)}</td><td>${esc(item.current.replace("Текущая до ", "До "))}</td><td>${esc(item.next.replace("Новая до ", "До "))}</td></tr>`).join(""); openDialog(over180Dialog); }
          else openActivationConfirmation();
        });
        const over180Ok = content.querySelector("[data-over180-ok]"); if (over180Ok) over180Ok.addEventListener("click", () => { closeDialog(over180Dialog); openActivationConfirmation(); });
        const over180Cancel = content.querySelector("[data-over180-cancel]"); if (over180Cancel) over180Cancel.addEventListener("click", () => closeDialog(over180Dialog));
        const cancelActivation = content.querySelector("[data-cancel-activation]"); if (cancelActivation) cancelActivation.addEventListener("click", () => closeDialog(activationConfirmDialog));
        const confirmActivation = content.querySelector("[data-confirm-activation]");
        if (confirmActivation) confirmActivation.addEventListener("click", () => {
          const total = activationTotal(); pendingActivationComment = content.querySelector("[data-new-activation-comment]")?.value.trim() || ""; const licenseContract = sublicenseContractForOrganization(selectedLicenseOrg); const deficit = licenseContract?.paymentTerms === "Предоплата 100%" ? Math.max(0, total - (balances[selectedLicenseOrg] || 0)) : 0;
          if (lastCheckedSerial !== "0000000000000000" && deficit > 0) { pendingActivationDeficit = deficit; const deficitNode = content.querySelector("[data-deficit-amount]"); if (deficitNode) deficitNode.textContent = rub(deficit); closeDialog(activationConfirmDialog); openDialog(insufficientDialog); return; }
          const activation = createActivationRecord(pendingActivationComment);
          if (activation) { pendingActivationComment = ""; closeDialog(activationConfirmDialog); render("activation", activation); }
        });
        const insufficientCancel = content.querySelector("[data-insufficient-cancel]"); if (insufficientCancel) insufficientCancel.addEventListener("click", () => { pendingActivationDeficit = 0; closeDialog(insufficientDialog); });
        const topUpAmount = content.querySelector("[data-top-up-amount]");
        const updateTopUpPreview = () => { if (!topUpAmount) return; const amount = Math.max(0, Math.min(10000000, Number.parseInt(topUpAmount.value, 10) || 0)); if (topUpAmount.value && Number(topUpAmount.value) > 10000000) topUpAmount.value = "10000000"; const after = content.querySelector("[data-balance-after]"); if (after) after.textContent = rub((balances[selectedLicenseOrg] || 0) + amount); const create = content.querySelector("[data-create-top-up]"); if (create) create.disabled = amount <= 0; };
        const insufficientTopUp = content.querySelector("[data-insufficient-topup]"); if (insufficientTopUp) insufficientTopUp.addEventListener("click", () => { closeDialog(insufficientDialog); if (topUpAmount) topUpAmount.value = String(pendingActivationDeficit); updateTopUpPreview(); openDialog(balanceDialog); });
        const deleteActivation = content.querySelector("[data-delete-activation]");
        const deleteSerialsDialog = content.querySelector("[data-delete-serials-dialog]");
        if (deleteActivation) deleteActivation.addEventListener("click", () => {
          const count = selectedActivationDeviceCount();
          if (!count) return;
          const lastTwo = count % 100;
          const last = count % 10;
          const noun = lastTwo >= 11 && lastTwo <= 14 ? "серийных номеров" : last === 1 ? "серийный номер" : last >= 2 && last <= 4 ? "серийных номера" : "серийных номеров";
          const text = content.querySelector("[data-delete-serials-text]");
          if (text) text.textContent = `Удалить ${count} ${noun} из таблицы?`;
          openDialog(deleteSerialsDialog);
        });
        const deleteSerialsConfirm = content.querySelector("[data-delete-serials-confirm]");
        if (deleteSerialsConfirm) deleteSerialsConfirm.addEventListener("click", () => {
          for (let index = activationDevices.length - 1; index >= 0; index -= 1) {
            if (activationDeviceSelection(activationDevices[index]).all) activationDevices.splice(index, 1);
          }
          activationPreviewVisible = activationDevices.length > 0;
          saveActivationDraft();
          closeDialog(deleteSerialsDialog);
          const vendor = content.querySelector("[data-activation-vendor]");
          if (vendor) vendor.hidden = !activationPreviewVisible;
          const tableArea = content.querySelector("[data-license-table]");
          if (tableArea) tableArea.innerHTML = renderActivationPreviewTable();
          bindLicenseCheckboxes();
          updateActivationActions();
        });
        const deleteSerialsCancel = content.querySelector("[data-delete-serials-cancel]");
        if (deleteSerialsCancel) deleteSerialsCancel.addEventListener("click", () => closeDialog(deleteSerialsDialog));
        const topUp = content.querySelector("[data-top-up]"); if (topUp) topUp.addEventListener("click", () => { pendingActivationDeficit = 0; if (topUpAmount) topUpAmount.value = ""; updateTopUpPreview(); openDialog(balanceDialog); });
        content.querySelectorAll("[data-close-balance]").forEach(button => button.addEventListener("click", () => closeDialog(balanceDialog)));
        if (topUpAmount) topUpAmount.addEventListener("input", updateTopUpPreview);
        const createTopUp = content.querySelector("[data-create-top-up]");
        if (createTopUp) createTopUp.addEventListener("click", () => {
          const amount = Math.max(1, Math.min(10000000, Number.parseInt(topUpAmount?.value, 10) || 0)); const order = createAdvanceOrder(amount); closeDialog(balanceDialog);
          pendingActivationDeficit = 0; if (order) render("order", order);
        });
        bindToolbar();
        bindCatalog();
        bindCart();
        bindLicenseCheckboxes();
        updateActivationActions();
        if (window.lucide) window.lucide.createIcons({ attrs: { width: 16, height: 16 } });
      }

      const enforceSession = event => { if (activePage !== "login" && !browserStore.getCurrentUser()) { event.preventDefault(); event.stopImmediatePropagation(); render("login"); } };
      content.addEventListener("click", enforceSession, true);
      content.addEventListener("submit", enforceSession, true);
      root.querySelectorAll(".lkp-side [data-page]").forEach(button => button.addEventListener("click", () => {
        if (!button.disabled) render(button.dataset.page);
        if (window.matchMedia("(max-width: 700px)").matches) {
          side.classList.remove("mobile-open");
          const trigger = root.querySelector("[data-mobile-menu]");
          if (trigger) trigger.setAttribute("aria-expanded", "false");
        }
      }));
      root.querySelectorAll("[data-toggle]").forEach(button => button.addEventListener("click", () => {
        const target = root.querySelector("#" + button.dataset.toggle);
        const expanded = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!expanded));
        target.hidden = expanded;
      }));
      const logout = root.querySelector("[data-logout]");
      if (logout) logout.addEventListener("click", () => { browserStore.logout(); render("login"); });
      const mobileMenu = root.querySelector("[data-mobile-menu]");
      if (mobileMenu) mobileMenu.addEventListener("click", () => {
        const open = side.classList.toggle("mobile-open");
        mobileMenu.setAttribute("aria-expanded", String(open));
        mobileMenu.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
        if (window.lucide) window.lucide.createIcons({ attrs: { width: 16, height: 16 } });
      });
      const restoredNavigation = restoreNavigation();
      render(restoredNavigation.page, restoredNavigation.context);
      browserStore.subscribe(change => {
        if (change.reason !== "reset" && change.reason !== "external") return;
        const activationNumber = activePage === "activation" ? activeContext?.[0] : "";
        const orderNumber = activePage === "order" ? activeContext?.[0] : "";
        syncBrowserData();
        const refreshedContext = activationNumber ? activations.find(item => item[0] === activationNumber) : orderNumber ? orders.find(item => item[0] === orderNumber) : activeContext;
        if (["catalog", "orders", "profile", "organization", "activations", "activation", "activate-org", "cart", "cart-result", "order"].includes(activePage)) render(activePage, refreshedContext);
      });
      void Promise.all([loadCatalog(), refreshServerOrders(), refreshContacts()]).then(() => {
        if (["catalog", "orders", "profile", "organization", "activations", "activate-org", "cart"].includes(activePage)) render(activePage, activeContext);
      });
