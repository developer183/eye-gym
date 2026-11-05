#!/bin/bash
# 改壞了？點兩下把所有檔案還原成「正式網站上現在那一版」。
# 只會動程式檔案，不會動到小孩手機上的練習紀錄。
cd "$(dirname "$0")" || exit 1
clear
echo "  ┌──────────────────────────────────────────┐"
echo "  │  還原成正式網站上的版本                    │"
echo "  └──────────────────────────────────────────┘"
echo ""
DIRTY=$(git status --porcelain)
BR=$(git rev-parse --abbrev-ref HEAD)
if [ -z "$DIRTY" ] && [ "$BR" = "main" ]; then
  echo "  目前就是正式網站上那一版，沒有東西要還原。"
  echo ""; read -n 1 -s -r -p "  按任意鍵關閉"; exit 0
fi
if [ -n "$DIRTY" ]; then
  echo "  下面這些還沒送出的修改會被丟掉，沒辦法救回來："
  git status --porcelain | sed 's/^/     /'
else
  echo "  目前在「$BR」這一份上（已經送出過的修改）。"
  echo "  還原之後會回到正式網站那一版。已經送出的那一份還在 GitHub 上，不會消失。"
fi
echo ""
read -r -p "  確定嗎？輸入 yes 再按 Enter： " A
if [ "$A" = "yes" ]; then
  git checkout -- . 2>/dev/null; git clean -fdq 2>/dev/null
  git fetch -q origin main 2>/dev/null
  git checkout -q main 2>/dev/null
  git merge -q --ff-only origin/main 2>/dev/null
  echo ""; echo "  ✓ 已經還原成正式網站那一版。"
else
  echo ""; echo "  取消了，什麼都沒動。"
fi
echo ""; read -n 1 -s -r -p "  按任意鍵關閉"
