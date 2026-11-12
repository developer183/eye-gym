'use strict';
/* =======================================================================
   流程
   ======================================================================= */
let view = 'home', round = null, SESS = null, tick = null, qT0 = 0;
/* 關卡順序直接從 GAMES 讀，順序就是 index.html 裡 <script> 的載入順序。
   新增一關只要寫一個 js/game-xxx.js 再加一行 <script>，這裡不用動。 */
const GORDER = Object.keys(GAMES);

function show(v) {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === v));
  view = v;
  const top = v !== 'onboard';
  $('#back').hidden = !(top && v !== 'home');
  $('#who').hidden = !(top && v === 'home');
  $('#streak').hidden = !(top && v === 'home');
  $('#topbar').classList.toggle('line', v === 'play');
  window.scrollTo(0, 0);
  if (v === 'home') renderHome();
  if (v === 'free') renderFree();
  if (v === 'report') renderReport();
  if (v === 'settings') renderSettings();
}

/* ---------- 今日 ---------- */
function renderHome() {
  const r = dayRec(), target = K.minutes * 60;
  const pct = clamp(r.done / target, 0, 1);
  $('#ringVal').style.strokeDashoffset = String(264 * (1 - pct));
  $('#ringBig').textContent = Math.floor(r.done / 60);
  $('#ringSub').textContent = '／' + K.minutes + ' 分';
  $('#todayLbl').textContent = r.met ? '今天已完成' : '今天';

  const lv = LEVELS[K.level - 1];
  $('#facts').innerHTML =
    (K.patch === 'none'
      ? `<div class="fact">沒有設定遮眼</div>`
      : `<div class="fact"><span class="dot"></span>遮<b>${K.patch === 'left' ? '左' : '右'}眼</b></div>`) +
    `<div class="fact">視標 <b>${lv} mm</b>${K.auto ? '（自動）' : ''}</div>` +
    `<div class="fact">戴著眼鏡、拿 <b>30 公分</b></div>`;

  const go = $('#goBtn');
  go.classList.toggle('done', r.met);
  go.textContent = r.met ? '再練一輪' : (r.done > 0 ? '繼續今天的訓練' : '開始今天的訓練');

  const st = streakDays();
  $('#streak').hidden = st < 1;
  $('#streak').textContent = '🔥 連續 ' + st + ' 天';
  $('#whoName').textContent = K.name;
  $('#av').textContent = [...K.name][0] || '？';

  const wk = $('#week'); wk.replaceChildren();
  for (let i = 6; i >= 0; i--) {
    const d = dayAgo(i), rec = D.days[d];
    const h = rec ? clamp(rec.done / (K.minutes * 60), 0, 1) : 0;
    const c = el('div', 'd' + (i === 0 ? ' now' : ''));   // 不能叫 today，會撞到主卡的 .today
    c.innerHTML = `<i><b style="height:${Math.round(h * 100)}%"></b></i>
      <span>${'日一二三四五六'[new Date(d + 'T00:00').getDay()]}</span>`;
    wk.append(c);
  }
  const sl = stableLevel();
  $('#reportSub').textContent = sl
    ? `目前穩定做得到 ${LEVELS[sl - 1]} mm 的視標`
    : '練幾輪之後這裡會出現她的視標大小';
  $('#setSub').textContent = `${K.patch === 'none' ? '未設遮眼' : '遮' + (K.patch === 'left' ? '左' : '右') + '眼'}・每天 ${K.minutes} 分`;
  $('#installHint').hidden = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
}

function renderFree() {
  const host = $('#freeList'); host.replaceChildren();
  GORDER.forEach(id => {
    const g = GAMES[id];
    let th = ''; try { th = g.thumb(); } catch { th = '🎯'; }
    const b = el('button', 'row');
    b.innerHTML = `<div class="ic">${th}</div>
      <div style="flex:1"><div class="t">${TEXT[id]?.name || g.name}</div>
        <div class="d">${TEXT[id]?.desc || g.desc}</div></div>
      <div class="go2">›</div>`;
    b.onclick = () => startFree(id);
    host.append(b);
  });
  applyField();
}

