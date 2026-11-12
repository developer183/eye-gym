'use strict';
/* E 字方向（翻滾 E 視標）
   畫面中間出現一個 E，孩子按箭頭回答 E 的三隻腳朝哪邊。
   E 的畫法照標準視標：邊長 D、筆畫與空隙都是 D/5，大小跟著目前視標級距走。
   答錯會換一個新的 E（不讓孩子在同一題亂猜到對），答對 10 題這一輪結束。 */
GAMES.tumble = {
  name: 'E 字方向',
  desc: '畫面上有一個 E，按箭頭告訴我 E 的三隻腳朝哪一邊。',
  tag: '視力訓練視標',
  rounds: 10,
  thumb: () => tumblingE(0, 30),
  render(field, api) {
    const D = Math.round(mm(sizeMm()));
    let dir = -1, wrap = null, busy = false;

    // 方向鍵要先放進 DOM 再畫題目（同迷宮：先放兄弟元素，#field 的高度才會是對的）
    const KEY = { n: 3, w: 2, s: 1, e: 0 };
    const pad = el('div', 'dpad');
    pad.innerHTML = `<button class="sp" data-d="n" aria-label="上">↑</button>
      <button data-d="w" aria-label="左">←</button><button data-d="s" aria-label="下">↓</button><button data-d="e" aria-label="右">→</button>`;
    pad.querySelectorAll('button').forEach(b => b.onclick = () => answer(KEY[b.dataset.d], b));
    $('#extra').replaceChildren(pad);
    $('#promptRef').innerHTML = '';
    $('#promptTxt').innerHTML = 'E 的三隻腳朝<em>哪一邊</em>？按下面的箭頭';

    const draw = () => {
      let d; do { d = rnd(4); } while (d === dir);   // 不連續出同一個方向
      dir = d;
      wrap = el('div', 'tumble');
      wrap.innerHTML = tumblingE(dir, D);
      const g = makeGrid(1, 0);
      g.append(wrap);
      field.replaceChildren(g);
    };

    function answer(d, btn) {
      if (busy) return;
      if (d === dir) {
        busy = true;                                  // 等下一題畫出來前不收第二次點擊
        flashOn(wrap); sfx.pick(Math.min(round.streak + 1, 6)); round.streak++;
        api.pass();
      } else {
        bad(btn); sfx.bad(); round.streak = 0;
        api.miss();
        setTimeout(draw, 300);                        // 換一個新的 E，別讓同一題被猜中
      }
    }

    // 電腦上測試時可以用鍵盤方向鍵
    const onKey = e => {
      const m = { ArrowRight: 0, ArrowDown: 1, ArrowLeft: 2, ArrowUp: 3 }[e.key];
      if (m === undefined || view !== 'play' || round?.id !== 'tumble') return;
      e.preventDefault();
      answer(m, pad.querySelector(`[data-d="${'eswn'[m]}"]`));
    };
    GAMES.tumble.cleanup();
    document.addEventListener('keydown', onKey);
    GAMES.tumble._onKey = onKey;

    draw();
  },
  cleanup() {
    if (GAMES.tumble._onKey) document.removeEventListener('keydown', GAMES.tumble._onKey);
    GAMES.tumble._onKey = null;
  }
};
