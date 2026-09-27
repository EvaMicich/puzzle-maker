// Uses Node's built-in WebSocket and an installed browser; no testing dependency.
const tabs=await (await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(tabs[0].webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let seq=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,m=>m.error?reject(m.error):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
await send('Runtime.enable');await send('Page.enable');await send('Page.navigate',{url:'http://127.0.0.1:5173'});
await new Promise(r=>setTimeout(r,5000));
const result=await send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{
const game=window.puzzleMaker;if(!game)throw Error('Game did not boot');const s=game.scene.getScene('level');game.loop.sleep();
const checks=[];const assert=(ok,msg)=>{if(!ok)throw Error(msg);checks.push(msg)};
const tick=(n=1)=>{for(let i=0;i<n;i++)s.update(0,1000/60)};
const key=(name,value)=>s.keys[name].isDown=value;
assert(s.targets.length===6,'Six reference targets');tick();
s.p.x=1100;key('S',true);tick();key('S',false);assert(s.area===0,'Target gate blocks descent');
s.p.x=65;key('F',true);tick(420);key('F',false);assert(s.state.targetsHit===6&&s.state.targetSectionComplete,'Bow hits every target and opens gate');
s.p.x=1100;key('S',true);tick(65);key('S',false);assert(s.area===1&&s.p.y===414,'Right ladder reaches corridor');
tick(100);assert(s.shots.some(a=>a.enemy&&a.vx===0&&a.vy>0),'Ceiling traps fire downward');
const count=s.state.targetsHit;s.shots.push({x:s.p.x,y:s.p.y-5,vx:0,vy:220,enemy:true});tick();assert(s.immune>0&&s.p.x===1100&&s.state.targetsHit===count,'Arrow retry preserves target progress');
key('S',true);tick();key('S',false);assert(s.area===1,'Trophy gate blocks bottom ladder');
s.p.x=80;s.p.y=414;tick();assert(s.state.trophyCollected&&!s.state.trapsActive&&s.state.bottomLadderUnlocked,'Trophy stops traps and unlocks bottom ladder');assert(!s.shots.some(a=>a.enemy),'Pickup removes falling arrows');
s.p.x=1100;key('S',true);tick(100);key('S',false);tick(2);assert(s.area===2&&s.p.ground,'Bottom ladder reaches red landing');
s.p.y=780;tick();assert(s.p.x===1100&&s.state.trophyCollected,'Platform fall preserves trophy');
key('G',true);tick(8);assert(s.hook&&s.p.x<1100,'Grapple attaches and pulls toward a platform');key('G',false);tick();assert(!s.hook,'Grapple releases');s.resetToEntrance();
s.p.x=791;s.p.y=673;key('W',true);tick(32);key('W',false);tick();assert(s.p.y<=596,'Yellow ladder climbs onto its platform');s.resetToEntrance();
function jumpTo(x){s.keys.SPACE._justDown=true;key('A',true);let limit=180;while(s.p.x>x&&limit-->0)tick();key('A',false);tick(65);}
jumpTo(910);assert(Math.abs(s.p.y-651)<1,'Orange platform reachable');
jumpTo(754);assert(Math.abs(s.p.y-595)<1,'Yellow platform reachable');
jumpTo(572);assert(Math.abs(s.p.y-613)<1,'Rotating green platform reachable');
jumpTo(407);assert(Math.abs(s.p.y-634)<1,'Blue platform reachable');
s.keys.SPACE._justDown=true;key('A',true);let limit=100;while(s.p.x>257&&limit-->0)tick();key('A',false);tick(100);assert(s.state.completed,'Slime launches onto finish and completes level');
assert(s.children.list.some(c=>c.text==='Level 2 — Coming Next'),'Simple Level 2 placeholder appears');
return {checks,state:s.state,canvas:!!document.querySelector('canvas')};})()`});
console.log(JSON.stringify({result,errors},null,2));
await send('Browser.close');ws.close();
if(errors.length||result.exceptionDetails)process.exitCode=1;
