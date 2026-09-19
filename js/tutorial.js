// チュートリアル(読むだけ・6ページ)。ページ定義は TUTORIAL 配列。操作型に拡張するときは各ページに step を足す
const tc=(suit,rank,cls='')=>{const e=cardEl({suit,rank},true);if(cls)e.classList.add(...cls.split(' '));return e;};
const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
const col=(card,cap,capCls='')=>{const c=el('div','tut-col');c.appendChild(card);c.appendChild(el('span','tut-cap '+capCls,cap));return c;};

const TUTORIAL=[
  {title:'Suit Battle',lead:'トランプでじゃんけん。相性を読んで、数字で殴る。それだけ。',
   body:'♦がグー、♠がチョキ、♣がパー。相手のカードを見てから出せるから、読み勝ちは自分次第。<br>5ステージ勝ち抜きで <span class="k">ALL CLEAR</span>。',
   illo(){const r=el('div','tut-row');r.append(tc('D',10),tc('S',9),tc('C',8));return r;}},
  {title:'3 Cards, 3 Clashes',lead:'相手が先に3枚見せる。こっちも3枚、順番どおりにぶつける。',
   shots:[{src:'img/tut_picked.png',cap:'手札をクリックした順に 1・2・3'},{src:'img/tut_clash.png',cap:'1枚目同士、2枚目同士…で勝負。差がダメージ'}],
   body:'1枚目は1枚目と、2枚目は2枚目と。<b>数字がデカい方が勝ち</b>、差の分だけ相手のHPを削る。負けたら差の分こっちが削られる。<br>選ぶ時間は30秒。2ラウンドごとに <span class="k">Heat Up!</span> で5秒ずつ縮む(最短10秒)。HPが先に0になったら負け。',
   illo(){const r=el('div','tut-row');
     r.append(col(tc('S',5),'相手'),el('span','tut-vs','VS'),col(tc('S',9),'こっち'),el('span','tut-arrow','→'),col(el('span','tut-num good','−4'),'9 − 5 = 4ダメージ','good'));
     return r;}},
  {title:'1 More!',lead:'3枚ぜんぶ勝って、スートがバラバラなら 1more。',
   shots:[{src:'img/tut_1more.png',cap:'相手は 0。数字がそのまま入る'},{src:'img/tut_skill.png',cap:'敵のスキル中は 13 が並ぶ。耐えれば Skill Break!'}],
   body:'相手は <b>0</b>。こっちの数字が丸ごとダメージになる追い打ちタイム。温存したいなら <span class="k">スキップ</span> もOK。<br>敵のHPバーの <b>赤い縦棒</b> まで削るとスキルが来る。13以上を並べてくるけど、耐えきれば <span class="k">Skill Break!</span> で手札の上限+1。<br><span class="k">宝箱</span> 付きのカードを倒すと、カードを1枚ゲット(次のステージから使える)。',
   illo(){const r=el('div','tut-row');
     const b=backEl();r.append(col(b,'相手は 0'),el('span','tut-vs','VS'),col(tc('D',10,'won'),'そのまま','good'),col(el('span','tut-num gold','−10'),'10ダメージ','gold'));
     return r;}},
  {title:'Rock / Scissors / Paper',lead:'♦は♠に強い。♠は♣に強い。♣は♦に強い。',
   shots:[{src:'img/tut_select.png',cap:'光ってる枠が有利、▼が不利。相手の1枚目に対して表示'}],
   body:'有利なスートを当てると数字が <b>2倍</b>。逆に当てられると相手が2倍。<br>手札で <span class="k">枠が光ってる</span> のが有利、<span class="k">▼</span> が不利。まずはそれだけ見ればいい。',
   illo(){const g=el('div','tut-tri');
     g.append(col(tc('D',7),'グー'),el('span','tut-arrow','▶ 強い ▶'),col(tc('S',7),'チョキ'));
     g.append(el('span','tut-arrow','◀'),el('span','tut-chip gold','♦7 vs ♠7 → 14 vs 7'),el('span','tut-arrow','▼'));
     g.append(el('span',''),col(tc('C',7),'パー'),el('span',''));
     return g;}},
  {title:'Three of a Kind',lead:'同じ数字3枚、同じスート3枚。そろえたら派手なことが起きる。',
   shots:[{src:'img/tut_combo.png',cap:'♠3枚で Sword Combo! 残りの手札の一番小さいのが K に'}],
   body:'どれも同時に出した3枚で判定。スートのコンボは全部 <b>手札の上限+1</b> のおまけつき。',
   illo(){const g=el('div','tut-combos');
     const combo=(cards,name,desc,cls)=>{const c=el('div','tut-combo');const cs=el('div','cards');cards.forEach(x=>cs.appendChild(x));c.append(cs,el('div','txt',`<b>${name}</b><span>${desc}</span>`));return c;};
     g.append(combo([tc('D',9),tc('S',9),tc('C',9)],'Revolution!','同じ数字3枚。相手のカードが吹き飛んで、そのまま1more'),
              combo([tc('S',4),tc('S',8),tc('S',10)],'Sword Combo!','♠3枚。各スートの一番小さいのがKになる'),
              combo([tc('D',5),tc('D',6),tc('D',9)],'Diamond Combo!','♦3枚。各スートの一番大きいのが1枚増える'),
              combo([tc('C',3),tc('C',7),tc('C',8)],'Clover Combo!','♣3枚。少ないスートがまるごとKになる'));
     return g;}},
  {title:'Build Your Deck',lead:'勝てばスコア。スコアでデッキをいじる。',
   shots:[{src:'img/tut_build.png',cap:'ステージの間に出る画面。変えたところは黄色、迷ったらリセット'}],
   body:'撃破・1more・コンボ・ノーダメージ、速さでもポイントが入る。ステージの間に <b>カードを足す</b>(1枚30,000、Q・Kは40,000)、<b>デッキから外す</b>(外しても持ったまま。戻すのは無料)、<b>スキルやHPを買う</b>。<br>ルールは2つだけ。<span class="k">20枚以上</span>、<span class="k">同じカードは3枚まで</span>。迷ったらリセット。',
   illo(){const w=el('div','tut-build');
     const m=el('div','mini');m.append(el('span','tut-cap','デッキ表'),el('div','cellrow','<span class="cell"><i>−</i><b>1</b><i>+</i></span><span class="cell y"><i>−</i><b>2</b><i>+</i></span><span class="cell"><i>−</i><b>1</b><i>+</i></span><span class="cell y"><i>−</i><b>0</b><i>+</i></span>'),el('span','tut-cap','変えたところは黄色'));
     const s=el('div','mini');s.append(el('span','tut-cap','スキル'),el('span','tut-chip gold','相性有利で4倍  80,000 pt'),el('span','tut-chip','毎ターン+1ドロー  50,000 pt'));
     w.append(m,s);return w;}},
];

