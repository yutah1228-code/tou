const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const TILE = 24;
const MAP_W = 25;
const MAP_H = 20;
const PLAYER_SIZE = 80;

const itemImages = {};
const DIRECTIONS = {

  upLeft: [-1, -1],
  up: [0, -1],
  upRight: [1, -1],

  left: [-1, 0],
  right: [1, 0],

  downLeft: [-1, 1],
  down: [0, 1],
  downRight: [1, 1]
};

const ITEM_IMAGE_PATHS = {
  leaf: "images/grass.png",
  shield: "images/shield.png",
  weapon: "images/sword.png",
  staff: "images/staff.png",
  food: "images/bread.png",
  arrow: "images/arrow.png",
  scroll: "images/scroll.png",
  ring: "images/ring.png"
};


for (const [category, src] of Object.entries(ITEM_IMAGE_PATHS)) {
  const image = new Image();

  image.onload = () => {
    render();
  };

  image.onerror = () => {
    console.warn(`アイテム画像を読み込めませんでした: ${src}`);
  };

  image.src = src;

  itemImages[category] = image;
}


canvas.width = MAP_W * TILE;
canvas.height = MAP_H * TILE;

const WALL = 0;
const FLOOR = 1;
const INVENTORY_MAX = 20;
const SAVE_KEY = "roguelike-save-v2";

const playerImage = new Image();
playerImage.src = "images/player.png";
playerImage.onload = render;

let map = [];
let enemies = [];
let items = [];
let stairs = null;
let messages = [];
let gameOver = false;
let arrowAimMode = false;
let selectedInventoryIndex = -1;

let traps = [];

let floorEffects = {
  revealEnemies: false,
  revealItems: false
};

let holyGrounds = [];


// ============================================================
// プレイヤー
// ============================================================

const player = {
  x: 1,
  y: 1,

  hp: 20,
  maxHp: 20,

  level: 1,
  exp: 0,

  baseAttack: 5,
  baseDefense: 0,
  strength: 5,
maxStrength: 5,

  hunger: 100,
  maxHunger: 100,

  floor: 1,

  inventory: [],
   hungerSteps: 0,

  equipment: {
    weapon: null,
    shield: null,
    ring: null,
    arrow: null
  },

  status: {
    confused: 0,
    blind: 0,
    asleep: 0,
    haste: 0,
    slow: 0
  }
};


// ============================================================
// アイテムデータ
// ============================================================

const ITEM_DATA = {

  // ----------------------------------------------------------
  // 武器
  // ----------------------------------------------------------
  // ============================================================
// 武器
// ============================================================

woodStick: {
  id: "woodStick",
  name: "木の棒",
  category: "weapon",
  symbol: "剣",
  color: "#c89b6d",
  attack: 1,
  description: "強さ1の武器。"
},

dagger: {
  id: "dagger",
  name: "短剣",
  category: "weapon",
  symbol: "剣",
  color: "#cccccc",
  attack: 2,
  description: "強さ2の武器。"
},

ironSword: {
  id: "ironSword",
  name: "鉄の剣",
  category: "weapon",
  symbol: "剣",
  color: "#dddddd",
  attack: 4,
  description: "強さ4の武器。"
},

dragonKiller: {
  id: "dragonKiller",
  name: "ドラゴンキラー",
  category: "weapon",
  symbol: "剣",
  color: "#ff9944",
  attack: 5,

  // ドラゴン系への特効は敵種族実装時に使用
  dragonSlayer: true,

  description:
    "強さ5。ドラゴン系に強い武器。"
},

mithrilSword: {
  id: "mithrilSword",
  name: "ミスリルソード",
  category: "weapon",
  symbol: "剣",
  color: "#66ddff",
  attack: 7,

  // 通常床落ちしない
  naturalSpawn: false,

  description:
    "強さ7。メタルスライムがまれに落とす。"
},

benizakura: {
  id: "benizakura",
  name: "紅桜",
  category: "weapon",
  symbol: "剣",
  color: "#ff5577",
  attack: 10,
  description:
    "強さ10。極めて珍しい武器。"
},


// ============================================================
// 盾
// ============================================================

leatherShield: {
  id: "leatherShield",
  name: "皮の盾",
  category: "shield",
  symbol: "盾",
  color: "#b88655",
  defense: 2,

  hungerHalf: true,

  description:
    "強さ2。満腹度の減少速度が半分になる。"
},

ironShield: {
  id: "ironShield",
  name: "鉄の盾",
  category: "shield",
  symbol: "盾",
  color: "#aaaaaa",
  defense: 3,

  description:
    "強さ3の盾。"
},

mysticShield: {
  id: "mysticShield",
  name: "神秘の盾",
  category: "shield",
  symbol: "盾",
  color: "#9966ff",
  defense: 4,

  nullifySpecial: true,

  description:
    "強さ4。モンスターから受ける特殊効果を無効化する。"
},

dragonMail: {
  id: "dragonMail",
  name: "ドラゴンメイル",
  category: "shield",
  symbol: "盾",
  color: "#dd5533",
  defense: 7,

  fireDamageHalf: true,

  description:
    "強さ7。炎によるダメージを半減する。"
},

blackScale: {
  id: "blackScale",
  name: "黒鱗",
  category: "shield",
  symbol: "盾",
  color: "#555555",
  defense: 10,

  description:
    "強さ10の非常に強力な盾。"
},


// ============================================================
// 指輪
// ============================================================

awakeningRing: {
  id: "awakeningRing",
  name: "目覚めの指輪",
  category: "ring",
  symbol: "指",
  color: "#ffd86b",

  wakeEnemies: true,

  description:
    "接近や部屋への出入りでモンスターが必ず目覚める。"
},

wrathRing: {
  id: "wrathRing",
  name: "憤怒の指輪",
  category: "ring",
  symbol: "指",
  color: "#ff7744",

  randomStrength: true,

  description:
    "ちからと最大ちからが変化する。鑑定するまで効果の正負は分からない。"
},

teleportRing: {
  id: "teleportRing",
  name: "転移の指輪",
  category: "ring",
  symbol: "指",
  color: "#bb77ff",

  warpChance: 1 / 16,

  description:
    "歩くたび1/16の確率で同じ階のどこかへ転移する。"
},

insomniaRing: {
  id: "insomniaRing",
  name: "眠眠打破の指輪",
  category: "ring",
  symbol: "指",
  color: "#77ddff",

  preventSleep: true,

  description:
    "睡眠状態にならなくなる。"
},

gluttonyRing: {
  id: "gluttonyRing",
  name: "暴食の指輪",
  category: "ring",
  symbol: "指",
  color: "#dd9955",

  hungerMultiplier: 2,

  description:
    "満腹度の減少速度が2倍になる。"
},

greedRing: {
  id: "greedRing",
  name: "強欲の指輪",
  category: "ring",
  symbol: "指",
  color: "#ffee55",

  doublePickupChance: 0.05,

  description:
    "5%の確率で取得したアイテムが2個になる。"
},

lustRing: {
  id: "lustRing",
  name: "色欲の指輪",
  category: "ring",
  symbol: "指",
  color: "#ff77aa",

  attractEnemies: true,

  description:
    "モンスターを引き寄せやすくなる。"
},
// ============================================================
// 巻物
// ============================================================

trapScroll: {
  id: "trapScroll",
  name: "罠の巻物",
  category: "scroll",
  symbol: "巻",
  color: "#d58cff",
  effect: "addTraps",
  description: "その階に罠を30個追加する。"
},

identifyScroll: {
  id: "identifyScroll",
  name: "識別の巻物",
  category: "scroll",
  symbol: "巻",
  color: "#e6b3ff",
  effect: "identify",
  description: "指定したアイテムを識別し、正体を見破る。"
},

hellEarScroll: {
  id: "hellEarScroll",
  name: "地獄耳の巻物",
  category: "scroll",
  symbol: "巻",
  color: "#b784ff",
  effect: "revealEnemies",
  description: "この階にいるモンスターの位置が分かるようになる。"
},

whiteEyeScroll: {
  id: "whiteEyeScroll",
  name: "白眼の巻物",
  category: "scroll",
  symbol: "巻",
  color: "#eeeeff",
  effect: "revealItems",
  description: "この階に落ちているアイテムの位置が分かるようになる。"
},

weaponUpgradeScroll: {
  id: "weaponUpgradeScroll",
  name: "強化（武）の巻物",
  category: "scroll",
  symbol: "巻",
  color: "#ff7777",
  effect: "weaponUpgrade",
  description: "装備している武器の強さを+1する。"
},

shieldUpgradeScroll: {
  id: "shieldUpgradeScroll",
  name: "強化（防）の巻物",
  category: "scroll",
  symbol: "巻",
  color: "#77aaff",
  effect: "shieldUpgrade",
  description: "装備している盾の強さを+1する。"
},

prayerScroll: {
  id: "prayerScroll",
  name: "祈りの巻物",
  category: "scroll",
  symbol: "巻",
  color: "#ffff99",
  effect: "staffCharge",
  description: "所持している杖1本の使用回数を1～5回増やす。"
},

freezeScroll: {
  id: "freezeScroll",
  name: "フリーズの巻物",
  category: "scroll",
  symbol: "巻",
  color: "#88ddff",
  effect: "freeze",
  description: "周囲8マスのモンスターを攻撃されるまで動けなくする。"
},

meraScroll: {
  id: "meraScroll",
  name: "メラの巻物",
  category: "scroll",
  symbol: "巻",
  color: "#ff6633",
  effect: "mera",
  description: "周囲8マスのモンスターに5～35ダメージを与える。"
},

holyGroundScroll: {
  id: "holyGroundScroll",
  name: "聖地の巻物",
  category: "scroll",
  symbol: "巻",
  color: "#ffffcc",
  effect: "holyGround",
  description: "床に聖域を作る。上にいる間はモンスターの攻撃を受けない。一度置くと拾えない。"
},
// ============================================================
// 杖
// ============================================================

stealthStaff: {
  id: "stealthStaff",
  name: "ステルスの杖",
  category: "staff",
  symbol: "杖",
  color: "#888888",
  effect: "invisible",
  minCharges: 3,
  maxCharges: 5,
  description: "モンスターを透明にしてマップから見えなくする。"
},

hasteStaff: {
  id: "hasteStaff",
  name: "加速の杖",
  category: "staff",
  symbol: "杖",
  color: "#ffaa44",
  effect: "haste",
  minCharges: 3,
  maxCharges: 5,
  description: "モンスターを加速させ、1ターンに2回行動させる。"
},

thunderStaff: {
  id: "thunderStaff",
  name: "雷の杖",
  category: "staff",
  symbol: "杖",
  color: "#ffff55",
  effect: "thunder",
  minCharges: 3,
  maxCharges: 5,
  description: "モンスターに20～30ダメージを与える。"
},

confusionStaff: {
  id: "confusionStaff",
  name: "混乱の杖",
  category: "staff",
  symbol: "杖",
  color: "#ff88ff",
  effect: "confusion",
  minCharges: 3,
  maxCharges: 6,
  description: "10ターン、モンスターの攻撃・移動方向をランダムにする。"
},

splitStaff: {
  id: "splitStaff",
  name: "分裂の杖",
  category: "staff",
  symbol: "杖",
  color: "#77ff99",
  effect: "split",
  minCharges: 3,
  maxCharges: 5,
  description: "モンスターを分裂させる。"
},

sleepStaff: {
  id: "sleepStaff",
  name: "眠りの杖",
  category: "staff",
  symbol: "杖",
  color: "#6699ff",
  effect: "sleep",
  minCharges: 3,
  maxCharges: 6,
  description: "モンスターを5ターン眠らせる。"
},

changeStaff: {
  id: "changeStaff",
  name: "変化の杖",
  category: "staff",
  symbol: "杖",
  color: "#66ffcc",
  effect: "change",
  minCharges: 3,
  maxCharges: 6,
  description: "モンスターを別の種類に変化させる。"
},

warpStaff: {
  id: "warpStaff",
  name: "転送の杖",
  category: "staff",
  symbol: "杖",
  color: "#aa77ff",
  effect: "warp",
  minCharges: 3,
  maxCharges: 5,
  description: "モンスターを同じ階の別の場所へワープさせる。"
},

antiTripStaff: {
  id: "antiTripStaff",
  name: "転ばぬ杖",
  category: "staff",
  symbol: "杖",
  color: "#ddddaa",
  effect: "antiTrip",
  minCharges: 3,
  maxCharges: 5,
  description: "持っている間、転倒を防ぐ。"
},

marazomaStaff: {
  id: "merazomaStaff",
  name: "メラゾーマの杖",
  category: "staff",
  symbol: "杖",
  color: "#ff2222",
  effect: "death",
  minCharges: 1,
  maxCharges: 3,
  description: "命中したモンスターを即死させる。"
},

woodArrow: {
  id: "woodArrow",
  name: "木の矢",
  category: "arrow",
  symbol: "矢",
  color: "#e8d6a0",
  description: "普通の木の矢。強さ4。",
  attack: 4,
  quantity: 5
},

ironArrow: {
  id: "ironArrow",
  name: "鉄の矢",
  category: "arrow",
  symbol: "矢",
  color: "#cccccc",
  description: "鉄製の強力な矢。強さ12。",
  attack: 12,
  quantity: 5
},

silverArrow: {
  id: "silverArrow",
  name: "銀の矢",
  category: "arrow",
  symbol: "矢",
  color: "#eeeeff",
  description: "壁やモンスターを貫通する銀の矢。強さ12。",
  attack: 12,
  quantity: 5,
  piercing: true
},

rottenBread: {
  id: "rottenBread",
  name: "腐ったパン",
  category: "food",
  symbol: "食",
  color: "#ffffff",
  effect: "rottenBread",
  description:
    "満腹度が100%回復するが、ちからが1、HPが5下がる。"
},

bread: {
  id: "bread",
  name: "パン",
  category: "food",
  symbol: "食",
  color: "#ffffff",
  effect: "bread",
  description:
    "満腹度が50%回復する。"
},

bigBread: {
  id: "bigBread",
  name: "大きなパン",
  category: "food",
  symbol: "食",
  color: "#ffffff",
  effect: "bigBread",
  description:
    "満腹度が100%回復する。"
},

powerSeed: {
  id: "powerSeed",
  name: "力の種",
  category: "leaf",
  symbol: "草",
  color: "#ffffff",
  effect: "power",
  description:
    "ちからが1上がる。ちからが最大なら最大値が1上がる。"
},

happinessSeed: {
  id: "happinessSeed",
  name: "幸せの種",
  category: "leaf",
  symbol: "草",
  color: "#ffffff",
  effect: "levelUp",
  description:
    "レベルが1上がる。メタルスライムからも入手できる。"
},

blindGrass: {
  id: "blindGrass",
  name: "目つぶし草",
  category: "leaf",
  symbol: "草",
  color: "#ffffff",
  effect: "blind",
  description:
    "飲むと目が見えなくなる。敵に投げるとプレイヤーの位置を把握できなくなる。"
},

warpGrass: {
  id: "warpGrass",
  name: "転移草",
  category: "leaf",
  symbol: "草",
  color: "#ffffff",
  effect: "warp",
  description:
    "飲むと同じ階の別の場所へワープする。"
},

confusionGrass: {
  id: "confusionGrass",
  name: "混乱草",
  category: "leaf",
  symbol: "草",
  color: "#ffffff",
  effect: "confusion",
  description:
    "10ターンの間、攻撃と移動方向がランダムになる。敵に投げても有効。"
},

herb: {
  id: "herb",
  name: "薬草",
  category: "leaf",
  symbol: "草",
  color: "#ffffff",
  effect: "heal25",
  description:
    "HPを25回復する。HP最大時に飲むと最大HPが1上がる。"
},

sleepGrass: {
  id: "sleepGrass",
  name: "睡眠草",
  category: "leaf",
  symbol: "草",
  color: "#ffffff",
  effect: "sleep",
  description:
    "5ターン眠る。敵に投げた場合も5ターン眠らせる。"
},

fireGrass: {
  id: "fireGrass",
  name: "火炎草",
  category: "leaf",
  symbol: "草",
  color: "#ffffff",
  effect: "fire",
  description:
    "飲むと目の前のモンスターに65～75ダメージを与える。"
},

mysteryGrass: {
  id: "mysteryGrass",
  name: "神秘草",
  category: "leaf",
  symbol: "草",
  color: "#ffffff",
  effect: "mystery",
  description:
    "HPを100回復し、全状態異常を回復する。HP最大時なら最大HPが2上がる。"
},
  
};

