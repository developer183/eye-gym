#!/bin/bash
# Jessie 用的：看她送來的修改，決定要不要上線。
cd "$(dirname "$0")" || exit 1
PAGE="https://graylightai.github.io/eye-gym/"
while true; do
clear
echo "  ┌──────────────────────────────────────────┐"
echo "  │  待檢查的修改                             │"
echo "  └──────────────────────────────────────────┘"
echo ""
LIST=$(gh pr list --base main --json number,title,author,additions,deletions,updatedAt \
        --template '{{range .}}{{.number}}  {{.title}}  ({{.author.login}} +{{.additions}}/-{{.deletions}}){{"\n"}}{{end}}' 2>&1)
if [ -z "$LIST" ]; then
  echo "  目前沒有待檢查的修改。"
  echo ""; read -n 1 -s -r -p "  按任意鍵關閉"; exit 0
fi
echo "$LIST" | sed 's/^/     /'
echo ""
read -r -p "  要看哪一號？（直接 Enter 離開）： " N
[ -z "$N" ] && exit 0

while true; do
  clear
  gh pr view "$N" --json title,author,files \
    --template '  #{{"'"$N"'"}}  {{.title}}（{{.author.login}}）{{"\n\n"}}  改到的檔案：{{"\n"}}{{range .files}}     {{.path}}  +{{.additions}}/-{{.deletions}}{{"\n"}}{{end}}' 2>/dev/null
  echo ""
  echo "     d  看完整 diff          p  在本機跑起來看"
  echo "     m  合併上線             r  退回去（寫一句原因）"
  echo "     b  回上一層"
  echo ""
  read -n 1 -r -p "  選一個： " A; echo ""
  case "$A" in
    d) gh pr diff "$N" | ${PAGER:-less -R} ;;
    p)
       echo ""
       CUR=$(git rev-parse --abbrev-ref HEAD)
       gh pr checkout "$N" -f || { read -n 1 -s -r -p "  切不過去，按任意鍵"; continue; }
       PORT=8900; while lsof -ti tcp:$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done
       echo ""
       echo "  她的版本跑在 http://localhost:$PORT　（Control+C 結束，會自動切回 $CUR）"
       IP=$(ipconfig getifaddr en0 2>/dev/null); [ -n "$IP" ] && echo "  手機上看： http://$IP:$PORT"
       echo ""
       ( sleep 1; open "http://localhost:$PORT" ) &
       python3 -m http.server $PORT --bind 0.0.0.0
       git checkout -q "$CUR" 2>/dev/null
       ;;
    m)
       echo ""
       read -r -p "  確定合併上線？輸入 y： " C
       if [ "$C" = "y" ]; then
         if gh pr merge "$N" --squash --delete-branch; then
           echo ""; echo "  ✓ 合併了。約一分鐘後上線： $PAGE"
           git checkout -q main 2>/dev/null; git pull -q --ff-only origin main 2>/dev/null
         else echo "  ✗ 合併失敗（上面有原因）"; fi
         echo ""; read -n 1 -s -r -p "  按任意鍵"; break
       fi
       ;;
    r)
       echo ""
       read -r -p "  退回的原因： " WHY
       [ -n "$WHY" ] && gh pr comment "$N" --body "$WHY" && echo "  已經留言給她了。"
       echo ""; read -n 1 -s -r -p "  按任意鍵"; break
       ;;
    b|"") break ;;
  esac
done
done
