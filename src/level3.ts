import Phaser from 'phaser';
import { awardTrophy, hasTrophy } from './trophies';

const INK = 0x51483f;
type Attack = 'tree' | 'relocating' | 'fire-warning' | 'fire' | 'vulnerable'
  | 'spin-warning' | 'spin-pass' | 'flight' | 'swoop-warning' | 'swoop'
  | 'low' | 'final-tree' | 'defeated';
export type BossState = {
  dragonHP: number; phase: 1 | 2 | 3; hearts: number; attack: Attack;
  treeIndex: number; spinPasses: number; swoops: number;
  trophyCollected: boolean; completed: boolean;
};
let audio: AudioContext | undefined;

function sound(kind: 'swing' | 'hit' | 'hurt' | 'fire' | 'win') {
  if (document.querySelector('#sound')?.getAttribute('aria-pressed') !== 'true') return;
  try {
    audio ??= new AudioContext(); void audio.resume();
    const t = audio.currentTime, oscillator = audio.createOscillator(), gain = audio.createGain();
    const frequency = { swing: 190, hit: 330, hurt: 130, fire: 85, win: 520 }[kind];
    oscillator.type = kind === 'fire' ? 'sawtooth' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, t);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'win' ? 850 : 45, t + .18);
    gain.gain.setValueAtTime(.055, t); gain.gain.exponentialRampToValueAtTime(.001, t + .22);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(t); oscillator.stop(t + .23);
  } catch { /* Sound is optional. */ }
}

function page(level: string, controls: string) {
  document.querySelector('h1 small')!.textContent = level;
  document.title = `Puzzle Maker — ${level}`;
  document.querySelector('footer')!.innerHTML = controls;
  document.querySelector('#game')!.setAttribute('aria-label', `Puzzle Maker. ${level}. ${controls.replace(/<[^>]*>/g, '')}`);
  const button = document.querySelector<HTMLButtonElement>('#sound')!;
  button.onclick = () => {
    const on = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(on)); button.textContent = on ? 'Sound on' : 'Sound off';
    sound('hit');
  };
}

function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 18) {
  return scene.add.text(x, y, text, {
    fontFamily: 'Comic Sans MS, Trebuchet MS, cursive', fontSize: size, color: '#51483f',
  });
}

function wood(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color = 0x96724f) {
  const pts = [{ x: x + 2, y }, { x: x + w - 3, y: y + 1 }, { x: x + w, y: y + h }, { x, y: y + h - 2 }];
  g.fillStyle(color); g.fillPoints(pts, true); g.lineStyle(2, INK, .8); g.strokePoints(pts, true);
  g.lineStyle(1, 0xf5e5c6, .25);
  for (let i = 6; i < w - 2; i += 9) g.lineBetween(x + i, y + 3, x + i - 3, y + h - 3);
}

function trophy(g: Phaser.GameObjects.Graphics, x: number, y: number, earned = true) {
  const color = earned ? 0xe9c63e : 0xc8c4b9;
  g.lineStyle(4, earned ? 0xb08a24 : 0xa7a398); g.strokeCircle(x - 16, y - 26, 11); g.strokeCircle(x + 16, y - 26, 11);
  g.fillStyle(color); g.fillRect(x - 13, y - 43, 26, 30);
  g.lineBetween(x, y - 13, x, y - 1); g.fillRect(x - 19, y - 3, 38, 7);
}

function battleAxe(g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number) {
  g.save(); g.translateCanvas(x, y); g.rotateCanvas(angle);
  g.lineStyle(5, 0x79634e); g.lineBetween(0, 16, 0, -23);
  g.fillStyle(0xbdc9cf); g.lineStyle(1.5, INK);
  const blade = [{ x: 0, y: -29 }, { x: 22, y: -36 }, { x: 26, y: -16 }, { x: 0, y: -19 }, { x: -19, y: -14 }, { x: -23, y: -33 }];
  g.fillPoints(blade, true); g.strokePoints(blade, true);
  g.fillStyle(0xd4b158); g.fillCircle(0, -23, 4); g.restore();
}