const ITEM_POOLS = {

  weapon: [
    "woodStick",
    "dagger",
    "ironSword",
    "dragonKiller",
    "benizakura"
  ],

  shield: [
    "leatherShield",
    "ironShield",
    "mysticShield",
    "dragonMail",
    "blackScale"
  ],

  ring: [
    "awakeningRing",
    "wrathRing",
    "teleportRing",
    "insomniaRing",
    "gluttonyRing",
    "greedRing",
    "lustRing"
  ],

  arrow: [
    "woodArrow",
    "ironArrow",
    "silverArrow"
  ],

  food: [
    "rottenBread",
    "bread",
    "bigBread"
  ],

  leaf: [
    "powerSeed",
    "blindGrass",
    "warpGrass",
    "confusionGrass",
    "herb",
    "sleepGrass",
    "fireGrass",
    "mysteryGrass"
  ],

  scroll: [
    "trapScroll",
    "identifyScroll",
    "hellEarScroll",
    "whiteEyeScroll",
    "weaponUpgradeScroll",
    "shieldUpgradeScroll",
    "prayerScroll",
    "freezeScroll",
    "meraScroll",
    "holyGroundScroll"
  ],

  staff: [
    "stealthStaff",
    "hasteStaff",
    "thunderStaff",
    "confusionStaff",
    "splitStaff",
    "sleepStaff",
    "changeStaff",
    "warpStaff",
    "antiTripStaff",
    "merazomaStaff"
  ]
};


// ============================================================
// 共通
// ============================================================

function log(text) {
  messages.push(text);

  if (messages.length > 5) {
    messages.shift();
  }

  const el = document.getElementById("message");

  if (el) {
    el.innerHTML = messages.join("<br>");
  }
}


function randomInt(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}


function createItem(id) {

  const data = ITEM_DATA[id];

  if (!data) {
    console.error(
      `存在しないアイテムID: ${id}`
    );
    return null;
  }

  const item = {
    id: id,

    // 最初は本物として扱う
    identified: true,

    // 偽装表示用
    fakeId: null,

    plus: 0
  };


  // 杖の使用回数
  if (data.category === "staff") {

    item.charges = randomInt(
      data.minCharges || 3,
      data.maxCharges || 5
    );
  }


  // 矢
  if (data.category === "arrow") {

    item.quantity =
      randomInt(3, 10);
  }


  // ==========================
  // 20%で未識別
  // ==========================

  if (Math.random() < 0.10) {

    item.identified = false;

    item.fakeId =
      getRandomFakeItemId(id);
  }


  return item;
}

function getRandomFakeItemId(realId) {

  const real =
    ITEM_DATA[realId];

  if (!real) {
    return null;
  }

  // 同じカテゴリの別アイテムだけを候補にする
  const candidates =
    Object.values(ITEM_DATA)
      .filter(data =>
        data.category === real.category &&
        data.id !== realId
      );

  if (candidates.length === 0) {
    return null;
  }

  return candidates[
    randomInt(
      0,
      candidates.length - 1
    )
  ].id;
}


function itemName(item) {

  if (!item) {
    return "不明";
  }

  // 未識別なら偽物の名前
  const displayId =
    !item.identified && item.fakeId
      ? item.fakeId
      : item.id;

  const data =
    ITEM_DATA[displayId];

  if (!data) {

    console.warn(
      "存在しないアイテム:",
      displayId
    );

    return "謎のアイテム";
  }


  let name =
    data.name;


  // 未識別
  if (!item.identified) {
    name += "？";
  }


  // 強化値
  if (item.plus) {
    name += ` +${item.plus}`;
  }


  // 杖
  if (
    ITEM_DATA[item.id]?.category ===
    "staff"
  ) {

    name +=
      ` [${item.charges ?? 0}]`;
  }


  // 矢
  if (
    ITEM_DATA[item.id]?.category ===
    "arrow"
  ) {

    name +=
      ` ×${item.quantity ?? 1}`;
  }


  return name;
}
// ------------------------------------------------
// 足踏み・休憩
// 満腹度1を使ってHP1回復
// ------------------------------------------------

function restPlayer() {

  if (gameOver) return;

  if (player.hunger <= 0) {

    log("空腹なので休憩できない。");

    endTurn();
    return;
  }

  player.hunger--;

  if (player.hp < player.maxHp) {

    player.hp++;

    log("休憩した。HPが1回復した。");

  } else {

    log("休憩した。");
  }

  endTurn();
}

// ============================================================
// ダンジョン
// ============================================================