/* ---------- 一場訓練 ---------- */
function startDay() {
  // 今天的份已經做完還按「再練一輪」的話，就當加碼：跑一輪就好，不再要求達標
  const bonus = dayRec().done >= K.minutes * 60;
  SESS = { plan: [FIRST_GAME, ...shuffle(GORDER.filter(g => g !== FIRST_GAME))], i: 0, free: false, bonus };
  runNext();
}
function startFree(id) { SESS = { plan: [id], i: 0, free: true }; runNext(); }

function runNext() {
  if (!SESS.free && !SESS.bonus && dayRec().done >= K.minutes * 60) return endDay();
  const id = SESS.plan[SESS.i % SESS.plan.length];
  SESS.i++;
  runGame(id);
}

function runGame(id) {
  const g = GAMES[id];
  round = { id, idx: 0, total: g.rounds, ok: 0, bad: 0, streak: 0, t0: performance.now() };
  show('play');
  $('#minsRow').hidden = !!SESS.free;
  applyField();
  clearInterval(tick);
  tick = setInterval(() => {
    const r = dayRec();
    r.sec++; if (!SESS.free) r.done++;
    if (r.sec % 10 === 0) saveData();
    paintMins();
  }, 1000);
  paintMins();
  requestAnimationFrame(() => requestAnimationFrame(nextQ));
}
function paintMins() {
  if (SESS && SESS.free) return;
  const r = dayRec(), t = K.minutes * 60;
  $('#minsBar').style.width = clamp(r.done / t, 0, 1) * 100 + '%';
  $('#minsN').textContent = Math.floor(r.done / 60) + '／' + K.minutes + ' 分';
}
const bar = () => $('#pbar').style.width = (round.idx / Math.max(1, round.total) * 100) + '%';

function nextQ() {
  const g = GAMES[round.id];
  bar();
  if (round.idx >= round.total) return finish();
  // 兩個都要先清空再給關卡畫。關卡會自己量 #field 的高度來決定格數，
  // 留著上一關的內容會讓它量到被撐大的尺寸（迷宮因此畫得太高，把頁面頂出去）。
  $('#field').replaceChildren();
  $('#extra').replaceChildren();
  qT0 = performance.now();
  try {
  g.render($('#field'), {
    pass: () => {
      note(round.id, true, performance.now() - qT0);
      qT0 = performance.now();
      round.ok++; round.idx++; haptic(12);
      if (g.continuous) { bar(); if (round.idx >= round.total) { g.cleanup?.(); finish(); } }
      else setTimeout(nextQ, 380);
    },
    miss: () => { note(round.id, false, performance.now() - qT0); round.bad++; haptic([12, 60, 12]); },
    setTotal: n => { round.total = n; bar(); },
    fail: (title, msg) => {
      g.cleanup?.(); clearInterval(tick);
      sheet(`<h3>${title}</h3><p>${msg}</p>`, [
        ['再來一次', () => { close_(); runGame(round.id); }],
        ['結束', () => { close_(); afterRound(); }, 'link']
      ]);
    }
  });
  } catch (err) {
    // 某一關的程式壞掉時，不要讓整個 app 跟著死——跳過它，其他關照常。
    console.error('關卡出錯', round.id, err);
    GAMES[round.id]?.cleanup?.(); clearInterval(tick);
    sheet(`<h3>這一關出了問題</h3>
      <p>「${GAMES[round.id]?.name || round.id}」沒辦法開始，先跳過它。<br>
      <span style="font-family:var(--mono);font-size:11.5px">${String(err.message || err).slice(0, 90)}</span></p>`,
      [['跳過這一關', () => { close_(); SESS.plan = SESS.plan.filter(x => x !== round.id);
          SESS.plan.length ? runNext() : show('home'); }],
       ['回首頁', () => { close_(); show('home'); }, 'link']]);
  }
}