function sneeker(g: Phaser.GameObjects.Graphics, x: number, y: number, face: number, stride: number, axe = false, swing = 0) {
  g.save(); g.translateCanvas(x, y);
  g.lineStyle(7, 0x838786); g.lineBetween(-4, 6, -7 - stride, 16); g.lineBetween(4, 6, 7 + stride, 16);
  wood(g, -7, -12, 14, 20, 0x858b88);
  g.lineStyle(5, 0x858b88); g.lineBetween(-7, -8, -15, -5); g.lineBetween(7, -8, 15, -5);
  g.fillStyle(0xe19a74); g.fillRect(-18, -8, 5, 6); g.fillRect(13, -8, 5, 6);
  g.fillStyle(0xdf916f); g.fillEllipse(0, -23, 25, 28); g.lineStyle(1.5, INK); g.strokeEllipse(0, -23, 25, 28);
  g.fillStyle(0xf0be9a); g.fillRect(-11, -29, 22, 7); g.lineStyle(1.2, INK);
  g.strokePoints([{ x: -11, y: -23 }, { x: -6, y: -25 }, { x: -2, y: -21 }, { x: 3, y: -25 }, { x: 7, y: -22 }, { x: 11, y: -24 }]);
  g.lineBetween(-6, -28, -6, -25); g.lineBetween(6, -28, 6, -25); g.lineBetween(-3, -16, 3, -16);
  g.fillStyle(0xc68e67); g.fillRect(-8, 3, 16, 4); g.lineStyle(1, INK); g.strokeRect(-3, 2, 6, 6);
  if (axe) battleAxe(g, face * 23, -9, face * (swing > 0 ? -1.1 + (1 - swing / .28) * 2.8 : .3));
  g.restore();
}

export class Level3 extends Phaser.Scene {
  state!: BossState;
  p = { x: 300, y: 564, vx: 0, vy: 0, ground: true, face: 1 };
  dragon = { x: 820, y: 365, angle: 0, scale: 1 };
  treeXs = [430, 850, 560, 310, 740];
  elapsed = 0;
  attackTime = 0;
  attackDuration = 0;
  invulnerable = 0;
  cooldown = 0;
  swing = 0;
  flash = 0;
  passHit = false;
  lowHit = false;
  fireX = 400;
  target = { x: 600, y: 540 };
  passStart = { x: 250, y: 300 };
  passEnd = { x: 950, y: 300 };
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  world!: Phaser.GameObjects.Graphics;
  moving!: Phaser.GameObjects.Graphics;
  hud!: Phaser.GameObjects.Graphics;
  hpText!: Phaser.GameObjects.Text;
  phaseText!: Phaser.GameObjects.Text;
  hint!: Phaser.GameObjects.Text;

  constructor() { super('level3'); }

  create(data: { elapsed?: number } = {}) {
    this.state = { dragonHP: 300, phase: 1, hearts: 20, attack: 'tree', treeIndex: 0, spinPasses: 0, swoops: 0, trophyCollected: false, completed: false };
    this.p = { x: 300, y: 564, vx: 0, vy: 0, ground: true, face: 1 };
    this.dragon = { x: 820, y: 365, angle: 0, scale: 1 };
    this.elapsed = data.elapsed ?? 0; this.attackTime = 0; this.attackDuration = 0;
    this.invulnerable = 0; this.cooldown = 0; this.swing = 0; this.flash = 0; this.passHit = false; this.lowHit = false;
    this.fireX = 400; this.target = { x: 600, y: 540 }; this.passStart = { x: 250, y: 300 }; this.passEnd = { x: 950, y: 300 };
    this.keys = this.input.keyboard!.addKeys('A,D,LEFT,RIGHT,SPACE,F,R') as typeof this.keys;
    this.input.keyboard!.addCapture(['SPACE', 'LEFT', 'RIGHT']);
    this.world = this.add.graphics(); this.moving = this.add.graphics(); this.hud = this.add.graphics().setDepth(5);
    this.hpText = label(this, 600, 25, '', 20).setOrigin(.5, 0).setDepth(6);
    this.phaseText = label(this, 600, 96, '', 19).setOrigin(.5).setDepth(6);
    this.hint = label(this, 600, 728, '', 15).setOrigin(.5).setDepth(6);
    label(this, 32, 21, '03 / FINAL BOSS', 15);
    label(this, 32, 106, 'Sneeker', 12);
    this.world.fillStyle(0xfff9e9, .48); this.world.fillRoundedRect(16, 145, 1168, 555, 8);
    page('Level 3 — Final Boss', '<span><b>A D / ← →</b> run · <b>Space</b> jump · <b>F</b> battle axe</span><span><b>R</b> restart boss · <b>Levels</b> choose a level</span>');
    this.draw();
  }

