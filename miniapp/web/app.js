/* ─────────────────────────────────────────────────────────────
   JOWS mini app — клиентская логика.
   Всё состояние держим в одном объекте, экраны перерисовываем целиком:
   приложение маленькое, так проще, чем городить реактивность.
   ───────────────────────────────────────────────────────────── */

const tg = window.Telegram && window.Telegram.WebApp;

const state = {
  data: null,        // ответ /api/bootstrap
  view: 'tasks',     // tasks | task | top | profile | payout | payout_confirm
  tab: 'tasks',
  openTaskId: null,  // раскрытая карточка в ленте
  task: null,        // задание на экране выполнения
  draft: { template: null, text: '', rating: 0 },
  payout: { method: null, digits: '', error: '', preview: null },
  payoutGate: null,  // экран «Подтвердите подписку» перед выводом
  top: null,
  profile: null,
};

const screenEl = document.getElementById('screen');
const tabbarEl = document.getElementById('tabbar');
const overlayEl = document.getElementById('overlay');

/* ---------- утилиты ---------- */

const money = (value) => {
  const num = Math.round((Number(value) || 0) * 100) / 100;
  const int = Math.trunc(num);
  const rest = Math.abs(num - int);
  const body = int.toLocaleString('ru-RU');
  return rest ? `${body},${String(Math.round(rest * 100)).padStart(2, '0')}` : body;
};

/** Сумма с неразрывным пробелом перед знаком рубля. */
const rub = (value) => `${money(value)}\u00A0₽`;

const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const plural = (n, one, few, many) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
};

const haptic = (type = 'light') => {
  try {
    if (!tg || !tg.HapticFeedback) return;
    if (['success', 'error', 'warning'].includes(type)) {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  } catch (_) { /* haptics не критичны */ }
};

let toastTimer = null;
function toast(text) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = text;
  document.body.appendChild(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.remove(), 3000);
}