function finish() {
  GAMES[round.id].cleanup?.();
  clearInterval(tick);
  const sec = Math.round((performance.now() - round.t0) / 1000);
  const acc = round.ok / Math.max(1, round.ok + round.bad);
  const stars = acc >= .9 ? 3 : acc >= .7 ? 2 : 1;
  const r = dayRec(); r.rounds++; r.lv = K.level;
  D.log.unshift({ t: Date.now(), g: round.id, lv: K.level, ct: K.contrast, ok: round.ok, bad: round.bad, sec });
  D.log = D.log.slice(0, 80);
  const moved = adapt();
  saveData();

  const movedTxt = moved === 'up'
    ? `<p style="color:var(--go);font-weight:600;margin-top:10px">做得很穩，視標縮小到 ${LEVELS[K.level - 1]} mm</p>`
    : moved === 'down'
      ? `<p style="margin-top:10px">這個大小有點吃力，先退回 ${LEVELS[K.level - 1]} mm</p>` : '';

  sheet(`<h3>${GAMES[round.id].name} 完成</h3>
    <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
    <div class="score">
      <div><div class="k">答對</div><div class="v">${round.ok}</div></div>
      <div><div class="k">答錯</div><div class="v">${round.bad}</div></div>
      <div><div class="k">用時</div><div class="v">${sec}<small>秒</small></div></div>
    </div>${movedTxt}`,
    [['繼續', () => { close_(); afterRound(); }]],
    () => {});
}

function afterRound() {
  if (SESS.free) return show('home');
  const r = dayRec();
  if (SESS.bonus) return show('home');          // 加碼只跑一輪
  if (r.done >= K.minutes * 60) return endDay();
  const sinceRest = r.done - (r.lastRest || 0);
  if (K.rest && sinceRest >= K.rest * 60) { r.lastRest = r.done; saveData(); return rest(runNext); }
  runNext();
}

function endDay() {
  const r = dayRec();
  const first = !r.met;
  r.met = true; saveData();
  const st = streakDays();
  sheet(`<h3>今天練完了</h3>
    <div class="stars">★★★</div>
    <p>${Math.floor(r.done / 60)} 分鐘・${r.rounds} 輪${first && st > 1 ? `<br>連續第 <b>${st}</b> 天` : ''}</p>`,
    [['回首頁', () => { close_(); show('home'); }],
     ['再練一輪', () => { close_(); startDay(); }, 'link']]);
}

/* ---------- 20-20-20 ---------- */
function rest(after) {
  let left = 20;
  const box = sheet(`<h3>休息一下</h3><div class="restnum" id="rn">20</div>
    <p>放下手機，看窗外或房間裡最遠的東西 20 秒，讓眼睛的對焦肌肉鬆開。</p>`, []);
  const n = box.querySelector('#rn');
  const iv = setInterval(() => {
    n.textContent = --left;
    if (left <= 0) { clearInterval(iv); close_(); after && after(); }
  }, 1000);
}

/* ---------- 對話框 ---------- */
let sheetEl = null;
function sheet(html, buttons, onClose) {
  close_();
  sheetEl = el('div', 'sheet');
  const box = el('div', 'box'); box.innerHTML = html;
  (buttons || []).forEach(([label, fn, kind]) => {
    const b = el('button', kind === 'link' ? 'link' : 'primary');
    b.textContent = label; b.onclick = fn; box.append(b);
  });
  sheetEl.append(box); sheetEl._cb = onClose;
  document.body.append(sheetEl);
  return box;
}
function close_() { if (!sheetEl) return; const cb = sheetEl._cb; sheetEl.remove(); sheetEl = null; cb?.(); }

/* =======================================================================
   進度與回診報告
   ======================================================================= */
