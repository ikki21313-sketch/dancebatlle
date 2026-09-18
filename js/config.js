// 定数とルールのパラメータ。バランス調整はここを触る
const SUITS={
  D:{sym:'♦',type:'rock',label:'グー',cls:'rock',ico:'✊'},
  S:{sym:'♠',type:'scis',label:'チョキ',cls:'scis',ico:'✌'},
  C:{sym:'♣',type:'papr',label:'パー',cls:'papr',ico:'✋'},
  H:{sym:'♥',type:'heal',label:'相性なし',cls:'heal',ico:'♥'}  /* enemy-only: no affinity either way */
};
const BEATS={rock:'scis',scis:'papr',papr:'rock'};
const RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const rankLabel=r=>r<=13?RANKS[r-1]:String(r);
const MAX_ME=30,MAX_CPU=200,HAND=6,BEAT=450;
/* player's starting deck (Stage.md): 3〜10 of each suit, one copy each */
const PLAYER_MIN_RANK=3,PLAYER_MAX_RANK=10;
/* stages (Stage.md). ranges: what the enemy can play by round (until = last round the row applies to).
   skill: cd = rounds between activations (fires on the cd-th round), hp = HP thresholds that trigger it,
   len = rounds it lasts, cards(level,turn) = the 3 cards for that skill round, desc(level) = cut-in subtitle */
const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
const STAGES=[
  {name:'STAGE 1',enemy:'イッチメーン',cpu:150,bgm:'music/Groovy_Ignition.mp3',
   ranges:[{until:4,min:3,max:6},{until:6,min:3,max:8},{until:Infinity,min:7,max:11}],
   skill:{cd:4,hp:[100,50],len:1,
     cards:(level,turn)=>{const r=level===1?13:14;return ['D','C','S'].map(suit=>({suit,rank:r}));},
     desc:level=>`相手の場が ♦♣♠ の ${level===1?13:14} になる(1ラウンド)`}},
  {name:'STAGE 2',enemy:'ニーメン',cpu:200,bgm:'music/stage2.mp3',
   ranges:[{until:4,min:5,max:7},{until:6,min:5,max:9},{until:Infinity,min:7,max:11}],
   skill:{cd:4,hp:[150,100,50],len:3,
     cards:(level,turn)=>{const r=level===1?13:15,suit=['D','C','S'][turn-1];return [0,1,2].map(()=>({suit,rank:r}));},
     desc:level=>`3ラウンドの間、♦→♣→♠ の順に ${level===1?13:15} が3枚ずつ出る`}},
  {name:'STAGE 3',enemy:'ラストリオン',cpu:300,bgm:'music/stage3.mp3',
   ranges:[{until:4,min:7,max:10},{until:6,min:7,max:12},{until:Infinity,min:10,max:13}],
   skill:{cd:3,hp:[200,100],len:1,
     cards:(level,turn)=>{const r=level===1?13:15,w=level===1?11:12,wi=Math.floor(Math.random()*3);
       return [0,1,2].map(i=>i===wi?{suit:'H',rank:w}:{suit:pick(['D','C','S']),rank:r});},
     desc:level=>`♦♣♠ の ${level===1?13:15} と、相性のない ♥ の ${level===1?11:12} が1枚(1ラウンド)`}},
];
/* score (Score.md): points earned per stage, spent on the deck-build screen */
const SCORE={kill:500,three:1000,streak5:2000,streak10:4000,streak15:7000,noDamageClear:10000,onemore:4000,combo:3000,skillBreak:10000,round20:5000,round30:20000,time3m:10000,time2m:20000};
/* deck build (DeckBuild.md) */
const DECK_MIN=20,DECK_MAX_COPIES=6;
/* points refunded when a card is removed (DeckBuild.md; 10 is read as 1000 from the 100×rank pattern) */
const REMOVE_REFUND={1:100,2:200,3:300,4:400,5:500,6:600,7:700,8:800,9:900,10:1000,11:11000,12:12000,13:20000};
const ADD_COST={1:100,2:2000,3:3000,4:4000,5:5000,6:6000,7:7000,8:8000,9:9000,10:10000,11:11000,12:12000,13:20000};
const SKILLS={
  low2x:{name:'6以下のカードが常に2倍',desc:'6以下のカードは相性に関係なくパワー2倍(有利でも2倍)',cost:30000},
  adv4x:{name:'相性有利で4倍',desc:'相性が有利なカードのパワーが2倍ではなく4倍になる',cost:20000},
  draw:{name:'毎ターン+1ドロー',desc:'手札の上限が+1(3段階まで重ねられる)',levels:[10000,20000,30000]},
  chain:{name:'7以上で1more連鎖',desc:'7以上のカード3枚で1moreしたとき、そのあとさらに1more',cost:10000}
};
function baseDeckCounts(){const d={};for(const s of DECK_SUITS)for(let r=PLAYER_MIN_RANK;r<=PLAYER_MAX_RANK;r++)d[s+r]=1;return d;}
/* battle cadence per card, in beats (clash → number pops → flies → hold). Fixed so 1,2,3 land on a steady rhythm.
   normal: 2.0 beats per card. onemore: 1.65 beats (a touch quicker). Last Attack multiplies everything by 3. */
const TEMPO={normal:{clash:.55,pop:.45,fly:.35,hold:.65},onemore:{clash:.45,pop:.4,fly:.3,hold:.5}};
/* selection time limit: starts at LIMIT_START, drops LIMIT_STEP every HEAT_EVERY rounds (Heat Up!), never below LIMIT_MIN */
const LIMIT_START=30000,LIMIT_STEP=5000,LIMIT_MIN=10000,HEAT_EVERY=2;
/* deck config: hearts, A and 2 are removed for now */
const DECK_SUITS='DSC',MIN_RANK=3,MAX_RANK=13;

const COMBO_NAME={rev:'Three Card Revolution!',sword:'Sword Combo!',diamond:'Diamond Combo!',clover:'Clover Combo!'};
const COMBO_DESC={
  rev:'同じ数字3枚! 相手のカードがすべて吹き飛び、3枚ともフルダメージ。そのまま1moreへ',
  sword:'♠3枚! 残りの手札で各スートの一番低いカードがKになる + 手札上限+1',
  diamond:'♦3枚! 残りの手札で各スートの一番高いカードが1枚複製される + 手札上限+1',
  clover:'♣3枚! 残りの手札で一番枚数が少ないスートが全部Kになる + 手札上限+1'
};

const SUIT_ORDER={D:0,S:1,C:2,H:3};

const $=id=>document.getElementById(id);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
