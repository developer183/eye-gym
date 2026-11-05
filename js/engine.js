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

function note(game, ok, ms) {
  if (!K) return;
  const g = (D.g[game] = D.g[game] || []);
  g.push(ok ? 1 : 0); if (g.length > 80) g.splice(0, g.length - 80);
  if (!ACUITY_GAMES.has(game)) return;
  const a = (D.perf[K.level] = D.perf[K.level] || []);
  a.push({ ok: ok ? 1 : 0, ms: Math.round(ms) });
  if (a.length > WIN) a.splice(0, a.length - WIN);
}
function levelStat(L) {
  const a = D.perf[L] || []; if (!a.length) return null;
  const ms = a.map(x => x.ms).sort((p, q) => p - q);
  return { n: a.length, acc: a.reduce((s, x) => s + x.ok, 0) / a.length, med: ms[ms.length >> 1] };
}
/** 回傳 'up' / 'down' / null。升級後把新一級的樣本清空，重新量。 */
function adapt() {
  if (!K || !K.auto) return null;
  const s = levelStat(K.level); if (!s) return null;
  if (s.n >= UP_N && s.acc >= UP_ACC && s.med <= FAST_MS && K.level < LEVELS.length) {
    K.level++; D.perf[K.level] = []; saveKid(); saveData(); return 'up';
  }
  if (s.n >= DOWN_N && s.acc < DOWN_ACC && K.level > 1) {
    K.level--; saveKid(); saveData(); return 'down';
  }
  return null;
}
/** 最細的、樣本夠多且正確率站得住的那一級——這才是回診要講的數字 */
function stableLevel() {
  for (let L = LEVELS.length; L >= 1; L--) {
    const s = levelStat(L);
    if (s && s.n >= TUNE.穩定要幾題 && s.acc >= TUNE.穩定正確率) return L;
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
