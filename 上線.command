#!/bin/bash
# 點兩下就把今天的修改送上線。
cd "$(dirname "$0")" || exit 1
clear
echo "  ┌──────────────────────────────────────────┐"
echo "  │  把修改送上線                             │"
echo "  └──────────────────────────────────────────┘"
echo ""
if [ -z "$(git status --porcelain)" ]; then
  echo "  沒有任何修改，不用上線。"
  echo ""; read -n 1 -s -r -p "  按任意鍵關閉"; exit 0
fi
echo "  這次改了這些檔案："
git status --porcelain | sed 's/^/     /'
echo ""
read -r -p "  一句話說明改了什麼（直接按 Enter 用預設）： " MSG
[ -z "$MSG" ] && MSG="更新內容"
echo ""
echo "  → 重新產生離線快取清單…"
python3 build-sw.py || { echo "  build-sw.py 失敗，先停下來。"; read -n 1 -s -r -p "  按任意鍵關閉"; exit 1; }
echo "  → 存檔…"
git add -A
git commit -q -m "$MSG" || { echo "  commit 失敗"; read -n 1 -s -r -p "  按任意鍵關閉"; exit 1; }
echo "  → 送上去…"
if git push -q origin main; then
  echo ""
  echo "  ✓ 上線了。網站大約一分鐘後更新："
  echo "    https://graylightai.github.io/eye-gym/"
  echo ""
  echo "  手機上已經加到主畫面的話，要關掉 app 再開一次才會換新版。"
else
  echo ""
  echo "  ✗ 送不上去。通常是因為另一個人也改了同樣的東西。"
  echo "    把這個畫面截圖傳給 Jessie。"
fi
echo ""; read -n 1 -s -r -p "  按任意鍵關閉"
