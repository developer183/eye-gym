'use strict';
/* 走迷宮 */
GAMES.maze = {
  name: '走迷宮',
  desc: '用手指沿著通道從圓點拖到星星，撞牆會停住。也可以用下面的方向鍵一格一格走。',
  tag: '視覺追蹤',
  rounds: 3,
  thumb: () => `<svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="var(--fgt)" stroke-width="2.4" stroke-linecap="round">
    <path d="M4 4h26v26H4z"/><path d="M4 12h9M21 4v9M13 21h9M21 21v9"/></svg>`,
  render(field, api) {
    const cellPx = Math.max(Math.min(mm(sizeMm()) * 1.7, 58), 20);

    /* 方向鍵和題目字要先放進 DOM 再量 #field——它們是同一個直向 flex 的兄弟，
       先量再放，迷宮就會照著一個不存在的高度算列數，然後撐破畫面。 */
    const pad = el('div', 'dpad');
    pad.innerHTML = `<button class="sp" data-d="n">↑</button>
      <button data-d="w">←</button><button data-d="s">↓</button><button data-d="e">→</button>`;
    pad.querySelectorAll('button').forEach(b => b.onclick = () => step(b.dataset.d));
    $('#extra').replaceChildren(pad);
    $('#promptRef').innerHTML = '';
    $('#promptTxt').innerHTML = '從圓點拖到<em>星星</em>';

    const cols = Math.max(4, Math.min(12, Math.floor((field.clientWidth - 30) / cellPx)));
    const rows = Math.max(4, Math.min(14, Math.floor((field.clientHeight - 30) / cellPx)));
    const M = genMaze(cols, rows);
    const W = cols * cellPx, H = rows * cellPx, sw = Math.max(2, cellPx * .1);
    const goal = cols * rows - 1;
    let trail = [0];

    let walls = '';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const c = M[y * cols + x], X = x * cellPx, Y = y * cellPx;
      if (c.n) walls += `M${X} ${Y}h${cellPx}`;
      if (c.w) walls += `M${X} ${Y}v${cellPx}`;
      if (y === rows - 1 && c.s) walls += `M${X} ${Y + cellPx}h${cellPx}`;
      if (x === cols - 1 && c.e) walls += `M${X + cellPx} ${Y}v${cellPx}`;
    }
    const cx = i => (i % cols) * cellPx + cellPx / 2;
    const cy = i => ((i / cols) | 0) * cellPx + cellPx / 2;

    field.innerHTML = `<svg id="mz" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <path d="${walls}" stroke="var(--fgt)" stroke-width="${sw}" stroke-linecap="square" fill="none"/>
      <circle cx="${cx(0)}" cy="${cy(0)}" r="${cellPx * .2}" fill="var(--fgt)" opacity=".3"/>
      <path id="mzgoal" d="M${cx(goal)} ${cy(goal) - cellPx * .26}l${cellPx * .08} ${cellPx * .17}l${cellPx * .19} .03l-${cellPx * .15} ${cellPx * .12}l${cellPx * .06} ${cellPx * .18}l-${cellPx * .18} -${cellPx * .11}l-${cellPx * .18} ${cellPx * .11}l${cellPx * .06} -${cellPx * .18}l-${cellPx * .15} -${cellPx * .12}l${cellPx * .19} -.03Z" fill="var(--fgt)"/>
      <polyline id="mztrail" fill="none" stroke="var(--fgt)" stroke-width="${cellPx * .26}"
        stroke-linecap="round" stroke-linejoin="round" opacity=".42"/>
      <circle id="mzhead" r="${cellPx * .21}" fill="var(--fgt)"/></svg>`;

    const svg = field.querySelector('#mz'), tr = field.querySelector('#mztrail'), hd = field.querySelector('#mzhead');
    const draw = () => {
      tr.setAttribute('points', trail.map(i => `${cx(i)},${cy(i)}`).join(' '));
      const c = trail[trail.length - 1];
      hd.setAttribute('cx', cx(c)); hd.setAttribute('cy', cy(c));
    };
    draw();

    let done = false;
    function step(d) {
      if (done) return;
      const cur = trail[trail.length - 1], x = cur % cols, y = (cur / cols) | 0;
      const map = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
      if (M[cur][d]) { sfx.bad(); api.miss(); return; }
      const [dx, dy] = map[d], nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return;
      const ni = ny * cols + nx;
      if (trail.length > 1 && ni === trail[trail.length - 2]) trail.pop(); else trail.push(ni);
      draw(); sfx.step();
      if (ni === goal) { done = true; sfx.good(); setTimeout(() => api.pass(), 220); }
    }

    let dragging = false;
    const cellAt = ev => {
      const r = svg.getBoundingClientRect();
      const x = Math.floor((ev.clientX - r.left) / (r.width / cols));
      const y = Math.floor((ev.clientY - r.top) / (r.height / rows));
      return (x < 0 || x >= cols || y < 0 || y >= rows) ? -1 : y * cols + x;
    };
    svg.addEventListener('pointerdown', e => { dragging = true; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointerup', () => { dragging = false; });
    svg.addEventListener('pointercancel', () => { dragging = false; });
    svg.addEventListener('pointermove', e => {
      if (!dragging || done) return;
      const t = cellAt(e); if (t < 0) return;
      const cur = trail[trail.length - 1];
      if (t === cur) return;
      const x = cur % cols, y = (cur / cols) | 0, tx = t % cols, ty = (t / cols) | 0;
      if (Math.abs(tx - x) + Math.abs(ty - y) !== 1) return;
      step(ty < y ? 'n' : ty > y ? 's' : tx > x ? 'e' : 'w');
    });

    GAMES.maze._key = e => {
      const k = { ArrowUp: 'n', ArrowDown: 's', ArrowLeft: 'w', ArrowRight: 'e' }[e.key];
      if (k) { e.preventDefault(); step(k); }
    };
    window.addEventListener('keydown', GAMES.maze._key);
  },
  cleanup() { if (GAMES.maze._key) window.removeEventListener('keydown', GAMES.maze._key); }
};