let tutPage=0,tutFrom='start',tutPausedTimer=false;
function openTutorial(from='start'){
  tutFrom=from;tutPage=0;
  /* opened mid-battle: freeze the countdown while reading */
  tutPausedTimer=false;
  if(from==='game'&&S&&(S.phase==='select'||S.phase==='onemore')&&timerId&&pausedLeft===null){pauseTimer();tutPausedTimer=true;}
  renderTutorial();$('tutOver').classList.add('show');
}
function closeTutorial(startGame){
  $('tutOver').classList.remove('show');
  if(tutFrom==='start'){
    if(startGame){$('startOver').classList.remove('show');newGame(0);}
    else $('startOver').classList.add('show');
  }else if(tutPausedTimer&&pausedLeft!==null){pauseTimer();}
  tutPausedTimer=false;
}
function renderTutorial(){
  const p=TUTORIAL[tutPage],last=tutPage===TUTORIAL.length-1;
  const box=$('tutPage');box.innerHTML='';box.classList.remove('tut-page');void box.offsetWidth;box.classList.add('tut-page');
  box.append(el('div','tut-title',p.title),el('p','tut-lead',p.lead),el('p','tut-body',p.body));
  if(p.shots){const row=el('div','tut-shots');for(const s of p.shots){const f=el('figure','tut-shot');f.innerHTML=`<img src="${s.src}" alt="${s.cap}" loading="lazy"><figcaption>${s.cap}</figcaption>`;row.appendChild(f);}box.appendChild(row);}
  const illo=el('div','tut-illo');illo.appendChild(p.illo());box.appendChild(illo);
  $('tutStep').textContent=`${tutPage+1} / ${TUTORIAL.length}`;
  $('tutDots').innerHTML=TUTORIAL.map((_,i)=>`<i class="${i===tutPage?'on':''}"></i>`).join('');
  $('tutPrev').disabled=tutPage===0;
  $('tutNext').textContent=last?(tutFrom==='start'?'閉じてはじめる':'閉じる'):'次へ →';
}
function tutNav(d){const n=tutPage+d;if(n<0)return;if(n>=TUTORIAL.length){closeTutorial(true);return;}tutPage=n;renderTutorial();}
$('tutPrev').addEventListener('click',()=>tutNav(-1));
$('tutNext').addEventListener('click',()=>tutNav(1));
$('tutSkip').addEventListener('click',()=>closeTutorial(false));
$('tutBtn').addEventListener('click',()=>{$('startOver').classList.remove('show');openTutorial('start');});
$('tutHeadBtn').addEventListener('click',()=>{if($('startOver').classList.contains('show')){$('startOver').classList.remove('show');openTutorial('start');}else openTutorial('game');});
document.addEventListener('keydown',e=>{if(!$('tutOver').classList.contains('show'))return;if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();tutNav(1);}else if(e.key==='ArrowLeft'){e.preventDefault();tutNav(-1);}else if(e.key==='Escape'){closeTutorial(false);}});
