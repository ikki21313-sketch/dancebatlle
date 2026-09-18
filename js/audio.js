// BGM / 効果音 / 音あり・なし
/* ---- audio ---- */
const bgm=new Audio('music/Groovy_Ignition.mp3');bgm.loop=true;bgm.volume=.45;bgm.preload='auto';
const fanfare=new Audio('music/fanfare.mp3');fanfare.volume=.6;fanfare.preload='auto';
const SFX={flip:'music/card_flip.mp3',place:'music/card_place.mp3',onemore:'music/1more.mp3',slash:'music/slash.mp3',
  alert:'music/alert.mp3',dmgL:'music/dmageL.mp3',dmgM:'music/dmageM.mp3',dmgH:'music/dmageH.mp3'};
const sfxPool={};for(const k in SFX){const a=new Audio(SFX[k]);a.preload='auto';sfxPool[k]=a;}
let muted=false,bgmWanted=false;
try{muted=localStorage.getItem('sb-muted')==='1';}catch(e){}
function sfx(k){if(muted)return;const a=sfxPool[k].cloneNode();a.volume=(k==='onemore'||k==='slash'||k==='alert'||k==='dmgH')?.9:.7;a.play().catch(()=>{});}
/* damage impact sound by amount: <=5 L, 6-15 M, 16+ H */
function sfxDamage(n){sfx(n<=5?'dmgL':n<=15?'dmgM':'dmgH');}
function playBgm(){bgmWanted=true;bgm.muted=muted;bgm.currentTime=0;bgm.play().catch(()=>{});}
function ensureBgm(){if(bgmWanted&&bgm.paused)bgm.play().catch(()=>{});}
function stopBgm(){bgmWanted=false;bgm.pause();}
function playFanfare(){fanfare.muted=muted;fanfare.currentTime=0;fanfare.play().catch(()=>{});}
function stopFanfare(){fanfare.pause();}
function setMuted(m){muted=m;bgm.muted=m;fanfare.muted=m;try{localStorage.setItem('sb-muted',m?'1':'0');}catch(e){}$('muteBtn').textContent=m?'🔇 音なし':'🔊 音あり';if(!m)ensureBgm();}