/* ---------- сеть ---------- */

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': (tg && tg.initData) || '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try { payload = await response.json(); } catch (_) { payload = null; }

  if (!response.ok) {
    const message = (payload && payload.error)
      || (response.status === 401
        ? 'Откройте приложение через Telegram.'
        : 'Что-то пошло не так. Попробуйте ещё раз.');
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

/* ---------- модалки ---------- */

function showOverlay(html, extraClass = '') {
  overlayEl.innerHTML = `<div class="modal ${extraClass}">${html}</div>`;
  overlayEl.hidden = false;
}

function hideOverlay() {
  overlayEl.hidden = true;
  overlayEl.innerHTML = '';
}

function showLoader(title, subtitle = '') {
  showOverlay(`
    <div class="boot__spinner"></div>
    <h3>${esc(title)}</h3>
    ${subtitle ? `<p style="margin-bottom:0">${esc(subtitle)}</p>` : ''}
  `);
}

const CHECK_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 12.5 9.5 18 20 6.5"/>
  </svg>`;

function showSuccess(title, text, buttonText, action) {
  showOverlay(`
    <div class="check-icon">${CHECK_SVG}</div>
    <h3>${esc(title)}</h3>
    <p>${esc(text)}</p>
    <button class="btn" data-action="${action}">${esc(buttonText)}</button>
  `);
}

/** Салют на успешном экране. Сам себя убирает через 3.5 секунды. */
function launchConfetti() {
  const colors = ['#6c4df6', '#a259f7', '#00a87e', '#f5a524', '#e5484d', '#3ba0ff'];
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < 46; i += 1) {
    const piece = document.createElement('i');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = `${2 + Math.random() * 1.6}s`;
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    box.appendChild(piece);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3500);
}

/** Аватар: фото из Telegram, эмодзи из настроек или первая буква имени. */
function avatarHtml(person, cls = 'rank__ava') {
  if (person.photo) return `<img class="${cls}" src="${esc(person.photo)}" alt="">`;
  const face = person.avatar
    || esc((person.name || '?').trim().slice(0, 1).toUpperCase());
  return `<div class="${cls}">${face}</div>`;
}

/* ---------- шапка ---------- */

function topbar({ back = false } = {}) {
  const brand = state.data.brand;
  const user = state.data.user;
  // Всё прижато влево: кнопка «назад», логотип, название, баланс.
  return `
    <header class="topbar">
      ${back ? `
        <button class="back-btn" data-action="back" aria-label="Назад">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 5l-7 7 7 7"/>
          </svg>
        </button>` : ''}
      <div class="logo">${esc(brand.name.slice(0, 1))}</div>
      <div class="brand">
        <div class="brand__name">${esc(brand.name)}</div>
        <div class="brand__tag">${esc(brand.tagline)}</div>
      </div>
      ${back ? '' : `
        <div class="balance">
          <span class="balance__label">баланс</span>
          <span class="balance__value">${rub(user.balance)}</span>
        </div>`}
      <div class="topbar__spacer"></div>
    </header>`;
}

/* ---------- экран: проверка подписки ---------- */

function viewGate() {
  const sponsors = state.data.gate.sponsors.map((sponsor, index) => `
    <a class="sponsor" href="${esc(sponsor.url)}" target="_blank" rel="noopener">
      <div class="sponsor__icon">${index + 1}</div>
      <div>
        <div class="sponsor__title">${esc(sponsor.title)}</div>
        ${sponsor.subtitle ? `<div class="channel__sub">${esc(sponsor.subtitle)}</div>` : ''}
      </div>
      <div class="sponsor__state">подписаться</div>
    </a>`).join('');

  return `
    ${topbar()}
    <section class="gate">
      <div class="gate__lock">🔒</div>
      <h2>Ещё один шаг</h2>
      <p>Платформа работает при поддержке партнёров.<br>
         Подпишитесь на каналы ниже — и задания откроются.</p>
      ${sponsors}
      <button class="btn" data-action="check-gate" style="margin-top:16px">
        Я подписался
      </button>
    </section>`;
}

/* ---------- экран: лента заданий ---------- */

function taskCard(task) {
  const open = state.openTaskId === task.id && !task.done;
  return `
    <article class="task ${open ? 'is-open' : ''} ${task.done ? 'is-done' : ''}"
             data-task="${task.id}">
      <div class="task__head" data-action="toggle-task" data-id="${task.id}">
        <div class="task__emoji">${esc(task.emoji)}</div>
        <div class="task__body">
          <div class="task__title">${esc(task.title)}</div>
          <div class="task__meta">
            <span>🕒</span><span>до ${esc(task.deadline)}</span>
          </div>
        </div>
        <div class="reward ${task.done ? 'is-done' : ''}">
          ${task.done ? 'Сдано' : `+${rub(task.reward)}`}
        </div>
      </div>
      ${open ? `
        <div class="task__drop">
          <p class="section-label">Условия задания</p>
          <h4>${esc(task.title)}</h4>
          <p>${esc(task.short || task.brief)}</p>
          <button class="btn" data-action="open-task" data-id="${task.id}">
            Начать выполнение
          </button>
        </div>` : ''}
    </article>`;
}

function viewTasks() {
  const { stats, tasks, done_count: doneCount, day } = state.data;
  const left = tasks.length - doneCount;

  const segments = tasks.length
    ? tasks.map((task) => `<div class="progress__seg ${task.done ? 'is-done' : ''}"></div>`).join('')
    : '<div class="progress__seg"></div>';

  return `
    ${topbar()}
    <section class="hero">
      <h1>Выполняй задания.<br><span class="accent">Получай рубли.</span></h1>
      <p>В сервисе собраны задачи от компаний, которым нужна честная обратная
         связь по товарам, услугам и клиентскому опыту.</p>
    </section>

    <section class="stats">
      <div class="stat" style="--accent:var(--brand)">
        <div class="stat__label">участников</div>
        <div class="stat__value">${stats.participants.toLocaleString('ru-RU')}</div>
      </div>
      <div class="stat" style="--accent:var(--mint)">
        <div class="stat__label">за отзыв</div>
        <div class="stat__value">от ${rub(stats.min_reward)}</div>
      </div>
      <div class="stat" style="--accent:var(--amber)">
        <div class="stat__label">заданий</div>
        <div class="stat__value">${stats.tasks_today}</div>
      </div>
    </section>

    <section class="card">
      <h2 class="card__title">Задания на ${esc(day)}</h2>
      <div class="progress">
        <div class="progress__row">
          <span class="progress__done">Выполнено ${doneCount} из ${tasks.length}</span>
          <span class="progress__left">${left > 0 ? `Осталось ${left}` : 'Всё готово 🎉'}</span>
        </div>
        <div class="progress__bar">${segments}</div>
      </div>
      ${tasks.length
        ? tasks.map(taskCard).join('')
        : '<p class="empty">Сегодня заданий нет.<br>Загляните завтра — лента обновляется каждый день.</p>'}
    </section>`;
}

/* ---------- экран: выполнение задания ---------- */

function starSvg() {
  // Цвет задаётся классом .is-on, поэтому заливка всегда currentColor.
  return `<svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.7l6.1-.9z"/>
          </svg>`;
}

function viewTask() {
  const task = state.task;
  const { draft } = state;
  const left = Math.max(0, task.min_chars - draft.text.trim().length);
  const ratingOk = !task.require_rating || draft.rating === 5;
  const ready = left === 0 && ratingOk;

  const templates = task.templates.map((text, index) => `
    <div class="option ${draft.template === index ? 'is-active' : ''}"
         data-action="pick-template" data-index="${index}">
      <div style="flex:1">${esc(text)}</div>
      <div class="option__mark"></div>
    </div>`).join('');

  return `
    ${topbar({ back: true })}

    <section class="task-hero">
      <div class="task__emoji">${esc(task.emoji)}</div>
      <div class="task__body">
        <div class="task__title">${esc(task.title)}</div>
        <div class="task__meta">
          <span>Отзыв от ${task.min_chars} ${plural(task.min_chars, 'символа', 'символов', 'символов')} • до ${esc(task.deadline)}</span>
        </div>
      </div>
      <div class="reward">+${rub(task.reward)}</div>
    </section>

    <section class="card">
      <p class="section-label">Условия задания</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.5">${esc(task.brief)}</p>

      ${task.templates.length ? `
        <p class="section-label">Выберите один шаблон</p>
        ${templates}` : ''}

      <p class="section-label" style="margin-top:16px">Или напишите свой отзыв</p>
      <textarea id="answer" placeholder="Свой отзыв…"
                maxlength="1000">${esc(draft.text)}</textarea>
      <div class="counter">
        <span class="counter__left ${left === 0 ? 'is-ok' : ''}">
          ${left === 0 ? 'Длина в порядке' : `Осталось: ${left} ${plural(left, 'символ', 'символа', 'символов')}`}
        </span>
        <span style="text-align:right">Можно выбрать шаблон<br>или написать свой отзыв</span>
      </div>

      ${task.require_rating ? `
        <div class="rating-card">
          <div class="rating-card__top">
            <p class="section-label" style="margin:0">Оценка</p>
            <span class="pill-required">Обязательно</span>
          </div>
          <h4>Выберите 5 звёзд</h4>
          <p>Для выполнения задания необходимо поставить максимальную оценку.</p>
          <div class="stars">
            ${[1, 2, 3, 4, 5].map((value) => `
              <button class="star ${draft.rating >= value ? 'is-on' : ''}"
                      data-action="rate" data-value="${value}">
                ${starSvg()}
              </button>`).join('')}
          </div>
        </div>` : ''}

      <p class="hint">Ответ уйдёт заказчику задания.<br>
         Проверьте текст${task.require_rating ? ' и оценку' : ''} перед отправкой.</p>

      <button class="btn" data-action="submit" ${ready ? '' : 'disabled'}>
        Опубликовать
      </button>
    </section>`;
}

/* ---------- экран: рейтинг ---------- */

function rankRow(row, extraClass = '') {
  const avatar = avatarHtml(row);
  return `
    <div class="rank ${extraClass}">
      <div class="rank__place">${row.place.toLocaleString('ru-RU')}</div>
      ${avatar}
      <div class="rank__name">${esc(row.name)}</div>
      <div class="rank__sum">${rub(row.total)}</div>
    </div>`;
}

function viewTop() {
  if (!state.top) return `${topbar()}<div class="boot"><div class="boot__spinner"></div></div>`;

  const { me, participants } = state.top;
  const rows = state.top.items.map((row) => rankRow(
    row,
    `${row.place <= 3 ? `is-top${row.place}` : ''} ${row.is_me ? 'is-me' : ''}`,
  )).join('');

  return `
    ${topbar()}
    <section class="hero">
      <h1>Рейтинг</h1>
      <p>Места распределяются по общей сумме заработка за всё время.</p>
    </section>

    ${me && !me.in_list ? `
      <section class="card my-place">
        <p class="section-label">Твоё место</p>
        ${rankRow(me, 'is-me')}
        <p class="my-place__note">
          ${me.place.toLocaleString('ru-RU')} место из
          ${participants.toLocaleString('ru-RU')} участников.
          Выполняй задания — поднимешься выше.
        </p>
      </section>` : ''}

    <section class="card">
      <p class="section-label">Топ участников</p>
      ${rows || '<p class="empty">Пока никто не заработал.<br>Станьте первым 🙂</p>'}
    </section>`;
}

/* ---------- экран: профиль ---------- */

function viewProfile() {
  if (!state.profile) return `${topbar()}<div class="boot"><div class="boot__spinner"></div></div>`;

  const { user, done_count: doneCount, history, payouts,
          min_withdraw: minWithdraw } = state.profile;
  const avatar = avatarHtml(user);
  const canWithdraw = user.balance >= minWithdraw;

  const cardIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <rect x="2.5" y="5" width="19" height="14" rx="3.5"/><path d="M2.5 10h19"/>
    </svg>`;

  const payoutCards = payouts.map((item, index) => `
    <div class="payout-card" data-action="payout-details" data-index="${index}">
      <div class="payout-card__body">
        <div class="payout-card__date">${esc(item.date)}</div>
        <div class="payout-card__meta">${esc(item.method_title)} ${esc(item.masked)}</div>
        <span class="badge badge--${esc(item.status)}">${esc(item.status_title)}</span>
      </div>
      <div class="payout-card__sum">${rub(item.amount)}</div>
    </div>`).join('');

  const operations = history.map((op) => {
    const status = op.status === 'pending' ? ' • на проверке'
      : op.status === 'rejected' ? ' • отклонено' : '';
    return `
      <div class="op">
        <div class="op__emoji">${esc(op.emoji)}</div>
        <div class="op__body">
          <div class="op__title">${esc(op.title)}</div>
          <div class="op__date">${esc(op.date)}${status}</div>
        </div>
        <div class="op__sum plus">+${rub(op.amount)}</div>
      </div>`;
  }).join('');

  return `
    ${topbar()}

    <section class="profile-hero">
      ${avatar}
      <div class="profile-hero__name">${esc(user.name)}</div>
      <div class="profile-hero__role">исполнитель ${esc(state.data.brand.name)}</div>
    </section>

    <section class="tiles">
      <div class="tile tile--accent">
        <div class="tile__label">доступно</div>
        <div class="tile__value">${rub(user.balance)}</div>
      </div>
      <div class="tile">
        <div class="tile__label">заработано всего</div>
        <div class="tile__value">${rub(user.total_earned)}</div>
      </div>
      <div class="tile">
        <div class="tile__label">заданий</div>
        <div class="tile__value">${doneCount}</div>
      </div>
    </section>

    <button class="btn btn--wide" data-action="payout" ${canWithdraw ? '' : 'disabled'}>
      ${cardIcon}
      ${canWithdraw ? 'Вывести средства'
        : (user.balance > 0 ? `Вывод от ${rub(minWithdraw)}` : 'Нет средств для вывода')}
    </button>

    <section class="card">
      <h2 class="card__title">История вывода</h2>
      ${payouts.length ? `
        <p class="muted-note">Нажмите на заявку, чтобы посмотреть детали</p>
        ${payouts.some((item) => item.status === 'pending') ? `
          <div class="warn-strip">
            ⚠️ Заявка в обработке — не отписывайтесь от каналов,
            иначе платёж не будет отправлен.
          </div>` : ''}
        ${payoutCards}`
        : '<p class="empty">Заявок пока не было.<br>Накопите баланс и выведите средства.</p>'}
    </section>

    <section class="card">
      <h2 class="card__title">История заданий</h2>
      ${operations || '<p class="empty">Выполните первое задание — оно появится здесь.</p>'}
    </section>`;
}

