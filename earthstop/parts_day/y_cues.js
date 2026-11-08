// =================== timeline constants (shared by the scene and tools/day_cues.mjs) ===================
const S = SENT;
const wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
const T = {
  intro: 0.12, wash: S[1] - 0.35, miller: wordT('Stephen', S[2]), replaces: wordT('replaces', S[3]), wiles: wordT('Susie', S[3]), monday1: wordT('Monday', S[3]),
  press: S[4], dana: wordT('Dana', S[5]), monday2: wordT('Monday', S[6]), doj: S[7] - 0.15, justice: wordT('Justice', S[7]), dems: wordT('Democrats', S[7]), extortion: wordT('extortion', S[8]),
  mid: S[9] - 0.2, alaska: wordT('Alaska', S[10]), peltola: wordT('Peltola', S[10]), suing: S[11], trumpAK: wordT('Trump', S[11]), ms: S[12] - 0.25, colom: wordT('Colom', S[12]), votes: wordT('twenty-five', S[12]),
  house: S[13] - 0.15, h253: wordT('two', S[13]), texas: S[14] - 0.2, tesla: wordT('Tesla', S[14]), cyber: wordT('Cybertruck', S[14]), robo: wordT('robotaxis', S[14]),
  over: S[15] - 0.1, israel: wordT('Israel', S[15]), eisenkot: wordT('Gadi', S[15]), netanyahu: wordT('Netanyahu', S[15]), n67: S[16],
  europe: S[17] - 0.15, no: wordT('no', S[17]), russia: wordT('Russia', S[17]), abu: S[18] - 0.1, tuesday: wordT('Tuesday', S[18]), close: S[19], vclose: wordT('very', S[19]),
  zel: S[20], fired: wordT('fired', S[20]), grid: wordT('power', S[20]), outro: S[21] - 0.1, follow: S[22] };
// SFX cue list [time, name, gain] — tools/day_cues.mjs writes parts_day/cues.txt from it
const CUES = [[0.05, 'whoosh', 0.6], [T.intro + 0.05, 'thud', 0.7], [1.3, 'pop', 0.4], [1.6, 'pop', 0.4], [1.9, 'pop', 0.4], [2.2, 'pop', 0.4], [T.wash, 'whoosh', 0.55],
  [T.miller, 'pop', 0.6], [T.replaces + 0.1, 'flip', 0.6], [T.press, 'whoosh', 0.35], [T.dana, 'pop', 0.6], [T.doj, 'whoosh', 0.4], [T.extortion, 'stamp', 0.8],
  [T.mid, 'whoosh', 0.6], [T.alaska + 0.2, 'rise', 0.5], [T.suing + 0.1, 'pop', 0.5], [T.ms, 'whoosh', 0.5], [T.votes, 'thud', 0.5], [T.house, 'whoosh', 0.4], [T.house + 0.3, 'rise', 0.6],
  [T.texas, 'whoosh', 0.5], [T.robo - 0.1, 'flip', 0.6], [T.over, 'whoosh', 0.7], [T.n67, 'rise', 0.5], [T.europe, 'whoosh', 0.5], [T.no, 'stamp', 0.8], [T.abu, 'whoosh', 0.45],
  [T.tuesday, 'pop', 0.5], [T.zel, 'whoosh', 0.35], [T.fired + 0.2, 'thud', 0.5], [T.outro, 'whoosh', 0.6], [ENDC, 'thud', 0.5]];
