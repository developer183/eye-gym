'use strict';
/* 音效與繪圖：蘭氏環、小生物、迷宮、圖案貼圖、花樣背景。 */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
let AC = null;
function actx() {
  if (!S.sound) return null;
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    return AC;
  } catch { return null; }
}
function tone(f, { at = 0, dur = .13, type = 'triangle', vol = .15, to = 0 } = {}) {
  const c = actx(); if (!c) return;
  const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + .012);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + .03);
}
function noise({ dur = .17, vol = .06, hz = 1500 } = {}) {
  const c = actx(); if (!c) return;
  const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const src = c.createBufferSource(); src.buffer = b;
  const flt = c.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = hz;
  const g = c.createGain(); g.gain.value = vol;
  src.connect(flt).connect(g).connect(c.destination); src.start();
}
// 五聲音階：隨便疊都不會不和諧，連點很多下也不吵
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
const sfx = {
  pick: n => tone(PENTA[Math.min((n | 0) - 1, PENTA.length - 1)] || PENTA[0], { dur: .11, vol: .13 }),
  land: () => tone(1174.66, { dur: .06, vol: .06, type: 'sine' }),
  match: () => [659.25, 830.61, 1046.5].forEach((f, i) => tone(f, { at: i * .075, dur: .24, vol: .14 })),
  good: () => tone(880, { dur: .12, vol: .13, to: 1174.66 }),
  step: () => tone(587.33, { dur: .05, vol: .05, type: 'sine' }),
  bad: () => tone(196, { dur: .17, vol: .09, type: 'sine', to: 155 }),
  fail: () => [392, 261.63].forEach((f, i) => tone(f, { at: i * .15, dur: .32, vol: .12, type: 'sine' })),
  win: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { at: i * .09, dur: .36, vol: .14 })),
  swish: () => noise({ dur: .16, vol: .05 })
};

/* ---------- 主題色：目標 / 底色 ---------- */
const FC = { bg: '#FCFCFC', fg: '#111111' };
function applyField() {
  const c = CONTRAST[S.contrast];
  const bg = S.night ? '#0B0B0C' : '#FCFCFC';
  const lum = S.night ? Math.round(11 + 244 * c) : Math.round(252 - 244 * c);
  const fg = `rgb(${lum},${lum},${lum})`;
  FC.bg = bg; FC.fg = fg;
  const f = $('#field');
  f.style.setProperty('--fgt', fg);
  f.style.setProperty('--bgf', bg);
  document.querySelectorAll('.card .thumb').forEach(t => {
    t.style.setProperty('--fgt', 'var(--fg)');
    t.style.setProperty('--bgf', 'var(--sunken)');
  });
}

/* =======================================================================
   圖形產生器
   ======================================================================= */

/** 蘭氏環 (Landolt C)：外徑 D、筆畫與缺口各 D/5 —— 國際標準視標比例 */
function landoltC(dir, D) {
  const sw = D / 5, r = (D - sw) / 2, c = D / 2;
  const circ = 2 * Math.PI * r, gap = sw;
  return `<svg width="${D}" height="${D}" viewBox="0 0 ${D} ${D}">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--fgt)" stroke-width="${sw}"
      stroke-dasharray="${(circ - gap).toFixed(3)} ${gap.toFixed(3)}"
      stroke-dashoffset="${(circ - gap / 2).toFixed(3)}"
      transform="rotate(${dir * 90} ${c} ${c})"/></svg>`;
}

/** 翻滾 E 視標：邊長 D 的 5×5 格，筆畫與空隙都是 D/5。
    dir 0 = 三隻腳朝右，之後每 +1 順時針轉 90 度（下、左、上），跟 DIRNAME 一致。 */