/* ---------- экран: подтверждение подписки перед выводом ---------- */

function viewPayoutGate() {
  const gate = state.payoutGate || { sponsors: [] };
  const channels = gate.sponsors.map((sponsor, index) => `
    <a class="channel" href="${esc(sponsor.url)}" target="_blank" rel="noopener">
      <div class="channel__body">
        <div class="channel__title">${esc(sponsor.title)}</div>
        ${sponsor.subtitle ? `<div class="channel__sub">${esc(sponsor.subtitle)}</div>` : ''}
      </div>
      <div class="channel__num">${index + 1}</div>
    </a>`).join('');

  return `
    ${topbar({ back: true })}

    <section class="hero">
      <h1>Подтвердите подписку</h1>
    </section>

    <div class="gate-note">
      <div class="gate-note__mark">✓</div>
      <div>
        <div class="gate-note__title">Для подтверждения вывода</div>
        <div class="gate-note__text">
          Откройте каждый канал, подпишитесь и после этого нажмите
          «Проверить подписку».
        </div>
      </div>
    </div>

    <div class="gate-note gate-note--warn">
      <div class="gate-note__mark">!</div>
      <div>
        <div class="gate-note__title">Не отписывайтесь до выплаты</div>
        <div class="gate-note__text">
          Подписка проверяется ещё раз перед отправкой денег. Если отписаться
          раньше, заявка будет отклонена, а платёж не отправлен.
        </div>
      </div>
    </div>

    <section class="card">
      <div class="channels__head">
        <h2>Каналы партнёров</h2>
        <span class="channels__count">${gate.sponsors.length} шт.</span>
      </div>
      ${channels || '<p class="empty">Список каналов пуст.</p>'}
    </section>

    <div class="sticky-cta">
      <button class="btn" data-action="check-payout-gate">Проверить подписку</button>
    </div>`;
}