function generateDungeon() {
    traps = [];

holyGrounds = [];

floorEffects = {
  revealEnemies: false,
  revealItems: false
};

  map = Array.from(
    { length: MAP_H },
    () => Array(MAP_W).fill(WALL)
  );

  const rooms = [];

  for (let i = 0; i < 12; i++) {

    const w = randomInt(4, 8);
    const h = randomInt(4, 7);

    const x = randomInt(
      1,
      MAP_W - w - 2
    );

    const y = randomInt(
      1,
      MAP_H - h - 2
    );

    const room = { x, y, w, h };

    let overlaps = false;

    for (const r of rooms) {

      if (
        x < r.x + r.w + 1 &&
        x + w + 1 > r.x &&
        y < r.y + r.h + 1 &&
        y + h + 1 > r.y
      ) {
        overlaps = true;
        break;
      }
    }

    if (overlaps) continue;

    rooms.push(room);

    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        map[yy][xx] = FLOOR;
      }
    }
  }


  if (rooms.length === 0) {
    generateDungeon();
    return;
  }


  for (let i = 1; i < rooms.length; i++) {

    const a = rooms[i - 1];
    const b = rooms[i];

    let x1 = Math.floor(a.x + a.w / 2);
    let y1 = Math.floor(a.y + a.h / 2);

    const x2 = Math.floor(b.x + b.w / 2);
    const y2 = Math.floor(b.y + b.h / 2);

    while (x1 !== x2) {
      map[y1][x1] = FLOOR;
      x1 += x1 < x2 ? 1 : -1;
    }

    while (y1 !== y2) {
      map[y1][x1] = FLOOR;
      y1 += y1 < y2 ? 1 : -1;
    }

    map[y2][x2] = FLOOR;
  }


  const start = rooms[0];

  player.x =
    Math.floor(start.x + start.w / 2);

  player.y =
    Math.floor(start.y + start.h / 2);


  const last =
    rooms[rooms.length - 1];

  stairs = {
    x: Math.floor(last.x + last.w / 2),
    y: Math.floor(last.y + last.h / 2)
  };

  generateEnemies();
  generateItems();
}


// ============================================================
// 敵
// ============================================================

function createEnemy(pos) {

  return {
    x: pos.x,
    y: pos.y,

    hp: 7 + player.floor * 2,
    maxHp: 7 + player.floor * 2,

    attack:
      2 + Math.floor(player.floor / 2),

    defense:
      Math.floor(player.floor / 4),

    exp: 4 + player.floor,

    status: {
      asleep: 0,
      confused: 0,
      frozen: 0,
      sealed: false,
      slow: false,
      haste: false,
      invisible: false
    }
  };
}

function handleDirection(dx, dy) {

  if (arrowAimMode) {
    shootArrow(dx, dy);
    return;
  }

  movePlayer(dx, dy);
}

function generateEnemies() {

  enemies = [];

  const count =
    4 + Math.floor(player.floor / 2);

  for (let i = 0; i < count; i++) {

    const pos = randomFloorPosition();

    if (!pos) continue;

    enemies.push(createEnemy(pos));
  }
}


function enemyAt(x, y) {

  return enemies.find(
    enemy =>
      enemy.x === x &&
      enemy.y === y
  );
}

// ============================================================
// アイテム出現率
// ============================================================

// 最初にカテゴリを抽選する。
// 合計100%
const ITEM_CATEGORY_RATES = [
  { category: "weapon", rate: 11 },
  { category: "shield", rate: 11 },
  { category: "ring",   rate: 15 },
  { category: "arrow",  rate: 5 },
  { category: "food",   rate: 5 },
  { category: "leaf",   rate: 20 },
  { category: "scroll", rate: 18 },
  { category: "staff",  rate: 15 }
];


// 武器内の出現率
// ミスリルソードは含めない。
// メタルスライム専用ドロップ。
const WEAPON_SPAWN_RATES = [
  { id: "woodStick",    rate: 44.5 },
  { id: "dagger",       rate: 30 },
  { id: "ironSword",    rate: 20 },
  { id: "dragonKiller", rate: 5 },
  { id: "benizakura",   rate: 0.5 }
];


// 盾は個別確率がまだ指定されていないので
// 現時点では均等。
const SHIELD_SPAWN_RATES = [
  { id: "leatherShield", rate: 20 },
  { id: "ironShield",    rate: 20 },
  { id: "mysticShield",  rate: 20 },
  { id: "dragonMail",    rate: 20 },
  { id: "blackScale",    rate: 20 }
];


// 指輪も個別出現率が未指定なので現在は均等。
const RING_SPAWN_RATES = [
  { id: "awakeningRing", rate: 1 },
  { id: "wrathRing",     rate: 1 },
  { id: "teleportRing",  rate: 1 },
  { id: "insomniaRing",  rate: 1 },
  { id: "gluttonyRing",  rate: 1 },
  { id: "greedRing",     rate: 1 },
  { id: "lustRing",      rate: 1 }
];

// ============================================================
// 重み付きランダム
// ============================================================

function weightedRandom(table) {

  const total = table.reduce(
    (sum, entry) => sum + entry.rate,
    0
  );

  let roll = Math.random() * total;

  for (const entry of table) {

    roll -= entry.rate;

    if (roll < 0) {
      return entry;
    }
  }

  return table[table.length - 1];
}

function rollItemCategory() {

  return weightedRandom(
    ITEM_CATEGORY_RATES
  ).category;
}

function rollItemId() {

  // 最大100回抽選する
  for (let attempt = 0; attempt < 100; attempt++) {

    const category = rollItemCategory();

    // -------------------------
    // 武器
    // -------------------------
    if (category === "weapon") {

      const entry =
        weightedRandom(WEAPON_SPAWN_RATES);

      if (ITEM_DATA[entry.id]) {
        return entry.id;
      }

      continue;
    }

    // -------------------------
    // 盾
    // -------------------------
    if (category === "shield") {

      const entry =
        weightedRandom(SHIELD_SPAWN_RATES);

      if (ITEM_DATA[entry.id]) {
        return entry.id;
      }

      continue;
    }

    // -------------------------
    // 指輪
    // -------------------------
    if (category === "ring") {

      const entry =
        weightedRandom(RING_SPAWN_RATES);

      if (ITEM_DATA[entry.id]) {
        return entry.id;
      }

      continue;
    }

    // -------------------------
    // その他
    // -------------------------
    const candidates =
      Object.values(ITEM_DATA)
        .filter(data =>
          data &&
          data.category === category &&
          data.naturalSpawn !== false
        );

    // そのカテゴリのアイテムがまだ
    // ITEM_DATAに存在しない場合は再抽選
    if (candidates.length === 0) {

      console.warn(
        `カテゴリ「${category}」のアイテムが未登録なので再抽選します。`
      );

      continue;
    }

    return candidates[
      randomInt(
        0,
        candidates.length - 1
      )
    ].id;
  }

  // 100回失敗した場合の最終保険
  console.warn(
    "アイテム抽選に失敗したため木の棒を生成します。"
  );

  return "woodStick";
}
// ============================================================
// アイテム生成
// ============================================================

function generateItems() {

  items = [];

  const count = randomInt(3, 6);

  for (let i = 0; i < count; i++) {

    let pos = null;

    // 最大500回探す
    for (let attempt = 0; attempt < 500; attempt++) {

      const candidate = randomFloorPosition();

      if (!candidate) continue;

      // 他のアイテムが置かれていないか
      const itemExists = items.some(
        item =>
          item.x === candidate.x &&
          item.y === candidate.y
      );

      // 階段ではないか
      const isStairs =
        stairs &&
        stairs.x === candidate.x &&
        stairs.y === candidate.y;

      // 敵ではないか
      const hasEnemy =
        enemies.some(
          enemy =>
            enemy.x === candidate.x &&
            enemy.y === candidate.y
        );

      if (
        !itemExists &&
        !isStairs &&
        !hasEnemy
      ) {
        pos = candidate;
        break;
      }
    }

    if (!pos) continue;

    // ↓ここは今使っている
    // アイテム抽選関数に合わせる
    const id = rollItemId();

if (!id || !ITEM_DATA[id]) {

  console.warn(
    "存在しないアイテムID:",
    id
  );

  continue;
}


const newItem =
  createItem(id);

if (!newItem) {
  continue;
}


items.push({
  ...newItem,
  x: pos.x,
  y: pos.y
});
  }
}

function updateInventoryActionButtons() {

  const shootButton =
    document.getElementById("shootArrowButton");

  if (selectedInventoryIndex < 0) {
    shootButton.hidden = true;
    return;
  }

  const item =
    player.inventory[selectedInventoryIndex];

  if (!item) {
    shootButton.hidden = true;
    return;
  }

  const data = ITEM_DATA[item.id];

  if (!data) {
    shootButton.hidden = true;
    return;
  }

  // 装備中の矢か？
  const equipped =
    player.equipment.arrow === item ||
    player.equipment.arrow?.uid === item.uid;

  shootButton.hidden =
    !(data.category === "arrow" && equipped);
}

function canPlaceItem(x, y) {

  if (map[y][x] !== FLOOR) {
    return false;
  }

  if (
    x === player.x &&
    y === player.y
  ) {
    return false;
  }

  if (
    stairs &&
    stairs.x === x &&
    stairs.y === y
  ) {
    return false;
  }

  if (
    items.some(
      item =>
        item.x === x &&
        item.y === y
    )
  ) {
    return false;
  }

  if (
    enemies.some(
      enemy =>
        enemy.x === x &&
        enemy.y === y
    )
  ) {
    return false;
  }

  return true;
}


function randomFloorPosition() {

  for (let i = 0; i < 500; i++) {

    const x =
      randomInt(1, MAP_W - 2);

    const y =
      randomInt(1, MAP_H - 2);

    if (
      map[y]?.[x] === FLOOR &&
      !(x === player.x && y === player.y) &&
      !enemyAt(x, y)
    ) {
      return { x, y };
    }
  }

  return null;
}


// ============================================================
// 能力値
// ============================================================

function getPlayerAttack() {

  let value = player.baseAttack;

  const weapon =
    player.equipment.weapon;

  const ring =
    player.equipment.ring;

  if (weapon) {

    const data =
      ITEM_DATA[weapon.id];

    value +=
      (data.attack || 0) +
      (weapon.plus || 0);
  }

  if (ring) {

    value +=
      ITEM_DATA[ring.id]?.attack || 0;
  }

  return Math.max(1, value);
}


function getPlayerDefense() {

  let value =
    player.baseDefense;

  const shield =
    player.equipment.shield;

  if (shield) {

    const data =
      ITEM_DATA[shield.id];

    value +=
      (data.defense || 0) +
      (shield.plus || 0);
  }

  return Math.max(0, value);
}


// ============================================================
// プレイヤー移動
// ============================================================

function movePlayer(dx, dy) {

  if (gameOver) return;

  if (player.status.asleep > 0) {
    log("眠っていて動けない！");
    endTurn();
    return;
  }

  if (player.status.confused > 0) {

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];

    [dx, dy] =
      dirs[randomInt(0, 3)];
  }


  const nx = player.x + dx;
  const ny = player.y + dy;

  if (
    nx < 0 ||
    ny < 0 ||
    nx >= MAP_W ||
    ny >= MAP_H
  ) {
    return;
  }


  if (map[ny][nx] === WALL) {
    log("壁がある。");
    return;
  }


  const enemy =
    enemyAt(nx, ny);

  if (enemy) {

    attackEnemy(enemy);

  } else {

    player.x = nx;
player.y = ny;

// 1歩進んだ
addHungerStep();

checkItem();
    
    checkTrap();
    


    if (
      stairs &&
      player.x === stairs.x &&
      player.y === stairs.y
    ) {
      nextFloor();
      return;
    }
  }

  endTurn();
}

