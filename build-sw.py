#!/usr/bin/env python3
"""改過 index.html 或 img/ 之後跑這支，重新產生 sw.js。

版本字串取自所有檔案內容的雜湊：內容一變版本就變，使用者下次開啟時
新的 Service Worker 會接手並清掉舊快取。不跑這支的話，改動不會送到
已經裝在主畫面上的 app。
"""
import os, hashlib, json

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

# 說明書和點兩下的腳本是給開發用的，不進 app 的離線快取
assets = ['./', 'index.html', 'manifest.json', 'fonts.css']
assets += sorted('css/' + f for f in os.listdir('css') if f.endswith('.css'))
assets += sorted('js/' + f for f in os.listdir('js') if f.endswith('.js'))
assets += sorted('img/' + f for f in os.listdir('img') if f.endswith('.png'))
assets += sorted('fonts/' + f for f in os.listdir('fonts') if f.endswith('.woff2'))

h = hashlib.sha256()
for a in assets:
    if a != './':
        h.update(open(a, 'rb').read())
ver = h.hexdigest()[:12]

tpl = open('sw.js', encoding='utf-8').read()
import re
tpl = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{ver}';", tpl, count=1)
tpl = re.sub(r"const ASSETS = \[.*?\n\];", "const ASSETS = " + json.dumps(assets, indent=2, ensure_ascii=False) + ";",
             tpl, count=1, flags=re.S)
open('sw.js', 'w', encoding='utf-8').write(tpl)

size = sum(os.path.getsize(a) for a in assets if a != './')
print(f"sw.js 更新：{len(assets)} 個檔案、{size/1024:.0f} KB、版本 {ver}")
