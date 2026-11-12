'use strict';
/* 視標刻度、孩子資料、設定的讀寫。 */
/* ---------- 視標刻度 ---------- */
const LEVELS = LEVEL_MM;                          // 視標邊長（公釐），定義在 content.js
const CONTRAST = { high: .92, mid: .55, low: .26 };
const VIEW_MM = 300;                               // 假設觀看距離 30 公分
const CSS_PX_PER_MM = 96 / 25.4;
const CARD_MM = 85.6;                              // 信用卡／健保卡寬度
/** 視標缺口在 30 公分處張開的角度（分角），換算成十進位視力 */
const acuity = m => 1 / ((m / 5) / VIEW_MM * 3437.7468);

/* ---------- 多個孩子 ---------- */
const newKid = name => ({
  id: 'k' + Date.now().toString(36) + rnd(999).toString(36),
  name: name || '寶貝', patch: 'none', minutes: 10, rest: 10,
  level: 3, auto: true, contrast: 'high', motion: MOTION_DEFAULT, calPx: 0, born: today()
});
let KIDS = load('eg.kids', []);
let CURID = load('eg.cur', null);
let P = load('eg.pref', { night: false, color: true, bg: true, sound: true, haptic: true });
let K = null, D = null;

const blankData = () => ({ perf: {}, hist: {}, g: {}, days: {}, log: [] });
function useKid(id) {
  K = KIDS.find(k => k.id === id) || KIDS[0];
  if (!K) return;
  CURID = K.id; save('eg.cur', CURID);
  D = load('eg.d.' + K.id, blankData());
  for (const f of ['perf', 'hist', 'g', 'days', 'log']) D[f] = D[f] || (f === 'log' ? [] : {});
  // 舊版沒有 hist，用當時的短期窗補一份，免得已經在用的人穩定視標歸零
  if (!Object.keys(D.hist).length && Object.keys(D.perf).length) {
    for (const L in D.perf) {
      const a = D.perf[L];
      D.hist[L] = { n: a.length, ok: a.reduce((s2, x) => s2 + x.ok, 0) };
    }
  }
  syncS();
}
const saveKid = () => { save('eg.kids', KIDS); syncS(); };
const saveData = () => save('eg.d.' + K.id, D);

/* S 是關卡程式直接讀的那一份設定。孩子的（視標、對比）跟裝置的（夜間、音效）
   來源不同，但關卡只認得一個 S，所以在這裡合起來。 */
const S = { level: 3, contrast: 'high', night: false, color: true, bg: true, sound: true };
function syncS() {
  if (K) { S.level = K.level; S.contrast = K.contrast; }
  S.night = P.night; S.color = P.color; S.bg = P.bg; S.sound = P.sound;
  if (typeof applyField === 'function') applyField();
}
const pxPerMm = () => (K && K.calPx > 0) ? K.calPx / CARD_MM : CSS_PX_PER_MM;
const mm = v => v * pxPerMm();
const sizeMm = () => LEVELS[S.level - 1];
/** 目前孩子設定的圖案移動速度。舊資料沒有這個欄位，就用預設檔 */
const motionKey = () => (K && MOTION[K.motion]) ? K.motion : MOTION_DEFAULT;
const motionMm = () => MOTION[motionKey()][1];
const motionLabel = () => { const [lab, v] = MOTION[motionKey()]; return v ? `${lab}（${v} mm/秒）` : lab; };
