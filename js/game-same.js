'use strict';
/* 找一樣的 */
GAMES.same = {
  name: '找一樣的',
  desc: '三種題型輪流出：找出跟上面一樣的、找出唯一不一樣的、找出成對的那兩隻。連續答對會累積連擊。',
  tag: '視覺辨別・連擊',
  rounds: 12,
  thumb: () => creature({ sides: 5, eyes: 2, tail: 6, ears: 1 }, 34),
  render(field, api) {
    const MODES = ['match', 'match', 'odd', 'pair', 'match', 'odd',
                   'pair', 'match', 'odd', 'pair', 'odd', 'pair'];
    const mode = MODES[round.idx % MODES.length];
    // 比視標大、而且有最小尺寸，好看清楚（數字在 content.js）
    const D = Math.round(mm(Math.max(sizeMm() * SAME_SCALE, SAME_MIN_MM)));
    const p = gridPlan(D, 6, 8);
    const n = Math.min(40, Math.max(6, p.cols * p.rows));
    // 連續答對三題之後，干擾項只差一個特徵——孩子表現好就自動變難
    const minDiff = (S.level >= 4 || round.streak >= 3) ? 1 : 2;

    const items = [];          // { s, right }
    let ref = null, text = '';

    if (mode === 'match') {
      const target = randSpec();
      const set = [];
      for (let g = 0; set.length < n - 1 && g < 1200; g++) {
        const s = randSpec();
        if (diffCount(s, target) < minDiff) continue;
        if (set.some(x => diffCount(x, s) === 0)) continue;
        set.push(s);
      }
      set.forEach(s => items.push({ s, right: false }));
      items.push({ s: target, right: true });
      ref = target;
      text = '找出<em>一模一樣</em>的那一隻';

    } else if (mode === 'odd') {
      const base = randSpec();
      for (let i = 0; i < n - 1; i++) items.push({ s: base, right: false });
      items.push({ s: mutate(base, minDiff), right: true });
      text = '只有一隻<em>不一樣</em>，把牠找出來';

    } else {                   // pair：畫面上只有一對是相同的
      const set = [];
      for (let g = 0; set.length < n - 1 && g < 1500; g++) {
        const s = randSpec();
        if (set.some(x => diffCount(x, s) < minDiff)) continue;
        set.push(s);
      }
      // 相差 2 個特徵以上的組合數量有上限，湊不滿就放寬到「只要不完全相同」
      for (let g = 0; set.length < n - 1 && g < 2000; g++) {
        const s = randSpec();
        if (set.some(x => diffCount(x, s) === 0)) continue;
        set.push(s);
      }
      const twin = pick(set);
      set.forEach(s => items.push({ s, right: false }));
      items.push({ s: twin, right: false });
      text = '有<em>兩隻</em>長得一樣，把牠們都點出來';
    }
    shuffle(items);

    const setPrompt = () => {
      $('#promptRef').innerHTML = ref ? creature(ref, Math.min(46, Math.max(D, 28))) : '';
      $('#promptTxt').innerHTML = text +
        (round.streak >= 2 ? `<span class="streak">連擊 ×${round.streak}</span>` : '');
    };
    setPrompt();

    const ok = () => {
      round.streak++;
      sfx.pick(Math.min(round.streak, 6));            // 連越多聲音越高
      if (round.streak % 5 === 0) sfx.match();
      setPrompt();
      api.pass();
    };
    const nope = b => {
      bad(b); sfx.bad();
      round.streak = 0; setPrompt();
      api.miss();
    };

    let selBtn = null;
    const g = makeGrid(p.cols, p.gap);
    items.forEach(it => {
      const b = el('button', 'cellbtn');
      b.style.width = b.style.height = p.cell + 'px';
      b.innerHTML = creature(it.s, D);
      b.onclick = () => {
        if (mode === 'pair') {
          if (selBtn === b) { b.classList.remove('sel'); selBtn = null; sfx.step(); return; }
          if (!selBtn) { selBtn = b; b.classList.add('sel'); sfx.step(); return; }
          if (diffCount(selBtn._s, it.s) === 0) {
            selBtn.classList.replace('sel', 'hit'); b.classList.add('hit');
            flashOn(b); flashOn(selBtn); ok();
          } else {
            bad(b); bad(selBtn); selBtn.classList.remove('sel'); selBtn = null;
            sfx.bad(); round.streak = 0; setPrompt(); api.miss();
          }
          return;
        }
        if (it.right) { b.classList.add('hit'); flashOn(b); ok(); }
        else nope(b);
      };
      b._s = it.s;
      g.append(b);
    });
    field.replaceChildren(g);
  }
};