  setAttack(attack: Attack, duration = 0) {
    this.state.attack = attack; this.attackTime = 0; this.attackDuration = duration;
    this.passHit = false; this.lowHit = false;
    if (attack === 'fire-warning') this.fireX = Phaser.Math.Clamp(this.p.x, 260, 940);
    if (attack === 'fire') sound('fire');
    if (attack === 'spin-warning') {
      const left = this.state.spinPasses % 2 === 0;
      this.passStart = { x: left ? 270 : 930, y: 300 };
      this.passEnd = { x: left ? 930 : 270, y: 300 };
      this.target = { x: this.p.x, y: this.p.y - 5 };
      this.dragon.x = this.passStart.x; this.dragon.y = this.passStart.y;
    }
    if (attack === 'swoop-warning') {
      this.passStart = { x: this.dragon.x, y: this.dragon.y };
      this.target = { x: this.p.x, y: this.p.y - 5 };
      this.passEnd = { x: 820, y: 535 };
      this.state.swoops++;
    }
  }

  weakPoint() {
    const tree = this.state.attack === 'tree' || this.state.attack === 'final-tree';
    return tree ? { x: this.treeXs[this.state.treeIndex], y: 548 }
      : { x: this.dragon.x - 150 * this.dragon.scale, y: this.dragon.y - 35 * this.dragon.scale };
  }

  axeAttack() {
    if (this.cooldown > 0 || this.state.dragonHP === 0) return;
    this.cooldown = .55; this.swing = .28; sound('swing');
    const a = this.state.attack;
    const vulnerable = a === 'tree' || a === 'final-tree' || a === 'vulnerable' || (a === 'low' && !this.lowHit);
    const point = this.weakPoint(), dx = point.x - this.p.x;
    if (!vulnerable || Math.abs(dx) > 65 || Math.abs(point.y - this.p.y) > 90 || dx * this.p.face < -18) return;
    // Damage is registered once here, never every frame of a swing.
    this.state.dragonHP -= 20; this.flash = .3; sound('hit');
    if (this.state.dragonHP === 0) { this.setAttack('defeated'); sound('win'); return; }
    if (this.state.dragonHP === 200) {
      this.state.phase = 2; this.dragon.scale = 1; this.dragon.angle = 0;
      this.setAttack('fire-warning', 1.7); return;
    }
    if (this.state.dragonHP === 100) {
      this.state.phase = 3; this.setAttack('spin-warning', 1.2); return;
    }
    if (a === 'tree') {
      this.state.treeIndex = (this.state.treeIndex + 1) % this.treeXs.length;
      this.setAttack('relocating', .8);
    }
    if (a === 'low') this.lowHit = true;
  }

  damage(units: number): boolean {
    if (this.invulnerable > 0 || this.state.hearts <= 0) return false;
    this.state.hearts = Math.max(0, this.state.hearts - units); this.invulnerable = 1.15; sound('hurt');
    if (this.state.hearts === 0) this.scene.start('levels', { elapsed: this.elapsed, defeated: true });
    return true;
  }

  lava() {
    this.damage(1);
    Object.assign(this.p, { x: 600, y: 564, vx: 0, vy: 0, ground: true });
    this.invulnerable = Math.max(this.invulnerable, 1.3);
  }

