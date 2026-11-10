/* 目力練功房 Service Worker — 讓整個 app 離線可用（飛機、沒訊號、關網路都能玩）。
   策略：安裝時把全部檔案抓進快取，之後一律 cache-first。
   這是靜態 app，沒有任何要即時更新的內容，所以先吃快取是對的，也最快。
   版本字串由檔案內容雜湊產生：內容一改版本就變，新的 SW 會清掉舊快取。 */
const VERSION = '5636aafd7777';
const CACHE = 'eye-gym-' + VERSION;
const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "fonts.css",
  "css/app.css",
  "css/games.css",
  "css/tokens.css",
  "js/content.js",
  "js/draw.js",
  "js/engine.js",
  "js/game-gap.js",
  "js/game-maze.js",
  "js/game-pile.js",
  "js/game-same.js",
  "js/game-schulte.js",
  "js/games.js",
  "js/state.js",
  "js/ui.js",
  "js/util.js",
  "img/alien.png",
  "img/ant.png",
  "img/apple.png",
  "img/badger.png",
  "img/balloon.png",
  "img/banana.png",
  "img/batx.png",
  "img/bear.png",
  "img/beaver.png",
  "img/bee.png",
  "img/beetle.png",
  "img/bird.png",
  "img/blossom.png",
  "img/blowfish.png",
  "img/boar.png",
  "img/butterfly.png",
  "img/camel.png",
  "img/cat.png",
  "img/caterpillar.png",
  "img/cherries.png",
  "img/chick.png",
  "img/chicken.png",
  "img/circle.png",
  "img/coconut.png",
  "img/cookie.png",
  "img/cow.png",
  "img/crab.png",
  "img/cricket.png",
  "img/crocodile.png",
  "img/cupcake.png",
  "img/deer.png",
  "img/diamond.png",
  "img/dino.png",
  "img/dog.png",
  "img/dolphin.png",
  "img/dragon.png",
  "img/duck.png",
  "img/elephant.png",
  "img/elf.png",
  "img/eyes.png",
  "img/fairy.png",
  "img/fish.png",
  "img/flamingo.png",
  "img/fox.png",
  "img/frog.png",
  "img/ghost.png",
  "img/giraffe.png",
  "img/goat.png",
  "img/grapes.png",
  "img/hamster.png",
  "img/heart.png",
  "img/hedgehog.png",
  "img/hippo.png",
  "img/horse.png",
  "img/invader.png",
  "img/kangaroo.png",
  "img/kiwi.png",
  "img/koala.png",
  "img/ladybug.png",
  "img/lemon.png",
  "img/lion.png",
  "img/lizard.png",
  "img/llama.png",
  "img/lobster.png",
  "img/mammoth.png",
  "img/mango.png",
  "img/melon.png",
  "img/mermaid.png",
  "img/monkey.png",
  "img/mouse.png",
  "img/mushroom.png",
  "img/n0.png",
  "img/n1.png",
  "img/n2.png",
  "img/n3.png",
  "img/n4.png",
  "img/n5.png",
  "img/n6.png",
  "img/n7.png",
  "img/n8.png",
  "img/n9.png",
  "img/octopus.png",
  "img/orange.png",
  "img/otter.png",
  "img/owl.png",
  "img/panda.png",
  "img/parrot.png",
  "img/peach.png",
  "img/peacock.png",
  "img/pear.png",
  "img/penguin.png",
  "img/pig.png",
  "img/pineapple.png",
  "img/pumpkin.png",
  "img/rabbit.png",
  "img/raccoon.png",
  "img/rainbow.png",
  "img/rhino.png",
  "img/robot.png",
  "img/rooster.png",
  "img/sauropod.png",
  "img/seal.png",
  "img/shark.png",
  "img/sheep.png",
  "img/shrimp.png",
  "img/skunk.png",
  "img/sloth.png",
  "img/snail.png",
  "img/snake.png",
  "img/snowman.png",
  "img/square.png",
  "img/squid.png",
  "img/squirrel.png",
  "img/star.png",
  "img/strawberry.png",
  "img/superhero.png",
  "img/swan.png",
  "img/teddy.png",
  "img/tiger.png",
  "img/tomato.png",
  "img/triangle.png",
  "img/turkey.png",
  "img/turtle.png",
  "img/unicorn.png",
  "img/watermelon.png",
  "img/whale.png",
  "img/wizard.png",
  "img/wolf.png",
  "img/worm.png",
  "img/zebra.png",
  "fonts/v17-X7n64b87HvSqjb-WIi2yDCRwoQ-k7367-DWu89XgHPyh.woff2",
  "fonts/v20-F63fjptAgt5VM-kVkqdyU8n1i8q131nj-o.woff2",
  "fonts/v20-F6qfjptAgt5VM-kVkqdyU8n3vAOwlBFgsAXHNk.woff2"
];

self.addEventListener('install', e => {
  // 逐一塞，單一檔案失敗不會讓整包安裝失敗
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(ASSETS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('eye-gym-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;   // 不碰外部資源

  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch (err) {
      // 離線又沒快取：導覽請求一律回首頁，其他的就讓它失敗
      if (req.mode === 'navigate') {
        const home = await caches.match('index.html');
        if (home) return home;
      }
      throw err;
    }
  })());
});