function checkTrap() {

  const index =
    traps.findIndex(
      trap =>
        trap.x === player.x &&
        trap.y === player.y
    );

  if (index === -1) return;

  const damage =
    randomInt(3, 8);

  player.hp -= damage;

  log(
    `罠を踏んだ！ ${damage}ダメージ！`
  );

  // 発動した罠は消える
  traps.splice(index, 1);
}

function placeHolyGround() {

  const exists =
    holyGrounds.some(
      ground =>
        ground.x === player.x &&
        ground.y === player.y
    );

  if (exists) {

    log("ここにはすでに聖地がある。");

    return;
  }

  holyGrounds.push({
    x: player.x,
    y: player.y
  });

  log(
    "足元に聖地が生まれた！"
  );
}


function playerOnHolyGround() {

  return holyGrounds.some(
    ground =>
      ground.x === player.x &&
      ground.y === player.y
  );
}

function moveEnemyOnce(enemy) {

  if (!enemies.includes(enemy)) {
    return;
  }

  let dx =
    player.x - enemy.x;

  let dy =
    player.y - enemy.y;

  const distance =
    Math.max(
      Math.abs(dx),
      Math.abs(dy)
    );

  if (distance === 1) {

    enemyAttack(enemy);

    return;
  }

  if (distance < 8) {

    const mx =
      Math.sign(dx);

    const my =
      Math.sign(dy);

    tryEnemyMove(
      enemy,
      mx,
      my
    );
  }
}


// ============================================================
// 通常攻撃
// ============================================================
function shootArrow(dx, dy) {

  const arrow = player.equipment.arrow;

  if (!arrow) {
    log("矢を装備していない。");
    arrowAimMode = false;
    return;
  }

  const data = ITEM_DATA[arrow.id];

  if (!data) {
    log("矢のデータが存在しない。");
    arrowAimMode = false;
    return;
  }

  let x = player.x;
  let y = player.y;

  let hit = false;

  // 最大射程
  const range = 10;

  for (let i = 0; i < range; i++) {

    x += dx;
    y += dy;

    // マップ外
    if (
      x < 0 ||
      y < 0 ||
      x >= MAP_W ||
      y >= MAP_H
    ) {
      break;
    }

    // 壁
    if (map[y][x] === WALL) {

      // 銀の矢は壁を貫通
      if (data.piercing) {
        continue;
      }

      log(`${data.name}は壁に当たった。`);
      break;
    }

    const enemy = enemyAt(x, y);

    if (enemy) {

      const damage =
        data.attack + randomInt(0, 2);

      enemy.hp -= damage;

      log(
        `${data.name}が敵に命中！ ${damage}ダメージ！`
      );

      hit = true;

      if (enemy.hp <= 0) {

        enemies =
          enemies.filter(e => e !== enemy);

        player.exp += enemy.exp;

        log(
          `敵を倒した！ EXP +${enemy.exp}`
        );

        checkLevelUp();
      }

      // 普通の矢なら最初の敵で停止
      if (!data.piercing) {
        break;
      }
    }
  }

  if (!hit) {
    log(`${data.name}を放った！`);
  }

  consumeArrow();

  arrowAimMode = false;

  endTurn();
}

function consumeArrow() {

  const arrow = player.equipment.arrow;

  if (!arrow) return;

  // 本数がない古いセーブデータ対策
  if (arrow.quantity == null) {

    const data = ITEM_DATA[arrow.id];

    arrow.quantity =
      data?.quantity ?? 1;
  }

  arrow.quantity--;

  if (arrow.quantity > 0) {

    log(`残り ${arrow.quantity}本。`);

    return;
  }

  log(`${ITEM_DATA[arrow.id]?.name ?? "矢"}を使い切った。`);

  // inventoryにも同じ矢が入っている場合
  const index =
    player.inventory.indexOf(arrow);

  if (index !== -1) {
    player.inventory.splice(index, 1);
  }

  player.equipment.arrow = null;

  renderInventory?.();
}

function attackEnemy(enemy) {
    if (
  enemy.status &&
  enemy.status.frozen !== 0
) {

  enemy.status.frozen = 0;

  log(
    "攻撃を受けてモンスターの凍結が解けた！"
  );
}

  const raw =
    getPlayerAttack() +
    randomInt(0, 3);

  const damage =
    Math.max(
      1,
      raw - (enemy.defense || 0)
    );

  enemy.hp -= damage;

  log(`敵に ${damage} ダメージ！`);

  if (enemy.hp <= 0) {
    defeatEnemy(enemy);
  }

  
}


function defeatEnemy(enemy) {

  enemies =
    enemies.filter(
      e => e !== enemy
    );

  player.exp +=
    enemy.exp || 0;


  log(
    `${enemy.name || "敵"}を倒した！ EXP +${enemy.exp || 0}`
  );


  // ==========================================
  // メタルスライム限定ドロップ
  // ==========================================

  if (
    enemy.type === "metalSlime" &&
    Math.random() < 0.20
  ) {

    // 倒した場所にミスリルソードを落とす
    items.push({
      ...createItem(
        "mithrilSword"
      ),

      x: enemy.x,
      y: enemy.y
    });


    log(
      "メタルスライムがミスリルソードを落とした！"
    );
  }


  checkLevelUp();
}


// ============================================================
// レベル
// ============================================================

function checkLevelUp() {

  let required =
    player.level * 10;

  while (player.exp >= required) {

    player.exp -= required;

    player.level++;

    player.maxHp += 5;

    player.hp =
      player.maxHp;

    player.baseAttack += 2;

    log(
      `レベル ${player.level} になった！`
    );

    required =
      player.level * 10;
  }
}


// ============================================================
// 地面アイテム
// ============================================================

function getGroundItem() {

  return items.find(
    item =>
      item.x === player.x &&
      item.y === player.y
  );
}


function checkItem() {

  const item =
    getGroundItem();

  if (!item) {

    hideItemActions();

    return;
  }

  const data =
    ITEM_DATA[item.id];

  if (!data) {

    console.error(
      `存在しないアイテム: ${item.id}`
    );

    hideItemActions();

    return;
  }

  log(
    `${itemName(item)}が落ちている。`
  );

  log(
    `効果：${data.description}`
  );

  showItemActions(item);
}


function showItemActions(item) {

  const panel =
    document.getElementById("itemActions");

  if (!panel) return;

  const name =
    document.getElementById(
      "groundItemName"
    );

  if (name) {
    name.textContent =
      itemName(item);
  }

  const data =
    ITEM_DATA[item.id];

  const useButton =
    document.getElementById(
      "useGroundItem"
    );

  const equipButton =
    document.getElementById(
      "equipGroundItem"
    );


  if (useButton) {

    useButton.hidden =
      ![
        "food",
        "leaf",
        "scroll"
      ].includes(data.category);
  }


  if (equipButton) {

    equipButton.hidden =
      ![
        "weapon",
        "shield",
        "ring",
        "arrow"
      ].includes(data.category);
  }

  panel.hidden = false;
}


function hideItemActions() {

  const panel =
    document.getElementById(
      "itemActions"
    );

  if (panel) {
    panel.hidden = true;
  }
}

function addRandomTraps(count) {

  for (let i = 0; i < count; i++) {

    const pos =
      randomFloorPosition();

    if (!pos) continue;

    const exists =
      traps.some(
        trap =>
          trap.x === pos.x &&
          trap.y === pos.y
      );

    if (exists) continue;

    traps.push({
      x: pos.x,
      y: pos.y,
      type: "damage"
    });
  }
}


// ============================================================
// 拾う
// ============================================================

function pickupItem() {

  const index = items.findIndex(
    item =>
      item.x === player.x &&
      item.y === player.y
  );

  if (index === -1) return;

  if (player.inventory.length >= INVENTORY_MAX) {
    log("鞄がいっぱいだ！");
    return;
  }

  const groundItem = items[index];

  if (!ITEM_DATA[groundItem.id]) {
    console.error(
      `存在しないアイテムID: ${groundItem.id}`
    );
    return;
  }

  // x,y以外のデータをそのまま保持する
  const inventoryItem = {
    ...groundItem,
    equipped: false
  };

  delete inventoryItem.x;
  delete inventoryItem.y;

  player.inventory.push(inventoryItem);

  items.splice(index, 1);

  log(`${itemName(inventoryItem)}を鞄にしまった。`);


  // 強欲の指輪
  const ring = player.equipment.ring;
  const ringData =
    ring ? ITEM_DATA[ring.id] : null;

  if (
    ringData?.doublePickupChance &&
    Math.random() < ringData.doublePickupChance &&
    player.inventory.length < INVENTORY_MAX
  ) {

    const duplicate =
      JSON.parse(
        JSON.stringify(inventoryItem)
      );

    duplicate.equipped = false;

    player.inventory.push(duplicate);

    log(
      `強欲の指輪が輝いた！ ${itemName(duplicate)}がもう1個手に入った！`
    );
  }

  hideItemActions();
  updateInventoryUI();
  render();
  autoSave();
}


// ============================================================
// 装備
// ============================================================

function categoryToSlot(category) {

  switch (category) {
    case "weapon":
      return "weapon";

    case "shield":
      return "shield";

    case "ring":
      return "ring";

    case "arrow":
      return "arrow";

    default:
      return null;
  }
}


// ↓このあたりに置く
function rebuildEquipment() {

  player.equipment = {
    weapon: null,
    shield: null,
    ring: null,
    arrow: null
  };

  for (const item of player.inventory) {

    item.equipped ??= false;

    if (!item.equipped) {
      continue;
    }

    const data =
      ITEM_DATA[item.id];

    if (!data) {
      item.equipped = false;
      continue;
    }

    const slot =
      categoryToSlot(data.category);

    if (!slot) {
      item.equipped = false;
      continue;
    }

    // 同じ種類を2個装備しない
    if (player.equipment[slot]) {
      item.equipped = false;
      continue;
    }

    player.equipment[slot] = item;
  }
}


function equipGroundItem() {

  const index = items.findIndex(
    item =>
      item.x === player.x &&
      item.y === player.y
  );

  if (index === -1) return;

  if (
    player.inventory.length >=
    INVENTORY_MAX
  ) {
    log("鞄がいっぱいで装備できない！");
    return;
  }

  const groundItem = items[index];
  const data = ITEM_DATA[groundItem.id];

  if (!data) {
    console.error(
      `存在しないアイテムID: ${groundItem.id}`
    );
    return;
  }

  const slot =
    categoryToSlot(data.category);

  if (!slot) {
    log("これは装備できない。");
    return;
  }


  // 現在の同スロット装備を解除
  for (const invItem of player.inventory) {

    const invData =
      ITEM_DATA[invItem.id];

    if (!invData) continue;

    if (
      categoryToSlot(
        invData.category
      ) === slot
    ) {
      invItem.equipped = false;
    }
  }


  // 地面アイテムの全データを保存
  const newItem = {
    ...groundItem,
    equipped: true
  };

  delete newItem.x;
  delete newItem.y;

  player.inventory.push(newItem);

  player.equipment[slot] =
    newItem;

  items.splice(index, 1);

  log(
    `${itemName(newItem)}を装備した！`
  );

  hideItemActions();

  updateInventoryUI();
  updateUI();
  render();
  autoSave();
}