/* ---------- экран: вывод средств ---------- */

const METHODS = [
  { id: 'sbp', title: 'СБП', icon: '🏦' },
  { id: 'card_ru', title: 'Карта РФ', icon: '💳' },
  { id: 'card_foreign', title: 'Иностранная карта', icon: '🌍' },
];

function formatRequisites(method, digits) {
  if (method === 'sbp') {
    const rest = digits.slice(1);
    const parts = [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6, 8), rest.slice(8, 10)];
    return ('+7 ' + parts.filter(Boolean).join(' ')).trim();
  }
  return (digits.match(/.{1,4}/g) || []).join(' ');
}

function normalizeDigits(method, raw) {
  let digits = raw.replace(/\D/g, '');
  if (method === 'sbp') {
    if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    if (!digits.startsWith('7')) digits = '7' + digits;
    return digits.slice(0, 11);
  }
  return digits.slice(0, method === 'card_ru' ? 16 : 19);
}

function requisitesReady(method, digits) {
  if (method === 'sbp') return digits.length === 11;
  if (method === 'card_ru') return digits.length === 16;
  return digits.length >= 13;
}

function viewPayout() {
  const { method, digits, error } = state.payout;
  const balance = state.data.user.balance;

  const tiles = METHODS.map((item) => `
    <div class="method ${method === item.id ? 'is-active' : ''}"
         data-action="pick-method" data-id="${item.id}">
      <div class="method__icon">${item.icon}</div>
      <div class="method__title">${esc(item.title)}</div>
      <div class="method__mark"></div>
    </div>`).join('');

  const ready = method && requisitesReady(method, digits);
  const label = method === 'sbp' ? 'Номер телефона (СБП)' : 'Номер карты';
  const placeholder = method === 'sbp' ? '+7 900 000 00 00' : '0000 0000 0000 0000';

  const hint = error
    ? `<div class="field-hint is-error">${esc(error)}</div>`
    : ready
      ? '<div class="field-hint">Все цифры введены. Можно проверить данные.</div>'
      : '<div class="field-hint">Введите реквизиты получателя полностью.</div>';

  return `
    ${topbar({ back: true })}

    <section class="payout-head">
      <div class="payout-head__icon">₽</div>
      <h2>Вывод средств</h2>
      <p>Выберите способ получения</p>
    </section>

    <div class="amount-card">
      <div class="amount-card__label">Доступно к выводу</div>
      <div class="amount-card__value">${rub(balance)}</div>
    </div>

    <div class="methods">${tiles}</div>

    ${method ? `
      <section class="card">
        <div class="summary__row" style="padding:0 0 13px">
          <span class="summary__key">Выбранный способ</span>
          <span class="summary__val">${esc(METHODS.find((m) => m.id === method).title)}</span>
        </div>
        <div class="field-label">${esc(label)}</div>
        <input id="requisites" type="tel" inputmode="numeric"
               placeholder="${placeholder}"
               value="${esc(formatRequisites(method, digits))}">
        ${hint}
        <button class="btn" data-action="preview" ${ready ? '' : 'disabled'}>
          Проверить данные
        </button>
      </section>` : ''}

    <p class="section-label" style="text-align:center;margin-top:18px">
      Поддерживаемые способы получения
    </p>
    <div class="brands"><span>VISA</span><span>MASTERCARD</span><span>МИР</span></div>`;
}

