// 定数とルールのパラメータ。バランス調整はここを触る
const SUITS={
  D:{sym:'♦',type:'rock',label:'グー',cls:'rock',ico:'✊'},
  S:{sym:'♠',type:'scis',label:'チョキ',cls:'scis',ico:'✌'},
  C:{sym:'♣',type:'papr',label:'パー',cls:'papr',ico:'✋'},
  H:{sym:'♥',type:'heal',label:'回復',cls:'heal',ico:'♥'}
};
const BEATS={rock:'scis',scis:'papr',papr:'rock'};
const RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const rankLabel=r=>r<=13?RANKS[r-1]:String(r);
/* enemy skill: fires after SKILL_CD normal rounds or when CPU HP crosses a SKILL_HP_STEP boundary; lasts SKILL_LEN rounds */
const SKILL_CD=5,SKILL_LEN=2,SKILL_HP_STEP=50,SKILL_BASE_RANK=13;
const MAX_ME=30,MAX_CPU=200,HAND=6,BEAT=450;
/* stages: cleared in order, with a deck-build screen between them. cpu = that stage's CPU HP */
const STAGES=[{name:'STAGE 1',cpu:200},{name:'STAGE 2',cpu:200},{name:'STAGE 3',cpu:200}];
/* score (Score.md): points earned per stage, spent on the deck-build screen */
const SCORE={kill:500,three:1000,streak5:2000,streak10:4000,streak15:7000,noDamageClear:10000,onemore:4000,combo:3000,skillBreak:10000,round20:5000,round30:20000,time3m:10000,time2m:20000};
/* deck build (DeckBuild.md) */
const DECK_MIN=20,DECK_MAX_COPIES=6;
const REMOVE_COST={1:100,2:10000,3:9000,4:8000,5:7000,6:6000,7:5000,8:4000,9:3000,10:2000,11:1000,12:-10000,13:-20000};
const ADD_COST={1:100,2:2000,3:3000,4:4000,5:5000,6:6000,7:7000,8:8000,9:9000,10:10000,11:11000,12:12000,13:20000};
const SKILLS={
  low2x:{name:'6以下のカードが常に2倍',desc:'6以下のカードは相性に関係なくパワー2倍(有利でも2倍)',cost:30000},
  adv4x:{name:'相性有利で4倍',desc:'相性が有利なカードのパワーが2倍ではなく4倍になる',cost:20000},
  draw:{name:'毎ターン+1ドロー',desc:'手札の上限が+1(3段階まで重ねられる)',levels:[10000,20000,30000]},
  chain:{name:'7以上で1more連鎖',desc:'7以上のカード3枚で1moreしたとき、そのあとさらに1more',cost:10000}
};
function baseDeckCounts(){const d={};for(const s of DECK_SUITS)for(let r=MIN_RANK;r<=MAX_RANK;r++)d[s+r]=1;return d;}
/* battle cadence per card, in beats (clash → number pops → flies → hold). Fixed so 1,2,3 land on a steady rhythm.
   normal: 2.0 beats per card. onemore: 1.65 beats (a touch quicker). Last Attack multiplies everything by 3. */
const TEMPO={normal:{clash:.55,pop:.45,fly:.35,hold:.65},onemore:{clash:.45,pop:.4,fly:.3,hold:.5}};
/* selection time limit: starts at LIMIT_START, drops LIMIT_STEP every HEAT_EVERY rounds (Heat Up!), never below LIMIT_MIN */
const LIMIT_START=30000,LIMIT_STEP=5000,LIMIT_MIN=10000,HEAT_EVERY=2;
/* deck config: hearts, A and 2 are removed for now */
const DECK_SUITS='DSC',MIN_RANK=3,MAX_RANK=13;
/* CPU plays at most this rank during the first EARLY_ROUNDS rounds */
const EARLY_ROUNDS=4,EARLY_MAX_RANK=10;

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