// ============================================================
// 地面から直接使用
// ============================================================

function useGroundItem() {

  const index =
    items.findIndex(
      item =>
        item.x === player.x &&
        item.y === player.y
    );

  if (index === -1) return;

  const item = items[index];

  if (!useConsumable(item)) {
    return;
  }

  items.splice(index, 1);

  hideItemActions();

  updateInventoryUI();
  updateUI();
  render();
  autoSave();

  endTurn();
}

function applySleepToPlayer(turns) {

  const ring =
    player.equipment.ring;

  if (
    ring &&
    ITEM_DATA[ring.id]?.preventSleep
  ) {

    log(
      "眠眠打破の指輪が睡眠を防いだ！"
    );

    return false;
  }


  const shield =
    player.equipment.shield;

  if (
    shield &&
    ITEM_DATA[shield.id]?.nullifySpecial
  ) {

    log(
      "神秘の盾が特殊効果を防いだ！"
    );

    return false;
  }


  player.status.asleep = turns;

  log("眠ってしまった！");

  return true;
}

function damagePlayer(
  amount,
  damageType = "normal"
) {

  let damage = amount;


  const shield =
    player.equipment.shield;

  const shieldData =
    shield
      ? ITEM_DATA[shield.id]
      : null;


  // 炎ダメージ半減
  if (
    damageType === "fire" &&
    shieldData?.fireDamageHalf
  ) {

    damage =
      Math.ceil(damage / 2);

    log(
      "ドラゴンメイルが炎を軽減した！"
    );
  }


  // 通常防御
  if (damageType === "normal") {

    damage =
      Math.max(
        1,
        damage -
        getPlayerDefense()
      );
  }


  player.hp -= damage;

  return damage;
}


// ============================================================
// 消耗品
// ============================================================

function useConsumable(item) {

  const data =
    ITEM_DATA[item.id];

  if (!data) {
    return false;
  }


  // =========================
  // 食料
  // =========================

  if (data.category === "food") {

    switch (data.effect) {

      case "rottenBread":

        player.hunger =
          player.maxHunger;

        player.strength =
          Math.max(
            1,
            player.strength - 1
          );

        player.hp =
          Math.max(
            1,
            player.hp - 5
          );

        log(
          "腐ったパンを食べた。満腹になったが、ちからが1、HPが5下がった！"
        );

        break;


      case "bread":

        player.hunger =
          Math.min(
            player.maxHunger,
            player.hunger +
              Math.ceil(
                player.maxHunger *
                0.5
              )
          );

        log(
          "パンを食べた。満腹度が50%回復した！"
        );

        break;


      case "bigBread":

        player.hunger =
          player.maxHunger;

        log(
          "大きなパンを食べた。満腹になった！"
        );

        break;
    }

    return true;
  }


  // =========================
  // 草
  // =========================

  if (data.category === "leaf") {

    switch (data.effect) {

      // 力の種
      case "power":

        if (
          player.strength >=
          player.maxStrength
        ) {

          player.maxStrength++;

          player.strength =
            player.maxStrength;

          log(
            "最大ちからが1上がった！"
          );

        } else {

          player.strength++;

          log(
            "ちからが1上がった！"
          );
        }

        break;


      // 幸せの種
      case "levelUp":

        player.level++;
        player.maxHp += 5;
        player.hp =
          player.maxHp;
        player.baseAttack += 2;

        log(
          `レベル ${player.level} になった！`
        );

        break;


      // 目つぶし草
      case "blind":

        player.status.blind = 10;

        log(
          "目が見えなくなった！"
        );

        break;


      // 転移草
      case "warp":

        warpPlayer();

        log(
          "転移草の力でワープした！"
        );

        break;


      // 混乱草
      case "confusion":

        player.status.confused = 10;

        log(
          "混乱してしまった！"
        );

        break;


      // 薬草
      case "heal25":

        if (
          player.hp >=
          player.maxHp
        ) {

          player.maxHp++;
          player.hp =
            player.maxHp;

          log(
            "最大HPが1上がった！"
          );

        } else {

          const before =
            player.hp;

          player.hp =
            Math.min(
              player.maxHp,
              player.hp + 25
            );

          log(
            `HPが${player.hp - before}回復した！`
          );
        }

        break;


      // 睡眠草
      case "sleep":

        applySleepToPlayer(5);

        break;


      // 火炎草
      case "fire":

        useFireGrass();

        break;


      // 神秘草
      case "mystery":

        if (
          player.hp >=
          player.maxHp
        ) {

          player.maxHp += 2;
          player.hp =
            player.maxHp;

          log(
            "最大HPが2上がった！"
          );

        } else {

          const before =
            player.hp;

          player.hp =
            Math.min(
              player.maxHp,
              player.hp + 100
            );

          log(
            `HPが${player.hp - before}回復した！`
          );
        }


        player.status.confused = 0;
        player.status.blind = 0;
        player.status.asleep = 0;
        player.status.haste = 0;
        player.status.slow = 0;

        log(
          "すべての状態異常が回復した！"
        );

        break;


      default:

        log(
          `${data.name}を使った。`
        );
    }

    return true;
  }


  // =========================
  // 巻物
  // =========================

  if (data.category === "scroll") {

    useScroll(item);

    return true;
  }


  return false;
}


// ============================================================
// 巻物
// ============================================================

function useScroll(item) {

  const data = ITEM_DATA[item.id];

  if (!data) return;

  switch (data.effect) {

    // ==========================
    // 罠の巻物
    // ==========================
    case "addTraps":

      addRandomTraps(30);

      log("罠の巻物を読んだ！ 罠が30個増えた！");

      break;


    // ==========================
    // 識別
    // ==========================
    case "identify": {

      const targets =
        player.inventory.filter(
          target => !target.identified
        );

      if (targets.length === 0) {

        log("識別する必要のあるアイテムがない。");

        break;
      }

      // 現段階では未識別品から1つ選択
      const target =
        targets[
          randomInt(0, targets.length - 1)
        ];

      target.identified = true;

      log(
        `${itemName(target)}の正体を見破った！`
      );

      break;
    }


    // ==========================
    // 地獄耳
    // ==========================
    case "revealEnemies":

      floorEffects.revealEnemies = true;

      log(
        "地獄耳の巻物を読んだ！ モンスターの気配が分かる！"
      );

      break;


    // ==========================
    // 白眼
    // ==========================
    case "revealItems":

      floorEffects.revealItems = true;

      log(
        "白眼の巻物を読んだ！ アイテムの位置が分かる！"
      );

      break;


    // ==========================
    // 武器強化
    // ==========================
    case "weaponUpgrade":

      if (player.equipment.weapon) {

        player.equipment.weapon.plus =
          (player.equipment.weapon.plus || 0) + 1;

        log("装備している武器が+1強化された！");

      } else {

        log("武器を装備していない。");
      }

      break;


    // ==========================
    // 盾強化
    // ==========================
    case "shieldUpgrade":

      if (player.equipment.shield) {

        player.equipment.shield.plus =
          (player.equipment.shield.plus || 0) + 1;

        log("装備している盾が+1強化された！");

      } else {

        log("盾を装備していない。");
      }

      break;


    // ==========================
    // 祈り
    // ==========================
    case "staffCharge": {

      const staffs =
        player.inventory.filter(
          target =>
            ITEM_DATA[target.id]?.category === "staff"
        );

      if (staffs.length === 0) {

        log("杖を持っていない。");

        break;
      }

      // 今は所持している杖からランダムに1本
      const staff =
        staffs[
          randomInt(0, staffs.length - 1)
        ];

      const amount =
        randomInt(1, 5);

      staff.charges =
        (staff.charges || 0) + amount;

      log(
        `${ITEM_DATA[staff.id].name}の使用回数が${amount}増えた！`
      );

      break;
    }


    // ==========================
    // フリーズ
    // ==========================
    case "freeze": {

      let count = 0;

      for (const enemy of enemies) {

        const dx =
          Math.abs(enemy.x - player.x);

        const dy =
          Math.abs(enemy.y - player.y);

        // 周囲8マス
        if (
          dx <= 1 &&
          dy <= 1 &&
          !(dx === 0 && dy === 0)
        ) {

          enemy.status.frozen = -1;

          count++;
        }
      }

      log(
        count
          ? `${count}体のモンスターが凍りついた！`
          : "周囲にモンスターはいなかった。"
      );

      break;
    }


    // ==========================
    // メラ
    // ==========================
    case "mera": {

      let count = 0;

      for (const enemy of [...enemies]) {

        const dx =
          Math.abs(enemy.x - player.x);

        const dy =
          Math.abs(enemy.y - player.y);

        if (
          dx <= 1 &&
          dy <= 1 &&
          !(dx === 0 && dy === 0)
        ) {

          const damage =
            randomInt(5, 35);

          enemy.hp -= damage;

          count++;

          log(
            `メラ！ 敵に${damage}ダメージ！`
          );

          if (enemy.hp <= 0) {
            defeatEnemy(enemy);
          }
        }
      }

      if (count === 0) {
        log("周囲にモンスターはいなかった。");
      }

      break;
    }


    // ==========================
    // 聖地
    // ==========================
    case "holyGround":

      placeHolyGround();

      break;
  }
}


function activateMiracle() {

  const roll =
    randomInt(1, 6);

  switch (roll) {

    case 1:

      player.hp =
        player.maxHp;

      player.hunger =
        player.maxHunger;

      log(
        "奇跡！ HPと満腹度が全回復した！"
      );

      break;


    case 2:

      player.maxHp += 3;
      player.hp += 3;
      player.baseAttack += 3;

      log(
        "奇跡！ 身体能力が上昇した！"
      );

      break;


    case 3:

      player.level += 3;
      player.maxHp += 15;
      player.hp =
        player.maxHp;

      log(
        "奇跡！ レベルが3上がった！"
      );

      break;


    case 4:

      enemies = [];

      log(
        "奇跡！ この階の敵が消滅した！"
      );

      break;


    case 5:

      player.floor += 5;

      generateDungeon();

      log(
        "奇跡！ 5階上へ転移した！"
      );

      break;


    case 6:

      for (
        const slot of
        ["weapon", "shield", "ring"]
      ) {

        if (player.equipment[slot]) {

          player.equipment[slot].plus =
            (player.equipment[slot].plus || 0)
            + 3;
        }
      }

      log(
        "奇跡！ 装備が強化された！"
      );

      break;
  }
}


// ============================================================
// 杖
// ============================================================

function useStaffFromInventory(
  index,
  dx,
  dy
) {

  const item =
    player.inventory[index];

  if (!item) return;

  const data =
    ITEM_DATA[item.id];

  if (
    !data ||
    data.category !== "staff"
  ) {
    return;
  }


  if (item.charges <= 0) {

    log("杖の力は残っていない。");

    return;
  }


  item.charges--;

  const targets =
    findEnemiesInDirection(
      dx,
      dy,
      false
    );

  const enemy =
    targets[0];

  if (!enemy) {

    log(
      `${data.name}を振ったが何も起こらない。`
    );

    endTurn();
    return;
  }


  applyStaffEffect(
    data,
    enemy
  );

  updateInventoryUI();
  autoSave();
  endTurn();
}


