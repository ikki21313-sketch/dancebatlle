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
function canAdd(key){const rank=+key.slice(1);return (RUN.deck[key]||0)<DECK_MAX_COPIES&&RUN.points>=ADD_COST[rank];}
function canRemove(key){const rank=+key.slice(1);return (RUN.deck[key]||0)>0&&deckTotal()-1>=DECK_MIN&&RUN.points>=REMOVE_COST[rank];}
function addCard(key){if(!canAdd(key))return;const rank=+key.slice(1);RUN.points-=ADD_COST[rank];RUN.deck[key]=(RUN.deck[key]||0)+1;buildNote(`${SUITS[key[0]].sym}${rankLabel(rank)} を1枚追加 (−${ADD_COST[rank].toLocaleString()})`);renderBuild();}
function removeCard(key){if(!canRemove(key))return;const rank=+key.slice(1);RUN.points-=REMOVE_COST[rank];RUN.deck[key]--;const c=REMOVE_COST[rank];buildNote(`${SUITS[key[0]].sym}${rankLabel(rank)} を1枚減らす (${c<0?'+'+(-c).toLocaleString():'−'+c.toLocaleString()})`);renderBuild();}
function buildNote(t){const n=$('buildNote');n.textContent=t;n.classList.remove('pop');void n.offsetWidth;n.classList.add('pop');}
function fmtCost(c){return c<0?`+${(-c).toLocaleString()}`:c.toLocaleString();}

function renderBuild(){
  $('buildPoints').textContent=RUN.points.toLocaleString();
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
      const key=suit+rank,n=RUN.deck[key]||0;
      const cell=document.createElement('span');cell.className='dg-cell'+(n?'':' zero');
      cell.innerHTML=`<button type="button" class="dg-btn" data-k="${key}" data-op="-" ${canRemove(key)?'':'disabled'} title="1枚減らす: ${fmtCost(REMOVE_COST[rank])}">−</button><b>${n}</b><button type="button" class="dg-btn" data-k="${key}" data-op="+" ${canAdd(key)?'':'disabled'} title="1枚追加: ${ADD_COST[rank].toLocaleString()}">+</button>`;
      row.appendChild(cell);
    }
    g.appendChild(row);
  }
  const costRow=document.createElement('div');costRow.className='dg-row cost';
  costRow.innerHTML='<span class="dg-suit">追加 / 減少</span>'+RANKS.map((_,i)=>`<span class="dg-cell"><small>${(ADD_COST[i+1]/1000).toFixed(ADD_COST[i+1]%1000?1:0)}k</small><small>${REMOVE_COST[i+1]<0?'+'+(-REMOVE_COST[i+1]/1000)+'k':(REMOVE_COST[i+1]/1000).toFixed(REMOVE_COST[i+1]%1000?1:0)+'k'}</small></span>`).join('');
  g.appendChild(costRow);
  const total=deckTotal();
  $('deckTotal').innerHTML=`デッキ <b>${total}</b> 枚 (${DECK_MIN}枚以上、同じカードは${DECK_MAX_COPIES}枚まで)`;
  $('deckTotal').classList.toggle('bad',total<DECK_MIN);
  /* skills */
  const sk=$('skillList');sk.innerHTML='';
  for(const k in SKILLS){
    const s=SKILLS[k],owned=skillOwned(k),lvl=s.levels?RUN.skills[k]:0;
    const li=document.createElement('li');li.className='sk'+(owned?' owned':'');
    li.innerHTML=`<div class="sk-body"><b>${s.name}${s.levels?` <span class="lv">Lv ${lvl}/${s.levels.length}</span>`:''}</b><span>${s.desc}</span></div>`
      +(owned?'<span class="sk-owned">習得済み</span>':`<button type="button" class="btn sk-buy" data-k="${k}" ${canBuySkill(k)?'':'disabled'}>${skillCost(k).toLocaleString()} pt</button>`);
    sk.appendChild(li);
  }
  $('buildNextBtn').disabled=total<DECK_MIN;
}
$('deckGrid').addEventListener('click',e=>{const b=e.target.closest('.dg-btn');if(!b||b.disabled)return;(b.dataset.op==='+'?addCard:removeCard)(b.dataset.k);});
$('skillList').addEventListener('click',e=>{const b=e.target.closest('.sk-buy');if(!b||b.disabled)return;buySkill(b.dataset.k);});
