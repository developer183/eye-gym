#!/bin/bash
# 把這一個檔案傳到新電腦（AirDrop／郵件都可以），放到桌面，點兩下。
# 它會把整個專案下載到桌面，之後就不需要這個檔案了。
clear
echo "  ┌──────────────────────────────────────────┐"
echo "  │  把目力練功房下載到這台電腦                │"
echo "  └──────────────────────────────────────────┘"
echo ""
DEST="$HOME/Desktop/目力練功房"
REPO="https://github.com/graylightai/eye-gym.git"

if ! command -v git >/dev/null; then
  echo "  這台電腦還沒有 git，要先裝（Mac 內建的，只是沒開啟）。"
  echo ""
  echo "  → 會跳出一個「安裝命令列開發者工具」的視窗，按「安裝」，"
  echo "    等它跑完（約 5 分鐘），然後再點兩下這個檔案一次。"
  echo ""
  xcode-select --install 2>/dev/null
  read -n 1 -s -r -p "  按任意鍵關閉"; exit 0
fi

if [ -d "$DEST/.git" ]; then
  echo "  桌面上已經有「目力練功房」了，不用重新下載。"
  echo ""
  echo "  → 直接點兩下裡面的「設定這台電腦」。"
  echo ""
  open "$DEST"
  read -n 1 -s -r -p "  按任意鍵關閉"; exit 0
fi
if [ -e "$DEST" ]; then
  echo "  ✗ 桌面上有一個同名的東西，但它不是從 GitHub 下載的。"
  echo "    先把它改名或移走，再點兩下這個檔案。"
  echo ""; read -n 1 -s -r -p "  按任意鍵關閉"; exit 1
fi

echo "  → 下載中（約 1 MB，十幾秒）…"
echo ""
if git clone "$REPO" "$DEST" 2>&1 | sed 's/^/     /'; then
  echo ""
  echo "  ✓ 下載好了，在桌面上的「目力練功房」。"
  echo ""
  echo "  接下來兩件事："
  echo "    1. 點兩下裡面的「設定這台電腦」（只要做一次）"
  echo "    2. 看一次「給太太的說明.html」"
  echo ""
  echo "  第一次點這些檔案時，Mac 可能會說「無法打開，因為來自未識別的開發者」。"
  echo "  按「取消」，到 系統設定 → 隱私權與安全性，往下找到那一行按「仍要打開」。"
  echo ""
  open "$DEST"
  ( sleep 1; open "$DEST/給太太的說明.html" ) &
else
  echo ""
  echo "  ✗ 下載失敗。檢查網路，或把這個畫面截圖傳給 Jessie。"
fi
echo ""; read -n 1 -s -r -p "  按任意鍵關閉"