function viewPayoutConfirm() {
  const preview = state.payout.preview;
  return `
    ${topbar({ back: true })}
    <section class="card" style="text-align:center;padding:26px 20px">
      <div class="check-icon">${CHECK_SVG}</div>
      <h2 style="margin:0 0 8px;font-size:26px;font-weight:800">Проверьте реквизиты</h2>
      <p style="margin:0;color:var(--muted);font-size:14.5px;line-height:1.5">
        Убедитесь, что способ получения и номер указаны верно.
      </p>

      <div class="summary">
        <div class="summary__row">
          <span class="summary__key">Сумма</span>
          <span class="summary__val">${rub(preview.amount)}</span>
        </div>
        <div class="summary__row">
          <span class="summary__key">Способ</span>
          <span class="summary__val">${esc(preview.method_title)}</span>
        </div>
        <div class="summary__row">
          <span class="summary__key">Реквизиты</span>
          <span class="summary__val">${esc(preview.masked)}</span>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn--outline" data-action="payout-edit">Изменить</button>
        <button class="btn" data-action="payout-confirm">Продолжить</button>
      </div>
    </section>`;
}

/* ---------- рендер ---------- */

let lastView = null;

function render() {
  if (!state.data) return;
  // Внутри одного экрана (раскрыли карточку задания, обновили список каналов)
  // прокрутку сохраняем: иначе страница прыгает наверх прямо под пальцем.
  const sameView = state.view === lastView;
  const scroll = window.scrollY;

  if (!state.data.gate.passed) {
    tabbarEl.hidden = true;
    screenEl.innerHTML = viewGate();
    return;
  }

  const views = {
    tasks: viewTasks,
    task: viewTask,
    top: viewTop,
    profile: viewProfile,
    payout: viewPayout,
    payout_confirm: viewPayoutConfirm,
    payout_gate: viewPayoutGate,
  };
  screenEl.innerHTML = (views[state.view] || viewTasks)();

  tabbarEl.hidden = false;
  tabbarEl.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.tab === state.tab);
  });

  const nested = ['task', 'payout', 'payout_confirm', 'payout_gate']
    .includes(state.view);
  if (tg && tg.BackButton) {
    if (nested) tg.BackButton.show(); else tg.BackButton.hide();
  }

  window.scrollTo({ top: sameView ? scroll : 0 });
  lastView = state.view;
  bindInputs();
}

