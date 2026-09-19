// 描画(カード要素, 画面全体の再描画, タイマー表示, ログ)
function renderPause(){
  const on=pausedLeft!==null;
  $('pauseBtn').textContent=on?'▶ タイマー再開':'⏸ タイマー停止';$('pauseBtn').classList.toggle('on',on);
  $('sec').classList.toggle('paused',on);
  if(on){$('sec').textContent=(pausedLeft/1000).toFixed(1)+' ⏸';}
}
function renderTimer(left){
  const s=(left/1000).toFixed(1),urg=left<3000;
  $('sec').textContent=s;$('sec').classList.toggle('urgent',urg);
  const b=$('tbar');b.style.width=(left/S.limit*100)+'%';b.classList.toggle('urgent',urg);
}

function log(t,cls){const li=document.createElement('li');li.textContent=t;if(cls)li.className=cls;const o=$('log');o.appendChild(li);o.scrollTop=o.scrollHeight;}

/* ---- render ---- */
function cardEl(c,small){
  const s=SUITS[c.suit],d=document.createElement('div');
  d.className='card '+s.cls+(small?' sm':'');
  const rk=rankLabel(c.rank);if(c.skill)d.classList.add('skill');if(c.chest)d.classList.add('chest');
  d.innerHTML=`<div class="corner">${rk}<span>${s.sym}</span></div>`
    +`<div class="mid"><span class="hand-ico">${s.ico}</span><span class="lbl">${s.label}</span></div>`
    +`<div class="corner bottom">${rk}<span>${s.sym}</span></div>`;
  if(c.buff){const b=document.createElement('span');b.className='buff-tag';b.textContent={sword:'⚔ K化',copy:'◆ 複製',clover:'♣ K化'}[c.buff]||c.buff;d.appendChild(b);}
  if(c.skill){const b=document.createElement('span');b.className='buff-tag';b.textContent='SKILL';d.appendChild(b);}
  if(c.chest){const b=document.createElement('span');b.className='chest-tag';b.title='倒すとカードを1枚獲得';
    b.innerHTML='<svg viewBox="0 0 34 30" aria-hidden="true"><rect x="2" y="11" width="30" height="17" rx="3" fill="#8a5a1e" stroke="#f2c100" stroke-width="2"/><path d="M2 14 a15 9 0 0 1 30 0 v3 H2z" fill="#c8901f" stroke="#f2c100" stroke-width="2"/><rect x="2" y="15" width="30" height="3" fill="#f2c100"/><rect x="14" y="13" width="6" height="8" rx="1.5" fill="#fff3b0" stroke="#3a2600" stroke-width="1"/><circle cx="17" cy="16" r="1.2" fill="#3a2600"/></svg><span>TREASURE</span>';
    d.appendChild(b);}
  if(c.spawn)d.classList.add('spawn');else if(c.flash)d.classList.add('buffed');else if(c.done)d.classList.add('buffdone');
  if(c.fxLabel){const f=document.createElement('span');f.className='fx-label'+(c.done?' static':'');f.textContent=c.fxLabel;d.appendChild(f);}
  return d;
}
function backEl(){const d=document.createElement('div');d.className='card back';d.innerHTML='<span class="q">0</span>';return d;}
function render(){
  const sel=S.phase==='select'||S.phase==='onemore';
  const cpuMax=S.cpuMax||MAX_CPU,meMax=S.meMax||MAX_ME;
  $('stageLbl').textContent=`${STAGES[S.stage||0].name} / ${STAGES.length}`;$('cpuName').textContent=STAGES[S.stage||0].enemy;$('scoreLbl').textContent=`SCORE ${(S.score||0).toLocaleString()}`;
  $('cpuHp').innerHTML=`${S.cpu}<small> / ${cpuMax}</small>`;$('meHp').innerHTML=`${S.me}<small> / ${meMax}</small>`;
  const cb=$('cpuBar'),mb=$('meBar');cb.style.width=(S.cpu/cpuMax*100)+'%';mb.style.width=(S.me/meMax*100)+'%';
  cb.classList.toggle('low',S.cpu<=cpuMax*.3);
  /* skill ticks: one vertical bar per HP threshold; consumed ones go dim */
  const ticks=$('cpuTicks');ticks.innerHTML='';const all=STAGES[S.stage||0].skill.hp,left=S.hpTriggers||[];
  for(const th of all){const t=document.createElement('i');t.style.left=(th/cpuMax*100)+'%';t.title=`HP ${th} でスキル発動`;if(!left.includes(th))t.classList.add('used');ticks.appendChild(t);}mb.classList.toggle('low',S.me<=meMax*.3);
  const dealing=S.phase==='deal';
  $('field').classList.toggle('om',S.onemore);$('field').classList.toggle('enemy',!!S.skillActive);
  for(let i=0;i<3;i++){
    const c=$('c'+i),m=$('m'+i),v=$('v'+i),lane=$('l'+i);
    c.innerHTML='';m.innerHTML='';c.className='slot';m.className='slot';
    lane.classList.toggle('active',S.clash===i);
    const r=S.results[i];
    if(S.blown&&S.cpuField[i]){const e=cardEl(S.cpuField[i]);e.classList.add('blown');e.style.setProperty('--bx',((i-1)*160+60)+'px');e.style.setProperty('--br',(i%2?-1:1)*540+'deg');c.appendChild(e);}
    else if(S.onemore||S.revolution){const e=backEl();if(r&&r.dmgCpu)e.style.visibility='hidden';c.appendChild(e);}
    else if(S.cpuField[i]&&(!dealing||i<S.dealt)){
      const e=cardEl(S.cpuField[i]);
      if(dealing&&i===S.dealt-1)e.classList.add('deal');
      if(S.clash===i)e.classList.add('clash-cpu');
      /* the loser has been blown off the table (fx.js blowAway): keep the slot's size, hide the card */
      if(r&&r.dmgCpu)e.style.visibility='hidden';else if(r&&r.dmgMe)e.classList.add('won');
      c.appendChild(e);
    }else if(S.phase!=='intro'){c.className='slot empty';c.textContent='CPU';}
    if(S.picked[i]){
      const e=cardEl(S.picked[i]);
      if(S.clash===i){e.classList.add('clash-me');if(S.onemore)e.classList.add('big');}
      if(r&&r.dmgMe)e.style.visibility='hidden';else if(r&&r.dmgCpu)e.classList.add('won');
      m.appendChild(e);
    }else{m.className='slot empty';m.textContent=`${i+1}枚目`;}
    v.className='verdict';
    if(!r)v.innerHTML='';
    else{
      v.classList.add('pop');
      if(r.dmgCpu){v.classList.add('win');v.innerHTML=`<b>−${r.dmgCpu}</b><span class="tag">CPUへ${r.mul?' ・ '+r.mul:''}</span>`;}
      else if(r.dmgMe){v.classList.add('lose');v.innerHTML=`<b>−${r.dmgMe}</b><span class="tag">あなたへ${r.mul?' ・ '+r.mul:''}</span>`;}
      else if(r.heal){v.classList.add('heal');v.innerHTML=`<b>+${r.heal}</b><span class="tag">回復</span>`;}
      else v.innerHTML='<b>=</b><span class="tag">引き分け</span>';
      if(r.heal&&r.dmgMe)v.innerHTML+=`<span class="tag" style="color:var(--gold)">♥ +${r.heal} 回復</span>`;
    }
  }
  const h=$('hand');h.innerHTML='';h.classList.toggle('dim',!sel&&S.phase!=='combo');h.classList.toggle('combo',S.phase==='combo');
  const target=(S.phase==='select'&&S.picked.length<3)?S.cpuField[S.picked.length]:null;
  const tType=target?SUITS[target.suit].type:null;
  S.hand.forEach(c=>{
    const e=cardEl(c,true);e.tabIndex=sel?0:-1;
    const k=S.picked.indexOf(c);
    if(k>=0){e.classList.add('picked');e.dataset.order=k+1;}
    else if(!sel||S.picked.length>=3)e.classList.add('locked');
    else if(tType&&BEATS[SUITS[c.suit].type]===tType){
      e.classList.add('adv');
      const ring=document.createElement('span');ring.className='ring';e.appendChild(ring);
      const tag=document.createElement('span');tag.className='adv-tag';tag.textContent=`${S.picked.length+1}枚目 有利`;e.appendChild(tag);
    }
    else if(tType&&BEATS[tType]===SUITS[c.suit].type){
      e.classList.add('dis');
      const tag=document.createElement('span');tag.className='dis-tag';tag.textContent=`${S.picked.length+1}枚目 不利`;e.appendChild(tag);
    }
    e.addEventListener('click',()=>toggle(c));
    e.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();toggle(c);}});
    h.appendChild(e);
  });
  $('deckCnt').innerHTML=`山札 ${S.deck.length} ・ 手札 ${S.hand.length}/${S.handMax}${S.handMax>HAND?' <b>上限+'+(S.handMax-HAND)+'</b>':''}`;
  $('goBtn').disabled=!(sel&&S.picked.length===3);$('clearBtn').disabled=!sel||!S.picked.length;
  $('pauseBtn').disabled=!sel;renderPause();
  $('skipBtn').hidden=S.phase!=='onemore';
  $('lim').textContent=`制限 ${S.limit/1000}秒`;$('lim').classList.toggle('hot',S.limit<=10000);
  const comboNames=detectCombos(S.picked).map(k=>COMBO_NAME[k]).join(' + ');
  const hints={intro:'準備中…',deal:'CPUがカードを出しています…',select:S.picked.length<3?`手札から3枚を順番に選ぶ (${S.picked.length}/3) ・ 光る枠は${S.picked.length+1}枚目に有利 ・ ▼は不利(相手が2倍)`:(comboNames?`コンボ成立: ${comboNames} 決定で発動`:'3枚選択済み。決定を押してください'),combo:'コンボ発動!',onemore:'1more! 好きな3枚を選ぶ(数字がそのままダメージ)',battle:'バトル中…',over:'決着'};
  if(S.phase==='onemore'&&S.picked.length===3&&comboNames)hints.onemore=`コンボ成立: ${comboNames} 決定で発動`;
  if(sel&&S.picked.length===3){const pat=skillPatterns(S.picked,S.phase==='onemore',S.hand);if(pat.cutins.length)hints[S.phase]=`スキル成立: ${pat.cutins.map(c=>c[0]).join(' + ')}`+(comboNames?` + ${comboNames}`:'')+' 決定で発動';}
  $('hint').textContent=hints[S.phase]||'';
  if(!sel){$('sec').textContent='--';$('tbar').style.width='0%';pausedLeft=null;renderPause();}
}
