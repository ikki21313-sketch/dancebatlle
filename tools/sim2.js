// スートバトル ビルド別バランス計測(v2)
// 使い方: node tools/sim2.js [games per cell] [--stages 5] [--only 型名] [--policy optimal|mistake|all]
// 現行ルール(ステージ設定・敵スキル・コンボ・スキル8種・1moreスキップ)を再現し、
// ビルド型 × デッキの出来 × プレイングの質 ごとに、各ステージを「フルHPから単独で挑戦したときのクリア率」で出す。
// ステージ4・5は未定義なので Stage.md の傾向から仮置き(STAGES_EXTRA)。

const args = process.argv.slice(2);
const N = Number(args.find(a => /^\d+$/.test(a)) || 200);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const ONLY = opt('only'), POLICY = opt('policy') || 'all', STAGE_COUNT = Number(opt('stages') || 5), MISTAKE = Number(opt('mistake') || 0.25);
const SHIFT = Number(opt('shift') || 0);   // 調整実験用: 敵の出す数字の範囲を一律に +n (上限13)

let seed = 12345; const rng = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rnd = n => Math.floor(rng() * n), pick = a => a[rnd(a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------- rules (mirror of js/config.js, js/deck.js, js/game.js) ----------------
const ME_HP = 30, HAND = 6, BEATS = { D: 'S', S: 'C', C: 'D' }, SUITS = 'DSC';
const STAGES = [
  { name: 'S1 イッチメーン', cpu: 150, ranges: [[4, 3, 6], [6, 3, 8], [99, 7, 11]], skill: { cd: 4, hp: [100, 50], len: 1, cards: (lv) => ['D', 'C', 'S'].map(suit => ({ suit, rank: lv === 1 ? 13 : 14 })) } },
  { name: 'S2 ニーメン', cpu: 200, ranges: [[4, 5, 7], [6, 5, 9], [99, 7, 11]], skill: { cd: 4, hp: [150, 100, 50], len: 3, cards: (lv, turn) => { const suit = ['D', 'C', 'S'][turn - 1], r = lv === 1 ? 13 : 15; return [0, 1, 2].map(() => ({ suit, rank: r })); } } },
  { name: 'S3 ラストリオン', cpu: 300, ranges: [[4, 7, 10], [6, 7, 12], [99, 10, 13]], skill: { cd: 3, hp: [200, 100], len: 1, cards: (lv) => { const r = lv === 1 ? 13 : 15, w = lv === 1 ? 11 : 12, wi = rnd(3); return [0, 1, 2].map(i => i === wi ? { suit: 'H', rank: w } : { suit: pick(['D', 'C', 'S']), rank: r }); } } },
  // ---- 仮置き(未定義) ----
  { name: 'S4 (仮)', cpu: 400, ranges: [[4, 9, 11], [6, 9, 13], [99, 11, 13]], skill: { cd: 3, hp: [300, 200, 100], len: 2, cards: (lv, turn) => { const r = lv === 1 ? 14 : 15; return [0, 1, 2].map(() => ({ suit: pick(['D', 'C', 'S']), rank: r })); } } },
  { name: 'S5 (仮)', cpu: 500, ranges: [[4, 10, 13], [6, 11, 13], [99, 12, 13]], skill: { cd: 3, hp: [400, 300, 200, 100], len: 2, cards: (lv) => { const r = lv === 1 ? 15 : 16, w = lv === 1 ? 12 : 13, wi = rnd(3); return [0, 1, 2].map(i => i === wi ? { suit: 'H', rank: w } : { suit: pick(['D', 'C', 'S']), rank: r }); } } },
].slice(0, STAGE_COUNT);

function resolve(p, c, sk, mods = {}) {
  let pv = mods.base ?? p.rank, cv = c ? c.rank : 0, m = 1;
  if (c && c.suit !== 'H') { if (BEATS[p.suit] === c.suit) m = sk.adv4x ? 4 : 2; else if (BEATS[c.suit] === p.suit) cv *= 2; }
  if (sk.low2x && p.rank <= 6 && m < 2) m = 2;
  pv *= m; if (mods.mul) pv *= mods.mul; if (mods.add) pv += mods.add;
  const d = pv - cv; return { dmgCpu: d > 0 ? d : 0, dmgMe: d < 0 ? -d : 0, win: pv > cv };
}
function detectCombo(cards) {
  if (cards.every(c => c.rank === cards[0].rank)) return 'rev';
  if (cards.every(c => c.suit === cards[0].suit)) return { S: 'sword', D: 'diamond', C: 'clover' }[cards[0].suit];
  return null;
}
function skillPatterns(cards, inOneMore, hand, sk) {
  const suits = new Set(cards.map(c => c.suit)).size, same = cards.every(c => c.rank === cards[0].rank);
  const out = { mods: [{}, {}, {}] };
  if (sk.tripleAce && same && cards[0].rank === 1 && suits === 3) { const sum = hand.filter(c => !cards.includes(c)).reduce((a, c) => a + c.rank, 0); out.mods = out.mods.map(() => ({ base: sum })); }
  if (sk.triple7 && same && cards[0].rank === 7 && suits === 3) out.triple7 = true;
  if (sk.royal && suits === 1 && [11, 12, 13].every(r => cards.some(c => c.rank === r))) out.mods = out.mods.map(m => ({ ...m, add: (m.add || 0) + 50 }));
  if (sk.special && inOneMore && same && suits === 3) out.mods = out.mods.map(m => ({ ...m, mul: (m.mul || 1) * 3 }));
  return out;
}
function applyCombo(S, k, rest) {
  const bySuit = s => rest.filter(c => c.suit === s);
  if (k === 'sword') { for (const s of SUITS) { const cs = bySuit(s); if (cs.length) cs.reduce((a, b) => b.rank < a.rank ? b : a).rank = 13; } S.handMax++; }
  else if (k === 'diamond') { for (const s of SUITS) { const cs = bySuit(s); if (cs.length) { const h = cs.reduce((a, b) => b.rank > a.rank ? b : a); S.hand.push({ suit: s, rank: h.rank }); } } S.handMax++; }
  else if (k === 'clover') { const g = SUITS.split('').map(s => bySuit(s)).filter(cs => cs.length); if (g.length) { const min = Math.min(...g.map(cs => cs.length)); g.filter(cs => cs.length === min).forEach(cs => cs.forEach(c => c.rank = 13)); } S.handMax++; }
}
function draw(S) { if (!S.deck.length) { if (!S.discard.length) return null; S.deck = shuffle(S.discard); S.discard = []; } return S.deck.pop(); }
function refill(S) { while (S.hand.length < S.handMax) { const c = draw(S); if (!c) break; S.hand.push(c); } }
function cpuDeal(S, st) { const rg = st.ranges.find(r => S.round <= r[0]); const lo = Math.min(13, rg[1] + SHIFT), hi = Math.min(13, rg[2] + SHIFT); return [0, 1, 2].map(() => ({ suit: SUITS[rnd(3)], rank: lo + rnd(hi - lo + 1) })); }

// ---------------- policies ----------------
function perms3(arr) { const out = []; for (let i = 0; i < arr.length; i++) for (let j = 0; j < arr.length; j++) if (j !== i) for (let k = 0; k < arr.length; k++) if (k !== i && k !== j) out.push([arr[i], arr[j], arr[k]]); return out; }
function evalTrio(S, trio, field, sk, inOneMore) {
  const combo = detectCombo(trio), pat = skillPatterns(trio, inOneMore, S.hand, sk);
  let dc = 0, dm = 0, wins = 0;
  for (let i = 0; i < 3; i++) { const c = (inOneMore || combo === 'rev') ? null : field[i]; const r = resolve(trio[i], c, sk, pat.mods[i]); dc += r.dmgCpu; dm += r.dmgMe; if (r.win) wins++; }
  const suits = new Set(trio.map(c => c.suit)).size;
  const rest = S.hand.filter(c => !trio.includes(c));
  let score = dc - 1.6 * dm;
  if (!inOneMore && wins === 3 && suits === 3) score += Math.min(3, rest.length) ? rest.map(c => c.rank).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) * 0.8 + 4 : 4;
  if (combo && combo !== 'rev') score += 6;
  if (pat.triple7) score += 12;
  if (dm >= S.me) score -= 1000;
  return { score, dc, dm, wins };
}
function chooseOptimal(S, field, sk) {
  let best = null, bs = -1e9;
  const hand = S.hand.length > 9 ? S.hand.slice().sort((a, b) => b.rank - a.rank).slice(0, 9) : S.hand; // cap the search
  for (const trio of perms3(hand)) { const e = evalTrio(S, trio, field, sk, false); if (e.score > bs) { bs = e.score; best = trio; } }
  return best;
}
// 「型は理解しているがミスをする」: 通常は最適手。確率MISTAKEでそのラウンドは目先の1枚ずつ選び(1moreやパターンを見落とす)、
// さらにその半分は1枚を完全に間違える(急いで押した)
function chooseMistake(S, field, sk) {
  if (rng() >= MISTAKE) return chooseOptimal(S, field, sk);
  const hand = S.hand.slice(), out = [];
  for (let i = 0; i < 3; i++) {
    let p;
    if (rng() < 0.5) p = hand[rnd(hand.length)];
    else { let b = null, bs = -1e9; for (const c of hand) { const r = resolve(c, field[i], sk); const s = r.dmgCpu - 1.6 * r.dmgMe; if (s > bs) { bs = s; b = c; } } p = b; }
    out.push(p); hand.splice(hand.indexOf(p), 1);
  }
  return out;
}
function chooseOneMore(S, sk, optimal) {
  if (S.hand.length < 3) return null;
  if (optimal) {
    let best = null, bs = -1e9;
    const hand = S.hand.length > 9 ? S.hand.slice().sort((a, b) => b.rank - a.rank).slice(0, 9) : S.hand;
    for (const trio of perms3(hand)) { const e = evalTrio(S, trio, null, sk, true); if (e.score > bs) { bs = e.score; best = trio; } }
    // skip when the payoff is small and the hand is thin: keep cards for affinity plays
    if (bs < 12 && S.hand.length <= 5 && S.cpu > bs) return null;
    return best;
  }
  // mistake player in 1more: usually the optimal 1more, sometimes just the 3 biggest cards (misses patterns / never skips)
  if (rng() >= MISTAKE) return chooseOneMore(S, sk, true);
  return S.hand.slice().sort((a, b) => b.rank - a.rank).slice(0, 3);
}

// ---------------- one stage ----------------
function playStage(st, deckCounts, sk, optimal) {
  const deck = []; for (const k in deckCounts) for (let i = 0; i < deckCounts[k]; i++) deck.push({ suit: k[0], rank: +k.slice(1) });
  const S = { me: ME_HP, cpu: st.cpu, deck: shuffle(deck), discard: [], hand: [], handMax: HAND + (sk.draw || 0), round: 0,
    skillActive: false, skillRounds: 0, skillLevel: 0, skillCd: st.skill.cd, hpTrigger: false, hpTriggers: st.skill.hp.slice().sort((a, b) => b - a) };
  refill(S);
  while (S.round < 60) {
    S.round++;
    if (!S.skillActive) { S.skillCd--; if (S.skillCd <= 0 || S.hpTrigger) { S.hpTrigger = false; S.skillActive = true; S.skillRounds = st.skill.len; S.skillLevel++; } }
    const field = S.skillActive ? st.skill.cards(S.skillLevel, st.skill.len - S.skillRounds + 1) : cpuDeal(S, st);
    let trio = optimal ? chooseOptimal(S, field, sk) : chooseMistake(S, field, sk);
    if (!trio) break;
    let oneMore = false, chainReady = false, triple7Ready = false, dead = false;
    for (let pass = 0; pass < 4; pass++) {           // normal battle + up to 3 extra 1mores
      const combo = detectCombo(trio), rest = S.hand.filter(c => !trio.includes(c));
      if (combo && combo !== 'rev') applyCombo(S, combo, rest);
      const pat = skillPatterns(trio, oneMore, S.hand, sk); if (pat.triple7) triple7Ready = true;
      let wins = 0;
      for (let i = 0; i < 3; i++) {
        const c = (oneMore || combo === 'rev') ? null : field[i], r = resolve(trio[i], c, sk, pat.mods[i]);
        S.cpu -= r.dmgCpu; S.me -= r.dmgMe; if (r.win) wins++;
        while (S.cpu > 0 && S.hpTriggers.length && S.cpu <= S.hpTriggers[0]) { S.hpTriggers.shift(); if (!S.skillActive) S.hpTrigger = true; }
        if (S.me <= 0 || S.cpu <= 0) { dead = true; break; }
      }
      for (const c of trio) { S.hand.splice(S.hand.indexOf(c), 1); S.discard.push(c); }
      if (dead) break;
      let again = false;
      if (!oneMore && wins === 3 && new Set(trio.map(c => c.suit)).size === 3) { again = true; chainReady = !!sk.chain && trio.every(c => c.rank >= 7); }
      else if (oneMore && triple7Ready) { triple7Ready = false; refill(S); again = true; }
      else if (oneMore && chainReady) { chainReady = false; again = true; }
      if (!again) break;
      oneMore = true;
      trio = chooseOneMore(S, sk, optimal);
      if (!trio) break;                                  // skipped
    }
    if (dead) break;
    if (S.skillActive) { S.skillRounds--; if (S.skillRounds <= 0) { S.skillActive = false; S.skillCd = st.skill.cd; S.handMax++; } }
    refill(S);
  }
  return { win: S.cpu <= 0, rounds: S.round };
}

// ---------------- builds ----------------
const counts = (spec) => { const d = {}; for (const [ranks, suits, n] of spec) for (const s of suits) for (const r of ranks) d[s + r] = (d[s + r] || 0) + n; return d; };
const R = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const BASE = counts([[R(3, 10), 'DSC', 1]]);
const BUILDS = {
  '初期デッキ': { deck: BASE, skills: {}, variant: null },
  'ロー2倍型(6以下×2)': { deck: counts([[[5, 6], 'DSC', 4], [[3, 4], 'DSC', 1]]), skills: { low2x: 1, draw: 1 },
    variant: { deck: counts([[[5, 6], 'DSC', 4], [[3, 4], 'DSC', 1]]), skills: { draw: 1 } } },
  '相性4倍型': { deck: counts([[R(7, 10), 'DSC', 2]]), skills: { adv4x: 1, draw: 1 },
    variant: { deck: counts([[R(7, 10), 'D', 4], [R(7, 10), 'SC', 1]]), skills: { adv4x: 1, draw: 1 } } },
  'ドロー型(+3・連鎖)': { deck: counts([[R(5, 10), 'DSC', 1], [R(7, 10), 'DSC', 1]]), skills: { draw: 3, chain: 1 },
    variant: { deck: counts([[R(5, 10), 'DSC', 1], [R(7, 10), 'DSC', 1]]), skills: { draw: 1 } } },
  'ロイヤル型(JQK)': { deck: counts([[R(11, 13), 'DSC', 2], [[9, 10], 'DSC', 1]]), skills: { royal: 1, chain: 1 },
    variant: { deck: counts([[R(11, 13), 'DSC', 1], [R(7, 10), 'DSC', 1]]), skills: { royal: 1 } } },
  'トリプル7型': { deck: counts([[[7], 'DSC', 6], [[8], 'DSC', 2]]), skills: { triple7: 1, special: 1, chain: 1 },
    variant: { deck: counts([[[7], 'DSC', 3], [R(5, 10), 'DSC', 1]]), skills: { triple7: 1 } } },
  'トリプルエース型': { deck: counts([[[1], 'DSC', 6], [[6], 'DSC', 2]]), skills: { tripleAce: 1, draw: 3 },
    variant: { deck: counts([[[1], 'DSC', 3], [R(3, 10), 'DSC', 1]]), skills: { tripleAce: 1 } } },
};

// ---------------- run ----------------
const pct = x => (x * 100).toFixed(0).padStart(3) + '%';
const policies = POLICY === 'all' ? [['最適', true], ['ミス' + Math.round(MISTAKE * 100) + '%', false]] : [[POLICY, POLICY === 'optimal']];
console.log(`games/cell=${N}  stages=${STAGES.length}  (S4/S5 は仮置き)`);
console.log('目標: 型×最適 90%+ / 型×ミス 65% / 近い型×最適 70-80% / 近い型×ミス 30% / 初期デッキ 10%\n');
const header = ['ビルド', 'デッキ', 'プレイ', ...STAGES.map(s => s.name.split(' ')[0]), '平均R'].join('\t');
console.log(header);
for (const [name, b] of Object.entries(BUILDS)) {
  if (ONLY && !name.includes(ONLY)) continue;
  const rows = [['型どおり', b.deck, b.skills]]; if (b.variant) rows.push(['少し違う', b.variant.deck, b.variant.skills]);
  for (const [label, deck, skills] of rows) for (const [pname, optimal] of policies) {
    const cells = [], rounds = [];
    for (const st of STAGES) { let w = 0, rs = 0; for (let g = 0; g < N; g++) { const r = playStage(st, deck, skills, optimal); if (r.win) w++; rs += r.rounds; } cells.push(pct(w / N)); rounds.push(rs / N); }
    console.log([name, label, pname, ...cells, (rounds.reduce((a, b) => a + b, 0) / rounds.length).toFixed(1)].join('\t'));
  }
}
