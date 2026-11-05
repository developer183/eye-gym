#!/bin/bash
# 點兩下就開始工作：先抓最新版，再開一個本機網站（電腦和手機都能看）。
cd "$(dirname "$0")" || exit 1
clear
echo "  ┌──────────────────────────────────────────┐"
echo "  │  目力練功房 · 開發中                      │"
echo "  └──────────────────────────────────────────┘"
echo ""

# ---- 先把別人的最新版抓下來 ----
# 手上還有沒送出的改動就不要動分支，免得把她的東西弄丟。
if [ -n "$(git status --porcelain)" ]; then
  echo "  你還有沒送出的改動，這次不抓新版（免得衝突）："
  git status --porcelain | sed 's/^/     /'
  echo ""
else
  echo "  → 抓最新版…"
  git fetch -q origin 2>/dev/null
  git checkout -q main 2>/dev/null
  if git merge-base --is-ancestor HEAD origin/main 2>/dev/null; then
    git merge -q --ff-only origin/main 2>/dev/null && echo "     已經是最新版"
  else
    echo "     （離線或抓不到，用電腦上現有的版本）"
  fi
  # 已經合併掉的舊分支清一清，不然列表會越來越長
  for b in $(git branch --format='%(refname:short)' | grep '^edit-' 2>/dev/null); do
    git merge-base --is-ancestor "$b" origin/main 2>/dev/null && git branch -q -D "$b" 2>/dev/null
  done
  echo ""
fi

# ---- 起本機網站 ----
PORT=8800
while lsof -ti tcp:$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)

echo "  改完檔案存檔後，回到瀏覽器按 ⌘R 就看得到。"
echo ""
echo "  這台電腦：  http://localhost:$PORT"
if [ -n "$IP" ]; then
  echo "  手機上看：  http://$IP:$PORT"
  echo ""
  python3 - "$IP" "$PORT" <<'PYQR' 2>/dev/null
import sys
try:
    import segno
    q = segno.make(f"http://{sys.argv[1]}:{sys.argv[2]}", error='l')
    m = [[bool(v) for v in row] for row in q.matrix]
    B = 3                                                  # 靜空區，規範要 4，3 格實測夠用
    w = len(m[0]) + B * 2
    g = ([[False] * w for _ in range(B)]
         + [[False] * B + r + [False] * B for r in m]
         + [[False] * w for _ in range(B)])
    if len(g) % 2: g.append([False] * w)
    CH = {(0, 0): ' ', (1, 0): '\u2580', (0, 1): '\u2584', (1, 1): '\u2588'}
    for y in range(0, len(g), 2):
        # 強制黑字白底：終端機配色是深底還是淺底都一樣掃得到
        print('  \x1b[30;47m'
              + ''.join(CH[(int(a), int(b))] for a, b in zip(g[y], g[y + 1]))
              + '\x1b[0m')
    print()
    print("  \u2191 \u7528\u624b\u6a5f\u76f8\u6a5f\u6383\u9019\u500b\u5c31\u6253\u958b\u4e86\uff08\u8981\u8ddf\u96fb\u8166\u9023\u540c\u4e00\u500b Wi-Fi\uff09")
except Exception:
    print("  \u624b\u6a5f\u76f4\u63a5\u5728\u700f\u89bd\u5668\u6253\u4e0a\u9762\u90a3\u500b\u7db2\u5740\u5c31\u597d")
PYQR
  echo ""
  echo "  注意：手機上這樣看，「加到主畫面」和離線功能不會動——"
  echo "        那兩個要等送出、Jessie 合併之後在正式網址上才測得到。"
else
  echo "  （抓不到區網位址，手機這次連不到；電腦上還是能看）"
fi
echo ""
echo "  改完了：關掉這個視窗，點兩下「送出給 Jessie 檢查」。"
echo "  要停止：按 Control + C，或直接關掉這個視窗。"
echo ""
( sleep 1; open "http://localhost:$PORT" ) &
python3 -m http.server $PORT --bind 0.0.0.0
