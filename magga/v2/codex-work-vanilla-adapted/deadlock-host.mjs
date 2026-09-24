#!/usr/bin/env node
/** Deadlock Rooms LAN relay and static host. Node built-ins only. No install step. */
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import os from 'node:os';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(process.env.SITE_ROOT??process.env.DEADLOCK_ROOT??process.argv[2]??(existsSync(path.join(here,'index.html'))?here:path.join(here,'..','dist')));
const port=Number(process.env.PORT??4173),host=process.env.HOST??'0.0.0.0';
const rooms=new Map();const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const send=(client,message)=>{if(client.stream&&!client.stream.destroyed){if(client.stream.writableLength>300000){client.stream.destroy();return;}client.stream.write(`data: ${JSON.stringify(message)}\n\n`);}};
const presence=room=>{const count=room.clients.filter(c=>c.stream&&!c.stream.destroyed).length;for(const c of room.clients)send(c,{type:'presence',count});};
const readBody=async req=>{let size=0,parts=[];for await(const chunk of req){size+=chunk.length;if(size>180000)throw new Error('Message too large');parts.push(chunk);}return JSON.parse(Buffer.concat(parts).toString());};
const auth=body=>{const room=rooms.get(body.code),client=room?.clients.find(c=>c.token===body.token);if(!room||!client)throw new Error('Room no longer exists');return{room,client};};
const closeRoom=room=>{for(const c of room.clients){send(c,{type:'closed'});c.stream?.end();}rooms.delete(room.code);};
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const vector=(v,bound)=>v&&finite(v.x)&&finite(v.y)&&Math.abs(v.x)<=bound&&Math.abs(v.y)<=bound;
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/__lan/')){
   // Browser requests must originate from this exact host. LAN games need no CORS.
   const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)return json(res,403,{error:'Cross-origin request refused'});
   if(url.pathname==='/__lan/health')return json(res,200,{game:'Deadlock Rooms',protocol:1});
   if(url.pathname==='/__lan/events'&&req.method==='GET'){
    const {room,client}=auth(Object.fromEntries(url.searchParams));
    if(client.stream)client.stream.end();
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': connected\n\n');client.stream=res;client.seen=Date.now();presence(room);if(room.last&&client!==room.clients[0])send(client,room.last);
    req.on('close',()=>{if(client.stream===res){client.stream=null;client.seen=Date.now();presence(room);}});return;
   }
   if(req.method!=='POST')return json(res,405,{error:'POST required'});
   const body=await readBody(req);
   if(url.pathname==='/__lan/create'){
    if(rooms.size>=24)return json(res,429,{error:'Host has too many rooms'});
    const code=randomBytes(3).toString('hex').toUpperCase(),token=randomBytes(24).toString('hex');
    rooms.set(code,{code,clients:[{token,stream:null,seen:Date.now()}],last:null});return json(res,200,{code,token});
   }
   if(url.pathname==='/__lan/join'){
    const room=rooms.get(String(body.code));if(!room)return json(res,404,{error:'Room code not found'});if(room.clients.length>=2)return json(res,409,{error:'This room already has two players'});
    const token=randomBytes(24).toString('hex');room.clients.push({token,stream:null,seen:Date.now()});presence(room);return json(res,200,{code:room.code,token});
   }
   const {room,client}=auth(body);client.seen=Date.now();
   if(url.pathname==='/__lan/leave'){closeRoom(room);return json(res,200,{ok:true});}
   if(url.pathname==='/__lan/send'){
    const hosting=client===room.clients[0];
    if(hosting&&body.type==='frame'&&body.frame&&typeof body.frame==='object'){
      // Frame authority belongs exclusively to P1; guests can submit inputs only.
      const message={type:'frame',frame:body.frame};room.last=message;for(const peer of room.clients)if(peer!==client)send(peer,message);
    }else if(!hosting&&body.type==='input'&&vector(body.axis,1)&&(body.aim===null||vector(body.aim,1000))){
      const d=Math.max(1,Math.hypot(body.axis.x,body.axis.y));send(room.clients[0],{type:'input',axis:{x:body.axis.x/d,y:body.axis.y/d},aim:body.aim,fire:body.fire===true,weapon:Number.isInteger(body.weapon)&&body.weapon>=0&&body.weapon<8?body.weapon:-1,pause:body.pause===true,desiredPause:body.desiredPause===true,retry:body.retry===true});
    }else return json(res,400,{error:'Invalid player message'});
    return json(res,200,{ok:true});
   }
   return json(res,404,{error:'Unknown endpoint'});
  }
  let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(file!==root&&!file.startsWith(root+path.sep))return json(res,403,{error:'Forbidden'});
  let info=await stat(file);if(info.isDirectory()){if(!url.pathname.endsWith('/')){res.writeHead(302,{Location:url.pathname+'/'+url.search});return res.end();}file=path.join(file,'index.html');}
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Content-Length':bytes.length,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch(e){json(res,400,{error:e.message==='Room no longer exists'?e.message:'Request or file unavailable'});}
});
const timer=setInterval(()=>{for(const room of rooms.values()){
 if(room.clients.some(c=>!c.stream&&Date.now()-c.seen>30000)){closeRoom(room);continue;}
 for(const client of room.clients)if(client.stream)client.stream.write(': heartbeat\n\n');
}},5000);
server.on('error',e=>{console.error(`Could not start LAN host: ${e.message}`);process.exit(1);});
server.listen(port,host,()=>{
 console.log(`Deadlock Rooms host — http://127.0.0.1:${port}/boxhead/`);
 try{for(const entries of Object.values(os.networkInterfaces()))for(const a of entries??[])if(a.family==='IPv4'&&!a.internal)console.log(`Other devices: http://${a.address}:${port}/boxhead/`);}catch{}
 console.log('Both devices open the same address. Select LAN → Create room / Join room. Ctrl+C stops the host.');
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearInterval(timer);for(const room of rooms.values())closeRoom(room);server.close(()=>process.exit(0));});
