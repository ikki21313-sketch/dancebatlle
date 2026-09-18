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