function bindInputs() {
  const answer = document.getElementById('answer');
  if (answer) {
    answer.addEventListener('input', () => {
      const previous = state.draft.text;
      state.draft.text = answer.value;
      // Ручная правка снимает выбор шаблона.
      if (state.draft.template !== null
          && answer.value !== state.task.templates[state.draft.template]) {
        state.draft.template = null;
      }
      if (previous.trim().length !== answer.value.trim().length) refreshTaskControls();
    });
  }

  const requisites = document.getElementById('requisites');
  if (requisites) {
    requisites.addEventListener('input', () => {
      const method = state.payout.method;
      state.payout.digits = normalizeDigits(method, requisites.value);
      state.payout.error = '';
      const formatted = formatRequisites(method, state.payout.digits);
      requisites.value = formatted;
      requisites.setSelectionRange(formatted.length, formatted.length);
      refreshPayoutControls();
    });
  }
}

/** Точечное обновление счётчика и кнопки — чтобы не терять фокус в textarea. */
function refreshTaskControls() {
  if (state.view !== 'task') return;
  const task = state.task;
  const left = Math.max(0, task.min_chars - state.draft.text.trim().length);
  const counter = document.querySelector('.counter__left');
  if (counter) {
    counter.textContent = left === 0
      ? 'Длина в порядке'
      : `Осталось: ${left} ${plural(left, 'символ', 'символа', 'символов')}`;
    counter.classList.toggle('is-ok', left === 0);
  }
  const ratingOk = !task.require_rating || state.draft.rating === 5;
  const button = document.querySelector('[data-action="submit"]');
  if (button) button.disabled = !(left === 0 && ratingOk);
  document.querySelectorAll('.option').forEach((option, index) => {
    option.classList.toggle('is-active', state.draft.template === index);
  });
}

function refreshPayoutControls() {
  const { method, digits, error } = state.payout;
  const button = document.querySelector('[data-action="preview"]');
  if (button) button.disabled = !requisitesReady(method, digits);
  const hint = document.querySelector('.field-hint');
  if (hint) {
    hint.classList.toggle('is-error', Boolean(error));
    hint.textContent = error || (requisitesReady(method, digits)
      ? 'Все цифры введены. Можно проверить данные.'
      : 'Введите реквизиты получателя полностью.');
  }
}

/* ---------- действия ---------- */

function goTab(tab) {
  state.tab = tab;
  state.view = tab;
  if (tab === 'top') loadTop();
  if (tab === 'profile') loadProfile();
  render();
}

function goBack() {
  if (state.view === 'payout_gate') { state.view = 'payout_confirm'; render(); return; }
  if (state.view === 'payout_confirm') { state.view = 'payout'; render(); return; }
  if (state.view === 'payout') { state.tab = 'profile'; state.view = 'profile'; render(); return; }
  state.view = state.tab;  // с экрана задания — обратно в ленту
  render();
}

async function loadTop() {
  try { state.top = await api('/api/top'); } catch (err) { toast(err.message); }
  if (state.view === 'top') render();
}

async function loadProfile() {
  try { state.profile = await api('/api/profile'); } catch (err) { toast(err.message); }
  if (state.view === 'profile') render();
}

async function checkGate() {
  showLoader('Проверяем подписку');
  try {
    state.data.gate = await api('/api/subscription/check', { method: 'POST' });
    hideOverlay();
    if (state.data.gate.passed) {
      haptic('success');
      await reload();
    } else {
      haptic('error');
      toast('Подписка не найдена — подпишитесь и попробуйте снова');
      render();
    }
  } catch (err) {
    hideOverlay();
    toast(err.message);
  }
}

