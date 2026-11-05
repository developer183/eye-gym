#!/bin/bash
# 點兩下就開始工作：開一個本機網站，然後打開瀏覽器。
# 改完檔案存檔後，回到瀏覽器按重新整理就看得到。
cd "$(dirname "$0")" || exit 1
PORT=8800
while lsof -ti tcp:$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done
clear
cat <<'TXT'
  ┌──────────────────────────────────────────┐
  │  目力練功房 · 開發中                      │
  └──────────────────────────────────────────┘

  瀏覽器會自己打開。改完檔案存檔後，回到瀏覽器
  按 ⌘R 重新整理就看得到新的樣子。

  做完要上線的話：關掉這個視窗，點兩下「上線」。
  要停止：按 Control + C，或直接關掉這個視窗。

TXT
echo "  網址：http://localhost:$PORT"
echo ""
( sleep 1; open "http://localhost:$PORT" ) &
python3 -m http.server $PORT --bind 127.0.0.1
