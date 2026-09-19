// ゲーム進行(状態, ラウンド, 選択, バトル, コンボ, 敵スキル, タイマー, 決着)
let S=null,timerId=null,uid=0,seq=0;
/* RUN: carried across stages (points, deck composition, skills). S: one battle */
let RUN=null;
function newRun(){RUN={points:0,deck:baseDeckCounts(),owned:baseDeckCounts(),skills:{low2x:false,adv4x:false,draw:0,chain:false,tripleAce:false,triple7:false,royal:false,special:false,hp:0},checkpoint:null};}
function addScore(key,label){
  const pts=SCORE[key];S.score+=pts;S.scoreLog.push({label,pts});
  log(`　+${pts.toLocaleString()} ${label}`,'gold');scoreToast(label,pts);$('scoreLbl').textContent=`SCORE ${S.score.toLocaleString()}`;
}
/* end of a round (after any 1more): per-round damage bonus */
function endRoundScoring(){
  if(S.roundDmg>=30)addScore('round30','1ターンで30ダメージ以上');
  else if(S.roundDmg>=20)addScore('round20','1ターンで20ダメージ以上');
  S.roundDmg=0;
}

async function runCombo(k,my){
  const prev=S.phase;S.phase='combo';render();
  const rest=S.hand.filter(c=>!S.picked.includes(c));
  const bySuit=suit=>rest.filter(c=>c.suit===suit);
  const note=(step)=>{const n=$('comboNote');n.hidden=false;n.className='combo-note '+k;$('comboNoteName').textContent=COMBO_NAME[k];$('comboNoteStep').textContent=step;};
  const settle=(...cs)=>cs.forEach(c=>{c.flash=false;c.spawn=false;c.done=true;c.fxLabel='';});
  const bumpMax=async(n)=>{S.handMax+=n;note(`手札の上限 +${n} → ${S.handMax}枚。毎ラウンド上限まで補充`);render();await wait(BEAT*3);};
  if(k==='rev'){
    log('コンボ! Three Card Revolution! 相手のカードが吹き飛ぶ','gold');
    sfx('onemore');await cutIn(COMBO_NAME.rev,'rev',5,COMBO_DESC.rev);if(my!==seq)return;
    note('相手の3枚が吹き飛ぶ! 3枚ともフルダメージ → そのまま1more');
    if(!S.onemore){S.blown=true;render();await wait(BEAT*2.4);if(my!==seq)return;S.blown=false;S.revolution=true;render();}
    await wait(BEAT*1.5);if(my!==seq)return;
  }else if(k==='sword'){
    sfx('slash');await cutIn(COMBO_NAME.sword,'sword',5,COMBO_DESC.sword);if(my!==seq)return;
    const hit=[];
    for(const suit of 'DSC'){const cs=bySuit(suit);if(!cs.length)continue;
      const low=cs.reduce((a,b)=>b.rank<a.rank?b:a);
      note(`${SUITS[suit].sym}の一番低い ${cardName(low)} → K`);
      low.flash=true;low.fxLabel=`${rankLabel(low.rank)} → K`;if(low.origRank==null)low.origRank=low.rank;low.rank=13;low.buff='sword';hit.push(`${cardName(low)}`);
      render();await wait(BEAT*2.6);if(my!==seq)return;settle(low);}
    if(!hit.length){note('対象の手札がありません');render();await wait(BEAT*2);}
    log(`コンボ! Sword Combo! K化: ${hit.length?hit.join('  '):'なし'}`,'gold');addScore('combo','緑コンボ (Sword)');
    await bumpMax(1);if(my!==seq)return;
    log(`　手札上限が ${S.handMax} 枚に`,'gold');
  }else if(k==='diamond'){
    await cutIn(COMBO_NAME.diamond,'diamond',5,COMBO_DESC.diamond);if(my!==seq)return;
    const hit=[];
    for(const suit of 'DSC'){const cs=bySuit(suit);if(!cs.length)continue;
      const high=cs.reduce((a,b)=>b.rank>a.rank?b:a);
      note(`${SUITS[suit].sym}の一番高い ${cardName(high)} を複製`);
      high.flash=true;high.fxLabel='複製!';render();await wait(BEAT*1.6);if(my!==seq)return;
      const clone={id:++uid,suit,rank:high.rank,buff:'copy',spawn:true,fxLabel:'+1'};S.hand.push(clone);hit.push(cardName(high));
      sortHand();render();await wait(BEAT*2.6);if(my!==seq)return;settle(high,clone);}
    if(!hit.length){note('対象の手札がありません');render();await wait(BEAT*2);}
    log(`コンボ! Diamond Combo! 複製: ${hit.length?hit.join('  '):'なし'}`,'gold');addScore('combo','赤コンボ (Diamond)');
    await bumpMax(1);if(my!==seq)return;
    log(`　手札上限が ${S.handMax} 枚に`,'gold');
  }else if(k==='clover'){
    await cutIn(COMBO_NAME.clover,'clover',5,COMBO_DESC.clover);if(my!==seq)return;
    const counts='DSC'.split('').map(suit=>({suit,cs:bySuit(suit)})).filter(x=>x.cs.length);
    const hit=[];
    if(counts.length){
      const min=Math.min(...counts.map(x=>x.cs.length));
      const targets=counts.filter(x=>x.cs.length===min);
      note(`一番枚数が少ないスート: ${targets.map(x=>SUITS[x.suit].sym+'×'+min).join(' と ')} → すべて K`);
      render();await wait(BEAT*2);if(my!==seq)return;
      for(const t of targets){
        for(const c of t.cs){c.flash=true;c.fxLabel=`${rankLabel(c.rank)} → K`;if(c.origRank==null)c.origRank=c.rank;c.rank=13;c.buff='clover';hit.push(cardName(c));}
        note(`${SUITS[t.suit].sym}の ${t.cs.length} 枚がすべて K に`);
        render();await wait(BEAT*2.8);if(my!==seq)return;settle(...t.cs);}
    }else{note('対象の手札がありません');render();await wait(BEAT*2);}
    log(`コンボ! Clover Combo! K化: ${hit.length?hit.join('  '):'なし'}`,'gold');addScore('combo','青コンボ (Clover)');
    await bumpMax(1);if(my!==seq)return;
    log(`　手札上限が ${S.handMax} 枚に`,'gold');
  }
  S.hand.forEach(c=>{delete c.flash;delete c.spawn;delete c.done;delete c.fxLabel;});
  sortHand();$('comboNote').hidden=true;
  S.phase=prev;render();
}