function renderReport() {
  const sl = stableLevel();
  if (sl) {
    const m = LEVELS[sl - 1];
    $('#stableV').innerHTML = m + '<small> mm</small>';
    $('#stableN').innerHTML = `在 30 公分處約等於視力 <b>${acuity(m).toFixed(2)}</b>。
      這是 app 量到的，不是視力檢查——<b>看趨勢就好，不要當視力值</b>。`;
  } else {
    $('#stableV').textContent = '—';
    $('#stableN').textContent = '還要再練幾輪才夠判斷。同一個大小做滿 10 題、正確率站上八成才算數。';
  }
  const days = Object.keys(D.days).sort();
  const totalSec = days.reduce((a, d) => a + D.days[d].sec, 0);
  const weekSec = days.filter(d => d >= dayAgo(6)).reduce((a, d) => a + D.days[d].sec, 0);
  $('#stStreak').textContent = streakDays();
  $('#stWeek').innerHTML = Math.round(weekSec / 60) + '<small> 分</small>';
  $('#stTotal').innerHTML = Math.round(totalSec / 60) + '<small> 分</small>';

  /* 趨勢：越上面代表視標越細 */
  const pts = [];
  for (let i = 29; i >= 0; i--) {
    const d = dayAgo(i), r = D.days[d];
    if (r && r.lv) pts.push({ i: 29 - i, mm: LEVELS[r.lv - 1] });
  }
  const T = $('#trend');
  if (pts.length < 2) {
    T.innerHTML = `<p class="empty" style="padding:6px 0">練過兩天以上才畫得出趨勢。</p>`;
  } else {
    const W = 320, H = 110, PL = 30, PR = 8, PT = 10, PB = 18;
    const xs = i => PL + (i / 29) * (W - PL - PR);
    const lo = 2.5, hi = 14;                       // y 軸反過來：越上面越細
    const ys = m => PT + ((m - lo) / (hi - lo)) * (H - PT - PB);
    const dpath = pts.map((p, i) => (i ? 'L' : 'M') + xs(p.i).toFixed(1) + ' ' + ys(p.mm).toFixed(1)).join('');
    const ticks = [14, 7, 2.5].map(m =>
      `<line class="tr-grid" x1="${PL}" y1="${ys(m)}" x2="${W - PR}" y2="${ys(m)}"/>
       <text class="tr-lbl" x="2" y="${ys(m) + 3}">${m}</text>`).join('');
    T.innerHTML = `<svg viewBox="0 0 ${W} ${H}">${ticks}
      <path class="tr-line" d="${dpath}"/>
      ${pts.map(p => `<circle class="tr-dot" cx="${xs(p.i).toFixed(1)}" cy="${ys(p.mm).toFixed(1)}" r="2.6"/>`).join('')}
      <text class="tr-lbl" x="${PL}" y="${H - 4}">30 天前</text>
      <text class="tr-lbl" x="${W - PR}" y="${H - 4}" text-anchor="end">今天</text></svg>
      <div style="font-size:11.5px;color:var(--muted);margin-top:6px">越往上代表視標越細（mm）</div>`;
  }

  /* 各關正確率 */
  const B = $('#bars'); B.replaceChildren();
  let any = false;
  GORDER.forEach(id => {
    const a = D.g[id] || []; if (a.length < 5) return;
    any = true;
    const acc = a.reduce((s, v) => s + v, 0) / a.length;
    const d = el('div', 'gb');
    d.innerHTML = `<div class="hd"><span class="nm">${GAMES[id].name}</span>
      <span class="pcnt">${Math.round(acc * 100)}%　${a.length} 題</span></div>
      <div class="meter"><i style="width:${Math.round(acc * 100)}%"></i></div>`;
    B.append(d);
  });
  if (!any) B.innerHTML = `<p class="empty">每一關做滿 5 題之後會出現。</p>`;

  /* 回診報告 */
  const trained = days.filter(d => D.days[d].sec > 0);
  const since = trained[0] || today();
  const metDays = trained.filter(d => D.days[d].met).length;
  const span = Math.max(1, Math.round((Date.parse(today()) - Date.parse(since)) / DAY) + 1);
  const m = sl ? LEVELS[sl - 1] : null;
  $('#rpt').innerHTML = `
    <h4>${K.name}・練習紀錄</h4>
    <div class="meta">${since} ～ ${today()}　（${span} 天）</div>
    <table>
      <tr><td>醫囑：遮眼</td><td>${K.patch === 'none' ? '未設定' : (K.patch === 'left' ? '左眼' : '右眼')}</td></tr>
      <tr><td>醫囑：每日</td><td>${K.minutes} 分鐘</td></tr>
      <tr><td>有練習的天數</td><td>${trained.length} / ${span}</td></tr>
      <tr><td>達到每日時數的天數</td><td>${metDays} 天</td></tr>
      <tr><td>累積時間</td><td>${Math.round(totalSec / 60)} 分鐘</td></tr>
      <tr><td>目前穩定視標</td><td>${m ? m + ' mm' : '樣本不足'}</td></tr>
      <tr><td>　換算（30 cm）</td><td>${m ? '約 ' + acuity(m).toFixed(2) : '—'}</td></tr>
      <tr><td>對比設定</td><td>${({ high: '高', mid: '中', low: '低' })[K.contrast]}</td></tr>
      <tr><td>圖案移動</td><td>${motionLabel()}</td></tr>
    </table>
    <div class="foot">視標大小由 app 依正確率與反應時間自動調整，「穩定視標」指同一個大小做滿 10 題
    且正確率達 80% 的最細一級。<b>這不是視力檢查，數值僅供觀察趨勢</b>，
    請以院所的正式檢查為準。</div>`;
}

