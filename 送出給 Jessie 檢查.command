#!/bin/bash
# 點兩下就把今天的修改送出去給 Jessie 檢查。
# 送出不等於上線——Jessie 看過、按了合併，正式網站才會換版。
cd "$(dirname "$0")" || exit 1
clear
echo "  ┌──────────────────────────────────────────┐"
echo "  │  送出給 Jessie 檢查                       │"
echo "  └──────────────────────────────────────────┘"
echo ""
die() { echo ""; echo "  ✗ $1"; echo ""; read -n 1 -s -r -p "  按任意鍵關閉"; exit 1; }

command -v gh >/dev/null || die "這台電腦還沒設定好，先點兩下「設定這台電腦」。"
gh auth status >/dev/null 2>&1 || die "GitHub 沒登入，先點兩下「設定這台電腦」。"

if [ -z "$(git status --porcelain)" ]; then
  echo "  沒有任何修改，不用送出。"
  echo ""; read -n 1 -s -r -p "  按任意鍵關閉"; exit 0
fi

echo "  這次改了這些檔案："
git status --porcelain | sed 's/^/     /'
echo ""
read -r -p "  一句話說明改了什麼： " MSG
[ -z "$MSG" ] && MSG="更新內容"
echo ""

echo "  → 重新產生離線快取清單…"
python3 build-sw.py || die "build-sw.py 失敗。把這個畫面截圖傳給 Jessie。"

# 每次送出都開一條新的分支。這樣每一次送出都是獨立的一份，
# 不會跟上一次已經合併掉的東西纏在一起。
BR="edit-$(date +%Y%m%d-%H%M)"
echo "  → 整理成一份…"
git checkout -q -B "$BR" || die "分支建不起來。截圖傳給 Jessie。"
git add -A
git commit -q -m "$MSG" || die "存檔失敗。截圖傳給 Jessie。"

echo "  → 跟 Jessie 的最新版對齊…"
git fetch -q origin main || die "連不到 GitHub，檢查網路再試一次。"
if ! git rebase -q origin/main 2>/dev/null; then
  git rebase --abort 2>/dev/null
  die "你跟 Jessie 改到同一個地方了，我不敢自己決定留哪一份。
     你的修改都還在（在 $BR 這一份裡），什麼都沒丟。
     把這個畫面截圖傳給 Jessie。"
fi

echo "  → 送出…"
git push -q -u origin "$BR" || die "送不出去，檢查網路再試一次。"

URL=$(gh pr create --base main --head "$BR" --title "$MSG" \
        --body "從「送出給 Jessie 檢查」送出的修改。

請檢查：
- [ ] 五個關卡都還能玩
- [ ] 手機上版面沒有跑掉
- [ ] 文案裡沒有「治療」「矯正」「改善視力」這類字眼" 2>&1 | tail -1)

echo ""
if [[ "$URL" == https://* ]]; then
  echo "  ✓ 送出了。Jessie 會收到通知。"
  echo ""
  echo "    $URL"
  echo ""
  echo "  他看過按合併之後，正式網站大約一分鐘後更新："
  echo "    https://graylightai.github.io/eye-gym/"
  echo ""
  echo "  接下來可以直接關掉視窗。下次要改東西，點「開發」就會自動"
  echo "  回到最新版——不用做任何整理。"
else
  echo "  △ 檔案送上去了，但通知可能沒發出去："
  echo "    $URL"
  echo ""
  echo "  把這個畫面截圖傳給 Jessie，他看得到你的修改。"
fi
echo ""; read -n 1 -s -r -p "  按任意鍵關閉"
