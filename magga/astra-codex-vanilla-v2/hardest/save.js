/* Pure save boundary, shared by the browser and offline corruption checks. */
(function(root){
 'use strict';
 function clean(raw){
  const save={unlocked:1,best:{},deaths:0,mute:false,volume:.6,music:true};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return save;
  if(Number.isInteger(raw.unlocked))save.unlocked=Math.max(1,Math.min(114,raw.unlocked));
  if(Number.isInteger(raw.deaths)&&raw.deaths>=0)save.deaths=Math.min(1e9,raw.deaths);
  save.mute=raw.mute===true;save.music=raw.music!==false;
  if(Number.isFinite(raw.volume))save.volume=Math.max(0,Math.min(1,raw.volume));
  if(raw.best&&typeof raw.best==='object')for(const [id,b] of Object.entries(raw.best)){
   if(!/^\d+$/.test(id)||+id<1||+id>114||!b||!Number.isInteger(b.deaths)||b.deaths<0||!Number.isFinite(b.time)||b.time<=0)continue;
   save.best[id]={deaths:b.deaths,time:b.time,medal:b.deaths===0?'gold':b.deaths<=2?'silver':'bronze'};
  }
  return save;
 }
 root.RedlineSave=Object.freeze({clean});
})(globalThis);