/* =======================================================================
   設定
   ======================================================================= */
function seg(host, opts, get, set) {
  const h = $(host); h.replaceChildren();
  opts.forEach(([v, lab]) => {
    const b = el('button'); b.textContent = lab;
    b.setAttribute('aria-pressed', String(get() === v));
    b.onclick = () => { set(v); saveKid(); save('eg.pref', P); renderSettings(); };
    h.append(b);
  });
}
function renderSettings() {
  seg('#segPatch', [['none', '不遮'], ['left', '遮左眼'], ['right', '遮右眼']], () => K.patch, v => K.patch = v);
  seg('#segMinutes', [[5, '5 分'], [10, '10 分'], [15, '15 分'], [20, '20 分'], [30, '30 分']], () => K.minutes, v => K.minutes = v);
  seg('#segRest', [[5, '5 分'], [10, '10 分'], [15, '15 分'], [0, '不提醒']], () => K.rest, v => K.rest = v);
  seg('#segAuto', [[true, '自動調整'], [false, '我自己設']], () => K.auto, v => K.auto = v);
  seg('#segLevel', LEVELS.map((m, i) => [i + 1, String(i + 1)]), () => K.level, v => K.level = v);
  seg('#segContrast', [['high', '高'], ['mid', '中'], ['low', '低']], () => K.contrast, v => K.contrast = v);
  seg('#segMotion', Object.entries(MOTION).map(([k, [lab]]) => [k, lab]), motionKey, v => K.motion = v);
  seg('#segNight', [[false, '一般'], [true, '夜間']], () => P.night, v => P.night = v);
  seg('#segColor', [[true, '彩色'], [false, '單色（更難）']], () => P.color, v => P.color = v);
  seg('#segBg', [[true, '花樣背景'], [false, '素面背景']], () => P.bg, v => P.bg = v);
  seg('#segSound', [[true, '音效開'], [false, '靜音']], () => P.sound, v => { P.sound = v; if (v) sfx.good?.(2); });
  seg('#segHaptic', [[true, '開'], [false, '關']], () => P.haptic, v => { P.haptic = v; if (v) haptic(20); });

  const s = levelStat(K.level);
  $('#lvSub').innerHTML = K.auto
    ? `答得又快又準就自動縮小，太吃力就退回來。目前這一級${s ? `已做 <b>${s.n}</b> 題、正確率 <b>${Math.round(s.acc * 100)}%</b>` : '還沒有資料'}。`
    : '你自己決定。數字越大視標越小。';
  $('#segLevel').parentElement.style.opacity = K.auto ? .45 : 1;
  $('#segLevel').parentElement.style.pointerEvents = K.auto ? 'none' : '';

  const m = LEVELS[K.level - 1];
  $('#levelOut').textContent = `視標 ${m} mm ・ 30 公分處約等於視力 ${acuity(m).toFixed(2)}`;

  const w = K.calPx > 0 ? K.calPx : Math.round(CARD_MM * CSS_PX_PER_MM);
  $('#calRange').value = w;
  $('#calBox').style.width = w + 'px';
  $('#calOut').textContent = `1 公釐 = ${(w / CARD_MM).toFixed(2)} px${K.calPx > 0 ? '（已校準）' : '（預設值）'}`;
  $('#kidName').value = K.name;

  const ks = $('#segKids'); ks.replaceChildren();
  KIDS.forEach(k => {
    const b = el('button'); b.textContent = k.name;
    b.setAttribute('aria-pressed', String(k.id === K.id));
    b.onclick = () => { useKid(k.id); renderSettings(); };
    ks.append(b);
  });
  $('#delKid').disabled = KIDS.length < 2;
  $('#delKid').style.opacity = KIDS.length < 2 ? .4 : 1;
}

