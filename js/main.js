// 起動: ボタンの配線とホットリロード
$('goBtn').addEventListener('click',()=>{ensureBgm();commit();});
$('startBtn').addEventListener('click',()=>{$('startOver').classList.remove('show');newGame(0);});
$('buildNextBtn').addEventListener('click',()=>{$('buildOver').classList.remove('show');newGame((S.stage||0)+1);});
$('retryBtn').addEventListener('click',()=>newGame(S.stage||0));
$('retryBuildBtn').addEventListener('click',retryFromBuild);
$('muteBtn').addEventListener('click',()=>setMuted(!muted));
$('pauseBtn').addEventListener('click',pauseTimer);
$('skipBtn').addEventListener('click',()=>{ensureBgm();skipOneMore();});
setMuted(muted);
$('clearBtn').addEventListener('click',()=>{S.picked=[];render();});
$('againBtn').addEventListener('click',()=>newGame(0));
$('rulesBtn').addEventListener('click',()=>$('rules').showModal());

/* hot reload: keep the game across republishes */
function start(data){
  if(data&&data.S&&data.S.phase!=='over'&&data.S.phase!=='intro'){
    S=data.S;uid=data.uid||uid;S.clash=-1;if(S.stage==null)S.stage=0;if(S.cpuMax==null)S.cpuMax=MAX_CPU;if(S.meMax==null)S.meMax=MAX_ME;
    RUN=data.RUN||null;if(!RUN)newRun();if(!RUN.owned)RUN.owned={...RUN.deck};if(RUN.hp==null)RUN.hp=S.meMax;
    if(S.score==null){S.score=0;S.scoreLog=[];S.kills=0;S.streak=0;S.tookDamage=false;S.timeUsed=0;S.roundDmg=0;S.chainReady=false;}
    $('log').innerHTML='';
    bgmWanted=true;
    if(S.phase==='onemore')omfxShow();
    if(S.skillActive)omfxShow('dgfx');
    if(S.limit==null)S.limit=LIMIT_START;
    if(!S.hpTriggers){S.skillActive=false;S.skillRounds=0;S.skillLevel=0;S.hpTrigger=false;S.hpTriggers=STAGES[S.stage].skill.hp.slice().sort((a,b)=>b-a);}
    if(S.phase==='select'||S.phase==='onemore'){
      if(data.pausedLeft!=null){pausedLeft=data.pausedLeft;renderTimer(pausedLeft);render();}
      else{startTimer(Math.max(1000,(S.deadline||0)-Date.now()));render();}
    }
    else{S.picked=[];S.results=[null,null,null];S.onemore=false;S.handMax=S.handMax||HAND;refill();startRound();}
  }else{freshState();render();$('startOver').classList.add('show');}
}
window.claude?.hot?.snapshot?.(()=>({S,RUN,uid,pausedLeft}));
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});
