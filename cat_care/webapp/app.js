'use strict';
(() => {
  const tg = window.Telegram && window.Telegram.WebApp;
  const DEMO = !!window.CAT_DEMO || new URLSearchParams(location.search).has('demo');
  const $ = (id) => document.getElementById(id);
  const INK = '#5E4334';

  // ---------- котики (цвета можно поменять под настоящих) ----------
  const CATS = [
    // Кики — бежевая с тёмной «маской» на мордочке и тёмными ушками, голубые глаза
    { name: 'Кики', fur: '#F0E0C8', ear: '#8A6A55', earIn: '#C9A08E', eye: '#8DB6D9', nose: '#9C7462',
      pattern: 'point', mask: '#7A5A47' },
    // Лаки — тёмная трёхцветная (черепаховая), янтарные глаза
    { name: 'Лаки', fur: '#4A3A31', ear: '#4A3A31', earIn: '#B9837A', eye: '#E0AE45', nose: '#B5786E',
      line: '#F6E8D8', outline: '#2B1F19', pattern: 'tortie', ginger: '#C9864B', black: '#231915' },
    // Пуся — белоснежная, голубые глаза
    { name: 'Пуся', fur: '#FFFDF9', ear: '#FFFDF9', earIn: '#F3AFC0', eye: '#86B3DD', nose: '#E2809D',
      pattern: 'none' },
  ];
  const PAW_COLORS = ['#F3AFC0', '#E2809D', '#D9A98A', '#EE9DB4', '#E8BE9C', '#C9617F'];

  // ---------- svg ----------
  const pawPath = '<path d="M32 30c-9 0-18 9-18 17 0 6 5 8 9 8 4 0 6-2 9-2s5 2 9 2c4 0 9-2 9-8 0-8-9-17-18-17z"/>' +
    '<ellipse cx="13" cy="27" rx="6" ry="8" transform="rotate(-18 13 27)"/><ellipse cx="25" cy="15" rx="6" ry="8"/>' +
    '<ellipse cx="39" cy="15" rx="6" ry="8"/><ellipse cx="51" cy="27" rx="6" ry="8" transform="rotate(18 51 27)"/>';
  const pawSVG = (fill, stroke) =>
    `<svg viewBox="0 0 64 64"><g fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="3"` : ''}>${pawPath}</g></svg>`;

  const ICONS = {
    litter: `<svg viewBox="0 0 64 64" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <path d="M8 30h48l-5 22a4 4 0 0 1-4 3H17a4 4 0 0 1-4-3z" fill="#FFF8F0"/>
      <path d="M6 30h52" /><path d="M13 30c3-6 8-8 12-5 3-5 10-6 14-1 4-4 10-2 12 6" fill="#F6D3B8"/>
      <circle cx="22" cy="42" r="1.6" fill="${INK}"/><circle cx="32" cy="45" r="1.6" fill="${INK}"/><circle cx="42" cy="41" r="1.6" fill="${INK}"/>
      <path d="M44 22l8-14" /><path d="M50 6l6 4-4 7-6-4z" fill="#F3AFC0"/></svg>`,
    water: `<svg viewBox="0 0 64 64" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round">
      <path d="M32 7S15 28 15 40a17 17 0 0 0 34 0C49 28 32 7 32 7z" fill="#FFF8F0"/>
      <path d="M23 41a9 9 0 0 0 7 9" stroke="#E2809D" stroke-linecap="round"/></svg>`,
    food: `<svg viewBox="0 0 64 64" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <circle cx="22" cy="27" r="5" fill="#D9A98A"/><circle cx="32" cy="24" r="5" fill="#E8BE9C"/><circle cx="42" cy="27" r="5" fill="#D9A98A"/>
      <circle cx="27" cy="20" r="4" fill="#E8BE9C"/><circle cx="37" cy="19" r="4" fill="#D9A98A"/>
      <path d="M7 31h50c0 14-10 22-25 22S7 45 7 31z" fill="#FFF8F0"/>
      <path d="M24 42l4 3 4-3 4 3 4-3" stroke="#E2809D"/></svg>`,
    check: `<svg viewBox="0 0 64 64" fill="none" stroke="#C9617F" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 33l12 12 24-26"/></svg>`,
    paw: `<svg viewBox="0 0 64 64"><g fill="currentColor">${pawPath}</g></svg>`,
    plus: `<svg viewBox="0 0 64 64" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"><circle cx="32" cy="34" r="20" fill="#FCE4EA"/><path d="M32 24v20M22 34h20" stroke="#C9617F" stroke-width="5"/></svg>`,
    trophy: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><path d="M20 8h24v14a12 12 0 0 1-24 0z" fill="currentColor"/><path d="M20 14H10c0 10 6 14 12 14M44 14h10c0 10-6 14-12 14M32 34v12M22 56h20M26 46h12"/></svg>`,
    chart: `<svg viewBox="0 0 64 64" fill="currentColor"><rect x="8" y="34" width="12" height="22" rx="5"/><rect x="26" y="20" width="12" height="36" rx="5"/><rect x="44" y="8" width="12" height="48" rx="5"/></svg>`,
  };

  function catSVG(c, mood) {
    const O = c.outline || INK; // контур
    const L = c.line || INK; // усы, рот, брови (на тёмной шерсти — светлые)
    const id = c.name;
    let defs = '', pattern = '';
    if (c.pattern === 'point') {
      defs = `<radialGradient id="m-${id}" cx="50%" cy="55%" r="50%">
        <stop offset="0" stop-color="${c.mask}" stop-opacity=".95"/><stop offset=".55" stop-color="${c.mask}" stop-opacity=".55"/>
        <stop offset="1" stop-color="${c.mask}" stop-opacity="0"/></radialGradient>`;
      pattern = `<ellipse cx="50" cy="65" rx="27" ry="20" fill="url(#m-${id})"/>`;
    }
    if (c.pattern === 'tortie') {
      pattern = `<path d="M14 52c3-15 16-24 32-24-2 9-9 15-16 18-6 2-11 3-16 6z" fill="${c.ginger}"/>
        <path d="M54 30c12-1 23 6 28 17-9 2-18-1-24-6-3-3-5-7-4-11z" fill="${c.black}"/>
        <path d="M62 72c7-6 16-7 24-3-1 9-7 15-15 17-6-3-9-8-9-14z" fill="${c.ginger}" opacity=".9"/>
        <path d="M47 40l3-12 3 12-3 14z" fill="${c.ginger}" opacity=".85"/>`;
    }

    const iris = (cx, cy, r, pupil) =>
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.eye}" stroke="${O}" stroke-width="1.6"/>${pupil}`;
    let eyes, mouth, extra = '';
    if (mood === 'happy') {
      eyes = `<path d="M33 57q6-8 12 0M55 57q6-8 12 0" stroke="${L}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
      mouth = `<path d="M44 69q6 8 12 0z" fill="#E2809D" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/>`;
      extra = `<ellipse cx="29" cy="66" rx="6" ry="3.5" fill="#F3AFC0" opacity=".8"/><ellipse cx="71" cy="66" rx="6" ry="3.5" fill="#F3AFC0" opacity=".8"/>` +
        `<path class="heart" d="M84 18c0-4 6-5 7 0 1-5 7-4 7 0 0 5-7 9-7 9s-7-4-7-9z" fill="#E2809D"/>`;
    } else if (mood === 'sad') {
      const pupil = (x) => `<circle cx="${x}" cy="57.5" r="4.6" fill="#1F1612"/><circle cx="${x + 2.6}" cy="54.4" r="2.4" fill="#fff"/><circle cx="${x - 2}" cy="60.5" r="1.2" fill="#fff"/>`;
      eyes = iris(39, 57, 7.4, pupil(39)) + iris(61, 57, 7.4, pupil(61)) +
        `<path d="M30 48l10-4M70 48l-10-4" stroke="${L}" stroke-width="3" stroke-linecap="round"/>`;
      mouth = `<path d="M45 73q5-4 10 0" stroke="${L}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    } else {
      const pupil = (x) => `<ellipse cx="${x}" cy="57" rx="1.9" ry="3.8" fill="#1F1612"/><circle cx="${x + 1.9}" cy="54.8" r="1.5" fill="#fff"/>`;
      eyes = iris(39, 57, 5.6, pupil(39)) + iris(61, 57, 5.6, pupil(61));
      mouth = `<path d="M44 69q3 4 6 0q3 4 6 0" stroke="${L}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    }
    return `<svg viewBox="0 0 100 92">
      <defs>${defs}<clipPath id="h-${id}"><ellipse cx="50" cy="59" rx="35" ry="28"/></clipPath></defs>
      <g stroke="${O}" stroke-width="3" stroke-linejoin="round">
        <path d="M19 48L23 13l24 20z" fill="${c.ear}"/><path d="M81 48L77 13 53 33z" fill="${c.ear}"/>
        <path d="M25 40l2-18 13 11z" fill="${c.earIn}" stroke="none"/><path d="M75 40l-2-18-13 11z" fill="${c.earIn}" stroke="none"/>
      </g>
      <ellipse cx="50" cy="59" rx="35" ry="28" fill="${c.fur}"/>
      <g clip-path="url(#h-${id})">${pattern}</g>
      <ellipse cx="50" cy="59" rx="35" ry="28" fill="none" stroke="${O}" stroke-width="3"/>
      ${eyes}
      <path d="M46.5 64h7l-3.5 3.8z" fill="${c.nose}" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>
      ${mouth}
      <g stroke="${L}" stroke-width="2" stroke-linecap="round" opacity=".8">
        <path d="M24 66L5 62M24 71L6 75M76 66l19-4M76 71l18 4"/>
      </g>
      ${extra}
    </svg>`;
  }

  // ---------- звук поп-ита ----------
  const sound = (() => {
    let ctx = null;
    function get() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function noise(c, seconds) {
      const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
      const src = c.createBufferSource();
      src.buffer = buf;
      return src;
    }
    function pop() {
      const c = get();
      if (!c) return;
      const t = c.currentTime + 0.005;
      const f = 330 + Math.random() * 90;
      // глухой «пок» — синус с быстрым падением тона
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.32, t + 0.08);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.15);
      // силиконовый «щелчок» сверху
      const o2 = c.createOscillator(), g2 = c.createGain();
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(f * 2.6, t);
      o2.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.03);
      g2.gain.setValueAtTime(0.35, t);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      o2.connect(g2).connect(c.destination);
      o2.start(t); o2.stop(t + 0.05);
      const n = noise(c, 0.025), hp = c.createBiquadFilter(), g3 = c.createGain();
      hp.type = 'bandpass'; hp.frequency.value = 2400; hp.Q.value = 0.8;
      g3.gain.value = 0.45;
      n.connect(hp).connect(g3).connect(c.destination);
      n.start(t);
    }
    function chime() {
      const c = get();
      if (!c) return;
      [784, 988, 1175, 1568].forEach((f, i) => {
        const t = c.currentTime + 0.02 + i * 0.09;
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.28, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(g).connect(c.destination);
        o.start(t); o.stop(t + 0.65);
      });
    }
    function purr() {
      const c = get();
      if (!c) return;
      const t = c.currentTime + 0.01, dur = 0.9;
      const n = noise(c, dur), lp = c.createBiquadFilter(), g = c.createGain();
      const lfo = c.createOscillator(), lfoGain = c.createGain();
      // убираем затухание шума — для мурчания нужен ровный шум
      const d = n.buffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      lp.type = 'lowpass'; lp.frequency.value = 260;
      lfo.frequency.value = 24; lfoGain.gain.value = 0.5;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.6, t + 0.1);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      lfo.connect(lfoGain).connect(g.gain);
      n.connect(lp).connect(g).connect(c.destination);
      n.start(t); lfo.start(t); lfo.stop(t + dur);
    }
    return { pop, chime, purr, unlock: get };
  })();
  document.addEventListener('pointerdown', () => sound.unlock(), { once: true });

  function haptic(kind) {
    const h = tg && tg.HapticFeedback;
    if (!h) return;
    try {
      if (kind === 'success' || kind === 'warning' || kind === 'error') h.notificationOccurred(kind);
      else h.impactOccurred(kind);
    } catch (e) { /* старый клиент */ }
  }

  // ---------- эффекты: взрыв лапок ----------
  const fx = $('fx');
  function spawnPaw(x, y, size, color, frames, duration) {
    const p = document.createElement('div');
    p.className = 'paw-particle';
    p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
    p.innerHTML = pawSVG(color);
    fx.appendChild(p);
    const a = p.animate(frames, { duration, easing: 'cubic-bezier(.15,.75,.35,1)', fill: 'forwards' });
    a.onfinish = () => p.remove();
  }
  function burst(el, count = 18) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const ring = document.createElement('div');
    ring.className = 'ring';
    ring.style.cssText = `left:${cx}px;top:${cy}px;width:${r.width}px;height:${r.width}px`;
    fx.appendChild(ring);
    ring.animate([
      { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0.9 },
      { transform: 'translate(-50%,-50%) scale(1.7)', opacity: 0 },
    ], { duration: 550, easing: 'ease-out', fill: 'forwards' }).onfinish = () => ring.remove();

    const reach = Math.max(r.width, 90);
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = reach * (0.75 + Math.random() * 0.9);
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
      const face = (ang * 180) / Math.PI + 90; // пальчиками наружу
      const spin = (Math.random() - 0.5) * 160;
      const size = 20 + Math.random() * 24;
      spawnPaw(cx, cy, size, PAW_COLORS[i % PAW_COLORS.length], [
        { transform: `translate(-50%,-50%) rotate(${face}deg) scale(.2)`, opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 0.85}px), calc(-50% + ${dy * 0.85}px)) rotate(${face + spin * 0.6}deg) scale(1.15)`, opacity: 1, offset: 0.5 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 70}px)) rotate(${face + spin}deg) scale(.85)`, opacity: 0 },
      ], 950 + Math.random() * 450);
    }
  }
  function pawRain(count = 40) {
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w, size = 20 + Math.random() * 26, rot = (Math.random() - 0.5) * 120;
      setTimeout(() => spawnPaw(x, -40, size, PAW_COLORS[i % PAW_COLORS.length], [
        { transform: `translate(-50%,0) rotate(${rot}deg)`, opacity: 1 },
        { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 120}px), ${h + 80}px) rotate(${rot + 180}deg)`, opacity: 0.9 },
      ], 1800 + Math.random() * 1200), i * 45);
    }
  }
  function squish(el) {
    el.classList.remove('squish');
    void el.offsetWidth;
    el.classList.add('squish');
  }

  // ---------- тосты и модалки ----------
  let toastTimer;
  function toast(text, action, onAction) {
    const t = $('toast');
    t.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = text;
    t.appendChild(span);
    if (action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = action;
      b.onclick = () => { t.classList.remove('show'); onAction(); };
      t.appendChild(b);
    }
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), action ? 8000 : 2600);
  }

  const modalQueue = [];
  let modalOpen = false;
  function showModal(html, onShow, buttons) {
    modalQueue.push({ html, onShow, buttons });
    if (!modalOpen) nextModal();
  }
  function nextModal() {
    const m = $('modal');
    const item = modalQueue.shift();
    if (!item) { modalOpen = false; m.hidden = true; return; }
    modalOpen = true;
    const buttons = item.buttons || [{ text: 'Мур!' }];
    m.innerHTML = `<div class="modal-card">${item.html}<div class="modal-btns">${buttons.map((b, i) =>
      `<button class="btn ${b.secondary ? 'btn-secondary' : ''}" data-i="${i}" type="button">${b.text}</button>`).join('')}</div></div>`;
    m.hidden = false;
    m.querySelectorAll('.modal-btns .btn').forEach((el) => {
      el.onclick = () => {
        const b = buttons[Number(el.dataset.i)];
        sound.pop();
        nextModal();
        if (b.onClick) b.onClick();
      };
    });
    if (item.onShow) item.onShow();
  }
  function showAchievement(a) {
    showModal(
      `<div class="badge"><span>${a.icon}</span></div>
       <div class="kicker">Новая ачивка!</div><h3>${esc(a.title)}</h3><p>${esc(a.desc)}</p>`,
      () => { sound.chime(); haptic('success'); pawRain(36); });
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  // ---------- API ----------
  async function api(path, body) {
    if (DEMO) return window.CatDemoAPI(path, body);
    const res = await fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': (tg && tg.initData) || '' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = new Error(await res.text());
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  // ---------- состояние и отрисовка ----------
  let S = null;
  let viewDay = null; // null — сегодня, иначе 'YYYY-MM-DD' прошлого дня
  const task = (id) => S.tasks.find((t) => t.id === id);
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function mood() {
    if (S.done >= S.total) return 'happy';
    return S.done === 0 ? 'sad' : 'ok';
  }

  // с 0:00 до 5:00 день ещё «вчерашний» — можно начать новый день раньше
  function renderNight(d) {
    const box = $('newDay');
    const n = S.night || {};
    let html = '';
    if (!S.is_today) {
      html = `<div class="past-bar">Это прошлый день: можно отметить забытое или отменить своё
        <button class="today-btn" data-nav="today" type="button">К сегодня →</button></div>`;
    } else if (n.can_start) {
      html = `<button class="newday-btn" data-newday="start" type="button">🌅 Начать новый день</button>
        <div class="newday-note">Сейчас ${S.now}, ещё идёт ${d.getDate()} ${MONTHS[d.getMonth()]}. Новый день начнётся сам в 5:00</div>`;
    } else if (n.can_undo) {
      html = `<div class="newday-note">Новый день начат 🌅 <button class="undo-link inline" data-newday="undo" type="button">↩ вернуться во вчера</button></div>`;
    }
    if (box.dataset.html !== html) {  // не перерисовываем зря, чтобы не сбить нажатие
      box.dataset.html = html;
      box.innerHTML = html;
    }
    box.hidden = !html;
  }

  function askNewDay() {
    const left = S.total - S.done;
    const d = parseDay(S.date);
    const tail = left
      ? `За ${d.getDate()} ${MONTHS[d.getMonth()]} так и останется не сделано ${left} ${plural(left, 'дело', 'дела', 'дел')}.`
      : `${d.getDate()} ${MONTHS[d.getMonth()]} закрыт полностью ✨`;
    showModal(
      `<div class="badge"><span>🌅</span></div><div class="kicker">Ночь на дворе</div>
       <h3>Начать новый день?</h3><p>${tail} Новый день начнётся у всей семьи.</p>`,
      () => haptic('warning'),
      [{ text: 'Да, начать 🌅', onClick: () => newDay('start') }, { text: 'Пока нет', secondary: true }]);
  }

  async function newDay(action) {
    try {
      const r = await api('api/new_day', { action });
      S = r.state;
      render();
      if (!r.ok) {
        toast(action === 'undo' ? 'В новом дне уже есть отметки — вернуться нельзя' : 'Новый день уже начался 🌅');
      } else if (action === 'start') {
        sound.chime(); haptic('success'); pawRain(30);
        toast('Новый день начался! Котики ждут 🐾');
      } else {
        toast('Вернулись во вчерашний день ↩');
      }
    } catch (e) {
      toast('Не получилось 😿 Попробуй ещё раз');
    }
  }

  function renderHeader() {
    const d = parseDay(S.date);
    $('date').innerHTML =
      `<button class="navbtn" data-nav="-1" type="button" aria-label="Предыдущий день" ${S.date <= S.min_date ? 'disabled' : ''}>‹</button>` +
      `<span>${d.getDate()} ${MONTHS[d.getMonth()]}, ${WEEKDAYS[d.getDay()]}</span>` +
      `<button class="navbtn" data-nav="1" type="button" aria-label="Следующий день" ${S.is_today ? 'disabled' : ''}>›</button>`;
    const chip = $('streakChip');
    const st = S.my.streak;
    chip.hidden = st < 1;
    chip.textContent = `🔥 ${st} ${plural(st, 'день', 'дня', 'дней')} подряд`;

    renderNight(d);

    const m = mood();
    const cats = $('cats');
    if (cats.dataset.mood !== m) {
      cats.dataset.mood = m;
      cats.innerHTML = CATS.map((c, i) =>
        `<button class="cat ${m}" data-cat="${i}" type="button">${catSVG(c, m)}<div class="cat-pillow"></div><div class="cat-name">${c.name}</div></button>`).join('');
    }

    $('pawProgress').innerHTML = Array.from({ length: S.total }, (_, i) =>
      `<span class="p ${i < S.done ? 'on' : ''}">${i < S.done ? pawSVG('#E2809D') : pawSVG('#FFF9F2', '#E3CDB8')}</span>`).join('');
    const left = S.total - S.done;
    const dd = parseDay(S.date);
    const prefix = S.is_today ? '' : `${dd.getDate()} ${MONTHS[dd.getMonth()]}: `;
    $('progressLabel').textContent = prefix + (left === 0
      ? 'Идеальный день! Котики довольны ✨'
      : `Сделано ${S.done} из ${S.total} · осталось ${left} ${plural(left, 'дело', 'дела', 'дел')}`);
  }

  const WATER_PLACES = { water_kitchen: 'Кухня', water_hall: 'Коридор', water_room: 'Комната' };
  const who = (e) => `${esc(e.user)}, ${e.time}`;
  // своя отметка — сразу с кнопкой отмены (на случай, если тыкнул случайно)
  const undoBtn = (e) => (e && e.mine && e.id
    ? `<button class="undo-link" data-undo="${e.id}" type="button">↩ отменить</button>` : '');
  // сверх нормы: «＋ Ещё раз» и список дополнительных отметок
  const againBtn = (t) => `<button class="again-btn" data-again="${t.id}" type="button" aria-label="Ещё раз">
    <span class="bubble bubble-sm">＋</span><span class="again-lbl">ещё раз</span></button>`;
  const extras = (t) => t.events.slice(t.need).map((e) =>
    `<span class="extra-chip">＋ ${who(e)}${e.mine && e.id ? `<button class="undo-x" data-undo="${e.id}" type="button" aria-label="Отменить">↩</button>` : ''}</span>`).join('');

  function renderToday() {
    const l = task('litter');
    const lb = $('litterBtn');
    const lDone = l.done >= l.need;
    lb.classList.toggle('done', lDone);
    $('litterFace').innerHTML = lDone
      ? `${ICONS.check}<span>Лоток<br>чистый!</span>`
      : `${ICONS.litter}<span>Поменять<br>лоток</span>`;
    $('litterCount').textContent = `${Math.min(l.done, l.need)}/${l.need}${l.done > l.need ? ` ＋${l.done - l.need}` : ''}`;
    $('litterMini').innerHTML = Array.from({ length: l.need }, (_, i) => {
      const e = l.events[i];
      return `<div class="mini"><div class="dot ${e ? 'done' : ''}"></div>
        <div class="lbl"><b>${i + 1}-й раз</b><br>${e ? who(e) : 'ещё нет'}</div>${undoBtn(e)}</div>`;
    }).join('');
    $('litterExtra').innerHTML = lDone ? `<div class="extras">${extras(l)}</div>${againBtn(l)}` : '';

    const water = S.tasks.filter((t) => t.group === 'water');
    $('waterCount').textContent = `${water.filter((t) => t.done >= t.need).length}/${water.length}`;
    const wr = $('waterRow');
    if (!wr.children.length) {
      wr.innerHTML = water.map((t) =>
        `<div class="bubble-cell"><button class="bubble bubble-md" data-task="${t.id}" type="button">${ICONS.water}</button>
         <div class="cell-title">${WATER_PLACES[t.id] || esc(t.title)}</div>
         <div class="cell-sub" data-sub="${t.id}"></div></div>`).join('');
    }
    water.forEach((t) => {
      const done = t.done >= t.need;
      wr.querySelector(`[data-task="${t.id}"]`).classList.toggle('done', done);
      wr.querySelector(`[data-sub="${t.id}"]`).innerHTML = done
        ? `${who(t.events[0])}${undoBtn(t.events[0])}<div class="extras">${extras(t)}</div>${againBtn(t)}` : 'налить';
    });

    const f = task('food');
    const fb = $('foodBtn');
    const fDone = f.done >= f.need;
    fb.classList.toggle('done', fDone);
    fb.innerHTML = fDone ? ICONS.check : ICONS.food;
    $('foodStatus').innerHTML = fDone
      ? `Насыпано · ${who(f.events[0])}${undoBtn(f.events[0])}<div class="extras">${extras(f)}</div>${againBtn(f)}`
      : 'Подсыпать корм — нажми на миску';
  }

  function renderAch() {
    const got = S.achievements.filter((a) => a.unlocked).length;
    $('achCount').textContent = `${got} из ${S.achievements.length}`;
    const sorted = [...S.achievements].sort((a, b) => (b.unlocked - a.unlocked) || ((b.progress / b.target) - (a.progress / a.target)));
    $('achGrid').innerHTML = sorted.map((a) => {
      const d = a.unlocked_at ? parseDay(a.unlocked_at) : null;
      const foot = a.unlocked
        ? `<div class="date">${d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : ''}</div>`
        : (a.target > 1
          ? `<div class="bar"><i style="width:${(100 * a.progress) / a.target}%"></i></div><div class="bar-label">${a.progress} / ${a.target}</div>`
          : '<div class="bar-label">🔒 ещё не открыта</div>');
      return `<div class="ach ${a.unlocked ? '' : 'locked'}"><div class="badge"><span>${a.icon}</span></div>
        <h3>${esc(a.title)}</h3><p>${esc(a.desc)}</p>${foot}</div>`;
    }).join('');
  }

  function renderStats() {
    const M = S.my;
    const days = (n) => plural(n, 'день', 'дня', 'дней');
    $('meName').textContent = S.me;
    $('tiles').innerHTML = [
      ['accent', M.streak, days(M.streak), 'моя серия 🔥'],
      ['', M.best_streak, days(M.best_streak), 'мой рекорд'],
      ['', M.care_days, days(M.care_days), 'заботы всего 💗'],
      ['', M.total, '', `${plural(M.total, 'дело', 'дела', 'дел')} сделано 🐾`],
    ].map(([cls, n, unit, cap]) => `<div class="tile ${cls}"><div class="num">${n} <small>${unit}</small></div><div class="cap">${cap}</div></div>`).join('');

    $('history').innerHTML = S.history.map((h, i) => {
      const d = parseDay(h.day);
      const pct = Math.round((100 * Math.min(h.mine, S.total)) / S.total);
      return `<div class="hday ${i === S.history.length - 1 ? 'today' : ''}">
        <div class="hring ${h.mine ? '' : 'zero'}" style="--p:${pct}"><span>${h.mine}</span></div>
        ${WEEKDAYS[d.getDay()]} ${d.getDate()}</div>`;
    }).join('') + '<div class="legend" style="grid-column:1/-1">Цифра — сколько дел сделал(а) ты в этот день</div>';

    $('totals').innerHTML = [['litter', 'litter', 'лотков'], ['water', 'water', 'водичек'], ['food', 'food', 'кормёжек'], ['extra', 'plus', 'сверх нормы']]
      .map(([k, icon, cap]) => `<div class="t">${ICONS[icon]}<b>${M[k] || 0}</b><span>${cap}</span></div>`).join('');

    const F = S.family;
    $('familyLine').innerHTML =
      `<div><b>${F.streak} ${days(F.streak)}</b><span>идеальных дней подряд</span></div>` +
      `<div><b>${F.perfect_days}</b><span>${plural(F.perfect_days, 'идеальный день', 'идеальных дня', 'идеальных дней')} всего</span></div>`;

    const medals = ['🥇', '🥈', '🥉'];
    const max = Math.max(1, ...S.leaderboard.map((l) => l.count));
    $('leaders').innerHTML = S.leaderboard.length
      ? S.leaderboard.map((l, i) => `<div class="leader"><div class="medal">${medals[i] || '🐾'}</div>
          <div><div class="nm">${esc(l.name)}${l.me ? ' (ты)' : ''}</div><div class="bar"><i style="width:${(100 * l.count) / max}%"></i></div></div>
          <div class="cnt">${l.count}</div></div>`).join('')
      : '<div class="empty">Пока никто ничего не сделал за неделю 😿</div>';
  }

  function render() {
    renderHeader();
    renderToday();
    renderAch();
    renderStats();
  }

  // ---------- действия ----------
  async function doTask(id, el, extra = false) {
    const t = task(id);
    if (t.done >= t.need && !extra) { offerUndo(t); return; }

    sound.pop();
    haptic('heavy');
    burst(el, id === 'litter' ? 22 : 14);
    squish(el);

    const wasDone = S.done;
    t.done += 1;
    t.events.push({ id: null, time: '', user: S.me || 'Я', mine: true });
    if (!extra) S.done = Math.min(S.total, S.done + 1);
    render();

    try {
      const r = await api('api/do', { task: id, day: S.date, extra });
      S = r.state;
      render();
      if (!r.ok) {
        const last = task(id).events.slice(-1)[0];
        toast(last ? `Уже отмечено: ${last.user}, ${last.time}` : 'Уже отмечено 💕');
      } else {
        if (extra) {
          toast('＋1 сверх нормы! Котики в восторге 💪', 'Отменить', () => undo(r.event_id));
        } else if (S.done >= S.total && wasDone < S.total) {
          setTimeout(() => { pawRain(50); sound.chime(); haptic('success'); toast('Идеальный день! Кики, Лаки и Пуся мурчат 💕'); }, 450);
        } else {
          toast(`${t.title} — готово!`, 'Отменить', () => undo(r.event_id));
        }
      }
      announce(S, 900);
    } catch (e) {
      toast('Не получилось сохранить 😿 Попробуй ещё раз');
      load();
    }
  }

  function offerUndo(t) {
    const mine = [...t.events].reverse().find((e) => e.mine && e.id);
    const last = t.events[t.events.length - 1];
    haptic('light');
    const el = document.querySelector(`[data-task="${t.id}"]`);
    if (last) toast(`Уже сделано: ${last.user}, ${last.time}${mine ? '' : ' 💕'}`, '＋ Ещё раз', () => doTask(t.id, el, true));
  }

  async function undo(eventId) {
    try {
      const r = await api('api/undo', { event_id: eventId, day: S.date });
      S = r.state;
      render();
      toast(r.ok ? 'Отменено ↩ Можно отметить заново' : 'Отменить можно только свою отметку');
    } catch (e) {
      toast('Не получилось отменить 😿');
    }
  }

  const CAT_LINES = {
    happy: ['Мур-мур 💕', 'Ты лучшая! ✨', 'Мрррр…', 'Люблю тебя 💗'],
    hungry: ['Где мой корм? 🥺', 'Миска пустая…', 'Мяу! Кушать!'],
    thirsty: ['Водички бы… 💧', 'Хочу пить!'],
    litter: ['Лоток, пожалуйста 🙏', 'Тут надо убрать…'],
  };
  function catSays(btn) {
    let pool = CAT_LINES.happy;
    if (S.done < S.total) {
      const need = [];
      if (task('food').done < 1) need.push(CAT_LINES.hungry);
      if (S.tasks.some((t) => t.group === 'water' && t.done < t.need)) need.push(CAT_LINES.thirsty);
      if (task('litter').done < task('litter').need) need.push(CAT_LINES.litter);
      pool = need[Number(btn.dataset.cat) % need.length];
    }
    btn.querySelectorAll('.speech').forEach((s) => s.remove());
    const s = document.createElement('div');
    s.className = 'speech';
    s.textContent = pool[Math.floor(Math.random() * pool.length)];
    btn.appendChild(s);
    setTimeout(() => s.remove(), 2300);
    btn.classList.remove('tapped');
    void btn.offsetWidth;
    btn.classList.add('tapped');
    sound.purr();
    haptic('soft');
  }

  document.addEventListener('click', (ev) => {
    if (!S) return;
    const b = ev.target.closest('[data-task]');
    if (b) { doTask(b.dataset.task, b); return; }
    const again = ev.target.closest('[data-again]');
    if (again) { doTask(again.dataset.again, again.querySelector('.bubble'), true); return; }
    const nav = ev.target.closest('[data-nav]');
    if (nav) { if (!nav.disabled) goDay(nav.dataset.nav); return; }
    const nd = ev.target.closest('[data-newday]');
    if (nd) {
      haptic('light');
      if (nd.dataset.newday === 'start') askNewDay(); else newDay('undo');
      return;
    }
    const u = ev.target.closest('[data-undo]');
    if (u) { haptic('light'); undo(Number(u.dataset.undo)); return; }
    const cat = ev.target.closest('[data-cat]');
    if (cat) { catSays(cat); return; }
    const tab = ev.target.closest('[data-tab]');
    if (tab) {
      document.querySelectorAll('.tabbtn').forEach((x) => x.classList.toggle('active', x === tab));
      document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x.id === `tab-${tab.dataset.tab}`));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      haptic('light');
    }
  });

  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = ICONS[el.dataset.icon]; });

  function block(text) {
    const b = $('blocker');
    b.innerHTML = `<div>${catSVG(CATS[2], 'sad')}${esc(text)}</div>`;
    b.hidden = false;
  }

  function announce(state, delay) {
    (state.new_achievements || []).forEach((a, i) => setTimeout(() => showAchievement(a), delay + i * 50));
  }

  function shiftDay(day, n) {
    const d = parseDay(day);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function goDay(nav) {
    haptic('light');
    if (nav === 'today') viewDay = null;
    else {
      const next = shiftDay(S.date, Number(nav));
      viewDay = next >= S.today ? null : next;
    }
    await load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function load() {
    try {
      S = await api(viewDay ? `api/state?day=${viewDay}` : 'api/state');
      if (S.is_today) viewDay = null;
      $('blocker').hidden = true;
      render();
      announce(S, 300);
    } catch (e) {
      if (e.status === 400 && viewDay) { viewDay = null; load(); return; } // день стал слишком старым
      if (e.status === 401) block('Открой котохозяйство из Telegram-бота 🐾');
      else if (e.status === 403) block(e.message || 'Это приложение только для нашей семьи 🐾');
      else if (!S) block('Не получилось загрузиться 😿 Проверь интернет и открой ещё раз');
    }
  }

  async function start() {
    if (tg) {
      tg.ready();
      tg.expand();
      try {
        tg.setHeaderColor('#F6EBDD');
        tg.setBackgroundColor('#F6EBDD');
        if (tg.setBottomBarColor) tg.setBottomBarColor('#F6EBDD');
        if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
      } catch (e) { /* старый клиент */ }
    }
    if (DEMO && !window.CatDemoAPI) {
      await new Promise((ok) => {
        const s = document.createElement('script');
        s.src = `static/demo.js?v=${Date.now()}`;
        s.onload = ok;
        document.head.appendChild(s);
      });
    }
    await load();
    // подтягиваем то, что отметили другие члены семьи
    setInterval(() => { if (!document.hidden && !modalOpen) load(); }, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  }

  start();
})();