function tumblingE(dir, D) {
  const u = D / 5, c = D / 2, f = 'var(--fgt)';
  const r = (x, y, w, h) => `<rect x="${(x * u).toFixed(2)}" y="${(y * u).toFixed(2)}" width="${(w * u).toFixed(2)}" height="${(h * u).toFixed(2)}" fill="${f}"/>`;
  return `<svg width="${D}" height="${D}" viewBox="0 0 ${D} ${D}">
    <g transform="rotate(${dir * 90} ${c} ${c})">${r(0, 0, 1, 5)}${r(0, 0, 5, 1)}${r(0, 2, 5, 1)}${r(0, 4, 5, 1)}</g></svg>`;
}

/** 小生物：外型 × 眼睛數 × 尾巴方向 × 耳朵，四個特徵各自獨立。
    7 種外型（圓形＋3～8 邊形）× 4 種眼睛 × 8 個尾巴方向 × 有無耳朵 = 448 種組合 */
function creature(sp, D) {
  const c = D / 2, R = D * .34;
  let body;
  if (sp.sides === 0) {
    body = `<circle cx="${c}" cy="${c}" r="${R.toFixed(2)}" fill="var(--fgt)"/>`;
  } else {
    const pts = [];
    for (let i = 0; i < sp.sides; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / sp.sides;
      pts.push(`${(c + R * Math.cos(a)).toFixed(2)},${(c + R * Math.sin(a)).toFixed(2)}`);
    }
    body = `<polygon points="${pts.join(' ')}" fill="var(--fgt)"/>`;
  }
  const ta = sp.tail * Math.PI / 4;                    // 8 個方向，每 45 度
  const tx = c + Math.cos(ta) * D * .49, ty = c + Math.sin(ta) * D * .49;
  let ears = '';
  if (sp.ears) {                                        // 耳朵畫在身體前面，讓身體蓋住根部
    const w = D * .1, h = D * .18, y = c - R * .78;
    [-1, 1].forEach(s => {
      const x = c + s * D * .17;
      ears += `<polygon points="${x.toFixed(2)},${(y - h).toFixed(2)} ${(x - w).toFixed(2)},${(y + h * .4).toFixed(2)} ${(x + w).toFixed(2)},${(y + h * .4).toFixed(2)}" fill="var(--fgt)"/>`;
    });
  }
  const gap = D * .36 / Math.max(2, sp.eyes);           // 眼睛多的時候靠緊一點，才不會擠出身體外
  let eyes = '';
  for (let i = 0; i < sp.eyes; i++) {
    const ex = c + (i - (sp.eyes - 1) / 2) * gap;
    eyes += `<circle cx="${ex.toFixed(2)}" cy="${(c + D * .01).toFixed(2)}" r="${(D * .042).toFixed(2)}" fill="var(--bgf)"/>`;
  }
  return `<svg width="${D}" height="${D}" viewBox="0 0 ${D} ${D}">
    <line x1="${c}" y1="${c}" x2="${tx.toFixed(2)}" y2="${ty.toFixed(2)}"
      stroke="var(--fgt)" stroke-width="${(D * .08).toFixed(2)}" stroke-linecap="round"/>
    ${ears}${body}${eyes}</svg>`;
}
const randSpec = () => ({
  sides: pick([0, 3, 4, 5, 6, 7, 8]),
  eyes: 1 + rnd(4),
  tail: S.level >= 4 ? rnd(8) : rnd(4) * 2,             // 低精細度只用上下左右，高的才加斜角
  ears: rnd(2)
});
const diffCount = (a, b) =>
  (a.sides !== b.sides) + (a.eyes !== b.eyes) + (a.tail !== b.tail) + (a.ears !== b.ears);
/** 從 s 改掉剛好 k 個特徵 */
function mutate(s, k) {
  const m = { ...s };
  shuffle(['sides', 'eyes', 'tail', 'ears']).slice(0, Math.min(k, 4)).forEach(key => {
    let v, guard = 0;
    do { v = randSpec()[key]; } while (v === m[key] && guard++ < 40);
    m[key] = v;
  });
  return m;
}