  passPosition(progress: number) {
    const start = progress < .5 ? this.passStart : this.target;
    const end = progress < .5 ? this.target : this.passEnd;
    const t = progress < .5 ? progress * 2 : (progress - .5) * 2;
    this.dragon.x = Phaser.Math.Linear(start.x, end.x, t);
    this.dragon.y = Phaser.Math.Linear(start.y, end.y, t);
    if (!this.passHit && Math.hypot(this.p.x - this.dragon.x, this.p.y - this.dragon.y) < 66) {
      this.passHit = true; this.damage(2);
    }
  }

  bossUpdate(dt: number) {
    this.attackTime += dt;
    const a = this.state.attack, d = this.dragon;
    if (a === 'relocating' && this.attackTime >= .8) this.setAttack('tree');
    if (a === 'fire-warning' || a === 'fire') { d.x = 820; d.y = 365; d.scale = 1; d.angle = 0; }
    if (a === 'fire-warning' && this.attackTime >= this.attackDuration) this.setAttack('fire', 1.4);
    if (a === 'fire') {
      if (Math.abs(this.p.x - this.fireX) < 86 && this.p.y > 380 && !this.passHit) this.passHit = this.damage(2);
      if (this.attackTime >= this.attackDuration) this.setAttack('vulnerable', 15);
    }
    if (a === 'vulnerable') {
      d.x = 820; d.y = Phaser.Math.Linear(d.y, 535, Math.min(1, dt * 5));
      if (this.attackTime >= 15) this.setAttack('fire-warning', 1.7);
    }
    if (a === 'spin-warning' || a === 'spin-pass') { d.scale = .6; d.angle = this.elapsed * 25; }
    if (a === 'spin-warning' && this.attackTime >= this.attackDuration) this.setAttack('spin-pass', 1.05);
    if (a === 'spin-pass') {
      this.passPosition(Math.min(1, this.attackTime / 1.05));
      if (this.attackTime >= 1.05) {
        this.state.spinPasses++;
        this.setAttack(this.state.spinPasses < 5 ? 'spin-warning' : 'flight', this.state.spinPasses < 5 ? 1.2 : 2.3);
      }
    }
    if (a === 'flight') {
      d.angle = 0; d.scale = .85;
      d.x = 600 + Math.sin(this.attackTime * 1.8) * 260; d.y = 285 + Math.cos(this.attackTime * 2) * 24;
      if (this.attackTime >= this.attackDuration) this.setAttack('swoop-warning', 1.2);
    }
    if (a === 'swoop-warning' && this.attackTime >= 1.2) this.setAttack('swoop', 1.3);
    if (a === 'swoop') {
      this.passPosition(Math.min(1, this.attackTime / 1.3));
      if (this.attackTime >= 1.3) { d.scale = 1; d.angle = 0; this.setAttack('low', 4); }
    }
    if (a === 'low') {
      d.x = 820; d.y = 535;
      if (this.attackTime >= 4) {
        if (this.state.swoops < 2) this.setAttack('flight', 2.3);
        else { this.state.treeIndex = 2; this.setAttack('final-tree'); }
      }
    }
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta / 1000, .033);
    this.elapsed += dt;
    this.cameras.main.setBackgroundColor(Phaser.Display.Color.HSLToColor((this.elapsed / 180) % 1, .38, .9).color);
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) { this.scene.restart({ elapsed: this.elapsed }); return; }
    if (this.state.completed || this.state.hearts <= 0) return;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.cooldown = Math.max(0, this.cooldown - dt); this.swing = Math.max(0, this.swing - dt); this.flash = Math.max(0, this.flash - dt);
    const p = this.p, k = this.keys;
    const left = k.A.isDown || k.LEFT.isDown, right = k.D.isDown || k.RIGHT.isDown;
    p.vx = (Number(right) - Number(left)) * 245;
    if (left || right) p.face = right ? 1 : -1;
    if (Phaser.Input.Keyboard.JustDown(k.SPACE) && p.ground) { p.vy = -430; p.ground = false; }
    const oldY = p.y;
    p.vy += 980 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.ground = false;
    if (p.vy >= 0 && oldY + 16 <= 584 && p.y + 16 >= 580 && p.x >= 182 && p.x <= 1018) { p.y = 564; p.vy = 0; p.ground = true; }
    if (p.y > 620 || p.x < 25 || p.x > 1175) this.lava();
    if (this.state.hearts === 0) return;
    if (Phaser.Input.Keyboard.JustDown(k.F)) this.axeAttack();
    this.bossUpdate(dt);
    if (this.state.attack === 'defeated' && this.attackTime > 1.2 && Math.abs(p.x - 600) < 32 && Math.abs(p.y - 564) < 44) {
      this.state.trophyCollected = true; this.state.completed = true; awardTrophy(this, 3); sound('win');
      this.scene.start('ending', { elapsed: this.elapsed }); return;
    }
    this.draw();
  }

  drawTree(g: Phaser.GameObjects.Graphics, x: number) {
    wood(g, x - 16, 477, 32, 103, 0x9e683c);
    g.lineStyle(8, 0x9e683c); g.lineBetween(x, 506, x - 33, 483); g.lineBetween(x, 516, x + 30, 483);
    const pts = [{ x: x - 57, y: 482 }, { x: x - 62, y: 449 }, { x: x - 39, y: 426 }, { x: x - 14, y: 431 }, { x: x + 4, y: 414 }, { x: x + 42, y: 435 }, { x: x + 53, y: 462 }, { x: x + 39, y: 492 }];
    g.fillStyle(0xa2c66f, .85); g.fillPoints(pts, true); g.lineStyle(3, 0x719348); g.strokePoints(pts, true);
    g.lineStyle(2, 0x779647, .7);
    for (let i = 0; i < 10; i++) g.lineBetween(x - 36 + i * 7, 442 + i % 3 * 5, x - 42 + i * 7, 480 - i % 2 * 6);
    g.lineStyle(2, 0x96623d); g.strokePoints([{ x: x + 15, y: 568 }, { x: x + 46, y: 571 }, { x: x + 61, y: 557 }]);
  }

  drawDragon(g: Phaser.GameObjects.Graphics, brown = false) {
    const d = this.dragon;
    g.save(); g.translateCanvas(d.x, d.y); g.rotateCanvas(d.angle); g.scaleCanvas(d.scale, d.scale);
    const wing = brown ? 0x7f8551 : 0x1d9dc4;
    // Two distinct blue wings, large and swept upward as in Owen's drawing.
    const wings = [
      [{ x: -30, y: -30 }, { x: -42, y: -125 }, { x: 1, y: -195 }, { x: 68, y: -203 }, { x: 124, y: -153 }, { x: 58, y: -129 }],
      [{ x: 16, y: -25 }, { x: 62, y: -130 }, { x: 110, y: -172 }, { x: 177, y: -156 }, { x: 203, y: -106 }, { x: 138, y: -111 }],
    ];
    wings.forEach(points => {
      g.fillStyle(wing, .19); g.fillPoints(points, true); g.lineStyle(5, wing); g.strokePoints(points, true);
      g.lineStyle(12, wing, .85); g.lineBetween(points[0].x + 6, points[0].y - 3, points[2].x, points[2].y + 9);
    });
    const tail = [{ x: 95, y: 5 }, { x: 182, y: -5 }, { x: 260, y: 28 }, { x: 301, y: 32 }, { x: 271, y: 67 }, { x: 166, y: 87 }, { x: 94, y: 43 }];
    g.fillStyle(brown ? 0x878451 : 0xf4efe1); g.fillPoints(tail, true); g.lineStyle(3, 0x9c703e); g.strokePoints(tail, true);
    g.fillStyle(0x9ec365, .65); g.fillEllipse(303, 33, 67, 125); g.lineStyle(3, 0x85aa50); g.strokeEllipse(303, 33, 67, 125);
    for (const x of [-95, -44, 43, 86]) {
      const leg = [{ x, y: 35 }, { x: x + 23, y: 42 }, { x: x + 12, y: 91 }, { x: x - 12, y: 83 }];
      g.fillStyle(brown ? 0x878451 : 0xf3f0e5); g.fillPoints(leg, true); g.lineStyle(2, 0x617266); g.strokePoints(leg, true);
    }
    const body = [{ x: -145, y: -58 }, { x: -104, y: -70 }, { x: -12, y: -39 }, { x: 105, y: -7 }, { x: 115, y: 35 }, { x: 85, y: 59 }, { x: -7, y: 45 }, { x: -112, y: 0 }];
    g.fillStyle(brown ? 0x848356 : 0xfffdf3); g.fillPoints(body, true); g.lineStyle(3, 0x617266); g.strokePoints(body, true);
    for (const [x, y, w] of [[-120, -34, 19], [-58, -45, 23], [-58, 4, 22], [7, 12, 27], [63, -8, 24], [85, 40, 17]]) {
      const patch = [{ x: x - w, y: y - 8 }, { x: x - 6, y: y - 15 }, { x: x + w, y: y - 9 }, { x: x + w - 4, y: y + 9 }, { x, y: y + 14 }, { x: x - w + 3, y: y + 5 }];
      g.fillStyle(brown ? 0x55563a : 0x444441, .88); g.fillPoints(patch, true);
      g.lineStyle(1, 0x99998c, .4); g.lineBetween(x - w, y, x + w, y + 3);
    }
    g.fillStyle(brown ? 0x8f8050 : 0xdb706a); g.fillEllipse(-161, -69, 75, 91);
    g.lineStyle(3, brown ? INK : 0xb75050); g.strokeEllipse(-161, -69, 75, 91);
    g.lineStyle(3, INK); g.lineBetween(-176, -87, -176, -72); g.lineBetween(-161, -86, -161, -71);
    g.lineBetween(-182, -57, -142, -52); g.fillStyle(0xd5dadb);
    g.fillTriangle(-180, -55, -172, -36, -165, -53); g.fillTriangle(-164, -53, -156, -34, -148, -52);
    g.lineStyle(1, INK); g.strokeTriangle(-180, -55, -172, -36, -165, -53); g.strokeTriangle(-164, -53, -156, -34, -148, -52);
    g.restore();
  }

  draw() {
    const g = this.moving; g.clear();
    const a = this.state.attack;
    g.fillStyle(0xcf6d4c, .83); g.fillRoundedRect(25, 280, 1150, 413, 60);
    g.lineStyle(3, 0xe9a75e, .75);
    for (let i = 0; i < 24; i++) {
      const x = 40 + (i * 149) % 1120, y = 315 + (i * 97) % 360;
      g.strokeEllipse(x, y + Math.sin(this.elapsed * 1.4 + i) * 4, 13 + Math.sin(this.elapsed + i) * 4, 5);
    }
    if (!['tree', 'relocating', 'final-tree', 'defeated'].includes(a)) this.drawDragon(g, a === 'spin-warning' || a === 'spin-pass');
    wood(g, 180, 580, 840, 78, 0x9c8967);
    g.lineStyle(5, 0xb6bd83); g.lineBetween(183, 580, 1017, 580);
    if (a === 'tree' || a === 'final-tree') this.drawTree(g, this.treeXs[this.state.treeIndex]);
    if (a === 'fire-warning') {
      g.fillStyle(0xf5c85b, .25); g.fillRect(this.fireX - 86, 400, 172, 178);
      g.lineStyle(3, 0xad663b); g.strokeRect(this.fireX - 86, 401, 172, 177);
    }
    if (a === 'fire') {
      g.fillStyle(0xedb74b, .86); g.fillTriangle(659, 314, this.fireX - 86, 580, this.fireX + 86, 580);
      g.fillStyle(0xe47937, .85); g.fillTriangle(655, 316, this.fireX - 50, 580, this.fireX + 50, 580);
      for (let i = 0; i < 7; i++) { g.fillStyle(0xf3ca60, .8); g.fillEllipse(this.fireX - 65 + i * 22, 558 - Math.sin(this.elapsed * 8 + i) * 8, 22, 37); }
    }
    if (a === 'spin-warning' || a === 'swoop-warning') {
      g.lineStyle(2, 0x9c773c, .65); g.lineBetween(this.dragon.x, this.dragon.y, this.target.x, this.target.y);
      g.strokeEllipse(this.target.x, 578, 95, 13);
    }
    if (a === 'vulnerable' || (a === 'low' && !this.lowHit)) {
      const point = this.weakPoint(); g.lineStyle(2, 0x719548, .85); g.strokeCircle(point.x, point.y, 31);
    }
    if (this.flash > 0) { const point = this.weakPoint(); g.lineStyle(2, 0xf2d374, this.flash / .3); g.strokeCircle(point.x, point.y, 36 + (1 - this.flash / .3) * 15); }
    if (a === 'defeated') {
      if (this.attackTime < 1.2) {
        this.dragon.x = 820; this.dragon.y = 480 + this.attackTime * 35; this.dragon.scale = Math.max(.05, 1 - this.attackTime / 1.2); this.dragon.angle = .15;
        this.drawDragon(g);
      } else trophy(g, 600, 575);
    }
    if (this.invulnerable === 0 || Math.floor(this.elapsed * 12) % 2 === 0) sneeker(g, this.p.x, this.p.y, this.p.face, this.p.ground ? Math.sin(this.elapsed * 15) * Math.min(3, Math.abs(this.p.vx) / 80) : 2, true, this.swing);
    this.drawHUD();
  }

  drawHUD() {
    const g = this.hud; g.clear();
    this.hpText.setText(`DRAGON — ${this.state.dragonHP} / 300 HP`);
    g.fillStyle(0xcfc8b8); g.fillRoundedRect(390, 60, 420, 14, 5);
    if (this.state.dragonHP > 0) { g.fillStyle(0xb96b5d); g.fillRoundedRect(390, 60, 420 * this.state.dragonHP / 300, 14, 5); }
    for (let i = 1; i < 3; i++) { g.lineStyle(2, 0xfaf3e3); g.lineBetween(390 + i * 140, 60, 390 + i * 140, 74); }
    for (let i = 0; i < 10; i++) {
      const x = 43 + i * 26, y = 79, units = this.state.hearts - i * 2;
      const heart = [{ x, y: y + 10 }, { x: x - 10, y }, { x: x - 9, y: y - 7 }, { x: x - 3, y: y - 9 }, { x, y: y - 5 }, { x: x + 3, y: y - 9 }, { x: x + 9, y: y - 7 }, { x: x + 10, y }];
      g.fillStyle(units >= 2 ? 0xcb7168 : 0xd5cec0); g.fillPoints(heart, true);
      if (units === 1) { g.fillStyle(0xcb7168); g.fillPoints([heart[0], heart[1], heart[2], heart[3], heart[4], { x, y: y + 10 }], true); }
      g.lineStyle(1.2, INK); g.strokePoints(heart, true);
    }
    const a = this.state.attack;
    this.phaseText.setText(this.state.dragonHP === 0 ? 'Dragon defeated — collect trophy #3' : `Phase ${this.state.phase} / 3 · ${this.state.phase === 1 ? 'Find the tree-tail' : this.state.phase === 2 ? 'Fire breath' : 'The final phase'}`);
    const hints: Record<Attack, string> = {
      tree: 'Find the green tree-tail. Move close and press F for one battle-axe swing.',
      relocating: 'The tail escaped! Look for its new hiding place.',
      'fire-warning': 'Fire is coming! RUN out of the marked strip.',
      fire: 'Keep clear of the fire. A chance to attack is coming…',
      vulnerable: `Now! The dragon is resting — approach the green circle and press F. ${Math.max(0, Math.ceil(15 - this.attackTime))}s`,
      'spin-warning': `Spin-jet pass ${this.state.spinPasses + 1} / 5 — move away from the marked spot!`,
      'spin-pass': `Spin-jet pass ${this.state.spinPasses + 1} / 5 — dodge or jump!`,
      flight: 'The blue wings are back. Watch for the next swoop.',
      'swoop-warning': 'Swoop incoming — move away from the marked spot!',
      swoop: 'Dodge the swoop. The dragon will land for a moment.',
      low: this.lowHit ? 'Good hit! Get ready to dodge again.' : 'The dragon is low! One clear axe strike before it takes off.',
      'final-tree': 'The attacks have stopped. Find the tree-tail and finish the fight!',
      defeated: 'You did it! Walk over to the golden trophy in the middle.',
    };
    this.hint.setText(hints[a]);
  }
}