async function submitTask() {
  const task = state.task;
  showLoader('Отправляем ответ');
  try {
    const result = await api('/api/task/submit', {
      method: 'POST',
      body: {
        task_id: task.id,
        text: state.draft.text.trim(),
        rating: state.draft.rating,
      },
    });
    haptic('success');
    state.data.user.balance = result.balance;
    const target = state.data.tasks.find((item) => item.id === task.id);
    if (target) target.done = true;
    state.data.done_count = state.data.tasks.filter((item) => item.done).length;
    state.profile = null;
    state.top = null;

    const text = result.status === 'approved'
      ? `Начислено ${rub(result.reward)}. Доступно к выводу: ${rub(result.balance)}.`
      : `Ответ отправлен на проверку. После подтверждения начислим ${rub(result.reward)}.`;
    showSuccess('Задание выполнено', text, 'Вернуться на главную', 'to-tasks');
  } catch (err) {
    hideOverlay();
    haptic('error');
    toast(err.message);
    if (err.status === 409) await reload();
  }
}

async function payoutPreview() {
  const { method, digits } = state.payout;
  showLoader('Проверяем реквизиты');
  try {
    state.payout.preview = await api('/api/withdraw/preview', {
      method: 'POST',
      body: { method, requisites: digits },
    });
    hideOverlay();
    state.view = 'payout_confirm';
    render();
  } catch (err) {
    hideOverlay();
    state.payout.error = err.message;
    haptic('error');
    render();
  }
}

/**
 * Создаёт заявку на вывод. Если не подтверждена подписка на каналы
 * партнёров, сервер отвечает 409 и присылает список каналов — показываем
 * экран «Подтвердите подписку» вместо заявки.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createWithdrawal() {
  const { method, digits } = state.payout;
  showLoader('Создаём заявку на вывод', 'Обрабатываем данные');
  try {
    // Лоадер держим хотя бы пару секунд: иначе экран моргает и человек
    // не успевает понять, что вообще произошло.
    const [result] = await Promise.all([
      api('/api/withdraw', { method: 'POST', body: { method, requisites: digits } }),
      sleep(1800),
    ]);
    haptic('success');
    state.data.user.balance = result.balance;
    state.profile = null;
    state.payoutGate = null;
    launchConfetti();

    if (result.status === 'paid') {
      showSuccess(
        'Платёж доставлен',
        `${rub(result.amount)} отправлены на ${result.method_title} `
        + `${result.masked}. Заявка ${result.code} закрыта.`,
        'Вернуться в профиль', 'to-profile');
      return;
    }

    showSuccess(
      'Заявка отправлена',
      'Все подписки подтверждены. Средства зарезервированы, заявка '
      + 'находится в обработке. Не отписывайтесь от каналов до выплаты — '
      + 'иначе платёж не будет отправлен.',
      'Вернуться в профиль', 'to-profile');
  } catch (err) {
    hideOverlay();
    if (err.status === 409 && err.payload && err.payload.gate) {
      haptic('warning');
      state.payoutGate = err.payload.gate;
      state.view = 'payout_gate';
      render();
      return;
    }
    haptic('error');
    toast(err.message);
  }
}

/** Кнопка «Проверить подписку» на экране гейта перед выводом. */
async function checkPayoutGate() {
  showLoader('Проверяем подписку');
  try {
    const gate = await api('/api/subscription/check',
                           { method: 'POST', body: { scope: 'payout' } });
    state.payoutGate = gate;
    hideOverlay();
    if (gate.passed) {
      haptic('success');
      await createWithdrawal();
    } else {
      haptic('error');
      toast('Подписка не найдена — проверьте, что подписались на все каналы');
      render();
    }
  } catch (err) {
    hideOverlay();
    toast(err.message);
  }
}

/** Карточка заявки на вывод в профиле → детали. */
function showPayoutDetails(item) {
  const note = item.status === 'pending'
    ? 'Обычно обработка занимает до 72 часов. Не отписывайтесь от каналов '
      + 'до выплаты — иначе платёж не будет отправлен.'
    : item.status === 'paid'
      ? 'Средства отправлены на указанные реквизиты.'
      : 'Заявка не прошла — средства вернулись на баланс.';

  showOverlay(`
    <button class="modal__close" data-action="close-modal" aria-label="Закрыть">✕</button>
    <div class="modal__icon">₽</div>
    <h3>Детали заявки</h3>
    <div class="summary">
      <div class="summary__row">
        <span class="summary__key">Номер заявки</span>
        <span class="summary__val">${esc(item.code)}</span>
      </div>
      <div class="summary__row">
        <span class="summary__key">Сумма</span>
        <span class="summary__val">${rub(item.amount)}</span>
      </div>
      <div class="summary__row">
        <span class="summary__key">Дата</span>
        <span class="summary__val">${esc(item.date)}</span>
      </div>
      <div class="summary__row">
        <span class="summary__key">Способ</span>
        <span class="summary__val">${esc(item.method_title)}</span>
      </div>
      <div class="summary__row">
        <span class="summary__key">Реквизиты</span>
        <span class="summary__val">${esc(item.masked)}</span>
      </div>
      <div class="summary__row">
        <span class="summary__key">Статус</span>
        <span class="summary__val">${esc(item.status_title)}</span>
      </div>
    </div>
    <p class="hint">${esc(note)}</p>
    <button class="btn" data-action="close-modal">Закрыть</button>
  `, 'modal--sheet');
}

