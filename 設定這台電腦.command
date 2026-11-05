#!/bin/bash
# 新電腦第一次用，點兩下這個。只需要做一次。
cd "$(dirname "$0")" || exit 1
clear
echo "  ┌──────────────────────────────────────────┐"
echo "  │  設定這台電腦（只需要做一次）              │"
echo "  └──────────────────────────────────────────┘"
echo ""
FAIL=0

step() { printf "  %-26s" "$1"; }
ok()   { echo "✓ $1"; }
no()   { echo "✗ $1"; FAIL=1; }

step "檢查 git"
if command -v git >/dev/null; then ok "$(git --version | awk '{print $3}')"
else no "沒有安裝"; echo "     → 開終端機輸入：xcode-select --install"; fi

step "檢查 python3"
if command -v python3 >/dev/null; then ok "$(python3 -V | awk '{print $2}')"
else no "沒有安裝"; echo "     → 到 python.org 下載安裝"; fi

step "檢查 gh（GitHub 工具）"
if command -v gh >/dev/null; then ok "$(gh --version | head -1 | awk '{print $3}')"
else
  echo "還沒有"
  if command -v brew >/dev/null; then
    echo ""
    read -r -p "     要現在幫你裝嗎？（y／直接 Enter 跳過）： " YN
    if [ "$YN" = "y" ]; then
      echo "     → 安裝中，大約一兩分鐘…"
      brew install gh >/dev/null 2>&1
      command -v gh >/dev/null && echo "     ✓ 裝好了" || { echo "     ✗ 裝不起來"; FAIL=1; }
    else FAIL=1; fi
  else
    FAIL=1
    echo ""
    echo "     → 瀏覽器會打開 cli.github.com，下載那個 macOS 的安裝檔（.pkg），"
    echo "       點兩下照著按完，然後再點兩下「設定這台電腦」一次。"
    ( sleep 2; open "https://cli.github.com" ) &
  fi
fi

if command -v gh >/dev/null; then
  step "GitHub 有沒有登入"
  if gh auth status >/dev/null 2>&1; then ok "$(gh api user --jq .login 2>/dev/null)"
  else
    echo "還沒"
    echo ""
    echo "  現在幫你登入，照著問題選就好："
    echo "    Where do you use GitHub?   → GitHub.com"
    echo "    What is your preferred…    → HTTPS"
    echo "    Authenticate Git…          → Y"
    echo "    How would you like…        → Login with a web browser"
    echo ""
    read -n 1 -s -r -p "  按任意鍵開始登入"
    echo ""
    gh auth login || FAIL=1
  fi
fi

# 名字和信箱：commit 歷史是公開的，用 GitHub 的 noreply 信箱比較好
if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  LOGIN=$(gh api user --jq .login 2>/dev/null)
  UID_=$(gh api user --jq .id 2>/dev/null)
  step "設定 commit 署名"
  if [ -n "$LOGIN" ]; then
    git config user.name "$LOGIN"
    git config user.email "${UID_}+${LOGIN}@users.noreply.github.com"
    ok "$LOGIN（信箱用 GitHub 的 noreply，不會外流）"
  else no "抓不到帳號"; fi
fi

step "裝 QR code 工具"
if python3 -c "import segno" 2>/dev/null; then ok "已經有了"
else
  if pip3 install --user --quiet segno 2>/dev/null && python3 -c "import segno" 2>/dev/null; then ok "裝好了"
  else echo "△ 裝不起來（不影響，只是手機要自己打網址）"; fi
fi

step "檢查這個資料夾"
if git rev-parse --git-dir >/dev/null 2>&1; then
  ok "$(git config --get remote.origin.url | sed 's#.*/##')"
else
  no "這不是從 GitHub 下載下來的資料夾"
  echo "     → 用「安裝到新電腦.command」重新下載一份，不要用複製貼上的資料夾"
fi

echo ""
if [ "$FAIL" = "0" ]; then
  echo "  ✓ 都設定好了。以後就只要用這三個："
  echo ""
  echo "      開發.command                要改東西的時候"
  echo "      送出給 Jessie 檢查.command   改完了"
  echo "      還原.command                改壞了"
  echo ""
  echo "  先看一次「給太太的說明.html」（點兩下就會用瀏覽器打開）。"
else
  echo "  ✗ 上面有幾項沒過，把這個畫面截圖傳給 Jessie。"
fi
echo ""; read -n 1 -s -r -p "  按任意鍵關閉"
