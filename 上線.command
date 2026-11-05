#!/bin/bash
# Jessie 用的：把自己的修改送上線。也走 PR，所以線上版永遠有一次 diff 把關。
cd "$(dirname "$0")" || exit 1
clear
echo "  ┌──────────────────────────────────────────┐"
echo "  │  上線（走 PR）                            │"
echo "  └──────────────────────────────────────────┘"
echo ""
die() { echo ""; echo "  ✗ $1"; echo ""; read -n 1 -s -r -p "  按任意鍵關閉"; exit 1; }

if [ -z "$(git status --porcelain)" ]; then
  echo "  沒有任何修改。"
  echo ""; read -n 1 -s -r -p "  按任意鍵關閉"; exit 0
fi
git status --porcelain | sed 's/^/     /'
echo ""
read -r -p "  commit 訊息： " MSG
[ -z "$MSG" ] && die "要寫訊息。"

echo ""
echo "  → build-sw.py…"
python3 build-sw.py || die "build-sw.py 失敗。"

BR="j-$(date +%Y%m%d-%H%M)"
git checkout -q -B "$BR" || die "分支建不起來。"
git add -A
git commit -q -m "$MSG" || die "commit 失敗。"
git fetch -q origin main || die "連不到 GitHub。"
git rebase -q origin/main 2>/dev/null || { git rebase --abort 2>/dev/null; die "rebase 衝突，手動處理。"; }
git push -q -u origin "$BR" || die "push 失敗。"

URL=$(gh pr create --base main --head "$BR" --title "$MSG" --body "$MSG" 2>&1 | tail -1)
[[ "$URL" == https://* ]] || die "PR 開不起來：$URL"
echo "  → $URL"
echo ""
read -r -p "  直接合併上線嗎？（y＝合併，n＝留著等一下再看）： " C
if [ "$C" = "y" ]; then
  gh pr merge --squash --delete-branch "$URL" || die "合併失敗。"
  git checkout -q main; git pull -q --ff-only origin main
  echo ""
  echo "  ✓ 上線了。約一分鐘後更新：https://graylightai.github.io/eye-gym/"
  echo "  手機上已加到主畫面的話，要把 app 完全關掉再開。"
else
  echo ""
  echo "  留在 PR 裡了，之後用「檢查」合併。"
fi
echo ""; read -n 1 -s -r -p "  按任意鍵關閉"
