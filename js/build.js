// デッキビルド画面(ステージ間): ポイントでカードの増減とスキル購入
function deckTotal(){return Object.values(RUN.deck).reduce((a,b)=>a+b,0);}
function skillCost(k){const s=SKILLS[k];return s.levels?s.levels[RUN.skills[k]]:s.cost;}
function skillOwned(k){const s=SKILLS[k];return s.levels?RUN.skills[k]>=s.levels.length:!!RUN.skills[k];}
function canBuySkill(k){return !skillOwned(k)&&RUN.points>=skillCost(k);}
function buySkill(k){
  if(!canBuySkill(k))return;
  const cost=skillCost(k);RUN.points-=cost;
  if(SKILLS[k].levels)RUN.skills[k]++;else RUN.skills[k]=true;
  buildNote(`${SKILLS[k].name} を習得 (−${cost.toLocaleString()})`);renderBuild();
}
/* BUILD0: the run as it was when this build screen opened — used for Reset and for highlighting changes */
let BUILD0=null;
function openBuild(){
  BUILD0={points:RUN.points,deck:{...RUN.deck},skills:{...RUN.skills}};
  /* checkpoint: the run right after the last stage clear, before any build edits — used by "ビルドからやり直す" on defeat */
  RUN.checkpoint={stage:S.stage,points:RUN.points,deck:{...RUN.deck},skills:{...RUN.skills},score:S.score,scoreLog:S.scoreLog.slice(),eyebrow:$('buildEyebrow').textContent};
  $('buildNote').textContent='';renderBuild();
}
/* defeat → go back to the build screen as it was after the previous stage clear */
function retryFromBuild(){
  const cp=RUN&&RUN.checkpoint;if(!cp)return;
  seq++;stopTimer();omfxHide();omfxHide('dgfx');stopFanfare();setSlowmo(false);
  RUN.points=cp.points;RUN.deck={...cp.deck};RUN.skills={...cp.skills};
  S.stage=cp.stage;S.score=cp.score;S.scoreLog=cp.scoreLog.slice();S.phase='over';
  $('buildEyebrow').textContent=cp.eyebrow;
  $('over').classList.remove('show');openBuild();buildNote('前のステージクリア直後の状態に戻しました');$('buildOver').classList.add('show');
}
function resetBuild(){if(!BUILD0)return;RUN.points=BUILD0.points;RUN.deck={...BUILD0.deck};RUN.skills={...BUILD0.skills};buildNote('この画面での変更を取り消しました');renderBuild();}
function canAdd(key){const rank=+key.slice(1);return (RUN.deck[key]||0)<DECK_MAX_COPIES&&RUN.points>=ADD_COST[rank];}
function canRemove(key){return (RUN.deck[key]||0)>0&&deckTotal()-1>=DECK_MIN;}
function addCard(key){if(!canAdd(key))return;const rank=+key.slice(1);RUN.points-=ADD_COST[rank];RUN.deck[key]=(RUN.deck[key]||0)+1;buildNote(`${SUITS[key[0]].sym}${rankLabel(rank)} を1枚追加 (−${ADD_COST[rank].toLocaleString()})`);renderBuild();}
function removeCard(key){if(!canRemove(key))return;const rank=+key.slice(1);RUN.points+=REMOVE_REFUND[rank];RUN.deck[key]--;buildNote(`${SUITS[key[0]].sym}${rankLabel(rank)} を1枚減らす (+${REMOVE_REFUND[rank].toLocaleString()})`);renderBuild();}
/* remove every copy of one rank across all suits */
function rankCount(rank){return DECK_SUITS.split('').reduce((a,s)=>a+(RUN.deck[s+rank]||0),0);}
function canRemoveRank(rank){const n=rankCount(rank);return n>0&&deckTotal()-n>=DECK_MIN;}
function removeRank(rank){if(!canRemoveRank(rank))return;const n=rankCount(rank);for(const s of DECK_SUITS)RUN.deck[s+rank]=0;RUN.points+=REMOVE_REFUND[rank]*n;buildNote(`${rankLabel(rank)} を ${n} 枚まとめて減らす (+${(REMOVE_REFUND[rank]*n).toLocaleString()})`);renderBuild();}
function buildNote(t){const n=$('buildNote');n.textContent=t;n.classList.remove('pop');void n.offsetWidth;n.classList.add('pop');}