function applyStaffEffect(data, enemy) {

  switch (data.effect) {

    case "damage":

      enemy.hp -=
        data.power +
        randomInt(-2, 2);

      log(
        `${data.name}の雷撃！`
      );

      break;


    case "sleep":

      enemy.status.asleep = 5;

      log("敵は眠った！");

      break;


    case "confusion":

      enemy.status.confused = 10;

      log("敵は混乱した！");

      break;


    case "warp":

      warpEnemy(enemy);

      log(
        "敵はどこかへ飛ばされた！"
      );

      break;


    case "seal":

      enemy.status.sealed = true;

      log(
        "敵の特殊能力を封じた！"
      );

      break;


    case "split":

      splitEnemy(enemy);

      break;


    case "death":

      enemy.hp = 0;

      log(
        "死の力が敵を包んだ！"
      );

      break;
  }


  if (enemy.hp <= 0) {
    defeatEnemy(enemy);
  }
}


// ============================================================
// 矢
// ============================================================

function shootArrow(dx, dy) {

  const arrow =
    player.equipment.arrow;

  if (!arrow) {

    log("矢を装備していない。");

    return;
  }


  if (arrow.quantity <= 0) {

    log("矢がない。");

    player.equipment.arrow =
      null;

    return;
  }


  const data =
    ITEM_DATA[arrow.id];

  const targets =
    findEnemiesInDirection(
      dx,
      dy,
      !!data.piercing
    );


  arrow.quantity--;


  if (!targets.length) {

    log("矢は空を切った。");

  } else {

    for (const enemy of targets) {

      const damage =
        Math.max(
          1,
          data.attack +
          randomInt(0, 3)
        );

      enemy.hp -= damage;

      log(
        `矢が敵に命中！ ${damage}ダメージ！`
      );

      if (enemy.hp <= 0) {
        defeatEnemy(enemy);
      }

      if (!data.piercing) break;
    }
  }


  if (arrow.quantity <= 0) {

    player.equipment.arrow =
      null;

    log("矢を使い切った。");
  }

  updateInventoryUI();
  endTurn();
}


function findEnemiesInDirection(
  dx,
  dy,
  piercing
) {

  const result = [];

  let x = player.x;
  let y = player.y;

  for (let i = 0; i < 12; i++) {

    x += dx;
    y += dy;

    if (
      x < 0 ||
      y < 0 ||
      x >= MAP_W ||
      y >= MAP_H
    ) {
      break;
    }

    if (map[y][x] === WALL) {
      break;
    }

    const enemy =
      enemyAt(x, y);

    if (enemy) {

      result.push(enemy);

      if (!piercing) break;
    }
  }

  return result;
}


// ============================================================
// ワープなど
// ============================================================

function warpPlayer() {

  const pos =
    randomFloorPosition();

  if (!pos) return;

  player.x = pos.x;
  player.y = pos.y;

  log("別の場所へ転移した！");
}


function warpEnemy(enemy) {

  const pos =
    randomFloorPosition();

  if (!pos) return;

  enemy.x = pos.x;
  enemy.y = pos.y;
}


function splitEnemy(enemy) {

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  for (const [dx, dy] of dirs) {

    const x = enemy.x + dx;
    const y = enemy.y + dy;

    if (
      map[y]?.[x] === FLOOR &&
      !enemyAt(x, y) &&
      !(
        player.x === x &&
        player.y === y
      )
    ) {

      const clone =
        JSON.parse(
          JSON.stringify(enemy)
        );

      clone.x = x;
      clone.y = y;

      enemies.push(clone);

      log("敵が分裂した！");

      return;
    }
  }

  log("分裂する場所がない。");
}


// ============================================================
// 敵AI
// ============================================================

function moveEnemies() {

  for (
    const enemy of
    [...enemies]
  ) {

    if (
      !enemies.includes(enemy)
    ) {
      continue;
    }


    const actionCount =
      enemy.status.haste
        ? 2
        : 1;


    for (
      let action = 0;
      action < actionCount;
      action++
    ) {

      if (
        !enemies.includes(enemy)
      ) {
        break;
      }


      if (
        enemy.status.asleep > 0
      ) {

        enemy.status.asleep--;

        break;
      }


      if (
        enemy.status.frozen !== 0
      ) {
        break;
      }


      if (
        enemy.status.slow &&
        Math.random() < 0.5
      ) {
        continue;
      }


      if (
        enemy.status.confused > 0
      ) {

        enemy.status.confused--;

        const dirs = [
          [-1, -1],
          [0, -1],
          [1, -1],
          [-1, 0],
          [1, 0],
          [-1, 1],
          [0, 1],
          [1, 1]
        ];

        const dir =
          dirs[
            randomInt(
              0,
              dirs.length - 1
            )
          ];

        tryEnemyMove(
          enemy,
          dir[0],
          dir[1]
        );

        continue;
      }


      moveEnemyOnce(enemy);
    }
  }
}

function applyStaffEffect(data, enemy) {

  switch (data.effect) {

    // ステルス
    case "invisible":

      enemy.status.invisible = true;

      log(
        "モンスターの姿が見えなくなった！"
      );

      break;


    // 加速
    case "haste":

      enemy.status.haste = true;

      log(
        "モンスターの動きが速くなった！"
      );

      break;


    // 雷
    case "thunder": {

      const damage =
        randomInt(20, 30);

      enemy.hp -= damage;

      log(
        `雷が直撃！ ${damage}ダメージ！`
      );

      break;
    }


    // 混乱
    case "confusion":

      enemy.status.confused = 10;

      log(
        "モンスターは混乱した！"
      );

      break;


    // 分裂
    case "split":

      splitEnemy(enemy);

      break;


    // 睡眠
    case "sleep":

      enemy.status.asleep = 5;

      log(
        "モンスターは眠った！"
      );

      break;


    // 変化
    case "change":

      transformEnemy(enemy);

      break;


    // 転送
    case "warp":

      warpEnemy(enemy);

      log(
        "モンスターはどこかへ飛ばされた！"
      );

      break;


    // 転ばぬ杖は振っても効果なし
    case "antiTrip":

      log(
        "転ばぬ杖を振ったが何も起こらなかった。"
      );

      break;


    // メラゾーマ
    case "death":

      enemy.hp = 0;

      log(
        "メラゾーマ！ モンスターは力尽きた！"
      );

      break;
  }


  if (enemy.hp <= 0) {
    defeatEnemy(enemy);
  }
}

function transformEnemy(enemy) {

  const types = [
    {
      name: "スライム",
      hp: 8,
      attack: 3,
      defense: 0,
      exp: 4
    },

    {
      name: "ゴブリン",
      hp: 15,
      attack: 5,
      defense: 1,
      exp: 8
    },

    {
      name: "オーク",
      hp: 25,
      attack: 8,
      defense: 3,
      exp: 12
    },

    {
      name: "ゴーレム",
      hp: 40,
      attack: 10,
      defense: 6,
      exp: 18
    }
  ];

  const type =
    types[
      randomInt(0, types.length - 1)
    ];

  enemy.name = type.name;

  enemy.hp = type.hp;
  enemy.maxHp = type.hp;
  enemy.attack = type.attack;
  enemy.defense = type.defense;
  enemy.exp = type.exp;

  log(
    `モンスターは${type.name}に変化した！`
  );
}


function enemyAttack(enemy) {
    if (playerOnHolyGround()) {

  log(
    "聖地の力がモンスターの攻撃を防いだ！"
  );

  return;
}

  const defense =
    getPlayerDefense();

  const damage =
    Math.max(
      1,
      enemy.attack +
      randomInt(0, 2) -
      defense
    );

  player.hp -= damage;

  log(
    `敵から ${damage} ダメージ！`
  );
}


function tryEnemyMove(
  enemy,
  dx,
  dy
) {

  if (dx === 0 && dy === 0) {
    return false;
  }

  const nx = enemy.x + dx;
  const ny = enemy.y + dy;

  if (
    nx < 0 ||
    ny < 0 ||
    nx >= MAP_W ||
    ny >= MAP_H
  ) {
    return false;
  }

  if (map[ny][nx] === WALL) {
    return false;
  }

  if (enemyAt(nx, ny)) {
    return false;
  }

  if (
    nx === player.x &&
    ny === player.y
  ) {
    return false;
  }

  enemy.x = nx;
  enemy.y = ny;

  return true;
}


// ============================================================
// ターン
// ============================================================

// ------------------------------------------------
// 歩行による満腹度
// ------------------------------------------------

function addHungerStep() {

  player.hungerSteps ??= 0;
  player.hungerSteps++;

  const shield = player.equipment.shield;
  const ring = player.equipment.ring;

  const shieldData =
    shield ? ITEM_DATA[shield.id] : null;

  const ringData =
    ring ? ITEM_DATA[ring.id] : null;


  // 通常は5歩
  let requiredSteps = 5;


  // 皮の盾
  // 腹減り速度半減 → 10歩で1減る
  if (shieldData?.hungerHalf) {
    requiredSteps *= 2;
  }


  // 暴食の指輪
  // 腹減り速度2倍
  if (ringData?.hungerMultiplier === 2) {
    requiredSteps = Math.max(
      1,
      Math.floor(requiredSteps / 2)
    );
  }


  if (player.hungerSteps < requiredSteps) {
    return;
  }

  player.hungerSteps = 0;


  if (player.hunger > 0) {
    player.hunger--;
  }


  if (player.hunger <= 0) {

    player.hunger = 0;

    player.hp--;

    log("空腹でHPが1減った！");
  }
}
function endTurn() {

  if (gameOver) return;

  // ★追加
  const ring = player.equipment.ring;

  // ★追加
  const ringData =
    ring
      ? ITEM_DATA[ring.id]
      : null;





  // 状態異常
  for (
    const key of
    [
      "confused",
      "blind",
      "asleep",
      "haste",
      "slow"
    ]
  ) {

    if (player.status[key] > 0) {
      player.status[key]--;
    }
  }


  moveEnemies();


  // 転移の指輪
  if (
    ringData?.warpChance &&
    Math.random() < ringData.warpChance
  ) {
    warpPlayer();
  }


  if (player.hp <= 0) {
    die();
  }


  updateUI();
  updateInventoryUI();
  render();
  autoSave();
}

function decreaseHunger() {

  const shield =
    player.equipment.shield;

  const ring =
    player.equipment.ring;

  const shieldData =
    shield
      ? ITEM_DATA[shield.id]
      : null;

  const ringData =
    ring
      ? ITEM_DATA[ring.id]
      : null;


  let hungerLoss = 1;


  // 暴食の指輪
  if (ringData?.hungerMultiplier) {
    hungerLoss *= ringData.hungerMultiplier;
  }


  // 皮の盾
  // 1ターン0.5という小数を使う代わりに
  // 50%のターンで減らす。
  if (
    shieldData?.hungerHalf &&
    Math.random() < 0.5
  ) {
    hungerLoss = 0;
  }


  player.hunger -= hungerLoss;

  if (player.hunger < 0) {
    player.hunger = 0;
  }


  if (player.hunger === 0) {

    player.hp--;

    log("空腹でHPが減った！");
  }
}


