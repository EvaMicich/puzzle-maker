import Phaser from 'phaser';
import './style.css';
import { sfx } from './sound';
import { CharacterSelect, selectedCharacter, drawBanana } from './character';
import { Level2 } from './level2';
import { Level3, ChooseLevel, Ending } from './level3';
import { awardTrophy } from './trophies';

const INK = 0x51483f;
type Platform = { x:number; y:number; w:number; h:number; color:number; kind?:string };
type Shot = { x:number; y:number; vx:number; vy:number; enemy:boolean };
type Target = { x:number; y:number; hit:boolean; flash:number };
export type LevelState = { targetsHit:number; targetSectionComplete:boolean; trophyCollected:boolean; trapsActive:boolean; bottomLadderUnlocked:boolean; completed:boolean };

class Level extends Phaser.Scene {
  state!: LevelState;
  p = { x:65,y:226,vx:0,vy:0,ground:true,face:1 };
  area = 0;
  targets:Target[] = [];
  shots:Shot[] = [];
  platforms:Platform[] = [];
  keys!:Record<string,Phaser.Input.Keyboard.Key>;
  art!:Phaser.GameObjects.Graphics;
  moving!:Phaser.GameObjects.Graphics;
  hud!:Phaser.GameObjects.Text;
  note!:Phaser.GameObjects.Text;
  hook?:{x:number;y:number};
  elapsed=0; fireAt=0; immune=0; coyote=0; jumpBuffer=0; bounceLock=0;
  trapNext:number[]=[];
  trapXs=[170,275,390,505,630,755,870,970];


