// カード・山札・手札のルール(コンボ判定, CPUの場, 相性の解決)
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function newDeck(){const d=[];for(const s of DECK_SUITS)for(let r=MIN_RANK;r<=MAX_RANK;r++)d.push({id:++uid,suit:s,rank:r});return shuffle(d);}
function drawOne(){if(!S.deck.length){if(!S.discard.length)return null;S.deck=shuffle(S.discard);S.discard=[];}return S.deck.pop();}
function refill(){while(S.hand.length<S.handMax){const c=drawOne();if(!c)break;S.hand.push(c);}sortHand();}
/* combos: what do the 3 played cards form? */
function detectCombo(cards){
  if(cards.length!==3)return null;
  if(cards.every(c=>c.rank===cards[0].rank))return 'rev';
  if(cards.every(c=>c.suit===cards[0].suit))return {S:'sword',D:'diamond',C:'clover'}[cards[0].suit]||null;
  return null;
}

function cpuDeal(){const max=S.round<=EARLY_ROUNDS?EARLY_MAX_RANK:MAX_RANK;return [0,1,2].map(()=>({id:++uid,suit:'DSC'[Math.floor(Math.random()*3)],rank:MIN_RANK+Math.floor(Math.random()*(max-MIN_RANK+1))}));}
function cardName(c){return SUITS[c.suit].sym+rankLabel(c.rank);}
function skillDeal(){const r=SKILL_BASE_RANK+S.skillLevel-1;return 'DCS'.split('').map(suit=>({id:++uid,suit,rank:r,skill:true}));}

function sortHand(){S.hand.sort((a,b)=>SUIT_ORDER[a.suit]-SUIT_ORDER[b.suit]||b.rank-a.rank);}

/* rules */
function resolve(p,c,label){
  const pt=SUITS[p.suit].type,heal=pt==='heal'?p.rank:0;
  let pv=pt==='heal'?0:p.rank,cv=c?c.rank:0,mul='';
  if(c){const ct=SUITS[c.suit].type;
    if(BEATS[pt]===ct){pv*=2;mul='相性 ×2';}
    else if(BEATS[ct]===pt){cv*=2;mul='相性負け';}
  }else{mul=label||'1more';}
  const diff=pv-cv;
  return {pv,cv,heal,mul,dmgCpu:diff>0?diff:0,dmgMe:diff<0?-diff:0,win:pv>cv};
}
