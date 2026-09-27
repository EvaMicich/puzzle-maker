// Uses Node's built-in WebSocket and an installed browser; no testing dependency.
const tabs=await (await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(tabs[0].webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let seq=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,m=>m.error?reject(m.error):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
if(process.argv.includes('--close')){await send('Browser.close');ws.close();process.exit(0);}
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
game.scene.processQueue();
const tree=game.scene.getScene('level2');
assert(game.scene.isActive('level2'),'Level 1 finish starts Level 2');
assert(tree.state.attemptsRemaining===5&&!tree.state.axeCollected,'Level 2 starts with five attempts and no axe');
assert(document.querySelector('footer').textContent.includes('axe')&&!document.querySelector('footer').textContent.includes('bow'),'Level 2 controls replace bow with axe');
const step=(n=1)=>{for(let i=0;i<n;i++)tree.update(0,1000/60)};
const held=(name,value)=>tree.keys[name].isDown=value;
function walk(x){held('D',tree.p.x<x);held('A',tree.p.x>x);let limit=180;while(Math.abs(tree.p.x-x)>3.5&&limit-->0)step();held('D',false);held('A',false);}
function jumpBranch(i){
 const from=tree.branches[i-1],to=tree.branches[i];
 // Stand away from green patches to prove the ordinary jumps are sufficient.
 walk(from.x+from.w/2-8);
 tree.keys.SPACE._justDown=true;
 held('D',tree.p.x<to.x+to.w/2);held('A',tree.p.x>to.x+to.w/2);
 step();assert(tree.p.vy>-450,'Normal jump '+i+' does not need slime');
 let limit=100;
 while(!tree.p.ground&&tree.mode==='outside'&&limit-->0){if(Math.abs(tree.p.x-(to.x+to.w/2))<4){held('D',false);held('A',false)}step()}
 held('D',false);held('A',false);
 assert(tree.state.checkpoint===i,'Exterior branch '+i+' reachable with normal jump');
}
for(let i=1;i<9;i++)jumpBranch(i);
assert(tree.mode==='loop'&&tree.state.inLoop,'Top branch enters attached loop mode');
held('D',true);step(198);held('D',false);
assert(Math.abs(tree.p.rotation-Math.PI)<.05,'Sneeker rotates completely upside down');
const upsideY=tree.p.y,angle=tree.loopAngle;step(120);
assert(tree.p.y===upsideY&&tree.loopAngle===angle&&tree.state.attemptsRemaining===5,'Stopping upside down cannot cause a fall');
held('A',true);step(15);held('A',false);assert(tree.loopAngle<angle,'Loop supports reverse movement');
held('D',true);step(230);held('D',false);assert(tree.mode==='hole','Full loop leads into visible tree hole');
step(130);assert(tree.mode==='inside'&&tree.state.enteredTree&&tree.cameras.main.scrollX===1400,'Hole transitions camera into hollow tree');
step(30);assert(tree.standing===0,'Safe interior entry branch');
tree.keys.F._justDown=true;step();assert(tree.state.destroyedBranches.length===0,'Cannot chop before collecting axe');
walk(1800);assert(tree.state.axeCollected,'Touching axe collects level-specific tool');
tree.keys.F._justDown=true;step();assert(tree.state.destroyedBranches.includes(0)&&tree.swing>0&&tree.chips.length>0,'One axe action swings and breaks a branch');
step(60);assert(tree.standing===1,'Chopped branch allows safe descent');
tree.keys.F._justDown=true;step(65);assert(tree.standing===2,'Second chop reaches unstable branch');
step(1140);assert(!tree.state.destroyedBranches.includes(2),'Unstable branch survives less than twenty seconds');
tree.keys.SPACE._justDown=true;step(70);assert(tree.barriers[2].stood<2,'Leaving branch resets continuous-standing timer');
step(1250);assert(tree.state.destroyedBranches.includes(2),'Unstable branch breaks after continuous twenty-second wait');
step(60);assert(tree.standing===3,'Unstable break descends safely');
tree.keys.F._justDown=true;step(70);assert(tree.standing===4,'Middle branch chops once');
tree.keys.F._justDown=true;step(70);assert(tree.standing===5,'Unstable branch can be chopped immediately');
tree.keys.F._justDown=true;step();assert(!tree.state.destroyedBranches.includes(5),'Trophy branch prevents accidentally skipping trophy');
walk(2090);assert(tree.state.trophyCollected,'Trophy collected on second-last descent stage');
tree.p.y=1700;step();assert(tree.state.trophyCollected&&tree.state.axeCollected&&tree.state.attemptsRemaining===4&&tree.standing===5,'Failure keeps tools, trophy and recent checkpoint');
tree.keys.F._justDown=true;step(75);assert(tree.state.completed&&!tree.state.axeCollected,'Finish completes Level 2 and discards axe');
game.scene.processQueue();
const boss=game.scene.getScene('level3');
assert(game.scene.isActive('level3'),'Level 2 finish starts final boss');
assert(boss.state.dragonHP===300&&boss.state.hearts===20&&boss.state.phase===1,'Boss starts with 300 HP and ten full hearts');
assert(!boss.keys.G&&!document.querySelector('footer').textContent.includes('bow'),'No bow or grapple in boss arena');
const btick=(n=1)=>{for(let i=0;i<n;i++)boss.update(0,1000/60)};
const bkey=(name,on)=>boss.keys[name].isDown=on;
function bwalk(x){bkey('D',boss.p.x<x);bkey('A',boss.p.x>x);let limit=300;while(Math.abs(boss.p.x-x)>4.1&&limit-->0)btick();bkey('D',false);bkey('A',false);}
function strike(){boss.keys.F._justDown=true;btick();}
function waitAttack(name,limit=3000){while(boss.state.attack!==name&&limit-->0)btick();assert(boss.state.attack===name,'Boss reaches '+name);}
boss.p.x=120;btick(30);assert(boss.state.hearts===19&&boss.p.ground&&boss.p.x===600,'Lava removes exactly half a heart and respawns safely');
boss.p.y=650;btick();assert(boss.state.hearts===19,'Lava respawn immunity prevents rapid damage');
btick(85);boss.damage(2);boss.damage(2);assert(boss.state.hearts===17,'Ordinary damage is one heart with invulnerability');
boss.keys.R._justDown=true;btick();game.scene.processQueue();assert(boss.state.hearts===20&&boss.state.dragonHP===300,'Boss restart resets health and battle');
const hp=[];
for(let i=0;i<5;i++){
 const oldX=boss.weakPoint().x;bwalk(oldX-40);boss.p.face=1;strike();hp.push(boss.state.dragonHP);
 assert(boss.state.dragonHP===300-(i+1)*20,'Tree hit '+(i+1)+' deals exactly 20 HP');
 if(i<4){assert(boss.state.attack==='relocating'&&boss.weakPoint().x!==oldX,'Tail disappears and changes location');btick(49);}
}
assert(boss.state.phase===2&&boss.state.dragonHP===200,'Five tree hits begin Phase 2 at 200 HP');
const beforeFire=boss.state.hearts;waitAttack('fire');btick(1);assert(boss.state.hearts===beforeFire-2,'Fire costs one full heart');
btick(75);assert(boss.state.hearts===beforeFire-2,'One breath cannot repeatedly drain hearts');
waitAttack('vulnerable');assert(boss.attackDuration===15,'Fire opens a fifteen-second vulnerable window');
btick(902);assert(boss.state.attack==='fire-warning','Fire cycle repeats if no axe hits');
bwalk(boss.fireX<600?950:260);const dodgeHealth=boss.state.hearts;waitAttack('vulnerable');assert(boss.state.hearts===dodgeHealth,'Running out of the marked fire path avoids damage');
btick(60);bwalk(boss.weakPoint().x-40);boss.p.face=1;
for(let i=0;i<5;i++){
 strike();hp.push(boss.state.dragonHP);assert(boss.state.dragonHP===200-(i+1)*20,'Phase 2 hit '+(i+1)+' deals exactly 20 HP');
 const once=boss.state.dragonHP;boss.axeAttack();assert(boss.state.dragonHP===once,'Single swing cannot register twice');
 if(i<4)btick(34);
}
assert(boss.state.phase===3&&boss.state.dragonHP===100,'Five Phase 2 hits begin Phase 3 at 100 HP');
const spinHealth=boss.state.hearts;waitAttack('spin-pass');waitAttack('spin-warning');
assert(boss.state.spinPasses===1&&boss.state.hearts===spinHealth-2,'One distinct spin pass costs one heart at most');
while(boss.state.spinPasses<5){
 const count=boss.state.spinPasses;bwalk(boss.target.x<600?boss.target.x+200:boss.target.x-200);
 let guard=200;while(boss.state.spinPasses===count&&guard-->0)btick();
 assert(boss.state.spinPasses===count+1,'Spin pass '+(count+1)+' completes');
}
assert(boss.state.spinPasses===5&&boss.state.hearts===spinHealth-2,'Exactly five spin passes; later passes are dodgeable');
assert(boss.state.attack==='flight','Spin sequence leads to blue-wing flight');
let phase3Hits=0;
for(let i=0;i<2;i++){
 waitAttack('swoop-warning');bwalk(boss.target.x<600?940:260);waitAttack('low');
 bwalk(boss.weakPoint().x-40);boss.p.face=1;strike();hp.push(boss.state.dragonHP);phase3Hits++;
 const after=boss.state.dragonHP;btick(34);strike();assert(boss.state.dragonHP===after,'Each low swoop opening registers only one hit');
 if(i===0)waitAttack('flight');
}
waitAttack('final-tree');assert(boss.state.swoops===2&&boss.state.dragonHP===60,'After two swoops the final tree stops attacks');
bwalk(boss.weakPoint().x-40);boss.p.face=1;
while(boss.state.dragonHP>0){strike();hp.push(boss.state.dragonHP);phase3Hits++;if(boss.state.dragonHP>0)btick(34);}
assert(phase3Hits===5&&boss.state.dragonHP===0&&boss.state.attack==='defeated','Exactly five Phase 3 hits defeat the dragon');
assert(hp.join(',')==='280,260,240,220,200,180,160,140,120,100,80,60,40,20,0','Exact 300 to 200 to 100 to zero damage sequence');
btick(80);assert(!boss.state.trophyCollected&&boss.attackTime>1.2,'Defeat reveals trophy and waits for collection');
bwalk(600);game.scene.processQueue();assert(boss.state.trophyCollected&&boss.state.completed&&game.scene.isActive('ending'),'Collecting third trophy enters final room');
const ending=game.scene.getScene('ending');
assert([1,2,3].every(n=>game.registry.get('trophies').includes(n)),'Full run preserves all three earned trophies');
assert(['#1','#2','#3','YOU WIN','Made by Owen'].every(t=>ending.children.list.some(c=>c.text===t)),'Square trophy room labels all trophies and credits Owen');
ending.children.list.find(c=>c.text==='Choose a Level').emit('pointerdown');game.scene.processQueue();
assert(game.scene.isActive('levels'),'Ending replay opens Choose a Level');
function choose(n){const menu=game.scene.getScene('levels');menu.children.list.find(c=>c.text?.startsWith('Level '+n+' —')).emit('pointerdown');game.scene.processQueue();}
choose(3);assert(game.scene.isActive('level3')&&boss.state.hearts===20&&boss.state.dragonHP===300&&boss.state.spinPasses===0&&!boss.state.trophyCollected,'Level 3 menu button resets entire boss');
boss.state.hearts=1;boss.damage(1);game.scene.processQueue();assert(game.scene.isActive('levels')&&!game.scene.isActive('level3'),'Zero hearts opens level selection without automatic restart');
choose(1);assert(game.scene.isActive('level')&&s.state.targetsHit===0&&!s.state.trophyCollected,'Level 1 menu button initializes Level 1');
document.querySelector('#levels').click();game.scene.processQueue();choose(2);
assert(game.scene.isActive('level2')&&tree.state.checkpoint===0&&!tree.state.axeCollected,'Level 2 menu button initializes Level 2');
tree.keys.R._justDown=true;step();game.scene.processQueue();
assert(tree.mode==='outside'&&tree.state.attemptsRemaining===5&&!tree.state.trophyCollected,'R restarts only Level 2 cleanly');
held('G',true);let grappleLimit=120;while(tree.state.checkpoint===0&&grappleLimit-->0)step();held('G',false);step(5);assert(tree.state.checkpoint===1&&tree.p.ground,'Grapple pulls to a suitable tree branch');
const b=tree.branches[tree.state.checkpoint];walk(b.x+b.w-12);tree.keys.SPACE._justDown=true;step();
assert(tree.launchRemaining>0&&tree.p.vy<-450&&tree.p.vx>0,'Optional slime jump gives upward and forward momentum');
const cp=tree.state.checkpoint;step(80);assert(tree.state.checkpoint===cp+1,'Slime lands on intended next branch');
tree.p.y=790;step();assert(tree.state.attemptsRemaining===4&&tree.state.checkpoint===cp+1,'Outdoor fall retries recent checkpoint');
for(let i=0;i<4;i++){tree.p.y=790;step();game.scene.processQueue()}
assert(tree.state.attemptsRemaining===5&&tree.state.checkpoint===0&&!tree.state.enteredTree&&game.scene.isActive('level2'),'Fifth failed attempt restarts Level 2, never Level 1');
tree.scene.start('level');game.scene.processQueue();assert(game.scene.isActive('level')&&s.targets.length===6&&!s.state.completed,'Returning to Level 1 restores fresh target game');
s.keys.F.isDown=true;tick(30);s.keys.F.isDown=false;assert(s.state.targetsHit>0,'Level 1 bow still works after Level 2');
return {checks,canvas:!!document.querySelector('canvas')};})()`});
console.log(JSON.stringify({result,errors},null,2));
if(!result.exceptionDetails){
  await send('Page.navigate',{url:'http://127.0.0.1:5173/?level=2'});
  await new Promise(r=>setTimeout(r,1500));
  const initial=await send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{const g=window.puzzleMaker;const s=g.scene.getScene('level2');return {active:g.scene.isActive('level2'),x:s.p.x,attempts:s.state.attemptsRemaining,axe:s.state.axeCollected}})()`});
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
  await new Promise(r=>setTimeout(r,180));
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
  const moved=await send('Runtime.evaluate',{returnByValue:true,expression:'window.puzzleMaker.scene.getScene("level2").p.x'});
  const direct=initial.result?.value;
  const ok=direct?.active&&direct.attempts===5&&!direct.axe&&moved.result?.value>direct.x;
  console.log(JSON.stringify({directLevel2LaunchAndNativeKeyboard:ok,errors}));
  if(!ok)process.exitCode=1;
  await send('Page.navigate',{url:'http://127.0.0.1:5173/?level=3'});
  await new Promise(r=>setTimeout(r,1200));
  const finalChecks=await send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{
    const g=window.puzzleMaker,s=g.scene.getScene('level3');g.loop.sleep();
    if(!g.scene.isActive('level3')||s.state.hearts!==20||s.state.dragonHP!==300)throw Error('Direct boss launch');
    s.state.dragonHP=100;s.state.phase=3;s.setAttack('spin-warning',1.2);
    let limit=1000;while(s.state.spinPasses<5&&limit-->0)s.update(0,1000/60);
    if(s.state.spinPasses!==5||s.state.hearts!==10)throw Error('Five distinct spin hits must cost exactly five hearts');
    s.state.dragonHP=20;s.setAttack('final-tree');s.p.x=s.weakPoint().x-40;s.p.face=1;s.axeAttack();
    for(let i=0;i<80;i++)s.update(0,1000/60);
    s.p.x=600;s.update(0,1000/60);g.scene.processQueue();
    if(!g.scene.isActive('ending')||g.registry.get('trophies').join(',')!=='3')throw Error('Direct replay must not invent earlier trophies');
    const texts=g.scene.getScene('ending').children.list.map(c=>c.text);
    if(!texts.includes('Find in Level 1')||!texts.includes('Find in Level 2'))throw Error('Missing trophy slots need labels');
    return {directBossLaunch:true,fiveSeparateSpinHits:true,onlyEarnedTrophiesAwarded:true};
  })()`});
  console.log(JSON.stringify({finalChecks,errors}));
  if(finalChecks.exceptionDetails)process.exitCode=1;
}
if(!result.exceptionDetails&&!errors.length)await send('Browser.close');ws.close();
if(errors.length||result.exceptionDetails)process.exitCode=1;
