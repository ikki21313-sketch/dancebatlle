// 演出(カットイン, テープ, フラッシュ, 揺れ, 飛ぶダメージ数字, スローモーション)
/* ---- 1more tapes ---- */
(function buildTapes(){
  const build=(prefix,text,cfg)=>{const base=text.repeat(8);
    for(const side of 'lr'){const box=$(prefix+'-'+side);cfg[side].forEach(([top,rot,spd],i)=>{
      const t=document.createElement('div');t.className='tape'+(i%2?' rev':'');
      t.style.cssText=`top:${top}%;--rot:${rot}deg;--spd:${spd}s;--d:${(i*.12).toFixed(2)}s`;
      t.innerHTML=`<span>${base}${base}</span>`;box.appendChild(t);});}};
  build('om','1MORE! ✦ ',{l:[[9,-24,5.5],[31,16,7],[55,-9,6.2],[78,27,8]],r:[[7,20,6.8],[29,-14,5.2],[53,12,7.5],[77,-26,6]]});
  build('dg','DANGER!! ',{l:[[20,18,4.8],[44,-22,6],[66,12,5.4],[88,-16,7]],r:[[18,-20,5.6],[42,24,4.6],[64,-10,6.4],[86,20,5]]});
})();
function omfxShow(id='omfx'){const e=$(id);e.hidden=false;e.classList.remove('off');void e.offsetWidth;e.classList.add('on');}
function omfxHide(id='omfx'){const e=$(id);if(e.hidden)return;e.classList.remove('on');e.classList.add('off');setTimeout(()=>{e.hidden=true;e.classList.remove('off');},450);}

/* ---- cut-in: a band sweeps across the screen on the beat ---- */
function cutIn(text,style='',beats=2.4,sub=''){
  const el=$('cutin'),dur=BEAT*beats;
  el.className='cutin '+style+(sub?' has-sub':'');$('cutinTxt').textContent=text;$('cutinTxt').classList.toggle('long',text.length>14);
  $('cutinSub').textContent=sub;
  el.style.setProperty('--dur',dur+'ms');
  $('dimmer').classList.add('show');
  void el.offsetWidth;el.classList.add('play');
  return wait(dur).then(()=>{el.classList.remove('play');$('dimmer').classList.remove('show');});
}

/* ---- small effects ---- */
function fx(id,cls){const e=$(id);cls.split(' ').forEach(c=>e.classList.remove(c));void e.offsetWidth;cls.split(' ').forEach(c=>e.classList.add(c));}
function floatNum(id,text,cls){const f=document.createElement('span');f.className='float '+cls;f.textContent=text;$(id).appendChild(f);setTimeout(()=>f.remove(),950);}
function spark(i,big){const s=document.createElement('span');s.className='spark'+(big?' big':'');$('l'+i).appendChild(s);setTimeout(()=>s.remove(),550);}
function slashFx(i){const lane=$('l'+i);for(const c of ['','b']){const e=document.createElement('span');e.className='slash '+c;lane.appendChild(e);setTimeout(()=>e.remove(),500);}
  const w=$('flashwhite');w.classList.remove('go');void w.offsetWidth;w.classList.add('go');}
function quake(px=6){const f=$('field');f.classList.remove('quake');void f.offsetWidth;f.style.setProperty('--q',px+'px');f.classList.add('quake');setTimeout(()=>f.classList.remove('quake'),400);}
function flash(kind=''){const w=$('flashwhite');w.className='flashwhite';void w.offsetWidth;w.className='flashwhite go '+kind;}

/* damage tiers: 0-4 → plain, 5-9 → t1, 10-14 → t2, 15-19 → t3, 20+ → t4 */
function dmgTier(n){return n>=20?4:n>=15?3:n>=10?2:n>=5?1:0;}
const TIER_LABEL=['','','HIT!','BIG HIT!','SMASH!!'];