$('#calRange').addEventListener('input', e => {
  K.calPx = +e.target.value; saveKid();
  $('#calBox').style.width = K.calPx + 'px';
  $('#calOut').textContent = `1 公釐 = ${(K.calPx / CARD_MM).toFixed(2)} px（已校準）`;
});
$('#kidName').addEventListener('input', e => {
  K.name = e.target.value.trim() || '寶貝'; saveKid();
});
$('#addKid').onclick = () => {
  const k = newKid(''); KIDS.push(k); save('eg.kids', KIDS); useKid(k.id);
  renderSettings(); $('#kidName').focus(); $('#kidName').select();
};
$('#delKid').onclick = () => {
  if (KIDS.length < 2) return;
  sheet(`<h3>刪除「${K.name}」？</h3><p>這位孩子的醫囑、難度與全部練習紀錄都會消失，沒辦法復原。</p>`,
    [['確定刪除', () => {
      try { localStorage.removeItem('eg.d.' + K.id); } catch {}
      KIDS = KIDS.filter(x => x.id !== K.id); save('eg.kids', KIDS);
      useKid(KIDS[0].id); close_(); renderSettings();
    }], ['取消', () => close_(), 'link']]);
};
$('#who').onclick = () => {
  sheet(`<h3>切換孩子</h3><p>每個孩子的醫囑、難度與紀錄都分開。</p>`,
    KIDS.map(k => [k.name + (k.id === K.id ? '（目前）' : ''),
      () => { useKid(k.id); close_(); show('home'); }, k.id === K.id ? 'link' : '']) 
      .concat([['去設定新增', () => { close_(); show('settings'); }, 'link']]));
};

/* =======================================================================
   第一次設定
   ======================================================================= */
