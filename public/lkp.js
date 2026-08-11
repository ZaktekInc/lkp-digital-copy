      function render(page, context) {
        let html = "";
        shell.classList.toggle("login-mode", page === "login");
        if (page === "login") {
          html = `<section class="login-shell"><div class="page-head"><div class="page-title">Вход</div></div><label class="form-label">Ваш логин *<input class="form-control" type="text" autocomplete="username" placeholder="Логин" required data-login-field></label><label class="form-label">Ваш пароль *<input class="form-control" type="password" autocomplete="current-password" placeholder="Пароль" required data-login-field></label><div class="login-copy login-consent"><input class="form-check-input" id="login-consent" type="checkbox" data-login-consent><label for="login-consent">Нажимая кнопку «Войти», вы даете согласие на <a href="https://aqsi.ru/policy/" target="_blank" rel="noopener noreferrer"><strong>обработку персональных данных</strong></a> и подтверждаете, что ознакомлены и согласны с условиями <a href="https://aqsi.ru/lkp-agreement/" target="_blank" rel="noopener noreferrer"><strong>пользовательского соглашения</strong></a>.</label></div><div class="login-actions"><a href="https://dev1lkp.aqsi.ru/password-recovery" target="_blank" rel="noopener noreferrer">Забыли пароль?</a><button class="btn btn-primary" type="button" data-login disabled>Войти</button></div></section>`;
        } else if (page === "profile") {
          html = `<div class="page-head"><div class="page-title">Профиль</div></div><div class="partner-line"><span>ООО «Партнер»</span><span class="viz-badge">Постоянный партнер</span></div><section class="manager panel"><div class="manager-grid"><div class="key-value"><div class="label">Персональный менеджер</div><div>Смирнов Алексей</div></div><div class="key-value"><div class="label">Телефон</div><div>+7 987 654-32-10</div></div><div class="key-value"><div class="label">Email</div><div><a href="mailto:example@mail.ru">example@mail.ru</a></div></div></div></section><div class="tabs"><button class="btn btn-primary" data-tab="orgs">Организации</button><button class="btn" data-tab="contacts">Контакты</button></div><div id="profile-tab">${organizationTable()}</div><dialog class="form-dialog" data-contact-dialog><div class="dialog-head"><h2>Создать контактное лицо</h2><button class="btn btn-ghost" type="button" aria-label="Закрыть" data-close-contact><i data-lucide="x" aria-hidden="true"></i></button></div><form class="contact-form-grid" data-contact-form><label class="form-label contact-full">ФИО *<input class="form-control" required></label><label class="form-label">Должность *<input class="form-control" required></label><label class="form-label">E-mail *<input class="form-control" type="email" required></label><label class="form-label">Телефон *<input class="form-control" type="tel" required></label><label class="form-label">Отдел *<input class="form-control" required></label><div class="dialog-actions contact-full"><button class="btn btn-primary" type="submit">Сохранить</button></div></form></dialog>`;
        } else if (page === "organization") {
          const org = organizations[context || 0];
          const filtered = orders.filter(r => r[2] === org[1]);
          html = `<div class="page-head"><div class="page-title">${esc(org[1])}</div></div><div class="org-details-grid"><section class="org-card panel"><h3>Организация</h3><div class="key-value"><span class="label">ИНН:</span><span>7724827983</span></div><div class="key-value"><span class="label">Тип:</span><span>Юр. лицо</span></div><div class="key-value"><span class="label">КПП:</span><span>771601001</span></div><div class="key-value"><span class="label">ОГРН:</span><span>Нет данных</span></div><div class="key-value"><span class="label">ОКПО:</span><span>Нет данных</span></div></section><section class="org-card panel"><h3>Контакты</h3><div class="key-value"><span class="label">Фактический адрес:</span><span>190121, Город Санкт-Петербург, ул Почтамтская, д. 19, литера А</span></div><div class="key-value"><span class="label">Юридический адрес:</span><span>190121, Город Санкт-Петербург, ул Почтамтская, д. 19, литера А</span></div><div class="key-value"><span class="label">Телефон:</span><span>+7 800 555-35-36</span></div><div class="key-value"><span class="label">E-mail:</span><a href="mailto:example1@mail.ru">example1@mail.ru</a></div></section><section class="org-card panel"><h3>Банковские реквизиты</h3><div class="key-value"><span class="label">БИК:</span><span>044525225</span></div><div class="key-value"><span class="label">Корреспондентский счет:</span><span>ПАО Сбербанк<br>30101810400000000225</span></div><div class="key-value"><span class="label">Расчетный счет:</span><span>40702810457895841914</span></div></section><section class="org-card panel"><h3>ЭДО</h3><div class="key-value"><span class="label">Идентификатор:</span><span>Нет данных</span></div><div class="key-value"><span class="label">Организация использует ЭДО:</span><span>Нет данных</span></div></section></div><div class="page-head"><div class="page-title">Заказы</div></div>${orderTable(filtered, "organization-orders", org[1], { org: false, payment: true })}`;
        } else if (page === "contact") {
          const c = contacts[context || 0];
          html = `<div class="page-head"><div class="page-title">Редактирование контакта</div></div><div class="details panel"><div class="key-value"><div class="label">Отдел</div><div>${c[0]}</div></div><div class="key-value"><div class="label">Должность</div><div>${c[1]}</div></div><div class="key-value"><div class="label">ФИО</div><div>${c[2]}</div></div><div class="key-value"><div class="label">Телефон</div><div>${c[3]}</div></div><div class="key-value"><div class="label">Email</div><div>${c[4]}</div></div></div>`;
        } else if (page === "orders") {
          html = `<div class="page-head"><div class="page-title">Заказы</div></div>${orderTable()}`;
        } else if (page === "order") {
          const o = context || orders[0];
          const details = orderDetails[o[0]] || null;
          const linked = activations.find(a => a[1] === o[0]);
          const licenseOrder = linked || o[0] === "12540" || details?.type === "Активация лицензий";
          const advanceOrder = o[0] === "12480" || details?.type === "Авансовый платеж";
          const items = details?.items ? details.items.map((item, index) => [String(index + 1), esc(item.name), rub(item.price), String(item.qty), rub(item.price * item.qty)]) : advanceOrder
            ? [["1", "Авансовый платеж", "10 000 ₽", "1", "10 000 ₽"]]
            : licenseOrder
              ? [["1", "Сервис обновлений — aQsi 5Ф", "2 000 ₽", "1", "2 000 ₽"], ["2", "Расширенный функционал — aQsi 5Ф", "2 000 ₽", "1", "2 000 ₽"]]
              : [["1", "ПАК aQsi 5Ф", "24 500 ₽", "1", "24 500 ₽"]];
          html = `<div class="page-head"><div class="page-title">Заказ № ${esc(o[0])}</div></div>
            <div class="order-columns">
              <section class="order-block"><h3>Контакт</h3>
                <div class="order-field"><div class="label">Организация</div><div>${esc(details?.org || 'ООО "ЗОЛОТОЙ СТАНДАРТ"')}</div></div><div class="order-field"><div class="label">ФИО</div><div>${esc(details?.name || "Колесников В. В.")}</div></div><div class="order-field"><div class="label">Телефон</div><div>${esc(details?.phone || "+7 996 965-09-07")}</div></div><div class="order-field"><div class="label">E-mail</div><div><a href="mailto:${esc(details?.email || "aqaglobal+testzs@aqsi.ru")}">${esc(details?.email || "aqaglobal+testzs@aqsi.ru")}</a></div></div><div class="order-field"><div class="label">Комментарий</div><div>${esc(details?.comment || (licenseOrder ? `Активация № ${linked?.[0] || "421"}` : "—"))}</div></div>
              </section>
              <section class="order-block"><h3>Заказ</h3>
                <div class="order-field"><div class="label">Статус заказа</div><div>${esc(details?.status || "Отгружен")}</div></div>
                <div class="order-field"><div class="label">Тип заказа</div><div>${esc(details?.type || (advanceOrder ? "Авансовый платеж" : licenseOrder ? "Активация лицензий" : "Покупка товара"))}</div></div><div class="order-field"><div class="label">Статус оплаты</div><div>${esc(details?.payment || (licenseOrder ? "В ожидании" : "Оплачено"))}</div></div><div class="order-field"><div class="label">Дата заказа</div><div>${esc(details?.date || "06.08.2026")}</div></div><div class="order-field"><div class="label">Номер счёта</div><div>${esc(details?.invoice || (licenseOrder ? "ПГ-362" : o[1]))}</div></div><div class="order-field"><div class="label">Договор</div><div>${esc(details?.agreement || "Сублицензионный договор (Предоплата 100%) от 15.12.2025")}</div></div>
              </section>
            </div>
            <section class="mini-section"><h3>Вендор: ${esc(details?.vendor || (advanceOrder ? "Пи Джи Групп" : licenseOrder ? "Пэй Киоск" : "Пи Джи Групп"))}</h3>${plainTable(["№", "Наименование", "Цена", "Количество", "Сумма"], items, "order-items")}<div class="mini-total">Итого: ${details ? rub(details.total) : advanceOrder ? "10 000 ₽" : licenseOrder ? "4 000 ₽" : "24 500 ₽"}</div></section>
            ${linked ? `<section class="mini-section"><h3>Связанные лицензии</h3>${toolbar("order-linked-licenses", { search: false, org: false })}<div class="table-responsive"><table class="table table-sm"><thead><tr><th>№ активации</th><th>Статус активации</th><th>Вендор</th><th>Лицензий</th><th>Стоимость</th><th><span class="sr-only">Файл лицензий</span></th></tr></thead><tbody><tr data-go="activation-linked" data-index="0"><td>${esc(linked[0])}</td><td>${esc(linked[3])}</td><td>${esc(linked[4])}</td><td>${esc(linked[5])}</td><td>${esc(linked[6])}</td><td><button class="btn btn-ghost" type="button" aria-label="Скачать файл лицензий" data-download-license><i data-lucide="download" aria-hidden="true"></i></button></td></tr></tbody></table></div></section>` : ""}
            <section class="mini-section"><h3>Документы</h3><div class="documents"><button class="btn" type="button" data-doc-download="Счет на оплату.pdf"><i data-lucide="file-text" aria-hidden="true"></i>Счет на оплату.pdf</button>${advanceOrder ? "" : `<button class="btn" type="button" data-doc-download="Расходная накладная.pdf"><i data-lucide="file-text" aria-hidden="true"></i>Расходная накладная.pdf</button>`}</div><div class="text-small text-muted" data-doc-status aria-live="polite"></div></section>`;
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
            <div class="viz-row"><button class="btn" type="button" data-download-license><i data-lucide="download" aria-hidden="true"></i>Скачать файл лицензий</button><button class="btn" type="button" data-edit-activation-comment>${activationComment ? `Комментарий: ${esc(activationComment)}` : "Добавить комментарий"}</button></div>
            <section class="mini-section">${plainTable(["Серийный номер", "Тип лицензии", "Подписка", "Цена"], licenseRows, "activation-licenses")}</section>
            <dialog class="form-dialog" data-activation-comment-dialog><div class="dialog-head"><h2>${activationComment ? "Редактировать комментарий" : "Добавить комментарий"}</h2><button class="btn btn-ghost" type="button" aria-label="Закрыть" data-close-activation-comment><i data-lucide="x" aria-hidden="true"></i></button></div><label class="form-label">Комментарий<textarea class="form-control" rows="4" data-activation-comment-input>${esc(activationComment)}</textarea></label><div class="dialog-actions"><button class="btn btn-primary" type="button" data-save-activation-comment="${esc(a[0])}">Сохранить</button><button class="btn" type="button" data-close-activation-comment>Отмена</button></div></dialog>`;
        } else if (page === "activate-org") {
          html = `<div class="page-head"><div class="page-title">Выберите организацию</div></div><div class="viz-grid choice-grid">
            <button class="btn card org-choice" type="button" data-select-license-org='ООО "ЗОЛОТОЙ СТАНДАРТ"'><span class="org-choice-layout"><span class="org-choice-main"><span class="page-title">ООО "ЗОЛОТОЙ СТАНДАРТ"</span><span class="org-inn">7724827983</span></span><span class="org-choice-balance"><span class="label">Баланс</span><strong>${rub(balances['ООО "ЗОЛОТОЙ СТАНДАРТ"'] || 0)}</strong></span></span></button>
            <button class="btn card org-choice" type="button" data-select-license-org="ООО Бета"><span class="org-choice-layout"><span class="org-choice-main"><span class="page-title">ООО Бета</span><span class="org-inn">7812345678</span></span><span class="org-choice-balance"><span class="label">Баланс</span><strong>${rub(balances["ООО Бета"] || 0)}</strong></span></span></button>
          </div>`;
        } else if (page === "activate-offer") {
          html = `<div class="page-head"><div class="page-title">Оферта сублицензионного договора</div></div><div class="offer-copy"><div class="form-check"><input class="form-check-input" id="offer-accept" type="checkbox" data-offer-check><label class="form-check-label" for="offer-accept">Нажимая кнопку «Продолжить», вы подтверждаете, что ознакомлены и согласны с условиями <a href="https://aqsi.ru/lkp-oferta/" target="_blank" rel="noopener noreferrer"><strong>оферты сублицензионного договора</strong></a> в новой редакции</label></div></div><button class="btn btn-primary" type="button" data-offer-continue disabled>Продолжить</button>`;
        } else if (page === "activate") {
          activationPreviewVisible = false;
          const org = context || 'ООО "ЗОЛОТОЙ СТАНДАРТ"';
          selectedLicenseOrg = org;
          const currentBalance = balances[org] || 0;
          html = `<div class="page-head"><div class="page-title">Активация лицензий</div><button class="btn btn-primary" type="button" data-page="activations">Список активаций</button></div>
            <div class="activation-top panel"><div><span class="label">Организация:</span> <strong>${esc(org)}</strong></div><div class="balance-amount"><span><span class="label">Баланс:</span> <strong data-page-balance>${rub(currentBalance)}</strong></span><button class="btn special-action" type="button" data-top-up>Пополнить</button></div></div><div class="info-block"><p><strong>Активировать</strong> означает сгенерировать лицензию и купить. <strong>Заказ, Счет, УПД</strong> создаются автоматически в течение 15 минут и дублируются на почту.</p><p><strong>ВАЖНО!</strong> 18 августа 2026 года мы вводим балансовую систему для активации лицензий.<br>Оплачивать с баланса можно любой тип лицензии, пополнение баланса с помощью авансовых платежей. Оферта будет изменена в ЛКП.<br>Чтобы 18 августа сразу продолжить активации, внесите нужную сумму по авансовому счету, который мы отправим на вашу почту 12 августа.</p></div>
            <div class="serial-line"><label class="serial-field"><span class="sr-only">Серийный номер</span><input class="form-control" type="text" inputmode="numeric" maxlength="16" placeholder="Проверить серийный номер" data-serial-input></label><button class="btn btn-primary" type="button" aria-label="Проверить серийный номер" data-check-serial><i data-lucide="arrow-right" aria-hidden="true"></i></button><button class="btn" type="button" aria-label="Загрузить файл"><i data-lucide="file" aria-hidden="true"></i></button><button class="btn btn-ghost" type="button"><i data-lucide="download" aria-hidden="true"></i>Скачать пример файла</button></div><div class="notice" data-serial-notice aria-live="polite"></div>
            <div data-license-preview hidden>
              <section class="table-panel">${toolbar("activation-preview", { search: false, org: false })}<div data-license-table>${renderActivationPreviewTable()}</div></section>
            </div><div class="action-row actions-always"><div class="left-actions"><button class="btn action-outline" type="button" data-create-activation disabled>Активировать</button><button class="btn danger-outline" type="button" data-delete-activation disabled><i data-lucide="trash-2" aria-hidden="true"></i>Удалить</button></div></div>
            <dialog class="form-dialog" data-over180-dialog><div class="dialog-head"><h2>Внимание!</h2></div><p>Срок действия текущей лицензии для указанных ниже СН более 180 дней:</p><div class="table-responsive"><table class="table table-sm modal-table"><thead><tr><th>Серийный номер</th><th>Лицензия</th><th>Текущая подписка</th><th>Новая подписка</th></tr></thead><tbody data-over180-body></tbody></table></div><div class="dialog-info">Вы уверены, что хотите активировать подписку на эти серийные номера?</div><div class="dialog-actions"><button class="btn btn-primary" type="button" data-over180-ok>ОК</button><button class="btn action-outline" type="button" data-over180-cancel>Отмена</button></div></dialog>
            <dialog class="form-dialog" data-activation-confirm-dialog><div class="dialog-head"><h2>Новая активация</h2></div><div class="table-responsive"><table class="table table-sm modal-table"><thead><tr><th>№</th><th>Наименование номенклатуры</th><th>Цена</th><th>Количество</th><th>Сумма</th></tr></thead><tbody data-activation-confirm-body></tbody></table></div><div class="mini-total">Итого: <span data-activation-confirm-total>0 ₽</span></div><label class="form-label activation-comment">Комментарий<textarea class="form-control" rows="3" placeholder="Комментарий" data-new-activation-comment></textarea></label><div class="muted-note">Комментарий можно редактировать после активации лицензий</div><div class="dialog-info">Новый заказ будет создан сразу после успешной активации лицензий, обычно не более 15 минут. Данные по заказу будут отправлены на вашу почту.</div><div class="dialog-actions"><button class="btn btn-primary" type="button" data-confirm-activation>ОК</button><button class="btn action-outline" type="button" data-cancel-activation>Отмена</button></div></dialog>
            <dialog class="form-dialog" data-insufficient-dialog><div class="dialog-head"><h2>Недостаточно средств для активации</h2></div><p>Недостаточно средств на балансе организации для активации лицензий</p><p>Необходимо пополнить баланс на сумму: <strong data-deficit-amount>0 ₽</strong></p><p><strong>Хотите пополнить сейчас?</strong></p><div class="dialog-actions"><button class="btn special-action" type="button" data-insufficient-topup>Пополнить</button><button class="btn action-outline" type="button" data-insufficient-cancel>Отмена</button></div></dialog>
            <dialog class="form-dialog" data-balance-dialog><div class="dialog-head"><h2>Пополнение баланса</h2><button class="btn btn-ghost" type="button" aria-label="Закрыть" data-close-balance><i data-lucide="x" aria-hidden="true"></i></button></div><p>Укажите сумму пополнения</p><h3>Организация: ${esc(org)}</h3><div class="balance-grid"><div class="panel"><div class="label">Текущий баланс</div><h3 data-current-balance>${rub(currentBalance)}</h3></div><div class="panel"><div class="label">Баланс после пополнения</div><h3 data-balance-after>${rub(currentBalance)}</h3></div></div><label class="form-label">Сумма пополнения<input class="form-control" type="number" min="1" max="10000000" placeholder="Сумма пополнения ₽ (до 10 000 000 ₽)" data-top-up-amount></label><p class="muted-note">Для пополнения баланса на указанную сумму будет сформирован заказ в личном кабинете.</p><div class="dialog-actions"><button class="btn btn-primary" type="button" data-create-top-up disabled>Сформировать заказ</button><button class="btn" type="button" data-close-balance>Отмена</button></div></dialog>`;
        } else if (page === "catalog") {
          html = `<div class="page-head"><div class="page-title">Каталог</div><button class="btn catalog-cart ${cart.length ? "btn-primary" : ""}" type="button" data-open-cart ${cart.length ? "" : "disabled"}><i data-lucide="shopping-cart" aria-hidden="true"></i>Корзина <span data-cart-count>${cart.reduce((sum, item) => sum + item.qty, 0)}</span></button></div><div id="catalog-table">${catalogTable()}</div><div class="notice" data-catalog-notice aria-live="polite"></div><dialog class="confirm-dialog" data-remove-dialog><div class="page-title">Удаление товара</div><div class="notice">Вы уверены, что хотите удалить товар из корзины?</div><div class="confirm-actions"><button class="btn" type="button" data-remove-cancel>Отмена</button><button class="btn btn-primary" type="button" data-remove-confirm>Удалить</button></div></dialog><dialog class="confirm-dialog" data-org-required-dialog><div class="page-title">Организация не выбрана</div><div class="notice">Для добавления товара в корзину необходимо выбрать организацию</div><div class="confirm-actions"><button class="btn btn-primary" type="button" data-org-required-ok>ОК</button></div></dialog>`;
        } else if (page === "cart") {
          html = renderCart();
        } else if (page === "cart-result") {
          html = renderCartResult(context);
        }
        if (page !== "login") html = breadcrumbs(page) + html;
        content.innerHTML = html;
        bindContent();
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
            content.querySelector("#catalog-table").innerHTML = catalogTable(select.value, group ? group.value : "");
            bindContent();
          } else applyTableFilter(select.dataset.tableOrg);
        }));
        content.querySelectorAll("[data-table-payment]").forEach(select => select.addEventListener("change", () => applyTableFilter(select.dataset.tablePayment)));
        content.querySelectorAll("[data-search-toggle]").forEach(check => check.addEventListener("change", () => {
          const wrap = content.querySelector(`[data-toolbar="${check.dataset.searchToggle}"] [data-search-wrap]`);
          if (wrap) wrap.hidden = !check.checked;
        }));
      }

      function bindCatalog() {
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
          const item = cart.find(i => i.key === button.dataset.cartMinus);
          if (!item) return;
          item.qty = Math.max(1, item.qty - 1);
          saveState();
          render("cart");
        }));
        content.querySelectorAll("[data-cart-plus]").forEach(button => button.addEventListener("click", () => {
          const item = cart.find(i => i.key === button.dataset.cartPlus);
          if (!item) return;
          item.qty = Math.min(500, item.qty + 1);
          saveState();
          render("cart");
        }));
        content.querySelectorAll("[data-cart-input]").forEach(input => input.addEventListener("change", () => {
          const item = cart.find(i => i.key === input.dataset.cartInput);
          if (!item) return;
          item.qty = Math.max(1, Math.min(500, Number.parseInt(input.value, 10) || 1));
          saveState();
          render("cart");
        }));
        content.querySelectorAll("[data-comment-toggle]").forEach(check => check.addEventListener("change", () => {
          const box = content.querySelector(`[data-comment-box="${check.dataset.commentToggle}"]`);
          if (box) box.hidden = !check.checked;
        }));
        const checkout = content.querySelector("[data-checkout]");
        if (checkout) checkout.addEventListener("click", () => { const result = createCartOrders(); if (result) render("cart-result", result); });
      }

      function bindLicenseCheckboxes() {
        const tableArea = content.querySelector("[data-license-table]");
        if (!tableArea) return;
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
          refresh();
        }));
        tableArea.querySelectorAll("[data-license-row]").forEach(check => check.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          const device = activationDevices[Number(check.dataset.licenseRow)];
          if (device) {
            const available = licenseKeys.map(key => device.licenses[key]).filter(license => license.available);
            const shouldSelect = !available.every(license => license.selected);
            available.forEach(license => { license.selected = shouldSelect; });
          }
          refresh();
        }));
        tableArea.querySelectorAll("[data-license-column]").forEach(check => check.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          const key = check.dataset.licenseColumn;
          const available = activationDevices.map(device => device.licenses[key]).filter(license => license.available);
          const shouldSelect = !available.every(license => license.selected);
          available.forEach(license => { license.selected = shouldSelect; });
          refresh();
        }));
        const all = tableArea.querySelector("[data-license-all]");
        if (all) all.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          const shouldSelect = !allAvailableSelected();
          activationDevices.forEach(device => licenseKeys.forEach(key => { if (device.licenses[key].available) device.licenses[key].selected = shouldSelect; }));
          refresh();
        });
      }
      function updateActivationActions() { const activateButton = content.querySelector("[data-create-activation]"); const deleteButton = content.querySelector("[data-delete-activation]"); if (activateButton) activateButton.disabled = !activationPreviewVisible || activationTotal() <= 0; if (deleteButton) deleteButton.disabled = !activationPreviewVisible; }

      function updateCartControls() {
        root.querySelectorAll("[data-cart-menu]").forEach(button => { button.disabled = cart.length === 0; });
        const button = content.querySelector("[data-open-cart]");
        if (button) {
          button.disabled = cart.length === 0;
          button.classList.toggle("btn-primary", cart.length > 0);
          const count = button.querySelector("[data-cart-count]");
          if (count) count.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
        }
      }

      function bindContent() {
        content.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => { const tab = button.dataset.openTab; render(button.dataset.page); if (tab) { const tabButton = content.querySelector(`[data-tab="${tab}"]`); if (tabButton) tabButton.click(); } }));
        content.querySelectorAll("[data-download-license]").forEach(button => button.addEventListener("click", event => {
          event.stopPropagation();
        }));
        content.querySelectorAll("tr[data-go]").forEach(row => row.addEventListener("click", () => {
          const idx = Number(row.dataset.index || 0);
          if (row.dataset.go === "organization") render("organization", idx);
          if (row.dataset.go === "contact") render("contact", idx);
          if (row.dataset.go === "order") render("order", orders.find(o => o[0] === row.dataset.orderNumber) || orders[idx]);
          if (row.dataset.go === "activation") render("activation", activations[idx]);
          if (row.dataset.go === "activation-linked") render("activation", activations.find(a => a[0] === row.cells[0].textContent) || activations[0]);
        }));
        const tabs = content.querySelectorAll("[data-tab]");
        tabs.forEach(button => button.addEventListener("click", () => {
          tabs.forEach(x => x.classList.remove("btn-primary"));
          button.classList.add("btn-primary");
          const area = content.querySelector("#profile-tab");
          if (button.dataset.tab === "orgs") area.innerHTML = organizationTable();
          else area.innerHTML = `<div class="page-head"><span></span><button class="btn btn-primary" data-add-contact>Добавить контакт</button></div>${contactTable()}`;
          bindContent();
        }));
        const addContact = content.querySelector("[data-add-contact]"); const contactDialog = content.querySelector("[data-contact-dialog]"); if (addContact && contactDialog) addContact.addEventListener("click", () => { if (typeof contactDialog.showModal === "function") contactDialog.showModal(); else contactDialog.setAttribute("open", ""); }); content.querySelectorAll("[data-close-contact]").forEach(button => button.addEventListener("click", () => { if (!contactDialog) return; if (typeof contactDialog.close === "function") contactDialog.close(); else contactDialog.removeAttribute("open"); })); const contactForm = content.querySelector("[data-contact-form]"); if (contactForm && contactDialog) contactForm.addEventListener("submit", event => { event.preventDefault(); if (typeof contactDialog.close === "function") contactDialog.close(); else contactDialog.removeAttribute("open"); });
        content.querySelectorAll("[data-order-number]").forEach(orderButton => orderButton.addEventListener("click", event => { event.preventDefault(); render("order", orders.find(o => o[0] === orderButton.dataset.orderNumber) || orders[0]); }));
        const editActivationComment = content.querySelector("[data-edit-activation-comment]");
        const activationCommentDialog = content.querySelector("[data-activation-comment-dialog]");
        if (editActivationComment) editActivationComment.addEventListener("click", () => openDialog(activationCommentDialog));
        content.querySelectorAll("[data-close-activation-comment]").forEach(button => button.addEventListener("click", () => closeDialog(activationCommentDialog)));
        const saveActivationComment = content.querySelector("[data-save-activation-comment]");
        if (saveActivationComment) saveActivationComment.addEventListener("click", () => {
          const activationNumber = saveActivationComment.dataset.saveActivationComment;
          const activation = activations.find(item => item[0] === activationNumber);
          const details = activationDetails[activationNumber] || (activationDetails[activationNumber] = {});
          const input = content.querySelector("[data-activation-comment-input]");
          const value = input ? input.value.trim() : "";
          details.comment = value; if (activation) activation[9] = value || "—"; saveState(); if (activation) render("activation", activation);
        });
        const updateActivationStatus = content.querySelector("[data-update-activation-status]");
        if (updateActivationStatus) updateActivationStatus.addEventListener("click", () => { const activation = completeActivation(updateActivationStatus.dataset.updateActivationStatus); if (activation) render("activation", activation); });
        content.querySelectorAll("[data-select-license-org]").forEach(button => button.addEventListener("click", () => {
          selectedLicenseOrg = button.dataset.selectLicenseOrg;
          render("activate-offer");
        }));
        const offerCheck = content.querySelector("[data-offer-check]");
        const offerContinue = content.querySelector("[data-offer-continue]");
        if (offerCheck && offerContinue) {
          offerCheck.addEventListener("change", () => { offerContinue.disabled = !offerCheck.checked; });
          offerContinue.addEventListener("click", () => { if (offerCheck.checked) render("activate", selectedLicenseOrg); });
        }
        const checkSerial = content.querySelector("[data-check-serial]");
        if (checkSerial) checkSerial.addEventListener("click", () => {
          const input = content.querySelector("[data-serial-input]");
          const preview = content.querySelector("[data-license-preview]");
          const notice = content.querySelector("[data-serial-notice]");
          const valid = input && /^\d{16}$/.test(input.value.trim());
          if (!valid) {
            if (notice) notice.textContent = "Серийный номер должен содержать 16 цифр";
            if (preview) preview.hidden = true;
            return;
          }
          if (input && preview) {
            if (notice) notice.textContent = "";
            lastCheckedSerial = input.value.trim();
            activationDevices[0].serial = lastCheckedSerial;
            activationDevices.forEach(device => licenseKeys.forEach(key => { device.licenses[key].selected = false; }));
            preview.hidden = false;
            activationPreviewVisible = true;
            const tableArea = content.querySelector("[data-license-table]");
            if (tableArea) tableArea.innerHTML = renderActivationPreviewTable();
            bindLicenseCheckboxes();
            updateActivationActions();
            if (window.lucide) window.lucide.createIcons({ attrs: { width: 16, height: 16 } });
          }
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
          const blob = new Blob(["Демонстрационный PDF-документ цифровой копии ЛКП"], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = button.dataset.docDownload;
          link.click();
          URL.revokeObjectURL(url);
          if (status) status.textContent = `Скачивание: ${button.dataset.docDownload}`;
        }));
        const login = content.querySelector("[data-login]");
        const loginConsent = content.querySelector("[data-login-consent]");
        const loginFields = [...content.querySelectorAll("[data-login-field]")];
        const updateLogin = () => {
          if (login) login.disabled = !(loginConsent && loginConsent.checked && loginFields.every(field => field.value.trim()));
        };
        if (loginConsent) loginConsent.addEventListener("change", updateLogin);
        loginFields.forEach(field => field.addEventListener("input", updateLogin));
        if (login) login.addEventListener("click", () => { if (!login.disabled) render("profile"); });
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
          const total = activationTotal(); pendingActivationComment = content.querySelector("[data-new-activation-comment]")?.value.trim() || ""; const deficit = Math.max(0, total - (balances[selectedLicenseOrg] || 0));
          if (lastCheckedSerial !== "0000000000000000" && deficit > 0) { pendingActivationDeficit = deficit; const deficitNode = content.querySelector("[data-deficit-amount]"); if (deficitNode) deficitNode.textContent = rub(deficit); closeDialog(activationConfirmDialog); openDialog(insufficientDialog); return; }
          const activation = createActivationRecord(pendingActivationComment);
          if (activation) { pendingActivationComment = ""; activationDevices.forEach(device => licenseKeys.forEach(key => { device.licenses[key].selected = false; })); closeDialog(activationConfirmDialog); render("activation", activation); }
        });
        const insufficientCancel = content.querySelector("[data-insufficient-cancel]"); if (insufficientCancel) insufficientCancel.addEventListener("click", () => { pendingActivationDeficit = 0; closeDialog(insufficientDialog); });
        const topUpAmount = content.querySelector("[data-top-up-amount]");
        const updateTopUpPreview = () => { if (!topUpAmount) return; const amount = Math.max(0, Math.min(10000000, Number.parseInt(topUpAmount.value, 10) || 0)); if (topUpAmount.value && Number(topUpAmount.value) > 10000000) topUpAmount.value = "10000000"; const after = content.querySelector("[data-balance-after]"); if (after) after.textContent = rub((balances[selectedLicenseOrg] || 0) + amount); const create = content.querySelector("[data-create-top-up]"); if (create) create.disabled = amount <= 0; };
        const insufficientTopUp = content.querySelector("[data-insufficient-topup]"); if (insufficientTopUp) insufficientTopUp.addEventListener("click", () => { closeDialog(insufficientDialog); if (topUpAmount) topUpAmount.value = String(pendingActivationDeficit); updateTopUpPreview(); openDialog(balanceDialog); });
        const deleteActivation = content.querySelector("[data-delete-activation]"); if (deleteActivation) deleteActivation.addEventListener("click", () => { activationDevices.forEach(device => licenseKeys.forEach(key => { device.licenses[key].selected = false; })); updateActivationActions(); const tableArea = content.querySelector("[data-license-table]"); if (tableArea) tableArea.innerHTML = renderActivationPreviewTable(); bindLicenseCheckboxes(); });
        const topUp = content.querySelector("[data-top-up]"); if (topUp) topUp.addEventListener("click", () => { pendingActivationDeficit = 0; if (topUpAmount) topUpAmount.value = ""; updateTopUpPreview(); openDialog(balanceDialog); });
        content.querySelectorAll("[data-close-balance]").forEach(button => button.addEventListener("click", () => closeDialog(balanceDialog)));
        if (topUpAmount) topUpAmount.addEventListener("input", updateTopUpPreview);
        const createTopUp = content.querySelector("[data-create-top-up]");
        if (createTopUp) createTopUp.addEventListener("click", () => {
          const amount = Math.max(1, Math.min(10000000, Number.parseInt(topUpAmount?.value, 10) || 0)); createAdvanceOrder(amount); closeDialog(balanceDialog); const current = balances[selectedLicenseOrg] || 0;
          const pageBalance = content.querySelector("[data-page-balance]"); const currentBalance = content.querySelector("[data-current-balance]"); const after = content.querySelector("[data-balance-after]"); if (pageBalance) pageBalance.textContent = rub(current); if (currentBalance) currentBalance.textContent = rub(current); if (after) after.textContent = rub(current);
          if (pendingActivationDeficit > 0) { pendingActivationDeficit = 0; openActivationConfirmation(); const comment = content.querySelector("[data-new-activation-comment]"); if (comment) comment.value = pendingActivationComment; }
        });
        bindToolbar();
        bindCatalog();
        bindCart();
        bindLicenseCheckboxes();
        updateActivationActions();
        if (window.lucide) window.lucide.createIcons({ attrs: { width: 16, height: 16 } });
      }

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
      if (logout) logout.addEventListener("click", () => render("login"));
      const mobileMenu = root.querySelector("[data-mobile-menu]");
      if (mobileMenu) mobileMenu.addEventListener("click", () => {
        const open = side.classList.toggle("mobile-open");
        mobileMenu.setAttribute("aria-expanded", String(open));
        mobileMenu.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
        if (window.lucide) window.lucide.createIcons({ attrs: { width: 16, height: 16 } });
      });
      render("catalog");
