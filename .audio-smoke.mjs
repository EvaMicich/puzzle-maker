// Real Web Audio nodes + event wiring, using the same installed browser as gameplay checks.
const tabs = await (await fetch('http://127.0.0.1:9222/json')).json();
const ws = new WebSocket(tabs.find(t=>t.type==='page'&&!t.url.startsWith('chrome-extension:')).webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { pending.get(m.id)?.(m.result); pending.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails); });
const send = (method, params = {}) => new Promise(resolve => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
await send('Runtime.enable'); await send('Page.enable'); await send('Page.navigate', { url: 'http://127.0.0.1:5173/?level=3' });
for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,250));const ready=await send('Runtime.evaluate',{returnByValue:true,expression:'!!window.puzzleMaker?.scene?.isActive("level3")'});if(ready.result?.value)break;}
const result = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, userGesture: true, expression: `(async()=>{
const loaded=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/sound.ts'));
const {sfx}=await import(loaded.name); const g=window.puzzleMaker; g.loop.sleep();
const checks=[];const ok=(condition,message)=>{if(!condition)throw Error(message);checks.push(message)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
ok(sfx.enabled&&!sfx.context,'Default on; AudioContext waits for first interaction');
ok(sfx.pendingIgnition,'Direct boss start queues ignition until audio is permitted');
await sfx.unlock(); await wait(30);
ok(sfx.context.state==='running'&&sfx.last.has('ignite'),'First interaction unlocks boss ignition');
const context=sfx.context;await sfx.unlock();ok(sfx.context===context,'One reused AudioContext');
sfx.stopAll();await wait(300);ok(sfx.voices.size===0,'Stopped audio nodes dispose');
sfx.play('ding');await wait(450);ok(sfx.voices.size===0,'Naturally finished nodes dispose');
const layers=[],originalLayer=sfx.layer.bind(sfx);sfx.layer=(layer,delay)=>{layers.push({...layer,delay});originalLayer(layer,delay)};
const effects=['land','arrow','ding','clang','step','fwip','clink','boing','whack','ignite','fire','roar','defeat','spin','swoop'];
for(const effect of effects){sfx.play(effect);ok(sfx.voices.size>0,effect+' synthesizes audio');sfx.stopAll();await wait(200)}
ok(layers.filter(l=>l.build).every(l=>l.gain<=.24),'Building spin/fire envelopes have capped gains');
sfx.play('clang');const count=sfx.voices.size;sfx.play('clang');ok(sfx.voices.size===count,'Simultaneous clangs are limited');
sfx.stopAll();await wait(200);sfx.play('step');const steps=sfx.voices.size;sfx.play('step');ok(sfx.voices.size===steps,'Ladder sound is rate-limited');
sfx.stopAll();await wait(200);sfx.grapple();ok(layers.at(-1).delay===.075,'Clink follows fwip rather than playing on top');
document.querySelector('#sound').click();await wait(200);ok(!sfx.enabled&&sfx.voices.size===0,'Mute stops playing and scheduled sounds');
sfx.play('whack');ok(sfx.voices.size===0,'Mute suppresses new sounds');
document.querySelector('#sound').click();await wait(30);ok(sfx.enabled&&sfx.context===context,'Unmute reuses context');
// Capture scene event requests without filling the output device during accelerated simulation.
sfx.stopAll();await wait(200);const events=[];sfx.play=(name,delay)=>events.push({name,delay});
function scene(key){g.scene.getScenes(true)[0].scene.start(key);g.scene.processQueue();events.length=0;return g.scene.getScene(key)}
const names=()=>events.map(e=>e.name);const tick=(s,n=1)=>{for(let i=0;i<n;i++)s.update(0,1000/60)};
const one=scene('level');tick(one,8);events.length=0;
one.keys.SPACE._justDown=true;tick(one);ok(events.length===0,'Jump takeoff is silent');tick(one,70);ok(names().filter(n=>n==='land').length===1,'One pop on landing');
events.length=0;tick(one,60);ok(events.length===0,'Standing/walking floor contact does not repeat pop');
one.shoot();ok(names().includes('arrow'),'Bow firing whooshes');tick(one,35);ok(names().includes('ding'),'Confirmed target hit dings');
one.area=1;one.p.x=1100;one.p.y=414;one.p.vy=0;one.p.ground=true;one.state.trapsActive=false;one.shots=[{x:300,y:422,vx:0,vy:220,enemy:true}];events.length=0;tick(one);ok(names().includes('clang'),'Falling arrow clangs only at floor');
events.length=0;one.shots=[];one.p.x=80;tick(one);ok(events.length===0&&one.state.trophyCollected,'Level 1 trophy is silent');
one.area=2;one.p.x=1100;one.p.y=500;one.keys.S.isDown=true;events.length=0;tick(one);one.keys.S.isDown=false;ok(names().includes('step'),'Moving on ladder requests wooden steps');
one.p.y=664;one.p.ground=true;one.keys.G.isDown=true;events.length=0;tick(one);one.keys.G.isDown=false;ok(names().join(',')==='fwip,clink','Level 1 grapple fires and attaches');
const two=scene('level2');two.standing=1;two.p.x=213;two.p.y=644;events.length=0;two.jump();ok(names().includes('boing'),'Slime launch boings');
two.enterLoop();events.length=0;two.keys.D.isDown=true;tick(two,120);two.keys.D.isDown=false;ok(events.length===0,'Gravity loop stays quiet');
two.enterTree();two.p.y=184;two.p.ground=true;two.standing=0;two.state.axeCollected=true;events.length=0;two.chop();ok(names().join(',')==='whack','Axe branch destruction gives one whack');
two.state.trophyCollected=false;two.p.x=2090;two.p.y=1264;two.p.vy=0;two.p.ground=true;events.length=0;tick(two);ok(two.state.trophyCollected&&events.length===0,'Level 2 trophy is silent');
two.scene.restart();g.scene.processQueue();two.keys.G.isDown=true;events.length=0;tick(two);two.keys.G.isDown=false;ok(names().includes('fwip')&&names().includes('clink'),'Level 2 reuses grapple pair');
const boss=scene('level3');boss.scene.restart();g.scene.processQueue();ok(names().includes('ignite')&&!names().includes('roar'),'Boss starts with ignition, not roar');
events.length=0;boss.axeAttack();ok(events.length===0,'Missed axe swing is silent');boss.cooldown=0;boss.p.x=390;boss.p.face=1;boss.axeAttack();ok(names().join(',')==='roar','Successful twenty-HP hit roars');
events.length=0;boss.setAttack('fire');ok(names().join(',')==='fire','Fire breath starts flame effect');
events.length=0;boss.setAttack('spin-warning');ok(names().join(',')==='spin','Spin buildup starts once per pass');
events.length=0;boss.setAttack('swoop');ok(names().join(',')==='swoop','Swoop starts deeper whoosh');
events.length=0;boss.damage(2);ok(events.length===0,'Player damage has no invented sound');
boss.state.dragonHP=20;boss.setAttack('final-tree');boss.p.x=boss.weakPoint().x-40;boss.cooldown=0;events.length=0;boss.axeAttack();ok(names().join(',')==='defeat','Final damage uses one longer defeat roar');
boss.attackTime=2;boss.p.x=600;boss.p.y=564;boss.p.ground=true;boss.p.vy=0;events.length=0;tick(boss);g.scene.processQueue();ok(g.scene.isActive('ending')&&events.length===0,'Final trophy and win room are silent');
ok(sfx.context===context,'All scenes share the same context');
return {checks};})()` });
console.log(JSON.stringify({result,errors},null,2));
ws.close();if(result.exceptionDetails||errors.length)process.exitCode=1;
