// Run the real discovery loop against a clock and synthetic windows; no desktop connection.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src = fs.readFileSync(new URL('../scripts/injector.mjs', import.meta.url), 'utf8');
const slice = (from,to) => src.slice(src.indexOf(from),src.indexOf(to,src.indexOf(from)));
const code = slice('function nextWindowCheck(', 'async function connectTarget(')
  + slice('async function runWatch(', 'async function runOneShotAndExit(');
let turn=0, now=0, stop;
const probes=[], sends=[], failures=[];
const targets=()=>{
  const list=[{id:'chat',url:'app://shell/chat/'+(turn%2)}]; // local switching, same window
  if(turn<22 && turn!==12) list.push({id:'preview',url:'app://preview'});
  if(turn>=4) list.push({id:'pet',url:turn<13?'app://pet':'app://shell/new'});
  if(turn>=3) list.push({id:'late',url:'app://shell/loading'});
  if(turn>=7 && turn<=15)list.push({id:'new',url:'app://shell/second'});
  if(turn===25)stop();
  return list;
};
const ok=t=>t.id==='chat'||t.id==='new'||(t.id==='late'&&turn>=6)||(t.id==='pet'&&turn>=13);
const env={
 process:{on:(key,cb)=>{if(key==='SIGTERM')stop=cb;}},Date:{now:()=>now}, console:{log(){},error:(msg)=>failures.push(msg)},
 setTimeout:cb=>{now+=800;turn++;cb();},clearTimeout(){},DISCOVERY_BACKOFF:{initialMs:100},
 loadPayload:async()=>({payload:'fixture',revision:'test',theme:{id:'test',name:'test'}}),
 watchPayloadSources:()=>()=>{},watchOperationState:async()=>()=>{},listAppTargets:async()=>targets(),
 connectTarget:async target=>({target,on(){},close(){this.closed=true;},
   send(method){if(method.includes('addScript')){assert.ok(ok(target));sends.push([turn,target.id]);}return {identifier:'1'};},
   evaluate(){assert.ok(ok(target));return true;}}),
 probeSession:async s=>{probes.push([turn,s.target.id]);return {codex:ok(s.target),excludedPetSurface:s.target.id==='pet'&&!ok(s.target)};},
 cleanupExcludedSurface:async()=>true,earlyPayloadFor:()=>'',nextOperationToken:()=>'test',
 presentOperationUi:async()=>{},bestEffortOperationUi:async()=>{},waitForVerifiedSession:async()=>({pass:true})
};
await vm.runInNewContext(code+'\nrunWatch({timeoutMs:1})',env);
assert.deepEqual(failures,[]);assert.deepEqual(sends.map(p=>p[1]).sort(),['chat','late','new','pet']);
assert.ok(sends.some(([t,id])=>id==='pet'&&t===13)); // URL change bypasses negative cache
assert.ok(probes.some(([t,id])=>t===13 && id==='preview')); // close + reopen
assert.equal(probes.filter(([t,id])=>id==='pet'&&t<13).length,1);
assert.ok(probes.filter(([,id])=>id==='preview').length<16);
console.log('PASS: switching chats, preview open/close/reopen, late shell, new eligible window, excluded window navigation.');