function renderBuild(){
  $('buildPoints').textContent=RUN.points.toLocaleString();$('buildPoints').classList.toggle('changed',!!BUILD0&&RUN.points!==BUILD0.points);
  /* score breakdown of the stage just cleared */
  const bd=$('buildScore');bd.innerHTML='';
  if(S&&S.scoreLog){
    const agg={};for(const e of S.scoreLog){agg[e.label]=agg[e.label]||{n:0,pts:0};agg[e.label].n++;agg[e.label].pts+=e.pts;}
    for(const [label,v] of Object.entries(agg)){const li=document.createElement('li');li.innerHTML=`<span>${label}${v.n>1?` ×${v.n}`:''}</span><b>+${v.pts.toLocaleString()}</b>`;bd.appendChild(li);}
    const li=document.createElement('li');li.className='total';li.innerHTML=`<span>ステージ獲得</span><b>+${(S.score||0).toLocaleString()}</b>`;bd.appendChild(li);
  }
  /* deck grid */
  const g=$('deckGrid');g.innerHTML='';
  const head=document.createElement('div');head.className='dg-row head';head.innerHTML='<span class="dg-suit"></span>'+RANKS.map(r=>`<span class="dg-cell">${r}</span>`).join('');g.appendChild(head);
  for(const suit of DECK_SUITS){
    const row=document.createElement('div');row.className='dg-row';
    row.innerHTML=`<span class="dg-suit ${SUITS[suit].cls}">${SUITS[suit].sym} ${SUITS[suit].label}</span>`;
    for(let rank=1;rank<=13;rank++){
      const key=suit+rank,n=RUN.deck[key]||0,changed=!!BUILD0&&n!==(BUILD0.deck[key]||0);
      const cell=document.createElement('span');cell.className='dg-cell'+(n?'':' zero')+(changed?' changed':'');
      cell.innerHTML=`<button type="button" class="dg-btn" data-k="${key}" data-op="-" ${canRemove(key)?'':'disabled'} title="1枚減らす: +${REMOVE_REFUND[rank].toLocaleString()}">−</button><b>${n}</b><button type="button" class="dg-btn" data-k="${key}" data-op="+" ${canAdd(key)?'':'disabled'} title="1枚追加: −${ADD_COST[rank].toLocaleString()}">+</button>`;
      row.appendChild(cell);
    }
    g.appendChild(row);
  }
  const bulkRow=document.createElement('div');bulkRow.className='dg-row bulk';
  bulkRow.innerHTML='<span class="dg-suit">まとめて</span>'+RANKS.map((_,i)=>{const rank=i+1,n=rankCount(rank);return `<span class="dg-cell"><button type="button" class="dg-bulk" data-rank="${rank}" ${canRemoveRank(rank)?'':'disabled'} title="${rankLabel(rank)} を全スートまとめて減らす (+${(REMOVE_REFUND[rank]*n).toLocaleString()})">なくす</button></span>`;}).join('');
  g.appendChild(bulkRow);
  const k=v=>(v/1000).toFixed(v%1000?1:0)+'k';
  const costRow=document.createElement('div');costRow.className='dg-row cost';
  costRow.innerHTML='<span class="dg-suit">追加 / 返金</span>'+RANKS.map((_,i)=>`<span class="dg-cell"><small>−${k(ADD_COST[i+1])}</small><small>+${k(REMOVE_REFUND[i+1])}</small></span>`).join('');
  g.appendChild(costRow);
  const total=deckTotal(),total0=BUILD0?Object.values(BUILD0.deck).reduce((a,b)=>a+b,0):total;
  $('deckTotal').innerHTML=`デッキ <b>${total}</b> 枚 (${DECK_MIN}枚以上、同じカードは${DECK_MAX_COPIES}枚まで)`;
  $('deckTotal').classList.toggle('bad',total<DECK_MIN);$('deckTotal').classList.toggle('changed',total!==total0);
  /* skills */
  const sk=$('skillList');sk.innerHTML='';
  for(const k in SKILLS){
    const s=SKILLS[k],owned=skillOwned(k),lvl=s.levels?RUN.skills[k]:0;
    const changed=!!BUILD0&&RUN.skills[k]!==BUILD0.skills[k];
    const li=document.createElement('li');li.className='sk'+(owned?' owned':'')+(changed?' changed':'');
    li.innerHTML=`<div class="sk-body"><b>${s.name}${s.levels?` <span class="lv">Lv ${lvl}/${s.levels.length}</span>`:''}</b><span>${s.desc}</span></div>`
      +(owned?'<span class="sk-owned">習得済み</span>':`<button type="button" class="btn sk-buy" data-k="${k}" ${canBuySkill(k)?'':'disabled'}>${skillCost(k).toLocaleString()} pt</button>`);
    sk.appendChild(li);
  }
  $('buildNextBtn').disabled=total<DECK_MIN;
}
$('deckGrid').addEventListener('click',e=>{const b=e.target.closest('.dg-btn');if(!b||b.disabled)return;(b.dataset.op==='+'?addCard:removeCard)(b.dataset.k);});
$('skillList').addEventListener('click',e=>{const b=e.target.closest('.sk-buy');if(!b||b.disabled)return;buySkill(b.dataset.k);});
$('deckGrid').addEventListener('click',e=>{const b=e.target.closest('.dg-bulk');if(!b||b.disabled)return;removeRank(+b.dataset.rank);});
$('buildResetBtn').addEventListener('click',resetBuild);