/* ---------- обработчики кликов ---------- */

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const { action } = target.dataset;

  if (action === 'back') { haptic(); goBack(); return; }

  if (action === 'toggle-task') {
    const id = Number(target.dataset.id);
    const task = state.data.tasks.find((item) => item.id === id);
    if (task && task.done) { toast('Задание уже выполнено сегодня'); return; }
    haptic();
    state.openTaskId = state.openTaskId === id ? null : id;
    render();
    return;
  }

  if (action === 'open-task') {
    const id = Number(target.dataset.id);
    state.task = state.data.tasks.find((item) => item.id === id);
    state.draft = { template: null, text: '', rating: 0 };
    state.view = 'task';
    haptic();
    render();
    return;
  }

  if (action === 'pick-template') {
    const index = Number(target.dataset.index);
    state.draft.template = index;
    state.draft.text = state.task.templates[index];
    const answer = document.getElementById('answer');
    if (answer) answer.value = state.draft.text;
    haptic();
    refreshTaskControls();
    return;
  }

  if (action === 'rate') {
    state.draft.rating = Number(target.dataset.value);
    haptic();
    // Перерисовывать экран нельзя: он прокрутится наверх прямо под пальцем.
    document.querySelectorAll('.star').forEach((star, index) => {
      star.classList.toggle('is-on', index < state.draft.rating);
    });
    refreshTaskControls();
    return;
  }

  if (action === 'submit') { submitTask(); return; }
  if (action === 'check-gate') { checkGate(); return; }

  if (action === 'payout') {
    state.payout = { method: null, digits: '', error: '', preview: null };
    state.view = 'payout';
    haptic();
    render();
    return;
  }

  if (action === 'pick-method') {
    state.payout.method = target.dataset.id;
    state.payout.digits = '';
    state.payout.error = '';
    haptic();
    render();
    return;
  }

  if (action === 'preview') { payoutPreview(); return; }
  if (action === 'check-payout-gate') { checkPayoutGate(); return; }

  if (action === 'payout-details') {
    const item = state.profile.payouts[Number(target.dataset.index)];
    if (item) { haptic(); showPayoutDetails(item); }
    return;
  }

  if (action === 'close-modal') { hideOverlay(); return; }
  if (action === 'payout-edit') { state.view = 'payout'; render(); return; }
  if (action === 'payout-confirm') { createWithdrawal(); return; }

  if (action === 'to-tasks') {
    hideOverlay();
    state.view = 'tasks';
    state.tab = 'tasks';
    state.openTaskId = null;
    render();
    return;
  }

  if (action === 'to-profile') {
    hideOverlay();
    state.tab = 'profile';
    state.view = 'profile';
    loadProfile();
    render();
  }
});

tabbarEl.addEventListener('click', (event) => {
  const tab = event.target.closest('.tab');
  if (!tab) return;
  haptic();
  goTab(tab.dataset.tab);
});

/* ---------- запуск ---------- */

async function reload() {
  state.data = await api('/api/bootstrap');
  render();
}

function applyTheme() {
  const dark = tg ? tg.colorScheme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.body.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0e0e16' : '#f4f4fb');
  if (tg && tg.setBackgroundColor) {
    try { tg.setBackgroundColor(dark ? '#0e0e16' : '#f4f4fb'); } catch (_) { /* старый клиент */ }
  }
}

async function boot() {
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    tg.onEvent('themeChanged', applyTheme);
    if (tg.BackButton) tg.BackButton.onClick(goBack);
  }
  applyTheme();

  try {
    await reload();
  } catch (err) {
    screenEl.innerHTML = `
      <div class="gate">
        <div class="gate__lock">⚠️</div>
        <h2>Не удалось загрузить</h2>
        <p>${esc(err.message)}</p>
        <button class="btn" onclick="location.reload()">Обновить</button>
      </div>`;
  }
}

boot();
