// スートバトル バランス計測用シミュレーター
// 使い方: node tools/sim.js [games] [--set name=value ...]
//   例: node tools/sim.js 3000 --set ME=50 --set CPU=150
// mock.html のルールを再現し、簡単なAI(貪欲/ランダム)で対戦して勝率・ラウンド数などを出す

const DEFAULT = {
  ME: 30, CPU: 200, HAND: 6, MIN_RANK: 3, MAX_RANK: 13,
  EARLY_ROUNDS: 4, EARLY_MAX_RANK: 10,
  SKILL_CD: 5, SKILL_LEN: 2, SKILL_HP_STEP: 50, SKILL_BASE_RANK: 13, SKILL_ON: 1,
  ONEMORE_NEED_SUITS: 1, AFFINITY_MUL: 2,
  SKILL_NO_AFFINITY: 0,   // 1: スキル中は相性の2倍が無効(相手のカードが固い)
  HIDDEN_SLOTS: 0,        // n: 相手の右側n枚を裏向きにする(プレイヤーは数字・スートを知らずに出す)
  ONEMORE_MUL: 1,         // 1moreのダメージ倍率
  MISTAKE: 0.25,          // mid方針の「焦ってミスする」確率
  POLICY: 'greedy', // greedy | mid | random
};
const args = process.argv.slice(2);
const N = Number(args.find(a => /^\d+$/.test(a)) || 2000);
const P = { ...DEFAULT };
for (let i = 0; i < args.length; i++) if (args[i] === '--set') { const [k, v] = args[i + 1].split('='); P[k] = isNaN(v) ? v : Number(v); }

const BEATS = { D: 'S', S: 'C', C: 'D' }; // rock>scis>paper>rock  (D=rock,S=scis,C=paper)
const SUITS = 'DSC';
let rng = mulberry32(12345);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = n => Math.floor(rng() * n);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; }

