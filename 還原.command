#!/bin/bash
# 改壞了？點兩下把所有檔案還原成上次上線的樣子。
cd "$(dirname "$0")" || exit 1
clear
echo "  ┌──────────────────────────────────────────┐"
echo "  │  還原成上次上線的版本                     │"
echo "  └──────────────────────────────────────────┘"
echo ""
if [ -z "$(git status --porcelain)" ]; then
  echo "  目前沒有未上線的修改，不需要還原。"
  echo ""; read -n 1 -s -r -p "  按任意鍵關閉"; exit 0
fi
echo "  下面這些修改會被丟掉，沒辦法救回來："
git status --porcelain | sed 's/^/     /'
echo ""
read -r -p "  確定要丟掉嗎？輸入 yes 再按 Enter： " A
if [ "$A" = "yes" ]; then
  git checkout -- . && git clean -fd
  echo ""; echo "  ✓ 已經還原。"
else
  echo ""; echo "  取消了，什麼都沒動。"
fi
echo ""; read -n 1 -s -r -p "  按任意鍵關閉"
