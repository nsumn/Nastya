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
    ['first_pop', '🐾', 'Первый поп', 'Сделать самое первое дело', (s) => s.total, 1],
    ['perfect_day', '✨', 'Идеальный день', 'Закрыть все 6 дел за день', (s) => s.perfect.size, 1],
    ['streak_3', '🔥', 'Три дня мурчания', '3 идеальных дня подряд', (s) => s.best, 3],
    ['streak_7', '🌈', 'Неделя без косяков', '7 идеальных дней подряд', (s) => s.best, 7],
    ['streak_30', '👑', 'Кошачий рай', '30 идеальных дней подряд', (s) => s.best, 30],
    ['kiki', '🧡', 'Кики довольна', '10 идеальных дней всего', (s) => s.perfect.size, 10],
    ['laki', '🩶', 'Лаки мурчит', '25 идеальных дней всего', (s) => s.perfect.size, 25],
    ['pusya', '🤍', 'Пуся в восторге', '50 идеальных дней всего', (s) => s.perfect.size, 50],
    ['litter_50', '🧹', 'Лоточный мастер', 'Поменять лоток 50 раз', (s) => s.g.litter, 50],
    ['litter_300', '🏆', 'Повелитель лотков', 'Поменять лоток 300 раз', (s) => s.g.litter, 300],
    ['water_30', '💧', 'Водяной', 'Налить водичку 30 раз', (s) => s.g.water, 30],
    ['water_300', '🌊', 'Река жизни', 'Налить водичку 300 раз', (s) => s.g.water, 300],
    ['food_30', '🍗', 'Кормилица', 'Подсыпать корм 30 раз', (s) => s.g.food, 30],
    ['food_180', '🥫', 'Шеф-повар', 'Подсыпать корм 180 раз', (s) => s.g.food, 180],
    ['early', '🌅', 'Ранняя пташка', 'Поменять лоток до 8 утра', (s) => +s.early, 1],
    ['night', '🌙', 'Ночная смена', 'Сделать дело после 23:00', (s) => +s.night, 1],
    ['lightning', '⚡', 'Молния', 'Закрыть все дела дня до полудня', (s) => +s.lightning, 1],
    ['team', '🤝', 'Команда мечты', 'Дела за день делали двое или больше', (s) => +s.team, 1],
    ['pops_1000', '🎉', 'Тысяча попов', 'Сделать 1000 дел', (s) => s.total, 1000],
  ];
  const KEY = 'cat-care-demo-v1';
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

  function stats(events, today) {
    const s = { total: 0, g: { litter: 0, water: 0, food: 0 }, perfect: new Set(), best: 0, cur: 0, early: false, night: false, lightning: false, team: false };
    const per = {};
    events.forEach((e) => {
      s.total++;
      s.g[TASKS.find((t) => t.id === e.task).group]++;
      (per[e.day] = per[e.day] || []).push(e);
      const h = +e.ts.slice(11, 13);
      if (e.task === 'litter' && h < 8) s.early = true;
      if (h >= 23) s.night = true;
    });
    Object.entries(per).forEach(([day, evs]) => {
      if (new Set(evs.map((e) => e.user)).size >= 2) s.team = true;
      const ok = TASKS.every((t) => evs.filter((e) => e.task === t.id).length >= t.need);
      if (!ok) return;
      s.perfect.add(day);
      const fin = TASKS.map((t) => evs.filter((e) => e.task === t.id).map((e) => e.ts).sort()[t.need - 1]).sort().pop();
      if (+fin.slice(11, 13) < 12) s.lightning = true;
    });
    let run = 0, prev = null;
    [...s.perfect].sort().forEach((d) => {
      run = prev && dayStr(shift(new Date(prev + 'T12:00'), 1)) === d ? run + 1 : 1;
      s.best = Math.max(s.best, run);
      prev = d;
    });
    let d = s.perfect.has(dayStr(today)) ? today : shift(today, -1);
    while (s.perfect.has(dayStr(d))) { s.cur++; d = shift(d, -1); }
    return s;
  }

  function state() {
    const now = new Date(), today = dayStr(now);
    const todayEv = db.events.filter((e) => e.day === today);
    const tasks = TASKS.map((t) => {
      const evs = todayEv.filter((e) => e.task === t.id);
      return { ...t, done: evs.length, events: evs.map((e) => ({ id: e.id, time: e.ts.slice(11, 16), user: 'Я', mine: true })) };
    });
    const s = stats(db.events, now);
    const history = [];
    for (let i = 13; i >= 0; i--) {
      const d = dayStr(shift(now, -i));
      history.push({ day: d, done: Math.min(TOTAL, db.events.filter((e) => e.day === d).length), perfect: s.perfect.has(d) });
    }
    const weekAgo = dayStr(shift(now, -6));
    const week = db.events.filter((e) => e.day >= weekAgo).length;
    return {
      date: today, tasks, total: TOTAL,
      done: tasks.reduce((n, t) => n + Math.min(t.done, t.need), 0),
      streak: s.cur, best_streak: s.best, perfect_days: s.perfect.size,
      totals: { all: s.total, ...s.g },
      achievements: ACH.map(([code, icon, title, desc, f, target]) => ({
        code, icon, title, desc, target, unlocked: !!db.unlocked[code],
        unlocked_at: db.unlocked[code] || '', progress: Math.min(f(s), target),
      })),
      history,
      leaderboard: week ? [{ name: 'Я', count: week, me: true }] : [],
      me: 'Я',
    };
  }

  window.CatDemoAPI = async (path, body) => {
    if (path === 'api/state') return state();
    if (path === 'api/do') {
      const now = new Date(), t = TASKS.find((x) => x.id === body.task);
      const done = db.events.filter((e) => e.day === dayStr(now) && e.task === t.id).length;
      if (done >= t.need) return { ok: false, new_achievements: [], state: state() };
      const id = db.nextId++;
      db.events.push({ id, task: t.id, day: dayStr(now), ts: tsStr(now), user: 1 });
      const s = stats(db.events, now);
      const fresh = ACH.filter(([code, , , , f, target]) => !db.unlocked[code] && f(s) >= target);
      fresh.forEach(([code]) => { db.unlocked[code] = dayStr(now); });
      save();
      return { ok: true, event_id: id, state: state(),
        new_achievements: fresh.map(([code, icon, title, desc]) => ({ code, icon, title, desc })) };
    }
    if (path === 'api/undo') {
      const today = dayStr(new Date());
      const i = db.events.findIndex((e) => e.id === body.event_id && e.day === today);
      if (i >= 0) db.events.splice(i, 1);
      save();
      return { ok: i >= 0, state: state() };
    }
    throw new Error('unknown');
  };
})();