function newGame() {
  const deck = []; for (const s of SUITS) for (let r = P.MIN_RANK; r <= P.MAX_RANK; r++) deck.push({ suit: s, rank: r });
  const S = { me: P.ME, cpu: P.CPU, deck: shuffle(deck), discard: [], hand: [], handMax: P.HAND, round: 0,
    skillActive: false, skillRounds: 0, skillLevel: 0, skillCd: P.SKILL_CD, hpTrigger: false, nextHp: P.CPU - P.SKILL_HP_STEP,
    stats: { onemore: 0, combos: 0, skills: 0, dmgDealt: 0, dmgTaken: 0 } };
  refill(S); return S;
}
function draw(S) { if (!S.deck.length) { if (!S.discard.length) return null; S.deck = shuffle(S.discard); S.discard = []; } return S.deck.pop(); }
function refill(S) { while (S.hand.length < S.handMax) { const c = draw(S); if (!c) break; S.hand.push(c); } }
function cpuDeal(S) {
  if (S.skillActive) { const r = P.SKILL_BASE_RANK + S.skillLevel - 1; return SUITS.split('').map(suit => ({ suit, rank: r, skill: true })); }
  const max = S.round <= P.EARLY_ROUNDS ? P.EARLY_MAX_RANK : P.MAX_RANK;
  return [0, 1, 2].map(() => ({ suit: SUITS[rnd(3)], rank: P.MIN_RANK + rnd(max - P.MIN_RANK + 1) }));
}
function resolve(p, c) {
  let pv = p.rank, cv = c ? c.rank : 0;
  if (c && !(P.SKILL_NO_AFFINITY && c.skill)) { if (BEATS[p.suit] === c.suit) pv *= P.AFFINITY_MUL; else if (BEATS[c.suit] === p.suit) cv *= P.AFFINITY_MUL; }
  const d = pv - cv; return { dmgCpu: d > 0 ? d : 0, dmgMe: d < 0 ? -d : 0, win: pv > cv };
}
function detectCombo(cards) {
  if (cards.every(c => c.rank === cards[0].rank)) return 'rev';
  if (cards.every(c => c.suit === cards[0].suit)) return { S: 'sword', D: 'diamond', C: 'clover' }[cards[0].suit];
  return null;
}
function applyCombo(S, k, rest) {
  S.stats.combos++;
  const bySuit = suit => rest.filter(c => c.suit === suit);
  if (k === 'sword') { for (const suit of SUITS) { const cs = bySuit(suit); if (cs.length) cs.reduce((a, b) => b.rank < a.rank ? b : a).rank = 13; } S.handMax++; }
  else if (k === 'diamond') { for (const suit of SUITS) { const cs = bySuit(suit); if (cs.length) { const h = cs.reduce((a, b) => b.rank > a.rank ? b : a); S.hand.push({ suit, rank: h.rank }); } } S.handMax++; }
  else if (k === 'clover') { const counts = SUITS.split('').map(suit => bySuit(suit)).filter(cs => cs.length); if (counts.length) { const min = Math.min(...counts.map(cs => cs.length)); counts.filter(cs => cs.length === min).forEach(cs => cs.forEach(c => c.rank = 13)); } S.handMax++; }
}
// ---- policies ----
function perms3(arr) { const out = []; for (let i = 0; i < arr.length; i++) for (let j = 0; j < arr.length; j++) if (j !== i) for (let k = 0; k < arr.length; k++) if (k !== i && k !== j) out.push([arr[i], arr[j], arr[k]]); return out; }
function visible(field) { return field.map((c, i) => i >= 3 - P.HIDDEN_SLOTS ? null : c); }
function midChoose(S, field) {
  // 1枚ずつ: 見えている相手カードに対して「有利スートで最大ダメージ」を選ぶ。見えない枠は手札の最大値。確率MISTAKEで適当な札
  const hand = S.hand.slice(); const out = [];
  for (let i = 0; i < 3; i++) {
    let pick;
    if (rng() < P.MISTAKE) pick = hand[rnd(hand.length)];
    else if (!field[i]) pick = hand.reduce((a, b) => b.rank > a.rank ? b : a);
    else { let best = null, bs = -1e9; for (const c of hand) { const r = resolve(c, field[i]); const sc = r.dmgCpu - 1.6 * r.dmgMe; if (sc > bs) { bs = sc; best = c; } } pick = best; }
    out.push(pick); hand.splice(hand.indexOf(pick), 1);
  }
  return out;
}
function choose(S, fieldFull) {
  const field = visible(fieldFull);
  if (P.POLICY === 'random') { const h = shuffle(S.hand.slice()); return h.slice(0, 3); }
  if (P.POLICY === 'mid') return midChoose(S, field);
  let best = null, bestScore = -1e9;
  for (const trio of perms3(S.hand)) {
    const combo = detectCombo(trio);
    let dc = 0, dm = 0, wins = 0;
    for (let i = 0; i < 3; i++) { const f = combo === 'rev' ? null : field[i]; if (f === null && combo !== 'rev') { dc += trio[i].rank * .4; dm += 3; if (trio[i].rank >= 10) wins++; continue; } const r = resolve(trio[i], f); dc += r.dmgCpu; dm += r.dmgMe; if (r.win) wins++; }
    const rest = S.hand.filter(c => !trio.includes(c));
    const suits = new Set(trio.map(c => c.suit)).size;
    let score = dc - 1.6 * dm;
    if (wins === 3 && (!P.ONEMORE_NEED_SUITS || suits === 3)) score += rest.map(c => c.rank).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) * 0.9;
    if (combo && combo !== 'rev') score += 6;
    if (dm >= S.me) score -= 1000; // never walk into death
    if (score > bestScore) { bestScore = score; best = trio; }
  }
  return best;
}
function chooseOneMore(S) {
  const sorted = S.hand.slice().sort((a, b) => b.rank - a.rank);
  return sorted.slice(0, 3);
}
// ---- one game ----
function play() {
  const S = newGame();
  while (S.round < 200) {
    S.round++;
    if (P.SKILL_ON && !S.skillActive) { S.skillCd--; if (S.skillCd <= 0 || S.hpTrigger) { S.hpTrigger = false; S.skillActive = true; S.skillRounds = P.SKILL_LEN; S.skillLevel++; S.stats.skills++; } }
    const field = cpuDeal(S);
    let trio = choose(S, field);
    const combo = detectCombo(trio);
    const rest = S.hand.filter(c => !trio.includes(c));
    if (combo && combo !== 'rev') applyCombo(S, combo, rest); else if (combo === 'rev') S.stats.combos++;
    let wins = 0, dead = false;
    for (let i = 0; i < 3; i++) {
      const r = resolve(trio[i], combo === 'rev' ? null : field[i]);
      S.cpu -= r.dmgCpu; S.me -= r.dmgMe; S.stats.dmgDealt += r.dmgCpu; S.stats.dmgTaken += r.dmgMe; if (r.win) wins++;
      while (S.cpu > 0 && S.cpu <= S.nextHp && S.nextHp > 0) { if (!S.skillActive) S.hpTrigger = true; S.nextHp -= P.SKILL_HP_STEP; }
      if (S.me <= 0 || S.cpu <= 0) { dead = true; break; }
    }
    for (const c of trio) { S.hand.splice(S.hand.indexOf(c), 1); S.discard.push(c); }
    if (dead) break;
    if (wins === 3 && (!P.ONEMORE_NEED_SUITS || new Set(trio.map(c => c.suit)).size === 3)) {
      S.stats.onemore++;
      const t2 = chooseOneMore(S); const c2 = detectCombo(t2); const rest2 = S.hand.filter(c => !t2.includes(c));
      if (c2 && c2 !== 'rev') applyCombo(S, c2, rest2);
      for (const c of t2) { const d = Math.round(c.rank * P.ONEMORE_MUL); S.cpu -= d; S.stats.dmgDealt += d; if (S.cpu <= 0) { dead = true; break; } }
      for (const c of t2) { S.hand.splice(S.hand.indexOf(c), 1); S.discard.push(c); }
      if (dead) break;
    }
    if (S.skillActive) { S.skillRounds--; if (S.skillRounds <= 0) { S.skillActive = false; S.skillCd = P.SKILL_CD; S.handMax++; } }
    refill(S);
  }
  return { win: S.cpu <= 0, rounds: S.round, me: Math.max(0, S.me), cpu: Math.max(0, S.cpu), ...S.stats };
}
// ---- run ----
const res = []; for (let i = 0; i < N; i++) res.push(play());
const avg = k => (res.reduce((a, r) => a + r[k], 0) / N);
const wins = res.filter(r => r.win);
const losses = res.filter(r => !r.win);
const pct = x => (x * 100).toFixed(1) + '%';
const hist = {}; for (const r of res) { const b = r.rounds <= 3 ? '1-3' : r.rounds <= 6 ? '4-6' : r.rounds <= 9 ? '7-9' : r.rounds <= 12 ? '10-12' : '13+'; hist[b] = (hist[b] || 0) + 1; }
const lossRound = {}; for (const r of losses) { const b = r.rounds; lossRound[b] = (lossRound[b] || 0) + 1; }
console.log(JSON.stringify({
  params: P, games: N,
  winRate: pct(wins.length / N),
  avgRounds: avg('rounds').toFixed(1),
  roundsHist: hist,
  avgMeHpAtWin: wins.length ? (wins.reduce((a, r) => a + r.me, 0) / wins.length).toFixed(1) : '-',
  avgCpuHpAtLoss: losses.length ? (losses.reduce((a, r) => a + r.cpu, 0) / losses.length).toFixed(1) : '-',
  lossRoundTop: Object.entries(lossRound).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([r, n]) => `R${r}:${n}`).join(' '),
  perGame: { onemore: avg('onemore').toFixed(2), combos: avg('combos').toFixed(2), skills: avg('skills').toFixed(2), dmgDealtPerRound: (avg('dmgDealt') / avg('rounds')).toFixed(1), dmgTakenPerRound: (avg('dmgTaken') / avg('rounds')).toFixed(1) },
}, null, 1));