let obStep = 0, obKid = null;
function onboard() {
  obKid = obKid || newKid('');
  show('onboard');
  [...$('#obSteps').children].forEach((i, n) => i.classList.toggle('on', n <= obStep));
  const B = $('#obBody');
  if (obStep === 0) {
    B.innerHTML = `<h1>先認識一下</h1>
      <p class="lede">這個 app 給戴著矯正眼鏡、需要做近距離精細目力練習的孩子用。
      所有資料只存在這台裝置，沒有帳號也不會上傳。</p>
      <div class="set"><div class="lab">孩子的名字</div>
        <input type="text" id="obName" maxlength="12" placeholder="怎麼稱呼她／他"></div>
      <button class="primary" style="margin-top:18px" id="obNext">下一步</button>`;
    $('#obName').value = obKid.name === '寶貝' ? '' : obKid.name;
    $('#obNext').onclick = () => {
      obKid.name = $('#obName').value.trim() || '寶貝'; obStep = 1; onboard();
    };
    setTimeout(() => $('#obName').focus(), 120);
  } else if (obStep === 1) {
    B.innerHTML = `<h1>醫師怎麼交代？</h1>
      <p class="lede">這兩項決定訓練效果，請照眼科醫師的指示填。<b>沒有交代就留「不遮」</b>——
      自己加遮眼可能壓抑到好的那隻眼。</p>
      <div class="set"><div class="lab">遮哪隻眼</div><div class="seg" id="obPatch"></div></div>
      <div class="set"><div class="lab">每天練幾分鐘</div><div class="seg" id="obMin"></div></div>
      <button class="primary" style="margin-top:18px" id="obNext">下一步</button>
      <button class="link" id="obBack">上一步</button>`;
    const sg = (host, opts, get, set) => {
      const h = $(host); h.replaceChildren();
      opts.forEach(([v, l]) => { const b = el('button'); b.textContent = l;
        b.setAttribute('aria-pressed', String(get() === v));
        b.onclick = () => { set(v); onboard(); }; h.append(b); });
    };
    sg('#obPatch', [['none', '不遮'], ['left', '遮左眼'], ['right', '遮右眼']], () => obKid.patch, v => obKid.patch = v);
    sg('#obMin', [[5, '5 分'], [10, '10 分'], [15, '15 分'], [20, '20 分']], () => obKid.minutes, v => obKid.minutes = v);
    $('#obNext').onclick = () => { obStep = 2; onboard(); };
    $('#obBack').onclick = () => { obStep = 0; onboard(); };
  } else {
    B.innerHTML = `<h1>最後兩件事</h1>
      <p class="lede">校準之後，app 顯示的毫米數才對得上真實大小。可以先跳過，之後在設定裡做。</p>
      <div class="set"><div class="lab">拿一張卡片對齊</div>
        <div class="sub">健保卡、悠遊卡、信用卡都是同一個尺寸。貼著螢幕，拖到虛線框跟卡片一樣寬。</div>
        <div class="calbox"><div class="cardline" id="obCal"></div>
          <input type="range" id="obRange" min="180" max="420" step="1">
          <div class="readout" id="obOut"></div></div></div>
      <div class="set" style="border-bottom:0"><div class="lab">要知道的事</div>
        <div class="sub"><b>這不是醫療器材，也不能治療疾病。</b>它把練習時間記下來、自動調整難度，
        不能取代回診與醫師的處方。練習時<b>一定要戴著矯正眼鏡</b>，手機拿在 30 公分左右。</div></div>
      <button class="primary" style="margin-top:18px" id="obDone">知道了，開始用</button>
      <button class="link" id="obBack">上一步</button>`;
    const w0 = obKid.calPx > 0 ? obKid.calPx : Math.round(CARD_MM * CSS_PX_PER_MM);
    $('#obRange').value = w0; $('#obCal').style.width = w0 + 'px';
    $('#obOut').textContent = `1 公釐 = ${(w0 / CARD_MM).toFixed(2)} px`;
    $('#obRange').addEventListener('input', e => {
      obKid.calPx = +e.target.value;
      $('#obCal').style.width = obKid.calPx + 'px';
      $('#obOut').textContent = `1 公釐 = ${(obKid.calPx / CARD_MM).toFixed(2)} px（已校準）`;
    });
    $('#obDone').onclick = () => {
      KIDS.push(obKid); save('eg.kids', KIDS); useKid(obKid.id);
      obKid = null; obStep = 0; show('home');
    };
    $('#obBack').onclick = () => { obStep = 1; onboard(); };
  }
}

/* =======================================================================
   啟動
   ======================================================================= */
$('#back').onclick = () => {
  GAMES[round?.id]?.cleanup?.();
  clearInterval(tick); close_();
  show(view === 'play' ? (SESS && SESS.free ? 'free' : 'home') : 'home');
};
$('#goBtn').onclick = () => startDay();
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => show(b.dataset.go));
document.addEventListener('gesturestart', e => e.preventDefault());

buildMasks();
if (!KIDS.length) { onboard(); }
else { useKid(CURID || KIDS[0].id); show('home'); }

/* 離線：第一次連著網路開啟時把整個 app 抓進快取 */
const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && secure) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* =======================================================================
   備份與還原
   資料只在這台裝置的 localStorage。瀏覽器清資料、換手機、
   或系統空間不足時清快取，紀錄就沒了——所以要能匯出一份。
   ======================================================================= */