export class ChooseLevel extends Phaser.Scene {
  elapsed = 0;
  constructor() { super('levels'); }
  create(data: { elapsed?: number; defeated?: boolean } = {}) {
    this.elapsed = data.elapsed ?? 0;
    page('Choose a Level', '<span>Three levels. Owen’s complete game.</span><span>Choose a level to play again.</span>');
    label(this, 600, 170, 'CHOOSE A LEVEL', 36).setOrigin(.5);
    label(this, 600, 225, data.defeated ? 'Out of hearts. Pick any level and try again.' : 'Puzzle Maker · Made by Owen', 18).setOrigin(.5);
    ['Targets & platforms', 'The loop tree', 'The final dragon'].forEach((name, i) => {
      const button = label(this, 600, 315 + i * 85, `Level ${i + 1} — ${name}`, 23).setOrigin(.5)
        .setPadding(25, 14).setBackgroundColor('#e1d9c5').setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.scene.start(['level', 'level2', 'level3'][i], { elapsed: this.elapsed }));
    });
  }
  update(_time: number, delta: number) {
    this.elapsed += Math.min(delta / 1000, .033);
    this.cameras.main.setBackgroundColor(Phaser.Display.Color.HSLToColor((this.elapsed / 180) % 1, .38, .9).color);
  }
}

