'use strict';
/* 數字接龍 */
GAMES.schulte = {
  name: '數字接龍',
  desc: '從 1 按到最後一個數字，順序不能錯。眼睛要在整片格子裡快速搜尋。',
  tag: '視覺搜尋',
  rounds: 1,
  thumb: () => `<svg width="34" height="34" viewBox="0 0 34 34"><g fill="var(--fgt)" font-family="IBM Plex Mono, monospace" font-size="11" font-weight="600" text-anchor="middle">
    <text x="9" y="13">3</text><text x="25" y="13">1</text><text x="9" y="29">4</text><text x="25" y="29">2</text></g></svg>`,
  render(field, api) {
    const want = Math.round(mm(sizeMm()) * 2.1);
    const avail = Math.min(field.clientWidth, field.clientHeight) - 24;
    let n = Math.max(3, Math.min(6, Math.floor(avail / Math.max(want, 44))));
    const cell = Math.floor((avail - (n - 1) * 5) / n);
    const total = n * n;
    const nums = shuffle(Array.from({ length: total }, (_, i) => i + 1));

    const g = el('div', 'schulte');
    g.style.gridTemplateColumns = `repeat(${n},${cell}px)`;
    let next = 1;
    nums.forEach(v => {
      const b = el('button');
      b.style.height = cell + 'px';
      b.style.fontSize = Math.round(cell * .46) + 'px';
      b.textContent = v;
      b.onclick = () => {
        if (v === next) {
          b.classList.add('done'); b.disabled = true; next++; sfx.step();
          $('#promptTxt').innerHTML = next > total ? '完成了！' : `下一個：<em>${next}</em>`;
          if (next > total) { sfx.good(); api.pass(); }
        } else { bad(b); sfx.bad(); api.miss(); }
      };
      g.append(b);
    });
    field.replaceChildren(g);
    $('#promptRef').innerHTML = '';
    $('#promptTxt').innerHTML = '下一個：<em>1</em>';
  }
};
