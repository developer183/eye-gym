'use strict';

/* =======================================================================
   目力練功房
   每天一次的近距離精細目力練習。核心有三件事：
   1. 今天該練多久、遮哪隻眼 —— 照醫囑，app 負責排關卡與計時
   2. 視標大小自動找 —— 用正確率與反應時間往她的能力邊界逼
   3. 回診時給得出數字 —— 趨勢比單次分數有用
   資料只存在這台裝置，沒有帳號、沒有上傳、沒有任何對外連線。
   ======================================================================= */
const $ = s => document.querySelector(s);
const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uniq = a => [...new Set(a)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function load(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const DAY = 864e5;
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const dayAgo = n => new Date(Date.now() - n * DAY - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