async function maybeEnemySkill(my){
  if(S.skillActive)return;
  const sk=stageCfg().skill;
  if(!S.hpTrigger)return;   /* no cooldown: only HP thresholds trigger the skill */
  S.hpTrigger=false;S.skillActive=true;S.skillRounds=sk.len;S.skillLevel++;
  log(`${stageCfg().enemy} のスキル発動! ${sk.desc(S.skillLevel)}`,'bad');
  sfx('alert');omfxShow('dgfx');render();
  await cutIn('Enemy Skill Activation!','enemy',5,sk.desc(S.skillLevel));
}
async function endEnemySkillIfDue(my){
  if(!S.skillActive)return;
  S.skillRounds--;
  if(S.skillRounds>0)return;
  S.skillActive=false;S.handMax+=1;
  omfxHide('dgfx');render();
  log(`Skill Break! 相手のスキルが切れた。手札上限が ${S.handMax} 枚に`,'gold');
  addScore('skillBreak','Skill Break');
  await cutIn('Skill Break!','break',4,`相手のスキルが切れた。手札の上限 +1 → ${S.handMax}枚`);
}

/* ---- game flow ---- */
function freshState(stage=0){
  if(!RUN)newRun();
  const cpuMax=STAGES[stage].cpu,meMax=MAX_ME+HP_PER_LEVEL*(RUN.skills.hp||0);
  S={stage,cpuMax,meMax,me:meMax,cpu:cpuMax,deck:newDeck(),discard:[],hand:[],handMax:HAND+(RUN.skills.draw||0),
    score:0,scoreLog:[],kills:0,streak:0,tookDamage:false,timeUsed:0,roundDmg:0,chainReady:false,triple7Ready:false,cpuField:[],picked:[],results:[null,null,null],phase:'intro',round:0,onemore:false,dealt:0,clash:-1,revolution:false,blown:false,limit:LIMIT_START,skillActive:false,skillRounds:0,skillLevel:0,hpTrigger:false,hpTriggers:STAGES[stage].skill.hp.slice().sort((a,b)=>b-a)};
  refill();
}
/* a stage = one full battle. stages run 1 → build screen → 2 → build screen → 3 → all clear */
async function newGame(stage=0){
  const my=++seq;
  if(stage===0)newRun();
  stopTimer();omfxHide();omfxHide('dgfx');stopFanfare();$('comboNote').hidden=true;setSlowmo(false);document.querySelectorAll('.lane.focus').forEach(l=>l.classList.remove('focus'));freshState(stage);
  $('log').innerHTML='';$('over').classList.remove('show');$('buildOver').classList.remove('show');
  log(`${STAGES[stage].name} 開始 ・ 敵: ${STAGES[stage].enemy} (HP ${S.cpuMax})`,'r');
  render();
  await cutIn(STAGES[stage].name,'alt',3,`${stage+1} / ${STAGES.length} ・ ${STAGES[stage].enemy}`);
  if(my!==seq)return;
  await cutIn('Get Ready?','alt');
  if(my!==seq)return;
  await cutIn('Go!');
  if(my!==seq)return;
  playBgm(STAGES[stage].bgm);
  startRound();
}
async function startRound(){
  const my=seq;
  S.round++;S.onemore=false;S.revolution=false;S.blown=false;S.picked=[];S.results=[null,null,null];S.phase='deal';S.dealt=0;S.cpuField=[];S.roundDmg=0;S.chainReady=false;S.triple7Ready=false;
  log(`ラウンド ${S.round}`,'r');
  render();
  if(S.round>1&&(S.round-1)%HEAT_EVERY===0&&S.limit>LIMIT_MIN){
    const before=S.limit;S.limit=Math.max(LIMIT_MIN,S.limit-LIMIT_STEP);
    log(`Heat Up! 制限時間が ${before/1000}秒 → ${S.limit/1000}秒`,'bad');render();
    await cutIn('Heat Up!','heat',4,`制限時間 ${before/1000}秒 → ${S.limit/1000}秒`);if(my!==seq)return;
  }
  await maybeEnemySkill(my);if(my!==seq)return;
  S.cpuField=S.skillActive?skillDeal():cpuDeal();
  log(`　CPUの場: ${S.cpuField.map(cardName).join('  ')}${S.skillActive?'  [敵スキル 残り'+S.skillRounds+'ラウンド]':''}`);
  render();
  await wait(BEAT*.5);
  for(let i=0;i<3;i++){S.dealt=i+1;sfx('flip');render();await wait(BEAT);if(my!==seq)return;}
  await cutIn('Setup!','alt',2);
  if(my!==seq)return;
  S.phase='select';startTimer(S.limit);render();
}

