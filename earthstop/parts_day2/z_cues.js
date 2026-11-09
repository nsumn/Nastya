// =================== timeline constants — "The last 24 hours", Mon Nov 9 2026 (scene + tools/day2_cues.mjs) ===================
const S = SENT.filter((x, i) => i !== 2);   // the period in "U.S." split sentence 1 — merge it back
const wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-.]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
const T = { intro: 0.05, wash: S[1] - 0.45, nv: S[1], huang: wordT('Jensen', S[1]), spy: wordT('spy', S[1]), board: S[2], congress: wordT('Congress', S[2]), china: S[3],
  dc: S[4] - 0.2, impeach: wordT('impeach', S[4]), hegseth: wordT('Pete', S[4]), jeffries: wordT('Hakeem', S[5]), yes: wordT('hard', S[5]), senate: S[6], twothirds: wordT('two', S[6]),
  wh: S[7] - 0.2, miller: wordT('Stephen', S[7]), dana: wordT('Dana', S[7]), count: S[8] - 0.2, abu: S[9] - 0.2, europe: wordT('Europe', S[9]), russia: wordT('Russia', S[9]),
  il: S[10] - 0.2, eisenkot: wordT('Gadi', S[10]), d28: wordT('28', S[10]), jp: S[11] - 0.2, quake: wordT('earthquake', S[11]), tsunami: S[12], follow: S[13] };
const CUES = [[0.02, 'whoosh', 0.6], [T.intro + 0.08, 'thud', 0.7], [T.wash, 'whoosh', 0.6], [T.huang, 'pop', 0.6], [T.spy, 'stamp', 0.6], [T.congress, 'pop', 0.4], [T.china, 'flip', 0.4],
  [T.dc - 0.1, 'whoosh', 0.5], [T.impeach + 0.1, 'stamp', 0.8], [T.jeffries, 'pop', 0.5], [T.twothirds, 'rise', 0.5], [T.wh, 'whoosh', 0.35], [T.miller, 'pop', 0.5], [T.dana, 'pop', 0.5],
  [T.count, 'whoosh', 0.6], [T.count + 0.8, 'rise', 0.4], [T.abu, 'whoosh', 0.7], [T.europe + 0.3, 'pop', 0.5], [T.russia, 'pop', 0.4], [T.il, 'whoosh', 0.5], [T.d28, 'thud', 0.5],
  [T.jp, 'whoosh', 0.6], [T.quake + 0.2, 'thud', 0.8], [T.follow, 'whoosh', 0.6], [ENDC, 'thud', 0.5]];