/* ---------- 「三個一組」的圖案：129 張 PNG（Noto Emoji, Apache-2.0，可商用） ----------
   動物 / 水果 / 數字 / 形狀 / 卡通角色。
   沒有放任何有版權的卡通人物——那些不能用在會上架的 app 裡；
   機器人、幽靈、外星人、精靈、美人魚是授權乾淨的替代。
   要加圖：把 128×128 去背 PNG 丟進 img/，在這裡加一筆 ['檔名','中文名','分類']。 */
const SPRITES = [
  // 動物
  ['cat', '貓', '動物'], ['dog', '狗', '動物'], ['fox', '狐狸', '動物'], ['wolf', '狼', '動物'],
  ['tiger', '老虎', '動物'], ['lion', '獅子', '動物'], ['bear', '熊', '動物'], ['panda', '貓熊', '動物'],
  ['koala', '無尾熊', '動物'], ['monkey', '猴子', '動物'], ['sloth', '樹懶', '動物'], ['rabbit', '兔子', '動物'],
  ['mouse', '老鼠', '動物'], ['hamster', '倉鼠', '動物'], ['squirrel', '松鼠', '動物'], ['beaver', '海狸', '動物'],
  ['hedgehog', '刺蝟', '動物'], ['raccoon', '浣熊', '動物'], ['skunk', '臭鼬', '動物'], ['badger', '獾', '動物'],
  ['otter', '水獺', '動物'], ['batx', '蝙蝠', '動物'], ['kangaroo', '袋鼠', '動物'], ['pig', '豬', '動物'],
  ['boar', '山豬', '動物'], ['cow', '牛', '動物'], ['sheep', '綿羊', '動物'], ['goat', '山羊', '動物'],
  ['horse', '馬', '動物'], ['zebra', '斑馬', '動物'], ['deer', '鹿', '動物'], ['camel', '駱駝', '動物'],
  ['llama', '羊駝', '動物'], ['elephant', '大象', '動物'], ['rhino', '犀牛', '動物'], ['hippo', '河馬', '動物'],
  ['giraffe', '長頸鹿', '動物'], ['mammoth', '長毛象', '動物'], ['unicorn', '獨角獸', '動物'],
  ['chicken', '母雞', '動物'], ['rooster', '公雞', '動物'], ['chick', '小雞', '動物'], ['duck', '鴨子', '動物'],
  ['swan', '天鵝', '動物'], ['turkey', '火雞', '動物'], ['peacock', '孔雀', '動物'], ['flamingo', '紅鶴', '動物'],
  ['parrot', '鸚鵡', '動物'], ['owl', '貓頭鷹', '動物'], ['penguin', '企鵝', '動物'], ['bird', '小鳥', '動物'],
  ['frog', '青蛙', '動物'], ['turtle', '烏龜', '動物'], ['crocodile', '鱷魚', '動物'], ['lizard', '蜥蜴', '動物'],
  ['snake', '蛇', '動物'], ['dino', '暴龍', '動物'], ['sauropod', '長頸龍', '動物'], ['dragon', '龍', '動物'],
  ['whale', '鯨魚', '動物'], ['dolphin', '海豚', '動物'], ['shark', '鯊魚', '動物'], ['seal', '海豹', '動物'],
  ['fish', '熱帶魚', '動物'], ['blowfish', '河豚', '動物'], ['octopus', '章魚', '動物'], ['squid', '烏賊', '動物'],
  ['crab', '螃蟹', '動物'], ['lobster', '龍蝦', '動物'], ['shrimp', '蝦子', '動物'], ['snail', '蝸牛', '動物'],
  ['bee', '蜜蜂', '動物'], ['butterfly', '蝴蝶', '動物'], ['ladybug', '瓢蟲', '動物'], ['beetle', '甲蟲', '動物'],
  ['ant', '螞蟻', '動物'], ['cricket', '蟋蟀', '動物'], ['caterpillar', '毛毛蟲', '動物'], ['worm', '蚯蚓', '動物'],
  // 水果
  ['apple', '蘋果', '水果'], ['orange', '橘子', '水果'], ['peach', '桃子', '水果'], ['tomato', '番茄', '水果'],
  ['cherries', '櫻桃', '水果'], ['strawberry', '草莓', '水果'], ['grapes', '葡萄', '水果'], ['banana', '香蕉', '水果'],
  ['lemon', '檸檬', '水果'], ['pear', '梨子', '水果'], ['mango', '芒果', '水果'], ['kiwi', '奇異果', '水果'],
  ['coconut', '椰子', '水果'], ['melon', '哈密瓜', '水果'], ['watermelon', '西瓜', '水果'], ['pineapple', '鳳梨', '水果'],
  // 數字
  ['n0', '0', '數字'], ['n1', '1', '數字'], ['n2', '2', '數字'], ['n3', '3', '數字'], ['n4', '4', '數字'],
  ['n5', '5', '數字'], ['n6', '6', '數字'], ['n7', '7', '數字'], ['n8', '8', '數字'], ['n9', '9', '數字'],
  // 形狀
  ['circle', '圓形', '形狀'], ['square', '正方形', '形狀'], ['triangle', '三角形', '形狀'],
  ['diamond', '菱形', '形狀'], ['heart', '愛心', '形狀'], ['star', '星星', '形狀'],
  // 卡通角色（授權乾淨）
  ['robot', '機器人', '角色'], ['ghost', '幽靈', '角色'], ['alien', '外星人', '角色'], ['invader', '小精靈', '角色'],
  ['pumpkin', '南瓜燈', '角色'], ['wizard', '魔法師', '角色'], ['fairy', '小仙子', '角色'], ['mermaid', '美人魚', '角色'],
  ['elf', '精靈', '角色'], ['superhero', '超人', '角色'], ['snowman', '雪人', '角色'], ['teddy', '泰迪熊', '角色'],
  // 其他
  ['mushroom', '蘑菇', '其他'], ['blossom', '櫻花', '其他'], ['balloon', '氣球', '其他'],
  ['rainbow', '彩虹', '其他'], ['cookie', '餅乾', '其他'], ['cupcake', '杯子蛋糕', '其他']
];