// ============================================================
// 次の階
// ============================================================

function nextFloor() {

  player.floor++;

  log(
    `${player.floor}階へ上がった。`
  );

  hideItemActions();

  generateDungeon();

  updateUI();
  updateInventoryUI();
  render();
  autoSave();
}


// ============================================================
// ゲームオーバー
// ============================================================

function die() {

  gameOver = true;

  player.hp = 0;

  log("倒れてしまった……");

  localStorage.removeItem(
    SAVE_KEY
  );
}


// ============================================================
// 描画
// ============================================================

function render() {

  if (!map.length) return;

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  // ----------------------------------------------------------
  // マップ
  // ----------------------------------------------------------

  for (
    let y = 0;
    y < MAP_H;
    y++
  ) {

    for (
      let x = 0;
      x < MAP_W;
      x++
    ) {

      if (
        map[y][x] === WALL
      ) {
        ctx.fillStyle =
          "#2f2f2f";
      } else {
        ctx.fillStyle =
          "#79502d";
      }


      ctx.fillRect(
        x * TILE,
        y * TILE,
        TILE,
        TILE
      );


      ctx.strokeStyle =
        map[y][x] === FLOOR
          ? "#68401f"
          : "#222";


      ctx.strokeRect(
        x * TILE,
        y * TILE,
        TILE,
        TILE
      );
    }
  }


  // ----------------------------------------------------------
  // 階段
  // ----------------------------------------------------------

  if (stairs) {

    ctx.fillStyle =
      "#00ffff";

    ctx.font =
      "bold 18px sans-serif";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.fillText(
      "▲",
      stairs.x * TILE +
        TILE / 2,
      stairs.y * TILE +
        TILE / 2
    );
  }


  // ----------------------------------------------------------
  // アイテム
  // ----------------------------------------------------------

  // ----------------------------------------------------------
// アイテム
// ----------------------------------------------------------

for (const item of items) {

  const realData =
    ITEM_DATA[item.id];

  if (!realData) continue;


  // 未識別の場合は偽のアイテム情報を表示
  const displayId =
    !item.identified &&
    item.fakeId
      ? item.fakeId
      : item.id;

  const displayData =
    ITEM_DATA[displayId];

  if (!displayData) continue;


  // 表示するカテゴリ
  const category =
    displayData.category;

  const image =
    itemImages[category];


  if (
    image &&
    image.complete &&
    image.naturalWidth > 0
  ) {

    const size = 60;

    ctx.drawImage(
      image,

      item.x * TILE +
        (TILE - size) / 2,

      item.y * TILE +
        (TILE - size) / 2,

      size,
      size
    );

  } else {

    // 画像が無い場合だけ漢字
    ctx.fillStyle =
      item.identified
        ? "#ffffff"
        : "#ff9800";

    ctx.font =
      "bold 16px sans-serif";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.fillText(
      displayData.symbol,
      item.x * TILE + TILE / 2,
      item.y * TILE + TILE / 2
    );
  }
}


  // ----------------------------------------------------------
  // 敵
  // ----------------------------------------------------------

  for (const enemy of enemies) {

    if (
      enemy.status.invisible
    ) {
      continue;
    }

    ctx.fillStyle =
      "#ff4444";

    ctx.beginPath();

    ctx.arc(
      enemy.x * TILE +
        TILE / 2,
      enemy.y * TILE +
        TILE / 2,
      8,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }


  // ----------------------------------------------------------
  // プレイヤー
  // ----------------------------------------------------------

  if (
    playerImage.complete &&
    playerImage.naturalWidth > 0
  ) {

    ctx.drawImage(
      playerImage,

      player.x * TILE +
        (TILE - PLAYER_SIZE) / 2,

      player.y * TILE +
        (TILE - PLAYER_SIZE) / 2,

      PLAYER_SIZE,
      PLAYER_SIZE
    );

  } else {

    ctx.fillStyle =
      "#ff3333";

    ctx.fillRect(
      player.x * TILE + 4,
      player.y * TILE + 4,
      TILE - 8,
      TILE - 8
    );
  }

  // ==========================
// 白眼の巻物
// ==========================

if (floorEffects.revealItems) {

  for (const item of items) {

    ctx.fillStyle =
      "rgba(255,255,255,0.35)";

    ctx.beginPath();

    ctx.arc(
      item.x * TILE + TILE / 2,
      item.y * TILE + TILE / 2,
      11,
      0,
      Math.PI * 2
    );

    ctx.stroke();
  }
}


// ==========================
// 地獄耳の巻物
// ==========================

if (floorEffects.revealEnemies) {

  for (const enemy of enemies) {

    ctx.strokeStyle =
      "#ff00ff";

    ctx.strokeRect(
      enemy.x * TILE + 3,
      enemy.y * TILE + 3,
      TILE - 6,
      TILE - 6
    );
  }
}

// ==========================
// 白眼の巻物
// ==========================

if (floorEffects.revealItems) {

  for (const item of items) {

    ctx.fillStyle =
      "rgba(255,255,255,0.35)";

    ctx.beginPath();

    ctx.arc(
      item.x * TILE + TILE / 2,
      item.y * TILE + TILE / 2,
      11,
      0,
      Math.PI * 2
    );

    ctx.stroke();
  }
}


// ==========================
// 地獄耳の巻物
// ==========================

if (floorEffects.revealEnemies) {

  for (const enemy of enemies) {

    ctx.strokeStyle =
      "#ff00ff";

    ctx.strokeRect(
      enemy.x * TILE + 3,
      enemy.y * TILE + 3,
      TILE - 6,
      TILE - 6
    );
  }
}
}


// ============================================================
// UI
// ============================================================

function setText(id, value) {

  const element =
    document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}


function updateUI() {

  setText(
    "floor",
    player.floor
  );

  setText(
    "level",
    player.level
  );

  setText(
    "hp",
    player.hp
  );

  setText(
    "maxHp",
    player.maxHp
  );

  setText(
    "hunger",
    player.hunger
  );

  setText(
    "exp",
    player.exp
  );

  setText(
    "attack",
    getPlayerAttack()
  );

  setText(
    "defense",
    getPlayerDefense()
  );
}


// ============================================================
// 持ち物UI
// ============================================================

function updateInventoryUI() {

  const list =
    document.getElementById(
      "inventoryList"
    );

  if (!list) return;

  list.innerHTML = "";


  player.inventory.forEach(
    (item, index) => {

      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.className =
        "inventory-item";

      let displayName =
  itemName(item);

if (item.equipped) {
  displayName =
    `【E】${displayName}`;
}

button.textContent =
  displayName;

  button.classList.toggle(
  "equipped",
  !!item.equipped
);

      button.style.color =
  item.identified
    ? "#ffffff"
    : "#ff9800";

      button.addEventListener(
        "click",
        () => {

          selectedInventoryIndex =
            index;

          showInventoryActions(
            index
          );
        }
      );

      list.appendChild(button);
    }
  );


  const count =
    document.getElementById(
      "inventoryCount"
    );

  if (count) {

    count.textContent =
      `${player.inventory.length}/${INVENTORY_MAX}`;
  }


  updateEquipmentUI();
}

function getDisplayItemData(item) {

  if (
    !item.identified &&
    item.fakeId &&
    ITEM_DATA[item.fakeId]
  ) {
    return ITEM_DATA[item.fakeId];
  }

  return ITEM_DATA[item.id];
}


function updateEquipmentUI() {

  setText(
    "weaponName",
    player.equipment.weapon
      ? itemName(
          player.equipment.weapon
        )
      : "なし"
  );

  setText(
    "shieldName",
    player.equipment.shield
      ? itemName(
          player.equipment.shield
        )
      : "なし"
  );

  setText(
    "ringName",
    player.equipment.ring
      ? itemName(
          player.equipment.ring
        )
      : "なし"
  );

  setText(
    "arrowName",
    player.equipment.arrow
      ? itemName(
          player.equipment.arrow
        )
      : "なし"
  );
}


function showInventoryActions(index) {

  const item =
    player.inventory[index];

  if (!item) return;


  const realData =
    ITEM_DATA[item.id];

  const displayData =
    getDisplayItemData(item);

  if (
    !realData ||
    !displayData
  ) {
    return;
  }


  const panel =
    document.getElementById(
      "inventoryActions"
    );

  if (!panel) return;


  setText(
    "selectedItemName",
    item.equipped
      ? `【E】${itemName(item)}`
      : itemName(item)
  );


  setText(
    "selectedItemDescription",
    item.identified
      ? realData.description
      : displayData.description
  );


  const use =
    document.getElementById(
      "useInventoryItem"
    );

  const equip =
    document.getElementById(
      "equipInventoryItem"
    );

  const staff =
    document.getElementById(
      "useStaffButton"
    );


  if (use) {
    use.hidden =
      ![
        "food",
        "leaf",
        "scroll"
      ].includes(
        realData.category
      );
  }


  if (equip) {

    equip.hidden =
      ![
        "weapon",
        "shield",
        "ring",
        "arrow"
      ].includes(
        realData.category
      );

    equip.textContent =
      item.equipped
        ? "装備を外す"
        : "装備";
  }


  if (staff) {
    staff.hidden =
      realData.category !==
      "staff";
  }


  panel.hidden = false;
}


// ============================================================
// 持ち物から使用
// ============================================================

function useSelectedInventoryItem() {

  const index =
    selectedInventoryIndex;

  const item =
    player.inventory[index];

  if (!item) return;


  if (!useConsumable(item)) {
    return;
  }


  player.inventory.splice(
    index,
    1
  );

  selectedInventoryIndex = -1;

  hideInventoryActions();

  updateInventoryUI();
  updateUI();
  render();
  autoSave();

  endTurn();
}

function unequipInventoryItem(index) {

  const item = player.inventory[index];

  if (!item || !item.equipped) {
    return;
  }

  const data = ITEM_DATA[item.id];

  if (!data) return;


  let slot = null;

  if (data.category === "weapon") {
    slot = "weapon";
  }

  if (data.category === "shield") {
    slot = "shield";
  }

  if (data.category === "arrow") {
    slot = "arrow";
  }

  if (data.category === "ring") {
    slot = "ring";
  }


  item.equipped = false;

  if (slot) {
    player.equipment[slot] = null;
  }

  log(`${data.name}を外した。`);

  updateInventoryUI();
  updateUI();
  render();
  autoSave();
}

function equipSelectedInventoryItem() {

  const index = selectedInventoryIndex;
  const item = player.inventory[index];

  if (!item) return;

  const data = ITEM_DATA[item.id];

  if (!data) {
    console.error(
      `存在しないアイテムID: ${item.id}`
    );
    return;
  }

  const slot =
    categoryToSlot(data.category);

  if (!slot) {
    log("これは装備できない。");
    return;
  }


  // すでに装備中なら外す
  if (item.equipped) {

    item.equipped = false;
    player.equipment[slot] = null;

    log(
      `${itemName(item)}を外した。`
    );

  } else {

    // 同じスロットの装備を解除
    for (const invItem of player.inventory) {

      if (!invItem.equipped) {
        continue;
      }

      const invData =
        ITEM_DATA[invItem.id];

      if (!invData) continue;

      if (
        categoryToSlot(
          invData.category
        ) === slot
      ) {
        invItem.equipped = false;
      }
    }


    // 新しい装備
    item.equipped = true;

    player.equipment[slot] = item;

    log(
      `${itemName(item)}を装備した！`
    );
  }


  selectedInventoryIndex = -1;

  hideInventoryActions();

  updateInventoryUI();
  updateUI();
  render();
  autoSave();
}


function dropSelectedInventoryItem() {

  const index =
    selectedInventoryIndex;

  const item =
    player.inventory[index];

  if (!item) return;


  if (getGroundItem()) {

    log(
      "ここには既にアイテムがある。"
    );

    return;
  }


  const data =
    ITEM_DATA[item.id];

  if (!data) return;


  // 装備中なら装備解除
  if (item.equipped) {

    const slot =
      categoryToSlot(
        data.category
      );

    if (slot) {
      player.equipment[slot] =
        null;
    }

    item.equipped = false;
  }


  player.inventory.splice(
    index,
    1
  );


  items.push({
    ...item,
    x: player.x,
    y: player.y
  });


  log(
    `${itemName(item)}を床に置いた。`
  );


  selectedInventoryIndex = -1;

  hideInventoryActions();

  updateInventoryUI();
  updateUI();
  render();
  autoSave();
}

function rebuildEquipment() {

  player.equipment = {
    weapon: null,
    shield: null,
    ring: null,
    arrow: null
  };


  for (
    const item of
    player.inventory
  ) {

    item.equipped ??= false;

    if (!item.equipped) {
      continue;
    }


    const data =
      ITEM_DATA[item.id];

    if (!data) {

      console.warn(
        `存在しないアイテムID: ${item.id}`
      );

      item.equipped = false;

      continue;
    }


    const slot =
      categoryToSlot(
        data.category
      );

    if (!slot) {
      item.equipped = false;
      continue;
    }


    // 同じスロットが複数装備されていた場合
    // 最初の1個だけ有効
    if (player.equipment[slot]) {

      item.equipped = false;

      continue;
    }


    player.equipment[slot] =
      item;
  }
}


function hideInventoryActions() {

  const panel =
    document.getElementById(
      "inventoryActions"
    );

  if (panel) {
    panel.hidden = true;
  }
}


// ============================================================
// 杖方向選択
// ============================================================

let staffDirectionMode = false;


function prepareStaff() {

  const item =
    player.inventory[
      selectedInventoryIndex
    ];

  if (!item) return;

  if (
    ITEM_DATA[item.id]
      ?.category !== "staff"
  ) {
    return;
  }

  staffDirectionMode = true;

  log(
    "杖を振る方向を選んでください。"
  );
}


// ============================================================
// セーブ
// ============================================================

function createSaveData() {

  return {
    version: 3,

    player:
      JSON.parse(
        JSON.stringify(player)
      ),

    map:
      JSON.parse(
        JSON.stringify(map)
      ),

    enemies:
      JSON.parse(
        JSON.stringify(enemies)
      ),

    items:
      JSON.parse(
        JSON.stringify(items)
      ),

    stairs:
      stairs
        ? { ...stairs }
        : null,

    traps:
      JSON.parse(
        JSON.stringify(traps)
      ),

    holyGrounds:
      JSON.parse(
        JSON.stringify(
          holyGrounds
        )
      ),

    floorEffects: {
      ...floorEffects
    },

    messages: [
      ...messages
    ]
  };
}


function saveGame() {

  localStorage.setItem(
    SAVE_KEY,
    JSON.stringify(
      createSaveData()
    )
  );

  log(
    "ゲームをセーブしました。"
  );
}


function autoSave() {

  if (gameOver) return;

  localStorage.setItem(
    SAVE_KEY,
    JSON.stringify(
      createSaveData()
    )
  );
}


// ============================================================
// ロード
// ============================================================

function loadGame() {

  const raw =
    localStorage.getItem(SAVE_KEY);

  if (!raw) {
    log("セーブデータがありません。");
    return;
  }

  const data = JSON.parse(raw);


  // プレイヤーを復元
  Object.assign(
    player,
    data.player
  );


  // 古いセーブデータ対策
  player.inventory ??= [];

  player.equipment ??= {
    weapon: null,
    shield: null,
    ring: null,
    arrow: null
  };

  player.equipment.weapon ??= null;
  player.equipment.shield ??= null;
  player.equipment.ring ??= null;
  player.equipment.arrow ??= null;


  // inventoryの古いアイテムを補完
  for (const item of player.inventory) {

    item.equipped ??= false;
    item.identified ??= true;
    item.fakeId ??= null;
    item.plus ??= 0;

    const data =
      ITEM_DATA[item.id];

    if (!data) continue;

    if (
      data.category === "arrow" &&
      item.quantity == null
    ) {
      item.quantity = 1;
    }

    if (
      data.category === "staff" &&
      item.charges == null
    ) {
      item.charges = 0;
    }
  }


  // ★ここに入れる
  rebuildEquipment();


  // その他を復元
  map = data.map || [];
  enemies = data.enemies || [];
  items = data.items || [];
  stairs = data.stairs || null;

  traps = data.traps || [];
  holyGrounds = data.holyGrounds || [];

  floorEffects =
    data.floorEffects || {
      revealEnemies: false,
      revealItems: false
    };

  messages = data.messages || [];


  updateInventoryUI();
  updateUI();
  render();

  log("ロードしました。");
}


// ============================================================
// 新規ゲーム
// ============================================================

function newGame() {

  player.hp = 20;
  player.maxHp = 20;

  player.level = 1;
  player.exp = 0;
  player.strength = 5;
player.maxStrength = 5;

  player.baseAttack = 5;
  player.baseDefense = 0;

  player.hunger = 100;
player.maxHunger = 100;
player.hungerSteps = 0;

  player.floor = 1;

  player.inventory = [];

  player.equipment = {
    weapon: null,
    shield: null,
    ring: null,
    arrow: null
  };

  player.status = {
    confused: 0,
    blind: 0,
    asleep: 0,
    haste: 0,
    slow: 0
  };

  gameOver = false;

  messages = [];

  selectedInventoryIndex = -1;

  generateDungeon();

  log("冒険が始まった！");

  updateUI();
  updateInventoryUI();
  render();

  autoSave();
}


// ============================================================
// 入力共通
// ============================================================

function handleDirection(
  dx,
  dy
) {

  if (staffDirectionMode) {

    staffDirectionMode = false;

    useStaffFromInventory(
      selectedInventoryIndex,
      dx,
      dy
    );

    return;
  }

  movePlayer(dx, dy);
}


// ============================================================
// キーボード
// ============================================================

document.addEventListener(
  "keydown",
  event => {

    switch (event.key) {

      case "ArrowUp":
      case "w":

        event.preventDefault();

        handleDirection(
          0,
          -1
        );

        break;


      case "ArrowDown":
      case "s":

        event.preventDefault();

        handleDirection(
          0,
          1
        );

        break;


      case "ArrowLeft":
      case "a":

        event.preventDefault();

        handleDirection(
          -1,
          0
        );

        break;


      case "ArrowRight":
      case "d":

        event.preventDefault();

        handleDirection(
          1,
          0
        );

        break;

      case "q":
case "7":

  event.preventDefault();

  handleDirection(-1, -1);

  break;


case "e":
case "9":

  event.preventDefault();

  handleDirection(1, -1);

  break;


case "z":
case "1":

  event.preventDefault();

  handleDirection(-1, 1);

  break;


case "c":
case "3":

  event.preventDefault();

  handleDirection(1, 1);

  break;


      case " ":

  event.preventDefault();

  restPlayer();

  break;
    }
  }
);


// ============================================================
// ボタンイベント
// ============================================================
document
  .querySelectorAll("[data-dir]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const dir =
          button.dataset.dir;

        const vector =
          DIRECTIONS[dir];

        if (!vector) return;

        const [dx, dy] = vector;

        // 矢を構えている
        if (arrowAimMode) {

          shootArrow(dx, dy);

          return;
        }

        // 通常移動
        movePlayer(dx, dy);
      }
    );
  });