function collectBackup() {
  const d = { v: 1, at: new Date().toISOString(), pref: P, kids: KIDS, data: {} };
  KIDS.forEach(k => { d.data[k.id] = load('eg.d.' + k.id, blankData()); });
  return d;
}
function applyBackup(j) {
  if (!j || j.v !== 1 || !Array.isArray(j.kids)) throw new Error('這不是目力練功房的備份檔');
  KIDS = j.kids; save('eg.kids', KIDS);
  if (j.pref) { P = j.pref; save('eg.pref', P); }
  Object.keys(j.data || {}).forEach(id => save('eg.d.' + id, j.data[id]));
  useKid(KIDS[0] && KIDS[0].id);
}
$('#expBtn').onclick = async () => {
  const txt = JSON.stringify(collectBackup());
  const name = `目力練功房備份-${today()}.json`;
  const out = $('#backupOut');
  try {
    const file = new File([txt], name, { type: 'application/json' });
    // iPhone 加到主畫面之後下載連結不一定會動，有分享面板就優先用
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      out.textContent = '已送出，選「儲存到檔案」就存下來了'; return;
    }
  } catch { /* 使用者取消分享也走到這裡，往下用下載 */ }
  const url = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
  const a = el('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  out.textContent = `已匯出 ${KIDS.length} 位孩子的紀錄`;
};
$('#impBtn').onclick = () => $('#impFile').click();
$('#impFile').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    let j; try { j = JSON.parse(rd.result); } catch { return bk('檔案讀不開，不是有效的備份檔'); }
    sheet(`<h3>匯入備份？</h3><p>備份裡有 <b>${(j.kids || []).length}</b> 位孩子
      （${(j.kids || []).map(k => k.name).join('、') || '—'}），
      建立於 ${String(j.at || '').slice(0, 10)}。<br><br>
      <b>現在這台裝置上的紀錄會被覆蓋掉，沒辦法復原。</b></p>`,
      [['確定匯入', () => {
        try { applyBackup(j); close_(); renderSettings(); bk('匯入完成'); }
        catch (err) { close_(); bk(err.message); }
      }], ['取消', () => close_(), 'link']]);
  };
  rd.readAsText(f);
  e.target.value = '';
};
const bk = m => { $('#backupOut').textContent = m; };

/* ---------- 回診報告：轉成純文字 ----------
   看診時用講的或貼訊息比截圖方便，截圖還會因為頁面太長而捲動。 */
function reportText() {
  const days = Object.keys(D.days).sort();
  const trained = days.filter(d => D.days[d].sec > 0);
  const since = trained[0] || today();
  const span = Math.max(1, Math.round((Date.parse(today()) - Date.parse(since)) / DAY) + 1);
  const totalSec = days.reduce((a, d) => a + D.days[d].sec, 0);
  const sl = stableLevel(), m = sl ? LEVELS[sl - 1] : null;
  return [
    `${K.name}・目力練習紀錄`,
    `${since} ～ ${today()}（${span} 天）`,
    ``,
    `醫囑遮眼：${K.patch === 'none' ? '未設定' : (K.patch === 'left' ? '左眼' : '右眼')}`,
    `醫囑每日：${K.minutes} 分鐘`,
    `有練習的天數：${trained.length} / ${span}`,
    `達到每日時數：${trained.filter(d => D.days[d].met).length} 天`,
    `累積時間：${Math.round(totalSec / 60)} 分鐘`,
    `目前穩定視標：${m ? m + ' mm' : '樣本不足'}`,
    `　換算（30 cm）：${m ? '約視力 ' + acuity(m).toFixed(2) : '—'}`,
    `對比設定：${({ high: '高', mid: '中', low: '低' })[K.contrast]}`,
    `圖案移動：${motionLabel()}`,
    ``,
    `※ 視標大小由 app 依正確率與反應時間自動調整。`,
    `　「穩定視標」＝同一大小做滿 ${TUNE.穩定要幾題} 題且正確率達 ${Math.round(TUNE.穩定正確率 * 100)}% 的最細一級。`,
    `　這不是視力檢查，數值僅供觀察趨勢，請以院所的正式檢查為準。`
  ].join('\n');
}
$('#copyRpt').onclick = async () => {
  try { await navigator.clipboard.writeText(reportText()); $('#rptOut').textContent = '已複製，可以直接貼給醫師'; }
  catch { $('#rptOut').textContent = '這個瀏覽器不讓複製，改用「分享」'; }
};
$('#shareRpt').onclick = async () => {
  try {
    if (navigator.share) { await navigator.share({ title: `${K.name}・目力練習紀錄`, text: reportText() }); }
    else { await navigator.clipboard.writeText(reportText()); $('#rptOut').textContent = '沒有分享功能，已改成複製'; }
  } catch { /* 使用者取消 */ }
};
