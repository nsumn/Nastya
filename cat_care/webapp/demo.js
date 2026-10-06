'use strict';
// Демо-режим (?demo): всё хранится в браузере, сервер не нужен.
// Логика повторяет catbot/tasks.py в упрощённом виде.
(() => {
  const TASKS = [
    { id: 'litter', title: 'Поменять лоток', need: 2, group: 'litter' },
    { id: 'water_kitchen', title: 'Водичка на кухне', need: 1, group: 'water' },
    { id: 'water_hall', title: 'Водичка в коридоре', need: 1, group: 'water' },
    { id: 'water_room', title: 'Водичка в комнате', need: 1, group: 'water' },
    { id: 'food', title: 'Подсыпать корм', need: 1, group: 'food' },
  ];
  const TOTAL = 6;
  const ACH = [
    ['first_pop', '🐾', 'Первый поп', 'Сделать своё первое дело', (s) => s.total, 1],
    ['streak_3', '🔥', 'Три дня мурчания', 'Заботиться о котиках 3 дня подряд', (s) => s.best, 3],
    ['streak_7', '🌈', 'Неделя заботы', 'Заботиться о котиках 7 дней подряд', (s) => s.best, 7],
    ['streak_30', '👑', 'Кошачий рай', 'Заботиться о котиках 30 дней подряд', (s) => s.best, 30],
    ['kiki', '🤎', 'Кики довольна', '10 дней заботы всего', (s) => s.care.size, 10],
    ['laki', '🧡', 'Лаки мурчит', '25 дней заботы всего', (s) => s.care.size, 25],
    ['pusya', '🤍', 'Пуся в восторге', '50 дней заботы всего', (s) => s.care.size, 50],
    ['solo', '✨', 'Супергерой дня', 'Сделать все 6 дел за день в одиночку', (s) => +s.solo, 1],
    ['team', '🤝', 'Команда мечты', 'Закрыть идеальный день вместе с кем-то', (s) => +s.team, 1],
    ['lightning', '⚡', 'Молния', 'Все дела закрыты до полудня, и одно из них твоё', (s) => +s.lightning, 1],
    ['early', '🌅', 'Ранняя пташка', 'Поменять лоток до 8 утра', (s) => +s.early, 1],
    ['night', '🌙', 'Ночная смена', 'Сделать дело после 23:00', (s) => +s.night, 1],
    ['litter_50', '🧹', 'Лоточный мастер', 'Поменять лоток 50 раз', (s) => s.g.litter, 50],
    ['litter_300', '🏆', 'Повелитель лотков', 'Поменять лоток 300 раз', (s) => s.g.litter, 300],
    ['water_30', '💧', 'Водяной', 'Налить водичку 30 раз', (s) => s.g.water, 30],
    ['water_300', '🌊', 'Река жизни', 'Налить водичку 300 раз', (s) => s.g.water, 300],
    ['food_30', '🍗', 'Кормилица', 'Подсыпать корм 30 раз', (s) => s.g.food, 30],
    ['food_180', '🥫', 'Шеф-повар', 'Подсыпать корм 180 раз', (s) => s.g.food, 180],
    ['extra_litter', '🫧', 'Чистюля', 'Поменять лоток больше 2 раз за день', (s) => +s.xg.litter, 1],
    ['extra_water', '💦', 'Водопад', 'Налить водичку ещё раз там, где уже налито', (s) => +s.xg.water, 1],
    ['extra_food', '🥣', 'Добавка', 'Подсыпать корм ещё раз за день', (s) => +s.xg.food, 1],
    ['extra_10', '🌟', 'Сверх плана', 'Сделать 10 дел сверх нормы', (s) => s.extra, 10],
    ['extra_50', '💎', 'Золотые лапки', 'Сделать 50 дел сверх нормы', (s) => s.extra, 50],
    ['pops_1000', '🎉', 'Тысяча попов', 'Сделать 1000 дел', (s) => s.total, 1000],
  ];
  const ME = 1;
  const DAY_START_HOUR = 5; // день начинается в 5 утра, как на сервере
  const KEY = 'cat-care-demo-v2';
  const pad = (n) => String(n).padStart(2, '0');
  const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const tsStr = (d) => `${dayStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  const shift = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  function seed() {
    // три прошлых идеальных дня, чтобы было что посмотреть
    const ev = [];
    let id = 1;
    for (let back = 3; back >= 1; back--) {
      const d = shift(new Date(), -back);
      const at = (h, m) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
      [['litter', 9, 5], ['food', 9, 10], ['water_kitchen', 9, 12], ['water_hall', 9, 13],
        ['water_room', 9, 15], ['litter', 21, 30]].forEach(([task, h, m]) => {
        const x = at(h, m);
        ev.push({ id: id++, task, day: dayStr(x), ts: tsStr(x), user: 1 });
      });
    }
    return { events: ev, unlocked: {}, nextId: id };
  }
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
  if (!db) {
    db = seed();
    const s = stats(db.events, new Date());
    ACH.forEach(([code, , , , f, target]) => { if (f(s) >= target) db.unlocked[code] = db.events[0].day; });
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* приватный режим */ } };

  function remaining(evs) {
    return TASKS.some((t) => evs.filter((e) => e.task === t.id).length < t.need);
  }

  function streaks(days, today) {
    let best = 0, run = 0, prev = null;
    [...days].sort().forEach((d) => {
      run = prev && dayStr(shift(new Date(prev + 'T12:00'), 1)) === d ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    });
    let cur = 0;
    let d = days.has(dayStr(today)) ? today : shift(today, -1);
    while (days.has(dayStr(d))) { cur++; d = shift(d, -1); }
    return [best, cur];
  }

  function stats(events, today) {
    const s = { total: 0, g: { litter: 0, water: 0, food: 0 }, care: new Set(), best: 0, cur: 0, solo: false,
      extra: 0, xg: { litter: false, water: false, food: false },
      early: false, night: false, lightning: false, team: false, famPerfect: new Set(), famStreak: 0 };
    const per = {};
    events.forEach((e) => {
      (per[e.day] = per[e.day] || []).push(e);
      if (e.user !== ME) return;
      s.total++;
      s.g[TASKS.find((t) => t.id === e.task).group]++;
      s.care.add(e.day);
      const h = +e.ts.slice(11, 13);
      if (e.task === 'litter' && h >= DAY_START_HOUR && h < 8) s.early = true;
      if (h >= 23 || h < DAY_START_HOUR) s.night = true;
    });
    Object.entries(per).forEach(([day, evs]) => {
      TASKS.forEach((t) => {
        evs.filter((e) => e.task === t.id).sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : a.id - b.id))
          .slice(t.need).forEach((e) => { if (e.user === ME) { s.extra++; s.xg[t.group] = true; } });
      });
      const mine = evs.filter((e) => e.user === ME);
      if (mine.length && !remaining(mine)) s.solo = true;
      if (remaining(evs)) return;
      s.famPerfect.add(day);
      if (!mine.length) return;
      if (new Set(evs.map((e) => e.user)).size >= 2) s.team = true;
      const fin = TASKS.map((t) => evs.filter((e) => e.task === t.id).map((e) => e.ts).sort()[t.need - 1]).sort().pop();
      if (fin < `${day}T12:00`) s.lightning = true;
    });
    [s.best, s.cur] = streaks(s.care, today);
    s.famStreak = streaks(s.famPerfect, today)[1];
    return s;
  }

  // часы для демо (window.CAT_DEMO_HOUR — чтобы проверить ночь)
  function clock() {
    const d = new Date();
    if (window.CAT_DEMO_HOUR != null) d.setHours(window.CAT_DEMO_HOUR, 30, 0, 0);
    return d;
  }
  function logicalDay(now) {
    if (now.getHours() >= DAY_START_HOUR || db.early === dayStr(now)) return dayStr(now);
    return dayStr(shift(now, -1));
  }

  function inRange(day) {
    const today = logicalDay(clock());
    return day >= dayStr(shift(new Date(today + 'T12:00'), -7)) && day <= today;
  }

  function state(viewDay) {
    const real = clock(), today = logicalDay(real);
    const view = viewDay && inRange(viewDay) ? viewDay : today;
    const now = new Date(today + 'T12:00');
    const todayEv = db.events.filter((e) => e.day === today);
    const viewEv = db.events.filter((e) => e.day === view);
    const tasks = TASKS.map((t) => {
      const evs = viewEv.filter((e) => e.task === t.id);
      return { ...t, done: evs.length, events: evs.map((e) => ({ id: e.id, time: e.ts.slice(11, 16), user: 'Я', mine: true })) };
    });
    const s = stats(db.events, now);
    const fresh = ACH.filter(([code, , , , f, target]) => !db.unlocked[code] && f(s) >= target);
    fresh.forEach(([code]) => { db.unlocked[code] = today; });
    if (fresh.length) save();
    const history = [];
    for (let i = 13; i >= 0; i--) {
      const d = dayStr(shift(now, -i));
      history.push({ day: d, mine: db.events.filter((e) => e.day === d).length, family_perfect: s.famPerfect.has(d) });
    }
    const weekAgo = dayStr(shift(now, -6));
    const week = db.events.filter((e) => e.day >= weekAgo).length;
    const night = real.getHours() < DAY_START_HOUR;
    const early = night && today === dayStr(real);
    return {
      date: view, today, is_today: view === today, min_date: dayStr(shift(now, -7)),
      tasks, total: TOTAL, me: 'Я',
      now: `${pad(real.getHours())}:${pad(real.getMinutes())}`,
      night: { can_start: night && !early, can_undo: early && !todayEv.length },
      done: tasks.reduce((n, t) => n + Math.min(t.done, t.need), 0),
      my: { streak: s.cur, best_streak: s.best, care_days: s.care.size, total: s.total, extra: s.extra, ...s.g },
      family: { streak: s.famStreak, perfect_days: s.famPerfect.size },
      achievements: ACH.map(([code, icon, title, desc, f, target]) => ({
        code, icon, title, desc, target, unlocked: !!db.unlocked[code],
        unlocked_at: db.unlocked[code] || '', progress: Math.min(f(s), target),
      })),
      new_achievements: fresh.map(([code, icon, title, desc]) => ({ code, icon, title, desc })),
      history,
      leaderboard: week ? [{ name: 'Я', count: week, me: false }] : [],
    };
  }

  window.CatDemoAPI = async (path, body) => {
    if (path.startsWith('api/state')) return state((path.split('day=')[1] || '').slice(0, 10));
    if (path === 'api/do') {
      const now = clock(), day = inRange(body.day) ? body.day : logicalDay(now);
      const t = TASKS.find((x) => x.id === body.task);
      const done = db.events.filter((e) => e.day === day && e.task === t.id).length;
      if (done >= t.need && !body.extra) return { ok: false, state: state(day) };
      const id = db.nextId++;
      db.events.push({ id, task: t.id, day, ts: tsStr(now), user: ME });
      save();
      return { ok: true, event_id: id, state: state(day) };
    }
    if (path === 'api/undo') {
      const day = inRange(body.day) ? body.day : logicalDay(clock());
      const i = db.events.findIndex((e) => e.id === body.event_id && e.day === day);
      if (i >= 0) db.events.splice(i, 1);
      save();
      return { ok: i >= 0, state: state(day) };
    }
    if (path === 'api/new_day') {
      const now = clock(), cal = dayStr(now);
      let ok = false;
      if (now.getHours() < DAY_START_HOUR) {
        if (body.action === 'undo') {
          ok = db.early === cal && !db.events.some((e) => e.day === cal);
          if (ok) delete db.early;
        } else {
          ok = db.early !== cal;
          db.early = cal;
        }
        save();
      }
      return { ok, state: state() };
    }
    throw new Error('unknown');
  };
})();
