/* Bastion Afterdark — independent art/content, mechanics reconciled from checkpoint arena.
   Authored tuning is documented in ship-records/boxhead.md. No assets or network. */
(() => {
'use strict';
const $=s=>document.querySelector(s), canvas=$('#game'), ctx=canvas.getContext('2d',{alpha:false});
const W=640,H=400, clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const save=(k,v)=>{try{localStorage.setItem('bastion:'+k,JSON.stringify(v))}catch{}};
const load=(k,v)=>{try{return JSON.parse(localStorage.getItem('bastion:'+k))??v}catch{return v}};
const defaults=[{up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',fire:'Space',cycle:'KeyQ'},{up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',fire:'Numpad0',cycle:'NumpadDecimal'}];
const reservedKeys=new Set(['Escape','KeyP','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Tab','F5','KeyI','KeyJ','KeyK','KeyL','Numpad4','Numpad5','Numpad6','Numpad8']);
const bindableKey=code=>typeof code==='string'&&!reservedKeys.has(code)&&/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Numpad([0-9]|Decimal|Add|Subtract|Multiply|Divide|Enter|Equal)|F([1-9]|1[0-2])|(Shift|Control)(Left|Right)|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|Backspace|Delete|Insert|Home|End|PageUp|PageDown|CapsLock)$/.test(code);
const rawKeys=load('keys',null);
let binds=defaults.map((base,i)=>Object.fromEntries(Object.entries(base).map(([action,key])=>{const saved=rawKeys?.[i]?.[action];return[action,saved==='Unbound'||bindableKey(saved)?saved:key]})));
const rawOptions=load('options',{}),validOptions=rawOptions&&typeof rawOptions==='object'?rawOptions:{};
let options={volume:.7,music:.45,mute:false,touch:false,shake:!matchMedia('(prefers-reduced-motion: reduce)').matches,...validOptions};
for(const k of ['volume','music'])options[k]=Number.isFinite(options[k])?clamp(options[k],0,1):(k==='volume'?.7:.45);
for(const k of ['mute','touch','shake'])options[k]=typeof options[k]==='boolean'?options[k]:k==='shake';
const rawRecords=load('records',{}),records={best:0,wave:0,kills:0,runs:0};for(const k in records){const n=rawRecords?.[k];if(Number.isSafeInteger(n)&&n>=0)records[k]=Math.min(n,1e12)}
const ROOMS=[
{name:'Freight Yard',tag:'Open lanes. Room to breathe.',obstacles:[{x:200,y:140,w:60,h:40},{x:380,y:220,w:60,h:40}],barrels:[{x:150,y:300},{x:500,y:110},{x:176,y:300}],spawn:[{x:320,y:200},{x:220,y:200}],color:'#26372b'},
{name:'The Foundry',tag:'Four pillars. Hold the corners.',obstacles:[{x:140,y:110,w:36,h:36},{x:464,y:110,w:36,h:36},{x:140,y:254,w:36,h:36},{x:464,y:254,w:36,h:36}],barrels:[{x:320,y:110},{x:320,y:300},{x:346,y:300}],spawn:[{x:320,y:200},{x:320,y:300}],color:'#342f28'},
{name:'Switchback',tag:'Tight routes. Chain the fuel.',obstacles:[{x:156,y:96,w:100,h:28},{x:384,y:96,w:100,h:28},{x:268,y:190,w:104,h:28},{x:156,y:284,w:100,h:28},{x:384,y:284,w:100,h:28}],barrels:[{x:116,y:206},{x:140,y:206},{x:164,y:206},{x:508,y:206},{x:532,y:206}],spawn:[{x:320,y:150},{x:320,y:260}],color:'#233334'}
];
const WEAPONS=[
{name:'Sidearm',delay:.30,damage:1,speed:450,shots:1,spread:0,cost:1,unlock:1},
{name:'Scattergun',delay:.55,damage:1,speed:390,shots:5,spread:.105,cost:2,unlock:4},
{name:'Needler',delay:.105,damage:.8,speed:500,shots:1,spread:.025,cost:1,unlock:8},
{name:'Grenadier',delay:.8,damage:7,speed:235,shots:1,spread:0,cost:3,unlock:14,blast:60},
{name:'Lance',delay:.44,damage:4,speed:660,shots:1,spread:0,cost:2,unlock:22,pierce:5},
{name:'Siegebreaker',delay:.85,damage:11,speed:300,shots:1,spread:0,cost:4,unlock:32,blast:83}
];
class Sound {
 constructor(){this.ctx=null;this.next=0;this.step=0;this.cues={};}
 wake(){if(!this.ctx){try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.comp=this.ctx.createDynamicsCompressor();this.master.connect(this.comp);this.comp.connect(this.ctx.destination);this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*.5,this.ctx.sampleRate);const a=this.noise.getChannelData(0);let seed=17;for(let i=0;i<a.length;i++){seed=(seed*16807)%2147483647;a[i]=seed/1073741824-1}}catch{}}if(this.ctx?.state==='suspended')this.ctx.resume();this.mix();}
 mix(){if(this.ctx)this.master.gain.setTargetAtTime(options.mute?0:options.volume*.55,this.ctx.currentTime,.02)}
 tone(f,end,dur,gain,wave='square',delay=0){if(!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=wave;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+dur+.01);}
 burst(dur,gain,freq){if(!this.ctx)return;const t=this.ctx.currentTime,s=this.ctx.createBufferSource(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();s.buffer=this.noise;f.type='lowpass';f.frequency.value=freq;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(this.master);s.start();s.stop(t+dur)}
 play(id,n=0){this.cues[id]=(this.cues[id]||0)+1;if(!this.ctx)return;
  if(id==='shot'){const w=n;this.tone(w===2?880:w===1?95:420,w===2?440:70,w===2?.035:w===1?.14:.07,w===1?.22:.12,w===1?'sawtooth':'square');if(w!==2)this.burst(w===1?.14:.06,w===1?.24:.10,2400)}
  else if(id==='explode'){this.tone(110,38,.42,.3,'sawtooth');this.burst(.35,.4,800)}
  else if(id==='hurt'){this.tone(300,120,.09,.22,'sawtooth');this.burst(.09,.15,800)}
  else if(id==='hit')this.tone(160,70,.06,.055,'triangle');
  else if(id==='pickup')this.tone(660,990,.09,.16);
  else if(id==='empty')this.tone(180,90,.025,.08);
  else if(id==='death'){[196,155,131,98].forEach((f,i)=>this.tone(f,f*.8,.24,.18,'sawtooth',i*.12))}
  else if(id==='unlock'||id==='wave'){[262,330,392,524].forEach((f,i)=>this.tone(f,f,.13,.10,'square',i*.065))}
  else if(id==='special')this.tone(200,600,.28,.10);
  else this.tone(520,780,.07,.09);
 }
 tick(){if(!this.ctx||options.mute||options.music===0||state==='paused'||state==='settings')return;const now=this.ctx.currentTime;if(now<this.next)return;const combat=state==='playing',dur=60/(combat?128:100)/2;this.next=now+dur;const step=this.step++%32,base=mode==='deathmatch'?73.42:65.41;const pattern=[0,0,7,0,0,3,7,10],note=base*2**(pattern[Math.floor(step/4)%8]/12),g=options.music;
 this.tone(note,note,dur*.8,.13*g,'triangle');if(step%4===0)this.tone(85,38,.1,.11*g,'sine');if(combat&&step%2)this.burst(.023,.027*g,3500);if(step%4===2)this.tone(note*4,note*4,.13,.045*g,'square');
 }
}
const audio=new Sound();
let state='title',priorState='title',mode='solo',roomIndex=0,room=ROOMS[0],players=[],enemies=[],bullets=[],crates=[],barrels=[],particles=[],blasts=[],stains=[];
let wave=0,score=0,mult=1,multTime=0,peak=1,unlocked=0,queue=[],spawnTimer=0,breakTime=0,crateTimer=6,time=0,kills=0,shake=0,toastTime=0,toastText='',seed=749,enemyId=0,dmTime=180,navTimer=0,flow=[];
let maxEnemies=0,frameCount=0,hudTimer=0,bindCapture=null;
const keys=new Set(),pad=[{x:0,y:0,fire:false},{x:0,y:0,fire:false}],pointer={x:320,y:200,down:false,aim:false};
const rnd=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
const isTouch=()=>options.touch||matchMedia('(pointer: coarse)').matches;
function clearInput(){keys.clear();pointer.down=false;for(const p of pad){p.x=0;p.y=0;p.fire=false}document.querySelectorAll('.stick span').forEach(n=>n.style.transform='');}
function setState(s){state=s;$('#panel').dataset.state=s;clearInput();$('#hud').hidden=!['playing','paused','over'].includes(s);$('#panel').hidden=s==='playing';$('#touch').hidden=s!=='playing'||!isTouch();document.querySelector('.touch-half[data-player="1"]').hidden=mode==='solo';$('#pause').disabled=!['playing','paused'].includes(s);$('#toast').textContent='';}
function toast(text,duration=2.6){toastText=text;toastTime=duration;}
function keyLabel(k){return k.replace('Key','').replace('Digit','').replace('Arrow','').replace('Numpad','Num ')}
function button(text,action,cls=''){return '<button class="'+cls+'" data-action="'+action+'">'+text+'</button>'}
function title(){setState('title');$('#panel').innerHTML='<div class="eyebrow">THE NIGHT SHIFT NEVER ENDS</div><h1>BASTION<br><em>AFTERDARK</em></h1><p>Hold your ground. Feed the streak. Bring a friend.</p><div class="choices">'+button('<span class="mode-no">01 / SURVIVAL</span><b>Solo survivor</b><small>One defender. Endless waves.<br>How long can you hold?</small>','solo')+button('<span class="mode-no">02 / TWO PLAYERS</span><b>Local co-op</b><small>Share a keyboard or tablet.<br>Survive together.</small>','coop')+button('<span class="mode-no">03 / TWO PLAYERS</span><b>Deathmatch</b><small>First to five. Three minutes.<br>Settle it in the yard.</small>','deathmatch')+'</div><div class="menu-bottom">'+button('FIELD MANUAL','help')+button('SETTINGS','settings')+'</div><div class="best">PERSONAL BEST '+records.best.toLocaleString()+' / WAVE '+records.wave+'</div>'}
function chooseRoom(m){mode=m;setState('room');$('#panel').innerHTML='<div class="eyebrow">'+(m==='solo'?'SOLO SURVIVAL':m==='coop'?'LOCAL CO-OP':'LOCAL DEATHMATCH')+'</div><h2>Choose your ground</h2><p>Every room is open. Every route is yours.</p><div class="choices">'+ROOMS.map((r,i)=>button('<svg class="room-map" viewBox="0 0 640 400" aria-hidden="true">'+r.obstacles.map(o=>'<rect x="'+o.x+'" y="'+o.y+'" width="'+o.w+'" height="'+o.h+'"/>').join('')+'<circle cx="320" cy="200" r="12"/></svg><b>'+r.name+'</b><small>'+r.tag+'</small>','room'+i)).join('')+'</div><div class="controls">'+controlText()+'</div><div class="menu-bottom">'+button('← BACK','title')+'</div>'}
function playerControls(i){return 'P'+(i+1)+': '+['up','left','down','right'].map(k=>keyLabel(binds[i][k])).join(' ')+' move · '+keyLabel(binds[i].fire)+' fire · '+keyLabel(binds[i].cycle)+' weapon'}
function controlText(){return playerControls(0)+(mode!=='solo'?'<br>'+playerControls(1)+' · I J K L aim + fire':'<br>Mouse aims + fires · Arrows also move · 1–6 select unlocked weapons')+'<br>Esc pauses · Touch: move pad + auto-aim FIRE'}
function help(){setState('help');$('#panel').innerHTML='<div class="eyebrow">FIELD MANUAL</div><h2>Keep moving. Keep the streak.</h2><p>Shots follow your last movement direction. Hold '+keyLabel(binds[0].fire)+' to fire; move the mouse over the field to aim independently. On touch, FIRE aims at the nearest threat.</p><p>Quick kills build your multiplier and unlock six weapons. '+keyLabel(binds[0].cycle)+' cycles your arsenal. Gold crates restore 32 rounds; green kits restore 25 health. Your emergency reserve slowly refills below 12 rounds.</p><p>Orange fuel drums chain-explode and hurt nearby defenders. Ember casters fire after a bright warning. In co-op, a fallen partner returns when you clear the wave. Deathmatch ends at five kills or after three minutes; a tied score enters sudden death.</p><div class="controls">'+playerControls(0)+'<br>'+playerControls(1)+'</div><div class="menu-bottom">'+button('READY','title','primary')+'</div>'}
function settings(){priorState=state==='playing'?'paused':state==='settings'?priorState:state;setState('settings');$('#panel').innerHTML='<div class="eyebrow">MAKE YOURSELF AT HOME</div><h2>Settings</h2><div class="settings-grid"><label>Master volume <input id="volume" aria-label="Master volume" type="range" min="0" max="100" value="'+Math.round(options.volume*100)+'"></label><label>Music <input id="music" aria-label="Music volume" type="range" min="0" max="100" value="'+Math.round(options.music*100)+'"></label><label>Touch controls <input id="touch-option" type="checkbox" '+(options.touch?'checked':'')+'></label><label>Screen shake <input id="shake-option" type="checkbox" '+(options.shake?'checked':'')+'></label></div><div class="keys-title">KEY BINDINGS / SELECT ONE, THEN PRESS A KEY</div><div class="keys">'+[0,1].map(i=>Object.keys(defaults[i]).map(action=>button('P'+(i+1)+' '+action.toUpperCase()+' · '+keyLabel(binds[i][action]),'bind:'+i+':'+action)).join('')).join('')+'</div><div class="menu-bottom">'+button('RESTORE KEYS','resetkeys')+button('DONE','settingsdone','primary')+'</div>';
 for(const name of ['volume','music'])$('#'+name).oninput=e=>{options[name]=Number(e.target.value)/100;audio.mix();save('options',options)};
 for(const name of ['touch','shake'])$('#'+name+'-option').onchange=e=>{options[name]=e.target.checked;save('options',options)};
}
function pause(){if(state==='playing'){setState('paused');$('#panel').innerHTML='<div class="eyebrow">TAKE A BREATH</div><h2>Holding the line</h2><p>Your run is frozen. Resume when you are ready.</p><div class="menu-bottom">'+button('RESUME','resume','primary')+button('RESTART','restart')+button('MAIN MENU','title')+'</div>'}else if(state==='paused')resume()}
function resume(){setState('playing');canvas.focus({preventScroll:true})}
function finish(winner=-1){setState('over');records.runs++;records.best=Math.max(records.best,score);records.wave=Math.max(records.wave,wave);records.kills+=kills;save('records',records);audio.play('death');$('#panel').innerHTML='<div class="eyebrow">'+(winner>=0?'MATCH COMPLETE':'THE NIGHT CLAIMS ANOTHER')+'</div><h2>'+(winner>=0?'Player '+(winner+1)+' wins':'The bastion falls')+'</h2><div class="stats">'+(mode==='deathmatch'?'<div><strong>'+players[0].kills+' — '+players[1].kills+'</strong><span>FINAL SCORE</span></div>':'<div><strong>'+score.toLocaleString()+'</strong><span>SCORE</span></div><div><strong>'+wave+'</strong><span>WAVE</span></div><div><strong>'+kills+'</strong><span>DEFEATED</span></div>')+'</div><p>'+(mode==='deathmatch'?'One more round?':'Best '+records.best.toLocaleString()+' · Best wave '+records.wave)+'</p><div class="menu-bottom">'+button('PLAY AGAIN','restart','primary')+button('MAIN MENU','title')+'</div>';}
function action(a){audio.wake();audio.play('ui');if(['solo','coop','deathmatch'].includes(a))chooseRoom(a);else if(a.startsWith('room'))start(Number(a.slice(4)));else if(a==='title')title();else if(a==='help')help();else if(a==='settings')settings();else if(a==='resume')resume();else if(a==='restart')start(roomIndex);else if(a==='settingsdone'){bindCapture=null;if(priorState==='paused'){setState('playing');pause()}else if(priorState==='room')chooseRoom(mode);else title()}else if(a==='resetkeys'){binds=defaults.map(x=>({...x}));save('keys',binds);settings()}else if(a.startsWith('bind:')){bindCapture=a.split(':').slice(1);const b=document.querySelector('[data-action="'+a+'"]');b.textContent='PRESS A KEY… (ESC CANCEL)'}}
$('#panel').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)action(b.dataset.action)});
$('#pause').onclick=()=>{audio.wake();pause()};$('#settings').onclick=()=>{audio.wake();settings()};
$('#mute').onclick=()=>{options.mute=!options.mute;audio.wake();save('options',options);paintMute()};
function paintMute(){$('#mute').textContent=options.mute?'♫ OFF':'♫ ON';$('#mute').setAttribute('aria-label',options.mute?'Unmute audio':'Mute audio')}
function start(index){
 roomIndex=index;room=ROOMS[index];seed=749+index*337;wave=score=kills=time=0;mult=peak=1;unlocked=0;multTime=0;enemies=[];bullets=[];particles=[];blasts=[];stains=[];queue=[];flow=[];navTimer=0;breakTime=0;crateTimer=5;dmTime=180;maxEnemies=0;
 players=room.spawn.slice(0,mode==='solo'?1:2).map((p,i)=>({...p,id:i,hp:100,ammo:48,invuln:1.2,face:i?Math.PI:0,cool:0,weapon:0,kills:0,respawn:0,reserve:0,step:0}));
 barrels=room.barrels.map(p=>({...p,dead:false,fuse:-1,owner:-1}));crates=[{x:80,y:200,kind:'ammo'},{x:560,y:200,kind:'ammo'}];
 setState('playing');pointer.aim=false;audio.next=0;toast(mode==='deathmatch'?'FIRST TO FIVE / 3 MINUTES':'HOLD THE LINE',2.5);
 if(mode!=='deathmatch')nextWave();else{unlocked=2;players.forEach(p=>p.weapon=1)}
 $('#hint').textContent=playerControls(0)+(mode==='solo'?' · Mouse aim':' / '+playerControls(1))+' · Esc pause';canvas.focus({preventScroll:true});drawFloor();
}
function nextWave(){
 wave++;records.wave=Math.max(records.wave,wave);save('records',records);const count=Math.min(160,8+4*(wave-1)+Math.floor((wave-1)**2/5));
 queue=Array.from({length:count},(_,i)=>wave>=5&&i%17===0?'brute':wave>=3&&i%9===0?'ember':wave>=2&&i%5===0?'runner':'husk');spawnTimer=1;breakTime=0;
 for(const p of players){if(p.hp<=0){const s=room.spawn[p.id];p.x=s.x;p.y=s.y;p.hp=65;p.invuln=2;toast('PARTNER BACK IN THE FIGHT')}else p.hp=Math.min(100,p.hp+(wave>1?10:0));p.ammo=Math.min(160,p.ammo+(wave>1?24:0))}
 if(wave>1&&wave%3===1)for(const p of room.barrels)if(players.every(s=>dist(s,p)>70))barrels.push({...p,dead:false,fuse:-1,owner:-1});
 toast('WAVE '+String(wave).padStart(2,'0')+(wave===3?' / EMBERS INBOUND':wave===5?' / HEAVY CONTACT':''));audio.play('wave');
}
function blocked(x,y,r=7){return x<18||x>W-18||y<18||y>H-18||room.obstacles.some(o=>x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h)}
function move(p,dx,dy,r=7){if(!blocked(p.x+dx,p.y,r))p.x+=dx;if(!blocked(p.x,p.y+dy,r))p.y+=dy}
function freeSpot(){for(let n=0;n<60;n++){const p={x:32+rnd()*576,y:48+rnd()*320};if(!blocked(p.x,p.y,14)&&players.every(s=>dist(p,s)>40))return p}return{x:80,y:200}}
function spawn(type){
 let p;for(let n=0;n<20;n++){const edge=Math.floor(rnd()*4);p=edge===0?{x:22,y:32+rnd()*336}:edge===1?{x:618,y:32+rnd()*336}:edge===2?{x:32+rnd()*576,y:22}:{x:32+rnd()*576,y:378};if(players.every(s=>s.hp<=0||dist(s,p)>105)&&!blocked(p.x,p.y))break}
 enemies.push({...p,id:++enemyId,type,hp:type==='husk'?2:type==='runner'?1.4:type==='ember'?5:14,maxHp:type==='brute'?14:5,speed:Math.min(72,34+(wave-1)*1.8)*(type==='runner'?1.65:type==='brute'?.68:type==='ember'?.8:1),cool:1.4+rnd(),tell:0,flash:0,dead:false,face:0});
 if(type==='ember')audio.play('special');maxEnemies=Math.max(maxEnemies,enemies.length);
}
function recalcFlow(){
 const cols=40,rows=25,walk=new Uint8Array(cols*rows);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)walk[y*cols+x]=!blocked(x*16+8,y*16+8,7);
 flow=players.map(p=>{const f=new Int16Array(cols*rows).fill(32767),q=[],sx=clamp(Math.floor(p.x/16),0,39),sy=clamp(Math.floor(p.y/16),0,24);q.push(sy*40+sx);f[q[0]]=0;for(let h=0;h<q.length;h++){const id=q[h],x=id%40,y=Math.floor(id/40);for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,ni=ny*40+nx;if(nx<0||nx>=40||ny<0||ny>=25||!walk[ni]||f[ni]<=f[id]+1)continue;f[ni]=f[id]+1;q.push(ni)}}return f});
}
function targetFor(p){let best=null,d=Infinity;for(const t of (mode==='deathmatch'?players.filter(x=>x.id!==p.id&&x.hp>0):enemies)){const n=dist(p,t);if(n<d){d=n;best=t}}return best}
function cycle(i,step=1){const p=players[i];if(p&&p.hp>0){p.weapon=(p.weapon+step+unlocked+1)%(unlocked+1);toast('P'+(i+1)+' / '+WEAPONS[p.weapon].name,1.2);audio.play('ui')}}
function shoot(p,angle){
 const w=WEAPONS[p.weapon];if(p.ammo<w.cost){p.cool=.22;audio.play('empty');return}p.ammo-=w.cost;p.cool=w.delay;p.face=angle;
 for(let i=0;i<w.shots;i++){const a=angle+(i-(w.shots-1)/2)*w.spread+(p.weapon===2?(rnd()-.5)*w.spread:0),vx=Math.cos(a),vy=Math.sin(a);bullets.push({x:p.x+vx*13,y:p.y+vy*13,vx:vx*w.speed,vy:vy*w.speed,life:w.blast?1:1.6,owner:p.id,damage:w.damage,blast:w.blast||0,pierce:w.pierce||0,hit:[],kind:p.weapon})}
 for(let n=0;n<3;n++)particles.push({x:p.x+Math.cos(angle)*17,y:p.y+Math.sin(angle)*17,vx:Math.cos(angle)*40+(rnd()-.5)*30,vy:Math.sin(angle)*40+(rnd()-.5)*30,life:.07,color:'#ffe9a7',size:3});audio.play('shot',p.weapon);
}
function hurt(p,amount,owner=-1){if(p.hp<=0||p.invuln>0)return;p.hp=Math.max(0,p.hp-amount);p.invuln=mode==='deathmatch'?.18:.8;if(mode!=='deathmatch'){mult=1;multTime=0}shake=Math.max(shake,2.5);audio.play('hurt');if(p.hp<=0){audio.play('death');burst(p,'#b8c5ab',16);if(mode==='deathmatch'){p.respawn=1.4;if(owner>=0&&owner!==p.id){players[owner].kills++;if(players[owner].kills>=5||dmTime<=0)finish(owner)}}else toast(players.length===2?'P'+(p.id+1)+' DOWN / CLEAR THE WAVE TO REVIVE':'',2)}}
function kill(e,owner){
 if(e.dead)return;e.dead=true;kills++;score+=100*mult*(e.type==='brute'?3:e.type==='ember'?2:1);mult=Math.min(99,mult+1);peak=Math.max(peak,mult);multTime=3.5;
 const tier=WEAPONS.reduce((a,w,i)=>peak>=w.unlock?i:a,0);if(tier>unlocked){unlocked=tier;players.forEach(p=>p.weapon=tier);toast(WEAPONS[tier].name.toUpperCase()+' UNLOCKED');audio.play('unlock')}
 if(score>records.best){records.best=score;records.wave=Math.max(records.wave,wave);save('records',records)}
 burst(e,e.type==='ember'?'#e99b51':'#7b9656',7);stains.push({x:e.x,y:e.y,r:5+rnd()*6,color:e.type==='ember'?'#684530':'#354827'});if(stains.length>100)stains.shift();
 if(kills%5===0&&crates.length<7)crates.push({x:e.x,y:e.y,kind:kills%15===0?'health':'ammo'});audio.play('hit');
}
function burst(p,color,n){for(let i=0;i<n;i++){const a=rnd()*Math.PI*2,s=15+rnd()*65;particles.push({x:p.x,y:p.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.2+rnd()*.35,color,size:2+rnd()*2})}if(particles.length>350)particles.splice(0,particles.length-350)}
function explode(p,radius,damage,owner=-1){
 blasts.push({x:p.x,y:p.y,r:radius,life:.34});shake=Math.max(shake,5);audio.play('explode');burst(p,'#f5b666',22);
 for(const e of enemies)if(!e.dead&&dist(p,e)<radius){e.hp-=damage;if(e.hp<=0)kill(e,owner);else e.flash=.13}
 for(const s of players)if(s.id!==owner&&dist(p,s)<radius*.8)hurt(s,25,owner);
 for(const b of barrels)if(!b.dead&&b.fuse<0&&dist(p,b)<radius){b.fuse=.12;b.owner=owner}
}
function update(dt){
 time+=dt;dmTime-=mode==='deathmatch'?dt:0;
 for(const p of players){
  if(p.hp<=0){if(mode==='deathmatch'){p.respawn-=dt;if(p.respawn<=0){Object.assign(p,room.spawn[p.id],{hp:100,ammo:48,invuln:1.4});toast('P'+(p.id+1)+' BACK IN',1)}}continue}
  p.invuln=Math.max(0,p.invuln-dt);p.cool-=dt;p.reserve+=dt;if(p.ammo<12&&p.reserve>=1.1){p.ammo++;p.reserve=0}
  const b=binds[p.id],solo=mode==='solo';let dx=Number(keys.has(b.right))-Number(keys.has(b.left)),dy=Number(keys.has(b.down))-Number(keys.has(b.up));
  if(solo){dx+=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));dy+=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'))}
  if(pad[p.id].x||pad[p.id].y){dx=pad[p.id].x;dy=pad[p.id].y}
  const len=Math.hypot(dx,dy);if(len>0){dx/=Math.max(1,len);dy/=Math.max(1,len);move(p,dx*125*dt,dy*125*dt);p.face=Math.atan2(dy,dx);p.step+=dt*12}
  let firing=keys.has(b.fire)||pad[p.id].fire||(p.id===0&&pointer.down),angle=p.face;
  if(p.id===0&&pointer.aim&&!isTouch())angle=Math.atan2(pointer.y-p.y,pointer.x-p.x);
  if(p.id===1){const fx=Number(keys.has('KeyL')||keys.has('Numpad6'))-Number(keys.has('KeyJ')||keys.has('Numpad4')),fy=Number(keys.has('KeyK')||keys.has('Numpad5'))-Number(keys.has('KeyI')||keys.has('Numpad8'));if(fx||fy){firing=true;angle=Math.atan2(fy,fx)}}
  if(isTouch()&&pad[p.id].fire){const target=targetFor(p);if(target)angle=Math.atan2(target.y-p.y,target.x-p.x)}
  if(firing&&p.cool<=0)shoot(p,angle);
 }
 if(mode!=='deathmatch'){
  spawnTimer-=dt;if(queue.length&&spawnTimer<=0&&enemies.length<120){spawn(queue.shift());spawnTimer=Math.max(.16,1.05-wave*.055)}
  navTimer-=dt;if(navTimer<=0){recalcFlow();navTimer=.28}
  const buckets=new Map();for(const e of enemies){const key=Math.floor(e.x/24)+','+Math.floor(e.y/24);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(e)}
  for(const e of enemies){
   if(e.dead)continue;e.flash=Math.max(0,e.flash-dt);let target=null,bd=Infinity;for(const p of players)if(p.hp>0&&dist(p,e)<bd){target=p;bd=dist(p,e)}if(!target)continue;
   const angle=Math.atan2(target.y-e.y,target.x-e.x);e.face=angle;let mx=Math.cos(angle),my=Math.sin(angle);
   if(blocked(e.x+mx*25,e.y+my*25,8)){const f=flow[target.id],gx=clamp(Math.floor(e.x/16),0,39),gy=clamp(Math.floor(e.y/16),0,24);let best=f?.[gy*40+gx]??32767,point=null;for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=gx+dx,y=gy+dy,n=f?.[y*40+x]??32767;if(x>=0&&x<40&&y>=0&&y<25&&n<best){best=n;point={x:x*16+8,y:y*16+8}}}if(point){const d=dist(e,point)||1;mx=(point.x-e.x)/d;my=(point.y-e.y)/d}}
   if(e.type==='ember'){e.cool-=dt;if(e.tell>0){e.tell-=dt;if(e.tell<=0){const a=Math.atan2(target.y-e.y,target.x-e.x);bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*145,vy:Math.sin(a)*145,life:3,owner:-1,damage:14,blast:0,pierce:0,hit:[],kind:-1});e.cool=2.4}}else if(e.cool<=0&&bd<290){e.tell=.65}if(bd<165||e.tell>0){mx=0;my=0}}
   move(e,mx*e.speed*dt,my*e.speed*dt,e.type==='brute'?10:7);
   const bx=Math.floor(e.x/24),by=Math.floor(e.y/24);for(let yy=by-1;yy<=by+1;yy++)for(let xx=bx-1;xx<=bx+1;xx++)for(const o of buckets.get(xx+','+yy)||[]){if(o===e||o.dead)continue;const d=dist(e,o),min=e.type==='brute'||o.type==='brute'?19:13;if(d>0&&d<min)move(e,(e.x-o.x)/d*25*dt,(e.y-o.y)/d*25*dt)}
   for(const p of players)if(p.hp>0&&dist(e,p)<(e.type==='brute'?18:14))hurt(p,e.type==='brute'?18:10);
  }
 }
 for(let i=bullets.length-1;i>=0;i--){
  const b=bullets[i];b.life-=dt;let dead=b.life<=0;const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/6));
  for(let st=0;st<steps&&!dead;st++){b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps;if(blocked(b.x,b.y,2)){dead=true;break}
   for(const barrel of barrels)if(!barrel.dead&&barrel.fuse<0&&dist(b,barrel)<11){barrel.fuse=.12;barrel.owner=b.owner;dead=true;break}if(dead)break;
   if(b.owner>=0)for(const e of enemies){if(e.dead||b.hit.includes(e.id)||dist(b,e)>(e.type==='brute'?14:10))continue;e.hp-=b.damage;e.flash=.10;b.hit.push(e.id);if(e.hp<=0)kill(e,b.owner);if(b.pierce-->0)continue;dead=true;break}
   if(!dead&&(b.owner<0||mode==='deathmatch'))for(const p of players){if(p.id===b.owner||p.hp<=0||dist(p,b)>10)continue;hurt(p,b.owner<0?14:Math.max(8,b.damage*14),b.owner);dead=true;break}
  }
  if(dead){if(b.blast)explode(b,b.blast,b.damage,b.owner);bullets.splice(i,1)}
 }
 enemies=enemies.filter(e=>!e.dead);
 for(const b of barrels)if(!b.dead&&b.fuse>=0){b.fuse-=dt;if(b.fuse<=0){b.dead=true;explode(b,55,12,b.owner)}}
 crateTimer=Math.max(0,crateTimer-dt);if(crateTimer===0&&crates.length<3){crates.push({...freeSpot(),kind:'ammo'});crateTimer=6}
 for(let i=crates.length-1;i>=0;i--)for(const p of players)if(p.hp>0&&dist(p,crates[i])<18){const kind=crates[i].kind;if(kind==='health')p.hp=Math.min(100,p.hp+25);else p.ammo=Math.min(160,p.ammo+32);audio.play('pickup');burst(crates[i],kind==='health'?'#d1f99a':'#f4d075',5);crates.splice(i,1);break}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
 for(let i=blasts.length-1;i>=0;i--){blasts[i].life-=dt;if(blasts[i].life<=0)blasts.splice(i,1)}
 if(mult>1){multTime-=dt;if(multTime<=0){mult--;multTime=1.2}}
 if(state==='playing'){if(mode==='deathmatch'){if(dmTime<=0&&players[0].kills!==players[1].kills)finish(players[0].kills>players[1].kills?0:1);else if(dmTime<=0&&dmTime+dt>0)toast('SUDDEN DEATH / NEXT KILL WINS',4)}else if(players.every(p=>p.hp<=0))finish();else if(!queue.length&&!enemies.length){breakTime+=dt;if(breakTime>2.5)nextWave()}}
 shake=Math.max(0,shake-dt*12);if(toastTime>0)toastTime-=dt;hudTimer-=dt;if(hudTimer<=0){paintHud();hudTimer=.1}
}
const floor=document.createElement('canvas');floor.width=W;floor.height=H;const fctx=floor.getContext('2d');
function drawFloor(){
 const c=fctx;c.fillStyle='#0b1411';c.fillRect(0,0,W,H);c.fillStyle=room.color;c.fillRect(10,10,620,380);
 c.strokeStyle='#50634422';c.lineWidth=1;for(let x=10;x<630;x+=24){c.beginPath();c.moveTo(x+.5,10);c.lineTo(x+.5,390);c.stroke()}for(let y=10;y<390;y+=24){c.beginPath();c.moveTo(10,y+.5);c.lineTo(630,y+.5);c.stroke()}
 for(let i=0;i<65;i++){const x=(i*179+17)%612+14,y=(i*113+11)%362+17;c.fillStyle=i%3?'#0b110f24':'#a5b59912';c.fillRect(x,y,i%7+1,1)}
 c.strokeStyle='#6e806440';c.strokeRect(18.5,18.5,603,363);
 for(const [x,y,w,h]of[[270,10,100,8],[270,382,100,8],[10,155,8,90],[622,155,8,90]]){c.fillStyle='#111b16';c.fillRect(x,y,w,h);for(let i=0;i<(w>h?w:h);i+=12){c.fillStyle='#a19c4c';c.fillRect(x+(w>h?i:0),y+(h>w?i:0),w>h?6:w,h>w?6:h)}}
 c.font='bold 9px monospace';c.fillStyle='#adc19232';c.fillText('SECTOR 0'+(roomIndex+1),32,365);c.fillText('NIGHTWATCH / KEEP CLEAR',415,365);
 for(const o of room.obstacles){c.fillStyle='#08100b88';c.fillRect(o.x+5,o.y+7,o.w,o.h);c.fillStyle='#142219';c.fillRect(o.x,o.y,o.w,o.h);c.fillStyle='#526649';c.fillRect(o.x,o.y,o.w,o.h-5);c.fillStyle='#7a8a60';c.fillRect(o.x,o.y,o.w,3);c.fillStyle='#3d5137';c.fillRect(o.x+4,o.y+6,o.w-8,o.h-15);c.strokeStyle='#8b9a5d66';c.strokeRect(o.x+7.5,o.y+8.5,o.w-15,o.h-20);for(const dx of [5,o.w-7]){c.fillStyle='#aec089';c.fillRect(o.x+dx,o.y+4,2,2)}}
}
function body(p,type='player',id=0){
 const brute=type==='brute',size=brute?1.4:1;ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.fillStyle='#03090770';ctx.fillRect(-8*size,-3*size,19*size,15*size);ctx.rotate(p.face||0);ctx.scale(size,size);
 if(type==='player'){ctx.fillStyle='#101913';ctx.fillRect(-8,-8,14,16);ctx.fillStyle=id?'#b37441':'#668957';ctx.fillRect(-7,-7,11,14);ctx.fillStyle=id?'#f4b778':'#caed9c';ctx.fillRect(-6,-7,8,3);ctx.fillRect(-6,4,8,3);ctx.fillStyle='#dbe5c5';ctx.fillRect(-3,-5,10,10);ctx.fillStyle='#153327';ctx.fillRect(3,-4,3,8);ctx.fillStyle=id?'#ffbd72':'#96efd7';ctx.fillRect(4,-3,2,6);ctx.fillStyle='#181e19';ctx.fillRect(3,5,12,4);ctx.fillStyle='#c5cbac';ctx.fillRect(12,5,5,3);ctx.fillStyle='#17281c';ctx.fillRect(-9,-5,3,10)}
 else{const ember=type==='ember',runner=type==='runner';ctx.fillStyle='#14211a';ctx.fillRect(-7,-8,14,16);ctx.fillStyle=ember?'#bc6c39':brute?'#65715b':runner?'#9b8e4d':'#718b50';ctx.fillRect(-6,-7,11,14);ctx.fillStyle=ember?'#efae5c':brute?'#a4ac8c':'#a0b674';ctx.fillRect(-2,-5,9,10);ctx.fillStyle=ember?'#fff7b2':'#1a2718';ctx.fillRect(4,-4,2,3);ctx.fillRect(4,2,2,3);ctx.fillStyle=ember?'#d78745':'#627b45';ctx.fillRect(1,-10,9,3);ctx.fillRect(1,7,9,3);if(brute){ctx.fillStyle='#343f37';ctx.fillRect(-4,-7,5,14)}}
 ctx.restore();
}
function render(){
 ctx.fillStyle='#0b110f';ctx.fillRect(0,0,W,H);ctx.save();if(options.shake&&shake&&state==='playing')ctx.translate(Math.sin(time*81)*shake,Math.cos(time*73)*shake*.5);
 ctx.drawImage(floor,0,0);
 const running=['playing','paused','over','settings'].includes(state)&&players.length;
 if(running){
  for(const s of stains){ctx.fillStyle=s.color;ctx.fillRect(s.x-s.r,s.y-s.r,s.r*2,s.r);ctx.fillRect(s.x-2,s.y-4,9,9)}
  for(const b of barrels){if(b.dead)continue;ctx.fillStyle='#101b1388';ctx.fillRect(b.x-6,b.y-5,18,19);ctx.fillStyle=b.fuse>=0?'#fff0a0':'#b46436';ctx.fillRect(b.x-7,b.y-9,14,18);ctx.fillStyle='#e6ab5c';ctx.fillRect(b.x-6,b.y-9,12,3);ctx.fillStyle='#503b25';ctx.fillRect(b.x-7,b.y-3,14,3);ctx.fillRect(b.x-7,b.y+5,14,2);ctx.fillStyle='#ffdf88';ctx.fillRect(b.x-2,b.y-1,4,5)}
  for(const c of crates){const pulse=Math.sin(time*4)*.15+.85;ctx.globalAlpha=pulse;ctx.strokeStyle=c.kind==='ammo'?'#ecd783':'#c5f597';ctx.strokeRect(c.x-10.5,c.y-9.5,21,19);ctx.fillStyle=c.kind==='ammo'?'#b8a25e':'#5c8555';ctx.fillRect(c.x-7,c.y-6,14,12);ctx.fillStyle='#f0e8b9';if(c.kind==='ammo'){ctx.fillRect(c.x-4,c.y-4,2,8);ctx.fillRect(c.x+1,c.y-4,2,8)}else{ctx.fillRect(c.x-2,c.y-5,4,10);ctx.fillRect(c.x-5,c.y-2,10,4)}ctx.globalAlpha=1}
  const bodies=[...enemies,...players].sort((a,b)=>a.y-b.y);
  for(const p of bodies){
   if(p.hp<=0){ctx.fillStyle=p.id?'#f4a867':'#c8f07b';ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText(mode==='deathmatch'?Math.max(1,Math.ceil(p.respawn)):'DOWN',p.x,p.y);ctx.textAlign='left';continue}
   if(p.tell>0){ctx.strokeStyle='#ffd690';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,14+8*(.65-p.tell),0,Math.PI*2);ctx.stroke()}
   ctx.globalAlpha=p.invuln>0&&Math.sin(time*35)>0?.5:p.flash>0?.6:1;body(p,p.type||'player',p.id);ctx.globalAlpha=1;
   if(!p.type){ctx.fillStyle=p.id?'#f4a867':'#d9f1bb';ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillText('P'+(p.id+1),p.x,p.y-15);ctx.textAlign='left'}
   if(p.type==='brute'){ctx.fillStyle='#162019';ctx.fillRect(p.x-12,p.y-21,24,3);ctx.fillStyle='#c0b579';ctx.fillRect(p.x-12,p.y-21,24*p.hp/p.maxHp,3)}
  }
  for(const b of bullets){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));ctx.fillStyle=b.owner<0?'#f9af5c':b.kind===4?'#a7eee4':'#f7e6aa';if(b.owner<0){ctx.fillRect(-3,-3,6,6);ctx.fillStyle='#fff4cf';ctx.fillRect(-1,-1,2,2)}else if(b.blast){ctx.fillStyle='#a6ba75';ctx.fillRect(-4,-3,8,6);ctx.fillStyle='#f3d889';ctx.fillRect(-8,-2,4,4)}else ctx.fillRect(-5,-1,9,2);ctx.restore()}
  for(const b of blasts){const k=1-b.life/.34;ctx.globalAlpha=(1-k)*.7;ctx.fillStyle='#eaaa5b';ctx.beginPath();ctx.arc(b.x,b.y,b.r*k,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1-k;ctx.strokeStyle='#ffefb0';ctx.lineWidth=3;ctx.stroke();ctx.globalAlpha=1}
  for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*5);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)}ctx.globalAlpha=1;
  if(pointer.aim&&state==='playing'&&!isTouch()){ctx.strokeStyle='#ccec9577';ctx.lineWidth=1;ctx.strokeRect(pointer.x-4.5,pointer.y-4.5,9,9)}
 }else{
  for(let i=0;i<16;i++){const x=85+(i*79)%490,y=60+(i*47)%280;body({x,y,face:Math.sin(i)*2},i%5===0?'ember':'husk',0)}body({x:320,y:205,face:-.5},'player',0);
 }
 ctx.restore();$('#toast').textContent=state==='playing'&&toastTime>0?toastText:'';
}
function paintHud(){
 if(!players.length)return;
 $('#status').innerHTML=mode==='deathmatch'?'<span>FIRST TO 5 / P1 '+players[0].kills+' : '+players[1].kills+' P2</span><span>'+(dmTime>0?Math.floor(dmTime/60)+':'+String(Math.ceil(dmTime%60)).padStart(2,'0'):'SUDDEN DEATH')+'</span>':'<span>WAVE '+String(wave).padStart(2,'0')+' / '+(queue.length+enemies.length)+' LEFT</span><span>'+score.toLocaleString()+' / ×'+mult+'</span>';
 $('#players').innerHTML=players.map(p=>'<div class="player-hud p'+(p.id+1)+'"><b>P'+(p.id+1)+'</b><span class="hp"><i style="width:'+p.hp+'%"></i></span><span>'+p.hp+' HP</span><span>'+p.ammo+' RDS</span><b>'+WEAPONS[p.weapon].name.toUpperCase()+'</b></div>').join('');
}
function inputKey(e,down){
 if(down)audio.wake();if(bindCapture&&down){e.preventDefault();if(e.code!=='Escape'){const [i,a]=bindCapture;if(!bindableKey(e.code)){const b=document.querySelector('[data-action="bind:'+i+':'+a+'"]');b.textContent=reservedKeys.has(e.code)?'RESERVED KEY — TRY ANOTHER':'UNSUPPORTED KEY — TRY ANOTHER';return}for(const map of binds)for(const k in map)if(map[k]===e.code)map[k]='Unbound';binds[i][a]=e.code;save('keys',binds)}bindCapture=null;settings();return}
 if((e.target instanceof HTMLButtonElement)&&(e.code==='Enter'||e.code==='Space')&&state!=='playing')return;
 const used=['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','KeyP','KeyI','KeyJ','KeyK','KeyL','Numpad4','Numpad5','Numpad6','Numpad8',...Object.values(binds[0]),...Object.values(binds[1])].includes(e.code);
 if(used&&!(e.target instanceof HTMLInputElement))e.preventDefault();
 if(!down){keys.delete(e.code);return}if(e.repeat)return;
 if(state==='playing'||state==='paused'){if(e.code==='Escape'||e.code==='KeyP'){pause();return}if(state==='playing'){keys.add(e.code);if(e.code===binds[0].cycle)cycle(0);if(e.code===binds[1].cycle)cycle(1);if(/^Digit[1-6]$/.test(e.code)){const n=Number(e.code.slice(5))-1;if(n<=unlocked)players[0].weapon=n}}}
 else if(state==='title'){if(e.code==='Digit1'||e.code==='Space'||e.code==='Enter')chooseRoom('solo');if(e.code==='Digit2')chooseRoom('coop');if(e.code==='Digit3')chooseRoom('deathmatch')}
 else if(state==='room'){if(/^Digit[1-3]$/.test(e.code))start(Number(e.code.slice(5))-1);else if(e.code==='Space'||e.code==='Enter')start(0);else if(e.code==='Escape')title()}
 else if(state==='over'){if(e.code==='Space'||e.code==='Enter')start(roomIndex);if(e.code==='Escape'||e.code==='KeyM')title()}
 else if(state==='help'&&e.code==='Escape')title();else if(state==='settings'&&e.code==='Escape')action('settingsdone');
}
addEventListener('keydown',e=>inputKey(e,true));addEventListener('keyup',e=>inputKey(e,false));
addEventListener('blur',()=>{clearInput();if(state==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(state==='playing')pause()}});
function canvasPoint(e){const r=canvas.getBoundingClientRect(),s=Math.min(r.width/W,r.height/H);return{x:(e.clientX-r.left-(r.width-W*s)/2)/s,y:(e.clientY-r.top-(r.height-H*s)/2)/s}}
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){Object.assign(pointer,canvasPoint(e));pointer.aim=true}});
canvas.addEventListener('pointerdown',e=>{if(state!=='playing'||e.pointerType!=='mouse')return;audio.wake();Object.assign(pointer,canvasPoint(e));pointer.down=true;pointer.aim=true;canvas.setPointerCapture(e.pointerId)});
addEventListener('pointerup',()=>{pointer.down=false},true);addEventListener('pointercancel',()=>{pointer.down=false},true);
document.querySelectorAll('.stick').forEach(el=>{
 let id=null;const i=Number(el.dataset.player),update=e=>{const r=el.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width*.32),dy=(e.clientY-r.top-r.height/2)/(r.height*.32),d=Math.max(1,Math.hypot(dx,dy));pad[i].x=dx/d;pad[i].y=dy/d;el.querySelector('span').style.transform='translate('+pad[i].x*25+'px,'+pad[i].y*25+'px)'};
 el.addEventListener('pointerdown',e=>{e.preventDefault();audio.wake();id=e.pointerId;el.setPointerCapture(id);update(e)});el.addEventListener('pointermove',e=>{if(id===e.pointerId)update(e)});const release=e=>{if(id!==e.pointerId)return;id=null;pad[i].x=pad[i].y=0;el.querySelector('span').style.transform=''};addEventListener('pointerup',release,true);addEventListener('pointercancel',release,true);
});
document.querySelectorAll('.fire').forEach(el=>{const i=Number(el.dataset.player);let id=null;el.onpointerdown=e=>{e.preventDefault();audio.wake();id=e.pointerId;pad[i].fire=true;el.setPointerCapture(id)};const release=e=>{if(id===e.pointerId){pad[i].fire=false;id=null}};addEventListener('pointerup',release,true);addEventListener('pointercancel',release,true)});
document.querySelectorAll('.cycle').forEach(el=>el.onclick=()=>cycle(Number(el.dataset.player)));
let last=performance.now(),acc=0;
function loop(now){frameCount++;const elapsed=Math.min(.1,(now-last)/1000);last=now;if(state==='playing'){acc+=elapsed;let n=0;while(acc>=1/60&&n++<6){update(1/60);acc-=1/60;if(state!=='playing'){acc=0;break}}}else acc=0;audio.tick();render();requestAnimationFrame(loop)}
/* Read-only snapshots for verification. No state-mutating hooks. */
Object.defineProperty(window,'__bastion',{get:()=>Object.freeze({state,mode,room:room.name,wave,score,mult,unlocked,kills,time,dmTime,queue:queue.length,maxEnemies,frames:frameCount,players:players.map(p=>({id:p.id,x:p.x,y:p.y,hp:p.hp,ammo:p.ammo,weapon:p.weapon,kills:p.kills})),enemies:enemies.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,type:e.type})),barrels:barrels.filter(b=>!b.dead).map(b=>({x:b.x,y:b.y,fuse:b.fuse})),crates:crates.map(c=>({...c})),bullets:bullets.length,audio:{state:audio.ctx?.state||'not-started',cues:{...audio.cues}},options:{...options},records:{...records}})});
paintMute();drawFloor();title();requestAnimationFrame(loop);
})();
