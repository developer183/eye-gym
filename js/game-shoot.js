'use strict';
/* 太空守衛（射擊）
   一般的打外星人射擊遊戲：手指左右拖動太空船，船會自動發射。
   外星人整隊左右移動、碰邊往下降，越打越少就移動得越快；底下的會丟炸彈，要閃開。
   練的是：盯住快速移動的目標、預判軌跡、眼手協調（動態視力）。

   難度自己找（跟視標大小的做法一樣，家長不用設年齡）：
   - 每個孩子有自己的「等級」，存在練習紀錄裡（D.shoot），備份時會一起帶走
   - 一輪有好幾波，一波比一波快
   - 整輪打完、而且被炸到不超過 1 次 → 下次升一級；這輪沒過 → 下次降一級
   - 等級越高：外星人越快、炸彈越多越快、排數變多，高等級還會有外星人脫隊俯衝
   - 分數：打中 10 分 × 連擊倍數；連續命中越多倍數越高（子彈落空就歸零）
   數字都在 content.js 的 SHOOT。

   給眼睛的考量（變難也不破例）：
   - 只靠速度、數量、軌跡變難；不加閃光、不閃爍、不震動畫面、不用鮮豔色塊
   - 外星人只畫低彩度外框；打中是淡出縮小；被炸到是太空船變半透明一下
   - 外星人大小跟著目前視標級距，越細的級距外星人越小 */