/* 容易看錯的歸成同一組。精細度 1–3 每組只抽一種出場，4–5 最多兩種，6 才讓牠們同場較勁。 */
const GROUPS = {
  dog: '犬', wolf: '犬', fox: '犬',
  cat: '貓科', tiger: '貓科', lion: '貓科',
  bear: '熊', panda: '熊', koala: '熊', teddy: '熊',
  mouse: '鼠', hamster: '鼠', squirrel: '鼠', beaver: '鼠',
  hedgehog: '小獸', raccoon: '小獸', skunk: '小獸', badger: '小獸', otter: '小獸',
  pig: '蹄', boar: '蹄', cow: '蹄', sheep: '蹄', goat: '蹄', horse: '蹄', zebra: '蹄',
  deer: '蹄', camel: '蹄', llama: '蹄',
  elephant: '巨獸', rhino: '巨獸', hippo: '巨獸', mammoth: '巨獸', giraffe: '巨獸',
  chicken: '禽', rooster: '禽', chick: '禽', duck: '禽', swan: '禽', turkey: '禽',
  peacock: '禽', flamingo: '禽', parrot: '禽', owl: '禽', penguin: '禽', bird: '禽',
  turtle: '爬蟲', crocodile: '爬蟲', lizard: '爬蟲', snake: '爬蟲',
  dino: '恐龍', sauropod: '恐龍', dragon: '恐龍',
  whale: '海獸', dolphin: '海獸', shark: '海獸', seal: '海獸',
  fish: '魚', blowfish: '魚', octopus: '軟體', squid: '軟體',
  crab: '甲殼', lobster: '甲殼', shrimp: '甲殼',
  bee: '蟲', butterfly: '蟲', ladybug: '蟲', beetle: '蟲', ant: '蟲',
  cricket: '蟲', caterpillar: '蟲', worm: '蟲', snail: '蟲',
  apple: '圓果', orange: '圓果', peach: '圓果', tomato: '圓果', cherries: '圓果',
  lemon: '橢果', pear: '橢果', mango: '橢果', kiwi: '橢果', coconut: '橢果', melon: '橢果',
  n0: '數字', n1: '數字', n2: '數字', n3: '數字', n4: '數字',
  n5: '數字', n6: '數字', n7: '數字', n8: '數字', n9: '數字',
  circle: '形狀', square: '形狀', triangle: '形狀', diamond: '形狀', heart: '形狀', star: '形狀',
  robot: '角色', ghost: '角色', alien: '角色', invader: '角色', pumpkin: '角色',
  wizard: '角色', fairy: '角色', mermaid: '角色', elf: '角色', superhero: '角色', snowman: '角色'
};

