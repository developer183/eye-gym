'use strict';
/* 自適應難度與每日紀錄——這一塊是程式邏輯，改之前先問。 */
/* ---------- 自適應：往她的能力邊界逼 ----------
   只有「視標大小是限制因素」的關卡才拿來調難度。小缺口是校準過的蘭氏環，
   找一樣的是細節辨別——這兩關的表現才代表解析力。
   迷宮、數字接龍、三個一組練的是搜尋與追蹤，答錯不代表看不清楚。 */
const ACUITY_GAMES = new Set(['gap', 'same']);
const WIN = 24;
const UP_N = TUNE.升級要幾題, UP_ACC = TUNE.升級正確率, FAST_MS = TUNE.升級要多快;
const DOWN_N = TUNE.退回要幾題, DOWN_ACC = TUNE.退回正確率;

/* 兩份紀錄，用途不同：
   D.perf[L] 是「最近 24 題」的短期窗，只給升降級判斷用，換級時會清掉重新量。
   D.hist[L] 是從頭到尾的累計，永遠不清，給「穩定視標」用——
   不然一降級就會變成樣本不足，醫師看的數字會忽然消失。 */
function note(game, ok, ms) {
  if (!K) return;
  const g = (D.g[game] = D.g[game] || []);
  g.push(ok ? 1 : 0); if (g.length > 80) g.splice(0, g.length - 80);
  if (!ACUITY_GAMES.has(game)) return;
  const a = (D.perf[K.level] = D.perf[K.level] || []);
  a.push({ ok: ok ? 1 : 0, ms: Math.round(ms) });
  if (a.length > WIN) a.splice(0, a.length - WIN);
  const h = (D.hist[K.level] = D.hist[K.level] || { n: 0, ok: 0 });
  h.n++; if (ok) h.ok++;
}
function levelStat(L) {
  const a = D.perf[L] || []; if (!a.length) return null;
  const ms = a.map(x => x.ms).sort((p, q) => p - q);
  return { n: a.length, acc: a.reduce((s, x) => s + x.ok, 0) / a.length, med: ms[ms.length >> 1] };
}
/** 回傳 'up' / 'down' / null。
    不管升或降，都要把「去到的那一級」的短期窗清空。
    降級不清的話，舊的好成績會在下一輪立刻把她推回去，兩級之間無限來回。 */
function adapt() {
  if (!K || !K.auto) return null;
  const s = levelStat(K.level); if (!s) return null;
  if (s.n >= UP_N && s.acc >= UP_ACC && s.med <= FAST_MS && K.level < LEVELS.length) {
    K.level++; D.perf[K.level] = []; saveKid(); saveData(); return 'up';
  }
  if (s.n >= DOWN_N && s.acc < DOWN_ACC && K.level > 1) {
    K.level--; D.perf[K.level] = []; saveKid(); saveData(); return 'down';
  }
  return null;
}
/** 最細的、累計樣本夠多且正確率站得住的那一級——這才是回診要講的數字。
    用的是 D.hist 的累計，不是短期窗，所以不會因為剛降級就忽然消失。 */
function stableLevel() {
  for (let L = LEVELS.length; L >= 1; L--) {
    const h = D.hist[L];
    if (h && h.n >= TUNE.穩定要幾題 && h.ok / h.n >= TUNE.穩定正確率) return L;
  }
  return null;
}

/* ---------- 每日紀錄 ---------- */
function dayRec(d) {
  const t = d || today();
  return (D.days[t] = D.days[t] || { sec: 0, done: 0, rounds: 0, lv: K.level, met: false });
}
function streakDays() {
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const r = D.days[dayAgo(i)];
    if (r && r.met) n++;
    else if (i > 0) break;            // 今天還沒做完不算斷
    else if (!r || !r.met) continue;
  }
  return n;
}
function haptic(ms) { if (P.haptic && navigator.vibrate) { try { navigator.vibrate(ms); } catch {} } }