GAMES.shoot = {
  name: '太空守衛',
  desc: '手指左右拖動太空船，會自動發射。把外星人全部打下來，小心別被炸彈打到。',
  tag: '動態視力・眼手協調',
  continuous: true,
  rounds: 1,
  thumb: () => `<svg width="34" height="34" viewBox="0 0 34 34">
    <ellipse cx="17" cy="11" rx="9" ry="6.5" fill="none" stroke="#8FA9A2" stroke-width="2"/>
    <circle cx="14" cy="11" r="1.4" fill="#8FA9A2"/><circle cx="20" cy="11" r="1.4" fill="#8FA9A2"/>
    <path d="M17 22 L21 28 L28 31 L6 31 L13 28 Z" fill="none" stroke="var(--fgt,currentColor)" stroke-width="2" stroke-linejoin="round"/></svg>`,
  render(field, api) {
    const W = Math.max(200, field.clientWidth - 24), H = Math.max(260, field.clientHeight - 24);
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const cv = el('canvas', 'shootcv');
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    field.replaceChildren(cv);
    $('#extra').replaceChildren();
    $('#promptRef').innerHTML = '';

    /* ---------- 這個孩子的等級與最高分 ---------- */
    const rec = (D.shoot = D.shoot || { lv: 1, best: 0 });
    const LV = Math.max(1, Math.min(SHOOT.最高等級, rec.lv || 1));
    const WAVES = SHOOT.每輪幾波;
    const k = LV - 1;

    /* ---------- 尺寸與陣型 ---------- */
    const A = Math.round(Math.max(26, Math.min(52, mm(sizeMm()) * 2.2)));   // 外星人寬
    const AH = Math.round(A * .78);                                         // 外星人高
    const gx = Math.round(A * .4), gy = Math.round(A * .45);
    const cols = Math.max(4, Math.min(7, Math.floor((W * .82 + gx) / (A + gx))));
    const rows = Math.min((H > 420 ? 4 : 3) + (LV >= 6 ? 1 : 0), Math.floor((H * .42 + gy) / (AH + gy)));
    const fw = cols * A + (cols - 1) * gx;
    const n = cols * rows;
    api.setTotal(n * WAVES);

    const SW = Math.round(Math.max(36, A * 1.1)), SH = Math.round(SW * .62);
    const shipY = H - SH - 6;
    const HUES = S.color ? ['#8FA9A2', '#B9A58C', '#9C99B8', '#8EA4BA'] : ['#9A9A9A'];

    let wave = 0, aliens = [], left = 0, ox = 0, oy = 0, dir = 1, cfg = null;
    let sx = W / 2, tx = sx, hearts = 3, inv = 0;
    let score = 0, combo = 0, newBest = false;
    let bullets = [], bombs = [];
    let fireT = 0, bombT = 0, diveT = 0, intro = 0, over = false, last = 0;

    /* 每一波的參數：等級（k）決定基礎難度，波數再往上加 */
    function startWave() {
      wave++;
      const w = wave - 1;
      cfg = {
        march: mm(SHOOT.外星人速) * (1 + .12 * k) * (1 + .15 * w),
        bomb: mm(SHOOT.炸彈速) * (1 + .08 * k),
        bombEvery: SHOOT.炸彈間隔 / (1 + .15 * k) / (1 + .1 * w),
        dive: LV >= SHOOT.俯衝從第幾級 ? Math.max(2.2, 6 - .4 * LV - .5 * w) : 0,
        ship: mm(SHOOT.船速), bullet: mm(SHOOT.子彈速), fire: SHOOT.發射間隔
      };
      aliens = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
        aliens.push({ c, r, x: c * (A + gx), y: r * (AH + gy), hue: HUES[r % HUES.length], alive: true, die: 0, dv: null });
      left = n; ox = (W - fw) / 2; oy = 8; dir = Math.random() < .5 ? 1 : -1;
      bullets = []; bombs = [];
      bombT = cfg.bombEvery; diveT = cfg.dive || 0; fireT = 0;
      intro = 1.3;                                   // 每波開場停一下，顯示「第幾波」
      say();
    }

    const say = () => {
      const mult = 1 + Math.min(4, Math.floor(combo / 5));
      $('#promptTxt').innerHTML =
        `<span class="hearts">${'♥'.repeat(hearts)}<span class="lost">${'♥'.repeat(3 - hearts)}</span></span>` +
        `　第 ${LV} 級・${wave}/${WAVES} 波・<em>${score}</em> 分` +
        (mult > 1 ? `<span class="combo"> ×${mult}</span>` : '') +
        `<span class="best">${newBest ? '　新紀錄！' : `　最高 ${rec.best}`}</span>`;
    };

    /* ---------- 操作：手指拖、滑鼠移、鍵盤左右鍵 ---------- */
    const toX = e => { const r = cv.getBoundingClientRect(); tx = Math.max(SW / 2, Math.min(W - SW / 2, e.clientX - r.left)); };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture?.(e.pointerId); toX(e); });
    cv.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') toX(e); });
    const keys = { l: false, r: false };
    const onKey = e => {
      if (view !== 'play' || round?.id !== 'shoot') return;
      const on = e.type === 'keydown';
      if (e.key === 'ArrowLeft') { keys.l = on; e.preventDefault(); }
      if (e.key === 'ArrowRight') { keys.r = on; e.preventDefault(); }
    };
    GAMES.shoot.cleanup();
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);
    GAMES.shoot._onKey = onKey;

    /* ---------- 位置 ---------- */
    const posOf = a => a.dv ? { x: a.dv.x, y: a.dv.y } : { x: ox + a.x, y: oy + a.y };

    /* ---------- 畫圖 ---------- */
    function drawAlien(a) {
      let s = 1, al = 1;
      if (!a.alive) { s = 1 - a.die * .6; al = Math.max(0, 1 - a.die / .3); if (al <= 0) return; }
      if (a.dv && a.dv.back) al *= Math.min(1, a.dv.back);   // 俯衝完回隊伍：淡入
      const p = posOf(a), cx = p.x + A / 2, cy = p.y + AH / 2;
      ctx.save();
      ctx.globalAlpha = al * .85;
      ctx.translate(cx, cy); ctx.scale(s, s);
      if (a.dv && !a.dv.back) ctx.rotate(Math.sin(a.dv.t * 3) * .25);
      ctx.strokeStyle = ctx.fillStyle = a.hue;
      ctx.lineWidth = Math.max(2, A * .07); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(0, A * .06, A * .42, AH * .36, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-A * .16, -AH * .2); ctx.lineTo(-A * .26, -AH * .46);
      ctx.moveTo(A * .16, -AH * .2); ctx.lineTo(A * .26, -AH * .46);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(-A * .14, A * .04, A * .07, 0, Math.PI * 2); ctx.arc(A * .14, A * .04, A * .07, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function drawShip() {
      ctx.save();
      ctx.globalAlpha = inv > 0 ? .35 : 1;          // 被炸到：變半透明一陣子，不閃
      ctx.translate(sx - SW / 2, shipY);
      ctx.strokeStyle = FC.fg; ctx.fillStyle = FC.fg;
      ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
      const w = SW, h = SH;
      ctx.beginPath();
      ctx.moveTo(w * .5, 0); ctx.lineTo(w * .66, h * .5); ctx.lineTo(w, h * .75); ctx.lineTo(w, h);
      ctx.lineTo(0, h); ctx.lineTo(0, h * .75); ctx.lineTo(w * .34, h * .5); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(w * .5, h * .58, Math.max(2, w * .07), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      aliens.forEach(drawAlien);
      ctx.fillStyle = FC.fg; ctx.globalAlpha = .6;
      bullets.forEach(b => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(b.x - 1.75, b.y, 3.5, 11, 1.75) : ctx.rect(b.x - 1.75, b.y, 3.5, 11); ctx.fill(); });
      ctx.globalAlpha = .75; ctx.fillStyle = S.color ? '#B08A7A' : '#888';
      bombs.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
      drawShip();
      if (intro > 0) {                               // 「第幾波」字卡：淡入淡出，不閃
        ctx.save();
        ctx.globalAlpha = Math.min(1, intro / .4) * .85;
        ctx.fillStyle = FC.fg; ctx.textAlign = 'center';
        ctx.font = `600 ${Math.round(Math.min(26, W / 12))}px system-ui, sans-serif`;
        ctx.fillText(wave === 1 ? `第 ${LV} 級` : `第 ${wave} 波`, W / 2, H * .55);
        ctx.font = `500 ${Math.round(Math.min(15, W / 22))}px system-ui, sans-serif`;
        ctx.fillText(wave === 1 ? '手指左右拖動太空船，會自動發射' : '外星人會更快喔', W / 2, H * .55 + 26);
        ctx.restore();
      }
    }

    /* ---------- 結算：先記等級與最高分，再告訴外殼 ---------- */
    function settle(won) {
      if (score > (rec.best || 0)) { rec.best = score; newBest = true; }
      if (won && hearts >= 2) rec.lv = Math.min(SHOOT.最高等級, LV + 1);
      else if (!won) rec.lv = Math.max(1, LV - 1);
      saveData(); say();
    }
    function lose(title, msg) {
      over = true;
      settle(false);
      sfx.fail?.();
      api.fail(title, msg + (newBest ? `<br>這輪 ${score} 分，是新紀錄！` : `<br>這輪 ${score} 分（最高 ${rec.best}）。`));
    }
    function hitShip() {
      hearts--; inv = 1.2; combo = 0; say();
      sfx.bad(); api.miss();
      if (hearts <= 0) lose('太空船被打中三次', '再來一次——看準了往旁邊閃。下一輪會稍微慢一點。');
    }

    /* ---------- 遊戲迴圈 ---------- */
    function tick(now) {
      if (!cv.isConnected || over) return;
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
      last = now;

      // 太空船往目標位置滑
      if (keys.l) tx = Math.max(SW / 2, tx - cfg.ship * dt);
      if (keys.r) tx = Math.min(W - SW / 2, tx + cfg.ship * dt);
      const d = tx - sx, mv = cfg.ship * dt;
      sx += Math.abs(d) <= mv ? d : Math.sign(d) * mv;
      if (inv > 0) inv -= dt;

      if (intro > 0) { intro -= dt; draw(); return requestAnimationFrame(tick); }

      // 外星人整隊移動：這一波剩越少走越快（最多 2.2 倍）
      const live = aliens.filter(a => a.alive);
      const speed = cfg.march * (1 + (1 - left / n) * 1.2);
      ox += dir * speed * dt;
      const minX = Math.min(...live.map(a => a.x)), maxX = Math.max(...live.map(a => a.x)) + A;
      if (ox + minX < 0) { ox = -minX; dir = 1; oy += AH * .45; }
      else if (ox + maxX > W) { ox = W - maxX; dir = -1; oy += AH * .45; }
      const bottom = Math.max(...live.map(a => a.y)) + AH;
      if (oy + bottom >= shipY - 2) { lose('外星人降落了', '牠們走到太空船那一排了。再來一次——先打最下面那一排。'); return; }

      // 自動發射
      fireT -= dt;
      if (fireT <= 0 && bullets.length < 3) { bullets.push({ x: sx, y: shipY - 10 }); fireT = cfg.fire; }

      // 底下的外星人丟炸彈
      bombT -= dt;
      if (bombT <= 0) {
        bombT = cfg.bombEvery * (.7 + Math.random() * .6);
        const byCol = {};
        live.forEach(a => { if (!a.dv && (!byCol[a.c] || a.y > byCol[a.c].y)) byCol[a.c] = a; });
        const who = pick(Object.values(byCol));
        if (who) bombs.push({ x: ox + who.x + A / 2, y: oy + who.y + AH });
      }

      // 高等級：外星人脫隊，左右擺動俯衝向太空船，衝到底再回隊伍
      if (cfg.dive) {
        diveT -= dt;
        if (diveT <= 0) {
          diveT = cfg.dive * (.8 + Math.random() * .4);
          const who = pick(live.filter(a => !a.dv));
          if (who) who.dv = { x: ox + who.x, y: oy + who.y, x0: ox + who.x, t: 0, back: 0 };
        }
        live.forEach(a => {
          const v = a.dv; if (!v) return;
          if (v.back) { v.back += dt * 3; if (v.back >= 1) a.dv = null; else { v.x = ox + a.x; v.y = oy + a.y; } return; }
          v.t += dt;
          v.y += cfg.bomb * 1.1 * dt;
          v.x0 += Math.sign(sx - A / 2 - v.x0) * Math.min(Math.abs(sx - A / 2 - v.x0), A * 1.2 * dt);   // 慢慢朝太空船靠
          v.x = Math.max(0, Math.min(W - A, v.x0 + Math.sin(v.t * 2.6) * A * 1.1));
          if (inv <= 0 && v.y + AH > shipY + SH * .3 && v.y < shipY + SH && Math.abs(v.x + A / 2 - sx) < (A + SW) * .38) {
            v.back = .01; v.x = ox + a.x; v.y = oy + a.y;   // 撞到太空船：牠回隊伍，太空船扣一顆心
            hitShip(); if (over) return;
          } else if (v.y > H) { v.back = .01; v.x = ox + a.x; v.y = oy + a.y; }
        });
        if (over) return;
      }

      // 子彈往上、撞到外星人
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.y -= cfg.bullet * dt;
        if (b.y < -12) { bullets.splice(i, 1); if (combo) { combo = 0; say(); } continue; }   // 落空：連擊歸零
        const hit = aliens.find(a => {
          if (!a.alive || (a.dv && a.dv.back)) return false;
          const p = posOf(a);
          return b.x > p.x + A * .08 && b.x < p.x + A * .92 && b.y < p.y + AH * .9 && b.y > p.y;
        });
        if (!hit) continue;
        hit.alive = false; hit.dv = hit.dv ? { ...hit.dv, frozen: true } : null;
        bullets.splice(i, 1);
        left--; combo++;
        score += 10 * (1 + Math.min(4, Math.floor((combo - 1) / 5)));
        sfx.pick(1 + combo % 6); haptic(8);
        const waveDone = !left, roundDone = waveDone && wave >= WAVES;
        if (waveDone) score += 50 * wave + (hearts === 3 ? 100 : 0);   // 過波獎勵；沒被打中再加分
        if (roundDone) { over = true; settle(true); sfx.good(); }
        else say();
        api.pass();                                  // 最後一隻會讓外殼結束這一輪，所以要放在結算之後
        if (roundDone) return;
        if (waveDone) { sfx.good(); startWave(); break; }
      }
      aliens.forEach(a => { if (!a.alive && a.die < .3) a.die += dt; });

      // 炸彈往下、撞到太空船
      for (let i = bombs.length - 1; i >= 0; i--) {
        const b = bombs[i]; b.y += cfg.bomb * dt;
        if (b.y > H + 6) { bombs.splice(i, 1); continue; }
        if (inv <= 0 && b.y > shipY + SH * .2 && b.y < shipY + SH && Math.abs(b.x - sx) < SW * .45) {
          bombs.splice(i, 1);
          hitShip(); if (over) return;
        }
      }

      draw();
      requestAnimationFrame(tick);
    }
    startWave();
    draw();
    requestAnimationFrame(tick);
  },
  cleanup() {
    const f = GAMES.shoot._onKey;
    if (f) { document.removeEventListener('keydown', f); document.removeEventListener('keyup', f); }
    GAMES.shoot._onKey = null;
  }
};