function center(el){const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}
function burst(x,y,count,dist,ms,ring){
  const layer=$('fxlayer');
  for(let i=0;i<count;i++){const b=document.createElement('span');b.className='burst';b.style.left=x+'px';b.style.top=y+'px';layer.appendChild(b);
    const a=(i/count)*Math.PI*2+Math.random()*.5,d=dist*(.6+Math.random()*.6);
    b.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(${Math.cos(a)*d}px - 50%),calc(${Math.sin(a)*d}px - 50%)) scale(.2)`,opacity:0}],{duration:ms,easing:'cubic-bezier(.1,.8,.3,1)',fill:'forwards'});setTimeout(()=>b.remove(),ms+50);}
  if(ring){const r=document.createElement('span');r.className='shock';r.style.left=x+'px';r.style.top=y+'px';layer.appendChild(r);
    r.animate([{transform:'translate(-50%,-50%) scale(.3)',opacity:1},{transform:`translate(-50%,-50%) scale(${ring})`,opacity:0}],{duration:ms*1.2,easing:'ease-out',fill:'forwards'});setTimeout(()=>r.remove(),ms*1.2+50);}
}
/* a damage number pops at `fromEl`, hangs a beat, then flies into `toEl` (the target's HP) */
async function flyDamage(fromEl,toEl,value,tier,opts={}){
  const {slow=1,toMe=false,lethal=false,popBeats,flyBeats}=opts;
  const a=center(fromEl),b=center(toEl);
  const el=document.createElement('div');el.className='dmgfly t'+tier+(toMe?' me':'')+(lethal?' lethal':'');
  const lbl=lethal?'LAST ATTACK':(TIER_LABEL[tier]||'');
  el.innerHTML=`<span class="n">${value}</span>`+(lbl?`<span class="lbl">${lbl}</span>`:'');
  el.style.left=a.x+'px';el.style.top=a.y+'px';$('fxlayer').appendChild(el);
  const dx=b.x-a.x,dy=b.y-a.y,arc=(toMe?1:-1)*Math.min(120,Math.abs(dy)*.35);
  const pop=BEAT*(popBeats??(.55+tier*.08))*slow,fly=BEAT*(flyBeats??(.55+tier*.05))*slow;
  const T=(x,y,sc)=>`translate(${x}px,${y}px) translate(-50%,-50%) scale(${sc})`;
  /* timers, not Animation.finished: finished-promises stall when the tab is not rendering */
  el.animate([
    {transform:T(0,0,.2),opacity:0},
    {transform:T(0,0,1.35+tier*.08),opacity:1,offset:.45},
    {transform:T(0,0,1),opacity:1}
  ],{duration:pop,easing:'cubic-bezier(.2,.9,.3,1.4)',fill:'forwards'});
  await wait(pop);
  if(tier>=2)burst(a.x,a.y,6+tier*3,40+tier*15,BEAT*1.2*slow,0);
  el.animate([
    {transform:T(0,0,1)},
    {transform:T(dx*.5,dy*.5+arc,1.1),offset:.5},
    {transform:T(dx,dy,.7)}
  ],{duration:fly,easing:'cubic-bezier(.4,0,.8,.4)',fill:'forwards'});
  await wait(fly);
  /* impact */
  el.animate([{transform:T(dx,dy,.7),opacity:1},{transform:T(dx,dy,1.6+tier*.2),opacity:0}],{duration:BEAT*.8*slow,easing:'ease-out',fill:'forwards'});
  setTimeout(()=>el.remove(),BEAT*.8*slow+50);
  if(tier>=1)burst(b.x,b.y,8+tier*4,50+tier*22,BEAT*1.3*slow,tier>=3?7+tier:0);
}
function scoreToast(label,pts){const t=document.createElement('div');t.className='toast';t.innerHTML=`${label}${pts?`<b>+${pts.toLocaleString()}</b>`:''}`;$('toasts').appendChild(t);setTimeout(()=>t.remove(),2000);}
function setSlowmo(on){document.body.classList.toggle('slowmo',on);document.documentElement.style.setProperty('--beat',(on?BEAT*3:BEAT)+'ms');}
