// =================== timeline constants (scene + tools/tx_cues.mjs) ===================
const S = SENT;
const wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 5.6;
const T = { blue: wordT('blue', 0), why: S[1], years: S[2], senator: S[3], y2024: S[4], trump: wordT('Trump', S[4]), later: S[5], talarico: wordT('James', S[5]), gina: wordT('Gina', S[6]), abbott: wordT('Abbott', S[6]),
  r1: S[7], paxton: wordT('Ken', S[8]), cornyn: wordT('John', S[8]), impeached: wordT('impeached', S[9]), bush: wordT('Bush', S[10]),
  r2: S[11], collin: wordT('Collin', S[12]), denton: wordT('Denton', S[12]), tarrant: wordT('Tarrant', S[12]), kaufman: wordT('Kaufman', S[12]), flipped: wordT('flipped', S[12]), austin: S[13], williamson: wordT('Williamson', S[13]),
  r3: S[14], valley: S[15], thistime: S[16], jumped: wordT('jumped', S[16]), swung: wordT('swung', S[16]), r4: S[17], midterms: S[18], rural: S[19], forty: wordT('forty', S[20]), cities: S[21], q: S[22] };
const CUES = [[0.05, 'whoosh', 0.5], [T.blue, 'flip', 0.8], [T.blue + 0.9, 'thud', 0.7], [T.years, 'whoosh', 0.35], [T.senator + 1.2, 'pop', 0.5], [T.y2024, 'rise', 0.6], [T.later + 0.3, 'flip', 0.6], [T.talarico, 'pop', 0.6], [T.gina, 'pop', 0.5],
  [T.r1 - 0.3, 'whoosh', 0.5], [T.paxton, 'pop', 0.6], [T.cornyn, 'pop', 0.4], [T.impeached, 'stamp', 0.8], [T.bush, 'pop', 0.5],
  [T.r2 - 0.3, 'whoosh', 0.55], [T.collin, 'pop', 0.5], [T.denton, 'pop', 0.5], [T.tarrant, 'pop', 0.5], [T.kaufman, 'pop', 0.5], [T.austin - 0.2, 'whoosh', 0.4], [T.williamson, 'flip', 0.5],
  [T.r3 - 0.3, 'whoosh', 0.55], [T.thistime, 'rise', 0.6], [T.swung, 'flip', 0.6], [T.r4 - 0.5, 'whoosh', 0.7], [T.rural - 0.6, 'whoosh', 0.6], [T.forty, 'rise', 0.6], [T.q, 'thud', 0.6], [ENDC, 'thud', 0.5]];
