'use strict';
/* 五個關卡登記在這裡。每一關自己一個檔案，兩個人同時改不同關卡不會衝突。
   關卡要提供：name / desc / tag / rounds / thumb() / render(field, api)
   render 裡用 api.pass() 答對、api.miss() 答錯、api.setTotal(n) 改題數。 */
const GAMES = {};
