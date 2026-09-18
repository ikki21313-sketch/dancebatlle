// カード・山札・手札のルール(コンボ判定, CPUの場, 相性の解決)
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function newDeck(){const counts=(typeof RUN!=='undefined'&&RUN)?RUN.deck:baseDeckCounts();const d=[];for(const k in counts){const suit=k[0],rank=+k.slice(1);for(let i=0;i<counts[k];i++)d.push({id:++uid,suit,rank});}return shuffle(d);}
function drawOne(){if(!S.deck.length){if(!S.discard.length)return null;S.deck=shuffle(S.discard);S.discard=[];}return S.deck.pop();}
function refill(){while(S.hand.length<S.handMax){const c=drawOne();if(!c)break;S.hand.push(c);}sortHand();}
/* combos: what do the 3 played cards form? */
function detectCombo(cards){
  if(cards.length!==3)return null;
  if(cards.every(c=>c.rank===cards[0].rank))return 'rev';
  if(cards.every(c=>c.suit===cards[0].suit))return {S:'sword',D:'diamond',C:'clover'}[cards[0].suit]||null;
  return null;
}

function stageCfg(){return STAGES[S.stage||0];}
/* enemy plays 3 random cards inside the stage's range for this round (the enemy 'deck' is a range, not a pile) */
function cpuDeal(){const rg=stageCfg().ranges.find(r=>S.round<=r.until);return [0,1,2].map(()=>({id:++uid,suit:'DSC'[Math.floor(Math.random()*3)],rank:rg.min+Math.floor(Math.random()*(rg.max-rg.min+1))}));}
function cardName(c){return SUITS[c.suit].sym+rankLabel(c.rank);}
function skillDeal(){const sk=stageCfg().skill,turn=sk.len-S.skillRounds+1;return sk.cards(S.skillLevel,turn).map(c=>({id:++uid,suit:c.suit,rank:c.rank,skill:true}));}

function sortHand(){S.hand.sort((a,b)=>SUIT_ORDER[a.suit]-SUIT_ORDER[b.suit]||b.rank-a.rank);}

/* rules */
function resolve(p,c,label){
  const pt=SUITS[p.suit].type,heal=pt==='heal'?p.rank:0;
  let pv=pt==='heal'?0:p.rank,cv=c?c.rank:0,mul='';
  const sk=(typeof RUN!=='undefined'&&RUN)?RUN.skills:{};
  let m=1;
  if(c){const ct=SUITS[c.suit].type;
    if(BEATS[pt]===ct){m=sk.adv4x?4:2;mul='相性 ×'+m;}
    else if(BEATS[ct]===pt){cv*=2;mul='相性負け';}
  }else{mul=label||'1more';}
  if(sk.low2x&&p.rank<=6&&m<2){m=2;mul=(mul?mul+' ':'')+'6以下×2';}
  pv*=m;
  const diff=pv-cv;
  return {pv,cv,heal,mul,dmgCpu:diff>0?diff:0,dmgMe:diff<0?-diff:0,win:pv>cv};
}