export class Ending extends Phaser.Scene {
  elapsed = 0;
  constructor() { super('ending'); }
  create(data: { elapsed?: number } = {}) {
    this.elapsed = data.elapsed ?? 0;
    page('YOU WIN', '<span>Puzzle Maker · Made by Owen</span><span>All three levels. The end.</span>');
    const g = this.add.graphics();
    g.fillStyle(0xf9f1df, .85); g.fillRect(350, 85, 500, 500);
    g.lineStyle(3, INK, .75); g.strokeRect(350, 85, 500, 500); g.strokeRect(357, 92, 486, 486);
    label(this, 600, 135, 'YOU WIN', 40).setOrigin(.5);
    label(this, 600, 205, 'Puzzle Maker', 28).setOrigin(.5);
    label(this, 600, 247, 'Made by Owen', 26).setOrigin(.5);
    wood(g, 409, 402, 382, 64, 0xa89572);
    for (let i = 1; i <= 3; i++) {
      const x = 460 + (i - 1) * 140, earned = hasTrophy(this, i);
      trophy(g, x, 387, earned);
      label(this, x, 420, `#${i}`, 23).setOrigin(.5);
      if (!earned) label(this, x, 487, `Find in Level ${i}`, 12).setOrigin(.5);
    }
    sneeker(g, 600, 558, 1, 0);
    const replay = label(this, 600, 653, 'Choose a Level', 23).setOrigin(.5).setPadding(22, 12)
      .setBackgroundColor('#e1d9c5').setInteractive({ useHandCursor: true });
    replay.on('pointerdown', () => this.scene.start('levels', { elapsed: this.elapsed }));
  }
  update(_time: number, delta: number) {
    this.elapsed += Math.min(delta / 1000, .033);
    this.cameras.main.setBackgroundColor(Phaser.Display.Color.HSLToColor((this.elapsed / 180) % 1, .38, .9).color);
  }
}
