'use strict';
/* 三個一組 */
GAMES.pile = {
  name: '三個一組',
  desc: '畫面上方會指定這一關要找的東西。從一堆互相遮住的圖案裡挑出三個一樣的收進盒子，湊滿指定數量就過關。盒子只有 7 格，塞滿就結束。',
  tag: '指定目標搜尋・圖形背景辨別',
  continuous: true,
  rounds: 1,
  thumb: () => `<span class="tri"><img src="img/cat.png" alt=""><img src="img/frog.png" alt=""><img src="img/bee.png" alt=""></span>`,
  render(field, api) {
    const D = Math.max(Math.round(mm(sizeMm()) * 2.0), 26);
    const SPEED = mm(motionMm());   // 設定裡選的移動速度，換成 px／秒

    /* 這一場派誰上場：同一組（狗／狼／狐狸這種）低精細度時只抽一種 */
    const perGroup = S.level <= 3 ? 1 : (S.level <= 5 ? 2 : 99);
    const want = Math.min(28, 8 + S.level * 3);
    const seen = {}, TYPES = [];
    for (const i of shuffle(SPRITES.map((_, i) => i))) {
      if (TYPES.length >= want) break;
      const slug = SPRITES[i][0];
      if (!S.color && MONO_BAD.has(slug)) continue;
      const g = GROUPS[slug] || slug;
      if ((seen[g] || 0) >= perGroup) continue;
      seen[g] = (seen[g] || 0) + 1;
      TYPES.push(i);
    }
    const sp = t => SPRITES[TYPES[t]];
    const nTypes = TYPES.length;

    /* 指定目標：這一場要收集哪幾種、各幾個。收集數一定是 3 的倍數 */
    const objs = shuffle(TYPES.map((_, t) => t))
      .slice(0, Math.min(S.level <= 2 ? 2 : 3, nTypes))
      .map(t => ({ t, need: 3 * (S.level <= 2 ? 1 : 1 + rnd(2)), got: 0 }));

    // 單色模式：brightness(0) 壓成剪影，再 invert 到設定的明度，對比才跟其他關卡一致
    const lum = parseInt((FC.fg.match(/\d+/) || ['17'])[0], 10);
    const filtVal = S.color ? '' : `brightness(0) invert(${(lum / 255).toFixed(3)}) drop-shadow(0 2px 3px var(--pcsh))`;
    const filt = filtVal ? `filter:${filtVal};` : '';
    const imgFor = t => `<img src="img/${sp(t)[0]}.png" alt="${sp(t)[1]}" draggable="false">`;

    let zTop = 0, locked = false, tray = [], trayK = 0, slotRects = new Map();
    const flying = new Set();

    /* 托盤和目標列一定要在量 #field 之前就放好。
       它們跟 #field 是同一個直向 flex 的兄弟，先量再放，等於照著一個
       不存在的高度鋪圖案，然後底下整排被裁掉。 */
    const trayEl = el('div', 'tray');
    trayEl.style.setProperty('--bgf', FC.bg);
    trayEl.innerHTML = `<div class="slots" id="slots"></div>
      <div class="tools"><button id="bUndo" type="button">↩ 收回</button><button id="bShuf" type="button">⇄ 重鋪</button></div>`;
    $('#extra').replaceChildren(trayEl);
    const slots = trayEl.querySelector('#slots');
    $('#promptRef').innerHTML = '';
    drawTray();
    say();

    // clientWidth/Height 已經扣掉邊框，再扣自己的 padding 12px×2
    const W = Math.max(140, field.clientWidth - 24), H = Math.max(140, field.clientHeight - 24);

    const counts = new Array(nTypes).fill(1);
    objs.forEach(o => { counts[o.t] = Math.max(counts[o.t], o.need / 3 + 1); });  // 多留一組緩衝
    const base = counts.reduce((a, b) => a + b, 0);
    const nTriples = Math.max(base, Math.min(18 + S.level * 3, Math.round(W * H / (D * D * 1.75))));
    for (let i = base; i < nTriples; i++) counts[rnd(nTypes)]++;
    const list = [];
    counts.forEach((c, t) => { for (let i = 0; i < c * 3; i++) list.push(t); });
    shuffle(list);
    api.setTotal(objs.reduce((a, o) => a + o.need, 0) / 3);
    zTop = list.length;

    const pile = el('div', 'pile');
    if (S.night) pile.style.setProperty('--pcsh', 'rgba(0,0,0,.78)');
    if (S.bg) pile.innerHTML = pileBg(Math.round(W), Math.round(H));
    const pieces = new Map();

    /* 抖動網格：先把畫面切成剛好夠用的格子，每個圖案在自己那格裡隨機偏移。
       這樣整片都鋪得到，不會中間擠成一坨、四個角空著；格子比圖案小，所以照樣層層疊。
       邊緣留 margin 給旋轉和放大，免得轉出界被裁到。 */
    const M = Math.ceil(D * .18);
    const gc = Math.max(1, Math.round(Math.sqrt(list.length * W / H)));
    const gr = Math.max(1, Math.ceil(list.length / gc));
    const cw = (W - M * 2) / gc, ch = (H - M * 2) / gr;
    function place(p, cell) {
      if (cell !== undefined) p.cell = cell;
      const cx = M + ((p.cell % gc) + .5) * cw + (Math.random() - .5) * cw * .95;
      const cy = M + ((p.cell / gc | 0) + .5) * ch + (Math.random() - .5) * ch * .95;
      p.x = Math.max(M, Math.min(W - D - M, cx - D / 2));
      p.y = Math.max(M, Math.min(H - D - M, cy - D / 2));
      p.rot = Math.random() * 44 - 22;
      p.sc = .9 + Math.random() * .22;
      paint(p);
    }
    const paint = p => p.el.style.cssText =
      `left:0;top:0;width:${D}px;height:${D}px;z-index:${p.z};` +
      `transform:translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(${p.rot.toFixed(1)}deg) scale(${p.sc.toFixed(3)});${filt}`;

    const cells = shuffle([...Array(gc * gr).keys()]);
    list.forEach((t, i) => {
      const d = el('div', 'pc');
      d.innerHTML = imgFor(t);
      const p = { id: i, t, z: i, el: d };
      // 每個圖案自己的漂移方向與速度（公釐／秒換成 px），還有一點點左右搖擺
      const a = Math.random() * Math.PI * 2, v = SPEED * (.6 + Math.random() * .8);
      p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.vr = (Math.random() - .5) * 10;
      place(p, cells[i]);
      pieces.set(i, p);
      pile.append(d);
    });
    field.replaceChildren(pile);
    say();

    /* 會動：醫師建議用移動中的目標練追視。每個圖案慢慢漂、碰到邊就反彈。
       點擊判定（hitAt）用的就是這裡更新的 x/y/rot，所以點會動的圖案一樣準。
       這一關結束或離開畫面時 pile 會被移出 DOM，迴圈看到就自己停。 */
    let last = 0;
    function drift(now) {
      if (!pile.isConnected) return;
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0;   // 切到背景再回來不要一口氣跳很遠
      last = now;
      if (dt && SPEED > 0) {
        const lo = M, hiX = W - D - M, hiY = H - D - M;
        for (const p of pieces.values()) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          if (p.x < lo) { p.x = lo; p.vx = Math.abs(p.vx); } else if (p.x > hiX) { p.x = hiX; p.vx = -Math.abs(p.vx); }
          if (p.y < lo) { p.y = lo; p.vy = Math.abs(p.vy); } else if (p.y > hiY) { p.y = hiY; p.vy = -Math.abs(p.vy); }
          if (Math.abs(p.rot) > 24) { p.rot = Math.sign(p.rot) * 24; p.vr = -p.vr; }
          p.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(${p.rot.toFixed(1)}deg) scale(${p.sc.toFixed(3)})`;
        }
      }
      requestAnimationFrame(drift);
    }
    requestAnimationFrame(drift);

    /* 由上往下找第一個「不透明像素真的被點到」的圖案 */
    function hitAt(px, py) {
      const arr = [...pieces.values()].sort((a, b) => b.z - a.z);
      for (const p of arr) {
        const dx = px - (p.x + D / 2), dy = py - (p.y + D / 2);
        const th = p.rot * Math.PI / 180, co = Math.cos(th), si = Math.sin(th);
        const rx = (dx * co + dy * si) / p.sc, ry = (-dx * si + dy * co) / p.sc;
        if (Math.abs(rx) > D / 2 || Math.abs(ry) > D / 2) continue;
        const m = MASKS[sp(p.t)[0]];
        if (!m) return p;
        const u = Math.floor((rx / D + .5) * MASK_N), v = Math.floor((ry / D + .5) * MASK_N);
        if (u >= 0 && u < MASK_N && v >= 0 && v < MASK_N && m[v * MASK_N + u]) return p;
      }
      return null;
    }
    pile.addEventListener('pointerdown', e => {
      const r = pile.getBoundingClientRect();
      const p = hitAt(e.clientX - r.left, e.clientY - r.top);
      if (p) tap(p);
    });

    /* 先往上彈一下放大，再走一道弧線落進格子裡 */
    function fly(p, x0, y0, slotEl, done) {
      let ended = false;
      const end = () => { if (!ended) { ended = true; done(); } };
      if (!slotEl || REDUCED) return end();
      const sr = slotEl.getBoundingClientRect();
      const f = el('div', 'flyer');
      f.style.cssText = `left:${x0.toFixed(1)}px;top:${y0.toFixed(1)}px;width:${D}px;height:${D}px`;
      f.innerHTML = imgFor(p.t);
      if (filtVal) f.firstChild.style.filter = filtVal;
      document.body.append(f);
      const dx = sr.left + sr.width / 2 - (x0 + D / 2);
      const dy = sr.top + sr.height / 2 - (y0 + D / 2);
      const k = Math.max(.15, (sr.width - 6) / D);
      const tf = (tx, ty, rot, sc) => `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
      f.animate([
        { transform: tf(0, 0, p.rot, p.sc), offset: 0 },
        { transform: tf(dx * .05, dy * .05 - 12, p.rot * .5, p.sc * 1.3), offset: .22, easing: 'ease-out' },
        { transform: tf(dx * .58, dy * .58 - 46, p.rot * .2, (p.sc * 1.3 + k) / 2), offset: .64 },
        { transform: tf(dx, dy, 0, k), offset: 1 }
      ], { duration: 460, easing: 'cubic-bezier(.32,.72,.3,1)', fill: 'forwards' })
        .onfinish = () => { f.remove(); end(); };
      setTimeout(() => { f.remove(); end(); }, 900);   // 動畫沒回報也要收尾
    }

    function drawTray() {
      const sorted = tray.slice().sort((a, b) => a.t - b.t);
      const prev = slotRects; slotRects = new Map();
      slots.replaceChildren();
      for (let i = 0; i < 7; i++) {
        const s = el('div', 'slot'), it = sorted[i];
        if (it) {
          s.classList.add('full');
          s.dataset.k = it.k;
          s.innerHTML = imgFor(it.t);
          if (filtVal) s.firstChild.style.filter = filtVal;
          if (flying.has(it.k)) s.firstChild.style.visibility = 'hidden';   // 位子先留著，等它飛到
        }
        slots.append(s);
      }
      // FLIP：同款要靠在一起，插隊造成的位移用滑的，不要用跳的
      [...slots.children].forEach(s => {
        const k = s.dataset.k; if (!k) return;
        const r = s.getBoundingClientRect();
        slotRects.set(k, r);
        const o = prev.get(k);
        if (o && !REDUCED && Math.abs(o.left - r.left) > .5)
          s.animate([{ transform: `translateX(${(o.left - r.left).toFixed(1)}px)` }, { transform: 'none' }],
            { duration: 240, easing: 'cubic-bezier(.3,.8,.3,1)' });
      });
      trayEl.querySelector('#bUndo').disabled = !tray.length || !!flying.size;
    }

    // 指定目標列：這一場要找的是哪幾種、收到幾個了
    function say() {
      $('#promptTxt').innerHTML = '<span class="objs">' + objs.map(o =>
        `<span class="obj${o.got >= o.need ? ' done' : ''}">${imgFor(o.t)}${o.got >= o.need ? '✓' : `${o.got}/${o.need}`}</span>`
      ).join('') + '</span>';
    }

    function tap(p) {
      if (locked || tray.length >= 7 || !pieces.has(p.id)) return;
      pieces.delete(p.id);
      const it = { t: p.t, p, k: ++trayK };
      tray.push(it);
      flying.add(it.k);
      sfx.pick(tray.filter(x => x.t === p.t).length);   // 湊到第幾個，音就高一階

      const pr = pile.getBoundingClientRect();
      const x0 = pr.left + p.x, y0 = pr.top + p.y;
      flash(x0 + D / 2, y0 + D / 2, D);
      p.el.remove();
      drawTray();

      fly(p, x0, y0, slots.querySelector(`[data-k="${it.k}"]`), () => {
        flying.delete(it.k);
        const s = slots.querySelector(`[data-k="${it.k}"]`);
        if (s) {
          const im = s.querySelector('img');
          if (im) im.style.visibility = '';
          s.classList.add('pop');
          sfx.land();
        }
        trayEl.querySelector('#bUndo').disabled = !tray.length || !!flying.size;
        settle(it);
      });
    }

    // 等第三個真的落進格子才結算，不然消除會比動畫早
    function settle(it) {
      const same = tray.filter(x => x.t === it.t && !flying.has(x.k));
      if (same.length >= 3) {
        locked = true;
        const kill = same.slice(0, 3);
        kill.forEach(x => slots.querySelector(`[data-k="${x.k}"]`)?.classList.add('clearing'));
        sfx.match();
        setTimeout(() => {
          tray = tray.filter(x => !kill.includes(x));
          drawTray(); locked = false;
          // 只有指定目標才算進度；其他的消掉是清場，不推進關卡
          const o = objs.find(x => x.t === it.t);
          if (o && o.got < o.need) {
            o.got = Math.min(o.need, o.got + 3);
            say();
            if (o.got >= o.need) sfx.good();
            api.pass();
          }
        }, 300);
        return;
      }
      if (tray.length >= 7 && !flying.size) {
        sfx.fail();
        api.fail('盒子滿了', '七格都被佔住了，沒辦法再放。再來一次——先把看得最清楚的那幾個湊成三個。');
      }
    }

    trayEl.querySelector('#bUndo').onclick = () => {
      if (locked || flying.size || !tray.length) return;
      const { p } = tray.pop();
      p.z = ++zTop;
      pile.append(p.el); paint(p); pieces.set(p.id, p);
      if (!REDUCED) p.el.animate([{ opacity: 0, transform: `${p.el.style.transform} scale(.3)` }, { opacity: 1 }],
        { duration: 240, easing: 'ease-out' });
      sfx.swish();
      drawTray(); api.miss();
    };
    trayEl.querySelector('#bShuf').onclick = () => {
      if (locked) return;
      const cs = shuffle([...Array(gc * gr).keys()]);
      shuffle([...pieces.values()]).forEach((p, i) => { p.z = i; place(p, cs[i]); });
      zTop = pieces.size; sfx.swish(); api.miss();
    };
  }
};