/* timer */
let pausedLeft=null;
function startTimer(ms){
  stopTimer();pausedLeft=null;S.deadline=Date.now()+ms;
  timerId=setInterval(()=>{const left=Math.max(0,S.deadline-Date.now());renderTimer(left);if(left<=0){stopTimer();commit();}},100);
  renderTimer(ms);
}
function stopTimer(){if(timerId){clearInterval(timerId);timerId=null;}}
function pauseTimer(){
  if(pausedLeft!==null){const left=pausedLeft;pausedLeft=null;S.deadline=Date.now()+left;
    timerId=setInterval(()=>{const l=Math.max(0,S.deadline-Date.now());renderTimer(l);if(l<=0){stopTimer();commit();}},100);}
  else if(timerId){stopTimer();pausedLeft=Math.max(0,S.deadline-Date.now());}
  renderPause();
}

function autoFill(){
  if(S.picked.length>=3)return;
  const rest=S.hand.filter(c=>!S.picked.includes(c));
  while(S.picked.length<3&&rest.length)S.picked.push(rest.shift());
  log('時間切れ。足りない分は手札から自動で選びました');
}

async function commit(){
  if(S.phase!=='select'&&S.phase!=='onemore')return;
  const my=seq;
  /* stage time = selection time actually used (pauses and cut-ins excluded) */
  const remaining=pausedLeft!==null?pausedLeft:Math.max(0,(S.deadline||Date.now())-Date.now());
  S.timeUsed+=Math.max(0,S.limit-remaining);
  autoFill();stopTimer();
  const oneMore=S.phase==='onemore';S.phase='battle';render();
  let roundKills=0;
  for(const combo of detectCombos(S.picked)){await runCombo(combo,my);if(my!==seq)return;}
  /* skill patterns (Triple Ace / Triple 7 / Royal Straight / Special Attack) */
  const pat=skillPatterns(S.picked,oneMore,S.hand);
  for(const [t,sub] of pat.cutins){sfx('onemore');await cutIn(t,'break',4,sub);if(my!==seq)return;log(`スキル発動: ${t} ${sub}`,'gold');}
  if(pat.triple7)S.triple7Ready=true;
  if(!oneMore){await cutIn("Let's Dance!",'',2.6);if(my!==seq)return;}
  else await wait(BEAT*.5);
  const T=oneMore?TEMPO.onemore:TEMPO.normal;document.documentElement.style.setProperty('--clashk',T.clash);
  let wins=0,dead=false;
  for(let i=0;i<3;i++){
    const p=S.picked[i],c=(oneMore||S.revolution)?null:S.cpuField[i],r=resolve(p,c,S.revolution&&!oneMore?'Revolution':undefined,pat.mods[i]);
    /* Last Attack: this hit would finish the CPU */
    const lethal=r.dmgCpu>0&&r.dmgCpu>=S.cpu,slow=lethal?3:1;
    if(lethal){
      log('次の一撃で相手のHPが0に。Last Attack!!!','gold');
      await cutIn('Last Attack!!!','last',4,'とどめの一撃');if(my!==seq)return;
      setSlowmo(true);$('l'+i).classList.add('focus');await wait(BEAT*.6);if(my!==seq)return;
    }
    /* beat 1: the two cards move in */
    S.clash=i;render();
    await wait(BEAT*T.clash*slow);if(my!==seq)return;
    /* impact = damage, in the same beat: HP drops, shake, sound. The number's flight is afterglow (not awaited) */
    S.results[i]=r;S.clash=-1;
    /* the loser is knocked away right now (from its clash pose, before the re-render hides it) */
    if(r.dmgCpu)blowAway('c'+i,i,false);else if(r.dmgMe)blowAway('m'+i,i,true);
    if(oneMore||lethal){sfx('slash');slashFx(i);quake(lethal?10:6);}
    if(r.win)wins++;
    spark(i,oneMore||lethal);
    if(r.dmgCpu){
      const tier=dmgTier(r.dmgCpu);
      const flight=flyDamage($('m'+i),$('cpuHp'),r.dmgCpu,tier,{slow,lethal,popBeats:T.pop,flyBeats:T.fly});
      if(lethal){await flight;if(my!==seq)return;}   /* Last Attack: the slow number is the show, wait for it */
      S.cpu=Math.max(0,S.cpu-r.dmgCpu);sfxDamage(r.dmgCpu);S.roundDmg+=r.dmgCpu;
      while(S.cpu>0&&S.hpTriggers.length&&S.cpu<=S.hpTriggers[0]){const th=S.hpTriggers.shift();if(!S.skillActive){S.hpTrigger=true;log(`相手のHPが ${th} を割った。次のラウンドで敵のスキルが発動`,'bad');}}
      fx('cpuBox',tier>=2||lethal?'hitbig flash':'hit flash');
      if(lethal){flash('big');quake(16);}
      else if(tier>=4){flash('red');quake(12);}
      else if(tier>=3){flash('mid');quake(9);}
      else if(tier>=2)quake(6);
    }
    if(r.dmgMe){
      const tier=dmgTier(r.dmgMe);
      flyDamage($('c'+i),$('meHp'),r.dmgMe,tier,{toMe:true,popBeats:T.pop,flyBeats:T.fly});
      S.me=Math.max(0,S.me-r.dmgMe);sfxDamage(r.dmgMe);S.tookDamage=true;S.streak=0;fx('meBox',tier>=2?'hitbig flash':'hit flash');if(tier>=3)flash('mid');
    }
    if(r.heal&&S.me>0){S.me=Math.min(S.meMax||MAX_ME,S.me+r.heal);fx('meBox','glow');floatNum('meBox','+'+r.heal,oneMore?'heal big':'heal');}
    render();
    if(lethal){await wait(BEAT*1.6);$('l'+i).classList.remove('focus');setSlowmo(false);}
    const who=c?`${cardName(p)}(${r.pv}) vs ${cardName(c)}(${r.cv})`:`${cardName(p)}(${r.pv})`;
    const tag=r.mul?' ['+r.mul+']':'';
    if(r.dmgCpu)log(`${i+1}枚目 ${who} → CPUに ${r.dmgCpu} ダメージ${tag}`,'good');
    else if(r.dmgMe)log(`${i+1}枚目 ${who} → あなたに ${r.dmgMe} ダメージ${tag}`,'bad');
    else log(`${i+1}枚目 ${who} → 引き分け`);
    /* score: a kill = beating a real CPU card (not the 0s of 1more / Revolution) */
    if(r.win&&c){
      S.kills++;S.streak++;roundKills++;addScore('kill','撃破');
      /* treasure: the card is owned and put in RUN.deck only, so it is dealt from the next stage on (not into this stage's pile) */
      if(c.chest){const g=chestCard();if(g){const gk=g.suit+g.rank;RUN.owned[gk]=(RUN.owned[gk]||0)+1;RUN.deck[gk]=(RUN.deck[gk]||0)+1;
        log(`　宝箱! ${cardName(g)} カードを獲得(次のステージから使用できます)`,'gold');
        sfx('onemore');await chestCutIn(g);if(my!==seq)return;}}
      if(S.streak===5)addScore('streak5','ノーダメージで5枚撃破');
      else if(S.streak===10)addScore('streak10','ノーダメージで10枚撃破');
      else if(S.streak===15)addScore('streak15','ノーダメージで15枚撃破');
    }
    if(r.heal)log(`　♥ HPが ${r.heal} 回復 (${S.me})`,'gold');
    /* rest of this card's beat */
    await wait(BEAT*(T.beat-T.clash)*(lethal?slow:1));if(my!==seq)return;
    if(S.me<=0||S.cpu<=0){dead=true;break;}
  }
  await wait(BEAT*.6);if(my!==seq)return;   /* let the last hit settle before the round wraps up */
  const played=S.picked.slice();
  for(const p of S.picked){S.hand.splice(S.hand.indexOf(p),1);discardCard(p);}
  S.picked=[];
  if(!oneMore&&roundKills===3)addScore('three','3枚連続で撃破');
  if(dead){endRoundScoring();gameOver();return;}
  const suitsDiffer=new Set(played.map(c=>c.suit)).size===3;
  if(!oneMore&&wins===3&&!suitsDiffer)log('3枚すべてに勝利。ただし同じスートが含まれるので1moreは発生しない');
  if(!oneMore&&wins<3)log(`勝ち ${wins}/3 のため1moreなし`);
  if(!oneMore&&wins===3&&suitsDiffer){
    log('3枚すべてに勝利! 1more 発動。好きな3枚を追加で出せます','gold');
    addScore('onemore','1more');
    S.chainReady=!!RUN.skills.chain&&played.every(c=>c.rank>=7);
    /* the CPU's cards are already gone (each was knocked away when it lost). Baton touch: your 3 winners fall back toward the hand */
    scatterBack();render();await wait(BEAT*1.5);if(my!==seq)return;
    S.phase='onemore';S.onemore=true;S.results=[null,null,null];
    render();
    sfx('onemore');omfxShow();
    await cutIn('1 More!','',2.6);if(my!==seq)return;
    startTimer(S.limit);render();return;
  }
  if(oneMore&&S.triple7Ready){
    /* skill: Triple 7 → top the hand up to its limit, then one more 1more (the 7+ chain can still follow) */
    S.triple7Ready=false;
    const before=S.hand.length;refill();
    log(`スキル: トリプル7 → 手札を ${before} 枚から ${S.hand.length} 枚に補充してさらに1more!`,'gold');addScore('onemore','1more(トリプル7)');
    scatterBack();S.phase='onemore';S.results=[null,null,null];render();
    sfx('onemore');await cutIn('1 More!','',2.6,'トリプル7: 手札を補充してさらに1more');if(my!==seq)return;
    startTimer(S.limit);render();return;
  }
  if(oneMore&&S.chainReady){
    /* skill: 7+ cards → the 1more chains into one more 1more */
    S.chainReady=false;
    log('スキル: 7以上のカードで1more → さらに1more!','gold');addScore('onemore','1more(連鎖)');
    scatterBack();S.phase='onemore';S.results=[null,null,null];render();
    sfx('onemore');await cutIn('1 More!','',2.6,'スキル: 7以上の1more → さらに1more');if(my!==seq)return;
    startTimer(S.limit);render();return;
  }
  if(oneMore)omfxHide();
  await wait(BEAT);if(my!==seq)return;
  endRoundScoring();
  await endEnemySkillIfDue(my);if(my!==seq)return;
  refill();
  startRound();
}
async function gameOver(){
  const my=seq;
  S.phase='over';stopTimer();omfxHide();stopBgm();render();
  const win=S.cpu<=0,last=S.stage>=STAGES.length-1,name=STAGES[S.stage].name;
  if(win){
    if(!S.tookDamage)addScore('noDamageClear','ノーダメージクリア');
    const sec=Math.round(S.timeUsed/1000);
    if(S.timeUsed<=120000)addScore('time2m',`クリア時間2分以内 (${sec}秒)`);
    else if(S.timeUsed<=180000)addScore('time3m',`クリア時間3分以内 (${sec}秒)`);
    RUN.points+=S.score;
    log(`ステージスコア ${S.score.toLocaleString()} → 所持ポイント ${RUN.points.toLocaleString()}`,'r');
  }
  log(win?(last?'全ステージクリア!':`${name} クリア!`):'敗北…','r');
  await wait(BEAT*.6);if(my!==seq)return;
  if(win)playFanfare();
  await cutIn(win?(last?'All Clear!':`Stage ${S.stage+1} Clear!`):'Defeat...',win?'':'bad',3);if(my!==seq)return;
  if(win&&!last){
    /* between stages: the deck-build screen (placeholder for now) */
    $('buildEyebrow').textContent=`${name} CLEAR ・ ラウンド ${S.round} ・ 残りHP ${S.me} ・ 使用時間 ${Math.round(S.timeUsed/1000)}秒`;
    openBuild();$('buildOver').classList.add('show');return;
  }
  $('overTitle').textContent=win?'ALL CLEAR':'YOU LOSE';$('overTitle').className='big '+(win?'win':'lose');
  $('overText').textContent=win?`${STAGES.length}ステージすべてクリア! 最終ステージはラウンド ${S.round}、残りHP ${S.me}。総獲得ポイント ${RUN.points.toLocaleString()}`:`${name} ラウンド ${S.round} で力尽きました。CPUの残りHP ${S.cpu}`;
  $('retryBtn').hidden=win;$('retryBuildBtn').hidden=win||!(RUN&&RUN.checkpoint);
  $('over').classList.add('show');
}

/* a K-converted card (Sword/Clover) goes back to its original number once it hits the discard pile */
function discardCard(p){if(p.origRank!=null){p.rank=p.origRank;delete p.origRank;delete p.buff;}S.discard.push(p);}
/* 1more skip: end the round without playing the 1more (keeps the hand for later) */
async function skipOneMore(){
  if(S.phase!=='onemore')return;
  const my=seq;
  const remaining=pausedLeft!==null?pausedLeft:Math.max(0,(S.deadline||Date.now())-Date.now());
  S.timeUsed+=Math.max(0,S.limit-remaining);
  stopTimer();S.picked=[];S.chainReady=false;S.triple7Ready=false;S.phase='battle';
  log('1more をスキップ(手札を温存)');render();
  omfxHide();await wait(BEAT);if(my!==seq)return;
  endRoundScoring();
  await endEnemySkillIfDue(my);if(my!==seq)return;
  refill();
  startRound();
}
function toggle(c){
  if(S.phase!=='select'&&S.phase!=='onemore')return;
  const k=S.picked.indexOf(c);
  if(k>=0)S.picked.splice(k,1);else if(S.picked.length<3){S.picked.push(c);sfx('place');}
  ensureBgm();render();
}
