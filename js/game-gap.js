'use strict';
/* 小缺口 */
GAMES.gap = {
  name: '小缺口',
  desc: '一圈圈上面都有一個小缺口。把缺口朝指定方向的全部點出來。',
  tag: '視力訓練視標',
  rounds: 5,
  thumb: () => landoltC(1, 32),
  render(field, api) {
    const D = Math.round(mm(sizeMm()));
    const p = gridPlan(D, 6, 6);
    const rows = Math.min(p.rows, 5), n = p.cols * rows;
    const want = rnd(4);
    const k = Math.max(2, Math.min(n - 2, 2 + rnd(3)));
    const dirs = Array.from({ length: n }, (_, i) => i < k ? want : pick([0, 1, 2, 3].filter(d => d !== want)));
    shuffle(dirs);

    $('#promptRef').innerHTML = landoltC(want, Math.min(40, Math.max(D, 26)));
    $('#promptTxt').innerHTML = `點出所有缺口朝<em>${DIRNAME[want]}</em>的圈圈（共 ${k} 個）`;

    let found = 0;
    const g = makeGrid(p.cols, p.gap);
    dirs.forEach(d => {
      const b = el('button', 'cellbtn');
      b.style.width = b.style.height = p.cell + 'px';
      b.innerHTML = landoltC(d, D);
      b.onclick = () => {
        if (b.classList.contains('hit')) return;
        if (d === want) { b.classList.add('hit'); flashOn(b); sfx.pick(++found); if (found === k) { sfx.good(); api.pass(); } }
        else { bad(b); sfx.bad(); api.miss(); }
      };
      g.append(b);
    });
    field.replaceChildren(g);
  }
};