document.getElementById("wait")
  .addEventListener(
    "click",
    restPlayer
  );
document
  .getElementById("shootArrowButton")
  .addEventListener("click", () => {

    const arrow = player.equipment.arrow;

    if (!arrow) {
      log("矢を装備していない。");
      return;
    }

    const data = ITEM_DATA[arrow.id];

    if (!data) {
      log("矢のデータが見つからない。");
      return;
    }

    arrowAimMode = true;

    log(`${data.name}を構えた。撃つ方向を選んでください。`);

    // 鞄を閉じる
    document.getElementById(
      "inventoryPanel"
    ).hidden = true;
  });


function bindButton(
  id,
  callback
) {

  const button =
    document.getElementById(id);

  if (button) {

    button.addEventListener(
      "click",
      callback
    );
  }
}


bindButton(
  "wait",
  endTurn
);

bindButton(
  "save",
  saveGame
);

bindButton(
  "load",
  loadGame
);

bindButton(
  "pickupGroundItem",
  pickupItem
);

bindButton(
  "equipGroundItem",
  equipGroundItem
);

bindButton(
  "useGroundItem",
  useGroundItem
);

bindButton(
  "useInventoryItem",
  useSelectedInventoryItem
);

bindButton(
  "equipInventoryItem",
  equipSelectedInventoryItem
);

bindButton(
  "dropInventoryItem",
  dropSelectedInventoryItem
);

bindButton(
  "useStaffButton",
  prepareStaff
);


bindButton(
  "newGame",
  () => {

    if (
      confirm(
        "現在の冒険を終了して最初から始めますか？"
      )
    ) {

      localStorage.removeItem(
        SAVE_KEY
      );

      newGame();
    }
  }
);
bindButton(
  "inventoryButton",
  () => {

    const panel =
      document.getElementById(
        "inventoryPanel"
      );

    if (!panel) return;

    updateInventoryUI();

    panel.hidden = false;
  }
);


bindButton(
  "closeInventoryButton",
  () => {

    const panel =
      document.getElementById(
        "inventoryPanel"
      );

    if (!panel) return;

    panel.hidden = true;

    hideInventoryActions();

    selectedInventoryIndex = -1;
  }
);


// ============================================================
// 起動
// ============================================================

if (
  localStorage.getItem(
    SAVE_KEY
  )
) {
  loadGame();
} else {
  newGame();
}