/* 數字鍵帽是實心方塊底＋淺色數字，壓成剪影後 0～9 全都長一樣，所以單色模式不放數字。 */
const MONO_BAD = new Set(['n0', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9']);

/* 透明的地方不該點得到，不然疊在一起時會點到隔壁那隻。
   先把每張圖的 alpha 縮成 48×48 遮罩，點下去再反推回圖案自己的座標系比對。
   用 file:// 直接開會因為 canvas 被汙染而讀不到，那時自動退回方框判定。 */
const MASK_N = 48, MASKS = {};
function buildMasks() {
  const c = document.createElement('canvas');
  c.width = c.height = MASK_N;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  SPRITES.forEach(([s]) => {
    const im = new Image();
    im.onload = () => {
      try {
        ctx.clearRect(0, 0, MASK_N, MASK_N);
        ctx.drawImage(im, 0, 0, MASK_N, MASK_N);
        const d = ctx.getImageData(0, 0, MASK_N, MASK_N).data;
        const m = new Uint8Array(MASK_N * MASK_N);
        for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 40 ? 1 : 0;
        MASKS[s] = m;
      } catch { MASKS[s] = null; }
    };
    im.src = `img/${s}.png`;
  });
}

/* ---------- 花樣背景：野餐格紋 + 隨手塗鴉 ---------- */
const BG_DAY = [
  { a: '#FFF4E3', b: '#FFD9A6', d: '#E2892C' }, { a: '#EAF8F0', b: '#B7E9CE', d: '#38A377' },
  { a: '#E9F2FD', b: '#BFDAF8', d: '#3F7FD4' }, { a: '#F5EEFC', b: '#DBC8F3', d: '#8257C9' },
  { a: '#FFF8DC', b: '#FBE79A', d: '#C99B10' }, { a: '#FDEEF3', b: '#F8C8D9', d: '#D4578A' }
];
const BG_NIGHT = [
  { a: '#101A20', b: '#1C2E37', d: '#4E7789' }, { a: '#141821', b: '#222A3A', d: '#5E6A96' },
  { a: '#1A1620', b: '#2A2233', d: '#7A5E90' }, { a: '#101E1B', b: '#1B302B', d: '#458874' }
];
let bgSeq = 0;
function pileBg(W, H) {
  const t = pick(S.night ? BG_NIGHT : BG_DAY);
  const step = 28 + rnd(4) * 7;
  const strength = { high: .66, mid: .36, low: .18 }[S.contrast];
  const uid = 'gg' + (++bgSeq);
  let doodles = '';
  const n = Math.round(W * H / 4200);
  for (let i = 0; i < n; i++) {
    const k = rnd(3);
    const shape = k === 0 ? `<circle r="2.7"/>`
      : k === 1 ? `<circle r="3.4" fill="none" stroke="${t.d}" stroke-width="1.3"/>`
        : `<path d="M0 -5.4 1.2 -1.2 5.4 0 1.2 1.2 0 5.4 -1.2 1.2 -5.4 0 -1.2 -1.2Z"/>`;
    doodles += `<g transform="translate(${(Math.random() * W).toFixed(1)} ${(Math.random() * H).toFixed(1)}) rotate(${rnd(360)}) scale(${(.55 + Math.random() * .85).toFixed(2)})" fill="${t.d}">${shape}</g>`;
  }
  return `<svg class="bg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="opacity:${strength}" aria-hidden="true">
    <defs><pattern id="${uid}" width="${step}" height="${step}" patternUnits="userSpaceOnUse">
      <rect width="${step}" height="${step}" fill="${t.a}"/>
      <rect width="${step / 2}" height="${step}" fill="${t.b}" opacity=".6"/>
      <rect width="${step}" height="${step / 2}" fill="${t.b}" opacity=".6"/>
    </pattern></defs>
    <rect width="${W}" height="${H}" fill="url(#${uid})"/>
    <g opacity=".45">${doodles}</g></svg>`;
}

/** 遞迴回溯法產生完美迷宮 */
function genMaze(cols, rows) {
  const cells = Array.from({ length: cols * rows }, () => ({ n: 1, e: 1, s: 1, w: 1, v: 0 }));
  const stack = [0]; cells[0].v = 1;
  const DIRS = [[0, -1, 'n', 's'], [1, 0, 'e', 'w'], [0, 1, 's', 'n'], [-1, 0, 'w', 'e']];
  while (stack.length) {
    const cur = stack[stack.length - 1], cx = cur % cols, cy = (cur / cols) | 0;
    const opts = shuffle(DIRS.slice()).filter(([dx, dy]) => {
      const nx = cx + dx, ny = cy + dy;
      return nx >= 0 && nx < cols && ny >= 0 && ny < rows && !cells[ny * cols + nx].v;
    });
    if (!opts.length) { stack.pop(); continue; }
    const [dx, dy, a, b] = opts[0], ni = (cy + dy) * cols + (cx + dx);
    cells[cur][a] = 0; cells[ni][b] = 0; cells[ni].v = 1; stack.push(ni);
  }
  return cells;
}

/* =======================================================================
   遊戲
   ======================================================================= */
const DIRNAME = ['右', '下', '左', '上'];

/** 依目標大小自動算出格數：每格至少留到可以用手指點的大小 */
function gridPlan(targetPx, maxCols, maxRows) {
  const f = $('#field');                      // clientWidth/Height 已扣掉邊框，再扣 padding 12px×2
  const cell = Math.max(targetPx * 1.45, 46);
  const gap = Math.max(targetPx * .35, 8);
  const cols = Math.max(2, Math.min(maxCols, Math.floor((f.clientWidth - 24 + gap) / (cell + gap))));
  const rows = Math.max(2, Math.min(maxRows, Math.floor((f.clientHeight - 24 + gap) / (cell + gap))));
  return { cols, rows, cell, gap };
}

function makeGrid(cols, gap) {
  const g = el('div', 'grid');
  g.style.gridTemplateColumns = `repeat(${cols},auto)`;
  g.style.setProperty('--gap', gap + 'px');
  return g;
}
function bad(btn) { btn.classList.add('bad'); setTimeout(() => btn.classList.remove('bad'), 340); }

/** 點中了：金色光環從中心炸開。座標是視窗座標（fixed） */
function flash(cx, cy, size) {
  if (REDUCED) return;
  const s = size * 2.3, f = el('div', 'flash');
  f.style.cssText = `left:${(cx - s / 2).toFixed(1)}px;top:${(cy - s / 2).toFixed(1)}px;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px`;
  document.body.append(f);
  f.animate([{ transform: 'scale(.3)', opacity: .95 }, { transform: 'scale(1)', opacity: 0 }],
    { duration: 420, easing: 'ease-out' }).onfinish = () => f.remove();
}
const flashOn = elm => { const r = elm.getBoundingClientRect(); flash(r.left + r.width / 2, r.top + r.height / 2, Math.max(r.width, 28)); };