  constructor(){super('level');}
  create(){
    document.querySelector('h1 small')!.textContent = 'Level 1';
    document.title = 'Puzzle Maker — Owen’s Level 1';
    document.querySelector('footer')!.innerHTML = '<span><b>A D / ← →</b> move · <b>W S / ↑ ↓</b> ladders · <b>Space</b> jump · <b>F</b> bow · <b>G</b> hold to grapple</span><span>Click to aim & shoot · <b>R</b> restart</span>';
    document.querySelector('#game')!.setAttribute('aria-label', 'Puzzle Maker Level 1. Arrows or WASD to move, Space to jump, F to shoot, G to grapple.');
    this.events.once('shutdown', () => sfx.stopAll());
    this.state={targetsHit:0,targetSectionComplete:false,trophyCollected:false,trapsActive:true,bottomLadderUnlocked:false,completed:false};
    this.p={x:65,y:226,vx:0,vy:0,ground:true,face:1};this.area=0;this.elapsed=0;this.fireAt=0;this.immune=0;this.coyote=0;this.jumpBuffer=0;this.bounceLock=0;this.hook=undefined;this.shots=[];
    this.targets=[{x:165,y:173},{x:205,y:105},{x:438,y:188},{x:474,y:106},{x:739,y:117},{x:983,y:133}].map(t=>({...t,hit:false,flash:0}));
    this.trapNext=this.trapXs.map((_,i)=>1.4+(i%3)*.8);
    this.platforms=[{x:995,y:680,w:170,h:30,color:0xd77a79},{x:872,y:667,w:74,h:44,color:0xf19a27},{x:694,y:611,w:110,h:100,color:0xe8c631,kind:'yellow'},{x:526,y:629,w:90,h:24,color:0x80b94b,kind:'spin'},{x:355,y:650,w:105,h:38,color:0x339cc8},{x:225,y:666,w:66,h:45,color:0x8661b5,kind:'slime'},{x:30,y:643,w:134,h:68,color:0xe9975b,kind:'finish'}];
    this.art=this.add.graphics();this.moving=this.add.graphics();
    this.keys=this.input.keyboard!.addKeys('A,D,W,S,LEFT,RIGHT,UP,DOWN,SPACE,F,G,R') as typeof this.keys;
    this.input.keyboard!.addCapture(['SPACE','UP','DOWN','LEFT','RIGHT']);
    this.label(28,18,'01 / THE TARGETS',13);this.label(28,282,'02 / THE ARROW CORRIDOR',13);this.label(28,472,'03 / THE PLATFORMS',13);
    this.label(39,210,'start',12);this.label(53,568,'finish ↓',22);this.label(217,588,'slime ↓',18);this.label(521,560,'spinning ↓',18);this.label(808,584,'ladder',13);
    this.label(668,353,'Ah',18);this.label(1010,716,'Owen’s Level 1',12);
    this.hud=this.label(1170,20,'',15).setOrigin(1,0);
    this.note=this.label(600,742,'',14).setOrigin(.5,1);
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{if(!this.state.completed)this.shoot(pointer.worldX,pointer.worldY);});
    this.drawWorld();this.message();
  }
  label(x:number,y:number,text:string,size:number){return this.add.text(x,y,text,{fontFamily:'Comic Sans MS, Trebuchet MS, cursive',fontSize:size,color:'#51483f'});}
  box(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,color:number){
    g.fillStyle(color,.86);g.fillRect(x,y,w,h);g.lineStyle(1.6,INK,.85);g.strokePoints([{x:x-1,y:y+2},{x:x+w-2,y:y-1},{x:x+w+1,y:y+h},{x:x+2,y:y+h+1}],true);
    g.lineStyle(1,0xffffff,.23);for(let i=5;i<w-2;i+=7)g.lineBetween(x+i,y+3,x+i-3,y+h-3);
  }
  ladder(g:Phaser.GameObjects.Graphics,x:number,top:number,bottom:number,open:boolean){
    g.lineStyle(4,open?0x937450:0xa7a194,open?.9:.35);g.lineBetween(x-17,top,x-19,bottom);g.lineBetween(x+17,top,x+19,bottom);
    g.lineStyle(3,open?0x937450:0xa7a194,open?.9:.35);for(let y=top+8;y<bottom;y+=17)g.lineBetween(x-17,y,x+17,y+1);
  }
  drawWorld(){
    const g=this.art;g.clear();
    g.fillStyle(0xfffdf5,.65);g.fillRect(15,45,1170,194);g.fillStyle(0xfffdf5,.45);g.fillRect(15,275,1170,155);g.fillStyle(0xfffdf5,.57);g.fillRect(15,460,1170,262);
    g.lineStyle(2,INK,.75);g.lineBetween(20,240,1180,240);g.lineBetween(20,430,1067,430);g.lineBetween(20,434,1067,432);g.lineBetween(1133,430,1180,430);
    this.box(g,35,202,48,37,0x9c6b3d);
    this.ladder(g,1100,242,422,this.state.targetSectionComplete);this.ladder(g,1100,432,679,this.state.bottomLadderUnlocked);this.ladder(g,791,612,690,true);
    if(!this.state.targetSectionComplete){g.lineStyle(4,0x9c6b3d);g.lineBetween(1075,250,1125,250);}
    if(!this.state.bottomLadderUnlocked){g.lineStyle(4,0x9c6b3d);g.lineBetween(1075,444,1125,444);}
    for(const t of this.targets){g.lineStyle(1.5,INK,.7);g.lineBetween(t.x+2,47,t.x,t.y-28);}
    for(const p of this.platforms){if(p.kind!=='spin')this.box(g,p.x,p.y,p.w,p.h,p.color);if(p.kind==='slime'){this.box(g,p.x-2,p.y-9,p.w+4,12,0x87c94e);g.fillStyle(0x87c94e);g.fillRoundedRect(p.x+9,p.y-2,8,14,4);g.fillRoundedRect(p.x+42,p.y-2,7,10,3);}}
    // The little wall person is a drawing, never a game actor.
    g.lineStyle(1.7,INK,.65);g.strokeCircle(648,378,13);g.lineBetween(648,391,646,413);g.lineBetween(646,402,628,391);g.lineBetween(646,402,664,394);g.lineBetween(646,413,632,428);g.lineBetween(646,413,660,428);g.strokeCircle(652,379,4);
    g.lineStyle(1,INK,.12);for(let i=0;i<180;i++){const x=20+(i*137)%1150,y=52+(i*79)%660;g.lineBetween(x,y,x+3,y+1);}
  }
  message(custom?:string){
    this.hud.setText(this.area===0?`${this.state.targetsHit} / 6 targets` : this.state.trophyCollected?'Trophy collected ✓':'Trophy ←');
    this.note.setText(custom??(this.area===0?(this.state.targetSectionComplete?'All six! Head right →  then hold ↓ on the ladder.':'Walk across the top. Hold F to aim at nearby targets and shoot.') : this.area===1?(this.state.trophyCollected?'The arrows have stopped. Return right →  and climb down.':'← Collect the trophy. Watch the ceiling: a glow means an arrow is coming.'):'← Orange · yellow ladder · spinning green · blue · slime · finish'));
  }
  shoot(aimX?:number,aimY?:number){
    if(this.elapsed<this.fireAt)return;this.fireAt=this.elapsed+.32;sfx.play('arrow');
    const p=this.p;let dx=p.face,dy=0;
    if(aimX!==undefined&&aimY!==undefined){dx=aimX-p.x;dy=aimY-(p.y-15);}else if(this.area===0){const t=this.targets.filter(t=>!t.hit).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(t){dx=t.x-p.x;dy=t.y-(p.y-15);}}
    const length=Math.hypot(dx,dy)||1;this.shots.push({x:p.x,y:p.y-15,vx:dx/length*600,vy:dy/length*600,enemy:false});
  }
  resetToEntrance(){this.p.x=1100;this.p.y=this.area===1?414:664;this.p.vx=0;this.p.vy=0;this.p.ground=true;this.hook=undefined;this.immune=1.6;this.message(this.area===1?'Try again from the right — your progress is safe.':'Back at the bottom ladder. Try another jump!');}
  update(_time:number,delta:number){
    const dt=Math.min(delta/1000,.033);this.elapsed+=dt;
    const bg=Phaser.Display.Color.HSLToColor((this.elapsed/180)%1,.38,.9);this.cameras.main.setBackgroundColor(bg.color);
    if(Phaser.Input.Keyboard.JustDown(this.keys.R)){this.scene.restart();return;}if(this.state.completed)return;
    const k=this.keys,p=this.p;const left=k.A.isDown||k.LEFT.isDown,right=k.D.isDown||k.RIGHT.isDown,up=k.W.isDown||k.UP.isDown,down=k.S.isDown||k.DOWN.isDown;
    this.immune=Math.max(0,this.immune-dt);this.bounceLock=Math.max(0,this.bounceLock-dt);
    if(k.F.isDown)this.shoot();
    if(Phaser.Input.Keyboard.JustDown(k.SPACE))this.jumpBuffer=.13;else this.jumpBuffer-=dt;
    if(p.ground)this.coyote=.1;else this.coyote-=dt;
    const climbY=p.y; let climbing=false;
    if(Math.abs(p.x-1100)<28&&(up||down)){
      if(this.area===0&&this.state.targetSectionComplete&&down){this.area=1;p.y=290;p.ground=false;this.hook=undefined;this.trapNext=this.trapXs.map((_,i)=>this.elapsed+1.4+(i%3)*.8);this.message();}
      if(this.area===1&&p.y>=407&&down&&this.state.bottomLadderUnlocked){this.area=2;p.y=455;p.ground=false;this.hook=undefined;this.message();}
      const bottom=this.area===1?414:664;
      if(this.area>0&&p.y<bottom){climbing=true;p.x=1100;p.vy=(down?145:-145);p.y=Phaser.Math.Clamp(p.y+p.vy*dt,this.area===1?260:455,bottom);}
    }
    if(this.area===2&&Math.abs(p.x-791)<26&&p.y>590&&p.y<706&&(up||down)){climbing=true;p.vy=0;p.y+= (down?150:-150)*dt;if(p.y<=595){p.y=595;p.ground=true;}}
    if(this.bounceLock===0)p.vx=(Number(right)-Number(left))*210;
    if(left||right)p.face=right?1:-1;
    if(this.jumpBuffer>0&&(this.coyote>0||climbing)){p.vy=-390;p.ground=false;climbing=false;this.jumpBuffer=0;this.coyote=0;}
    if(k.G.isDown&&!this.hook&&this.area===2){const candidates=this.platforms.filter(s=>s.kind!=='finish'&&s.x+s.w/2<p.x-20&&Math.hypot(s.x+s.w/2-p.x,s.y-25-p.y)<230);const s=candidates.sort((a,b)=>b.x-a.x)[0];if(s){this.hook={x:s.x+s.w/2,y:s.y-24};sfx.grapple();}}
    if(!k.G.isDown)this.hook=undefined;
    if(this.hook){const dx=this.hook.x-p.x,dy=this.hook.y-p.y,len=Math.hypot(dx,dy);if(len>18){p.vx=dx/len*250;p.vy=dy/len*250;p.ground=false;}else this.hook=undefined;}
    const oldY=p.y;
    if(!climbing){if(!this.hook)p.vy+=980*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.ground=false;
      const surfaces=this.area===0?[{x:20,y:240,w:1160}]:this.area===1?[{x:20,y:430,w:1160}]:this.platforms;
      for(const s of surfaces){if(p.vy>=0&&oldY+16<=s.y+5&&p.y+16>=s.y&&p.x+10>s.x&&p.x-10<s.x+s.w){if(p.vy>60)sfx.play('land');p.y=s.y-16;p.vy=0;p.ground=true;
        if('kind'in s&&s.kind==='slime'){p.vy=-455;p.vx=-210;p.ground=false;this.bounceLock=.6;sfx.play('boing');}
        if('kind'in s&&s.kind==='finish'&&this.state.trophyCollected){this.complete();return;}break;}}
    }else{p.x+=p.vx*dt;}
    if(climbing&&p.y!==climbY)sfx.play('step');
    p.x=Phaser.Math.Clamp(p.x,32,1168);if(this.area===0)p.y=Math.max(p.y,75);if(this.area===1)p.y=Math.max(p.y,290);
    if(this.area===2&&p.y>760)this.resetToEntrance();
    if(this.area===1&&!this.state.trophyCollected&&p.x<106&&p.y>380){this.state.trophyCollected=true;awardTrophy(this,1);this.state.trapsActive=false;this.state.bottomLadderUnlocked=true;this.shots=this.shots.filter(s=>!s.enemy);this.drawWorld();this.message();}
    if(this.area===1&&this.state.trapsActive){this.trapXs.forEach((x,i)=>{if(this.elapsed>=this.trapNext[i]){this.shots.push({x,y:294,vx:0,vy:220,enemy:true});this.trapNext[i]=this.elapsed+2.65;}});}
    this.shots=this.shots.filter(s=>{
      s.x+=s.vx*dt;s.y+=s.vy*dt;
      if(s.enemy){if(this.area===1&&this.immune===0&&Math.abs(s.x-p.x)<17&&Math.abs(s.y-p.y)<27){this.resetToEntrance();return false;}if(s.y>=424)sfx.play('clang');return s.y<424;}
      if(this.area===0){for(const t of this.targets){if(!t.hit&&Math.abs(t.x-s.x)<28&&Math.abs(t.y-s.y)<27){t.hit=true;t.flash=this.elapsed;this.state.targetsHit++;sfx.play('ding');if(this.state.targetsHit===6){this.state.targetSectionComplete=true;this.drawWorld();}this.message();return false;}}}
      return s.x>0&&s.x<1200&&s.y>40&&s.y<(this.area===0?240:this.area===1?430:720);
    });
    this.drawMoving();
  }
  drawMoving(){
    const g=this.moving;g.clear();
    for(const t of this.targets){this.box(g,t.x-27,t.y-26,54,52,t.hit?0xd7c596:0xdf7154);g.fillStyle(t.hit?0xb9c987:0xe6b84c);g.fillEllipse(t.x,t.y,37,40);g.lineStyle(1.5,INK);g.strokeEllipse(t.x,t.y,37,40);g.fillStyle(0xece0aa);g.fillCircle(t.x,t.y,11);g.lineStyle(1.5,INK);g.strokeCircle(t.x,t.y,11);g.strokeCircle(t.x+1,t.y,4);if(t.hit){g.lineStyle(3,0x526b38);g.lineBetween(t.x-8,t.y,t.x-2,t.y+6);g.lineBetween(t.x-2,t.y+6,t.x+11,t.y-9);if(this.elapsed-t.flash<.4){g.lineStyle(2,0xd9a434,1-(this.elapsed-t.flash)/.4);g.strokeCircle(t.x,t.y,32+(this.elapsed-t.flash)*25);}}}
    if(!this.state.trophyCollected){g.lineStyle(4,0xb08a24);g.strokeCircle(65,386,11);g.strokeCircle(96,386,11);this.box(g,68,371,25,28,0xe9c63e);g.lineStyle(4,0xb08a24);g.lineBetween(80,398,80,415);this.box(g,63,415,34,6,0xe9c63e);}
    if(this.state.trapsActive)this.trapXs.forEach((x,i)=>{g.fillStyle(INK,.65);g.fillRect(x-8,283,16,5);if(this.area===1&&this.trapNext[i]-this.elapsed<.6){g.fillStyle(0xdc9957,.65);g.fillCircle(x,294,5);}});
    const spin=this.platforms[3];g.save();g.translateCanvas(spin.x+spin.w/2,spin.y+12);g.rotateCanvas(this.elapsed*.9);this.box(g,-35,-23,70,46,spin.color);g.restore();g.lineStyle(3,0x648d3b,.8);g.lineBetween(spin.x,spin.y,spin.x+spin.w,spin.y);
    for(const s of this.shots){g.save();g.translateCanvas(s.x,s.y);g.rotateCanvas(Math.atan2(s.vy,s.vx)-Math.PI/2);g.lineStyle(3,0x9c703c);g.lineBetween(0,-25,0,0);g.fillStyle(0x979da1);g.fillTriangle(0,8,-6,-4,6,-4);g.lineStyle(1,INK);g.strokeTriangle(0,8,-6,-4,6,-4);g.lineStyle(2,0xfffdf4);g.lineBetween(0,-20,-6,-27);g.lineBetween(0,-17,6,-25);g.lineBetween(0,-23,5,-30);g.restore();}
    if(this.hook){g.lineStyle(1.5,INK);g.lineBetween(this.p.x,this.p.y-8,this.hook.x,this.hook.y);g.strokeCircle(this.hook.x,this.hook.y,5);}
    const p=this.p;if(this.immune>0&&Math.floor(this.elapsed*12)%2===0)return;
    g.save();g.translateCanvas(p.x,p.y);const stride=p.ground?Math.sin(this.elapsed*15)*Math.min(Math.abs(p.vx)/210,1)*3:2;
    if(selectedCharacter(this)==='banana'){drawBanana(g,stride);}else{
    g.lineStyle(7,0x838786);g.lineBetween(-4,6,-7-stride,16);g.lineBetween(4,6,7+stride,16);this.box(g,-7,-12,14,20,0x858b88);g.lineStyle(5,0x858b88);g.lineBetween(-7,-8,-15,-5);g.lineBetween(7,-8,15,-5);g.fillStyle(0xe19a74);g.fillRect(-18,-8,5,6);g.fillRect(13,-8,5,6);
    g.fillStyle(0xdf916f);g.fillEllipse(0,-23,25,28);g.lineStyle(1.5,INK);g.strokeEllipse(0,-23,25,28);g.fillStyle(0xf0be9a);g.fillRect(-11,-29,22,7);g.lineStyle(1.2,INK);g.strokePoints([{x:-11,y:-23},{x:-6,y:-25},{x:-2,y:-21},{x:3,y:-25},{x:7,y:-22},{x:11,y:-24}]);g.lineBetween(-6,-28,-6,-25);g.lineBetween(6,-28,6,-25);g.lineBetween(-3,-16,3,-16);g.fillStyle(0xc68e67);g.fillRect(-8,3,16,4);g.lineStyle(1,INK);g.strokeRect(-3,2,6,6);g.lineBetween(0,-8,0,-2);
    }
    g.lineStyle(2,0x8a602f);g.beginPath();g.arc(p.face*17,-8,12,-Math.PI/2,Math.PI/2,p.face<0);g.strokePath();g.lineStyle(1,0xe9ddbd);g.lineBetween(p.face*17,-20,p.face*17,4);g.restore();
  }
  complete(){
    this.state.completed=true; this.hook=undefined; this.shots=[];
    this.scene.start('level2', { elapsed: this.elapsed });
  }
}

sfx.init();
const requested = new URLSearchParams(window.location.search).get('level');
const first = requested === '2' ? Level2 : requested === '3' ? Level3 : requested === 'menu' ? ChooseLevel : requested === '1' ? Level : CharacterSelect;
const scenes = [first, ...[Level,Level2,Level3,ChooseLevel,Ending,CharacterSelect].filter(scene => scene !== first)];
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1200,height:760,backgroundColor:'#f0e9df',antialias:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:scenes,audio:{noAudio:true}});
// Read-only state access for lightweight browser smoke checks; no debug UI or assets.
Object.defineProperty(window,'puzzleMaker',{value:game});

document.querySelector<HTMLButtonElement>('#levels')!.onclick = () => {
  const active = game.scene.getScenes(true)[0] as Phaser.Scene & { elapsed?: number };
  if (active) active.scene.start('levels', { elapsed: active.elapsed ?? 0 });
};