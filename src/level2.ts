import Phaser from 'phaser';
import { awardTrophy } from './trophies';

const INK = 0x51483f;
const GRAVITY = 980;
type Branch = {
  x: number; y: number; w: number; h: number;
  slime?: boolean; unstable?: boolean; stood: number;
};
type Mode = 'outside' | 'loop' | 'hole' | 'inside' | 'complete';
export type TreeState = {
  checkpoint: number;
  attemptsRemaining: number;
  inLoop: boolean;
  enteredTree: boolean;
  axeCollected: boolean;
  destroyedBranches: number[];
  trophyCollected: boolean;
  completed: boolean;
};

/** Owen's second drawing, kept independent of Level 1's working mechanics. */
export class Level2 extends Phaser.Scene {
  state!: TreeState;
  mode: Mode = 'outside';
  p = { x: 85, y: 684, vx: 0, vy: 0, ground: true, face: 1, rotation: 0 };
  branches: Branch[] = [];
  barriers: Branch[] = [];
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  art!: Phaser.GameObjects.Graphics;
  moving!: Phaser.GameObjects.Graphics;
  hud!: Phaser.GameObjects.Text;
  note!: Phaser.GameObjects.Text;
  hook?: { x: number; y: number };
  elapsed = 0;
  standing = 0;
  coyote = 0;
  jumpBuffer = 0;
  launchRemaining = 0;
  loopAngle = 0;
  holeTime = 0;
  swing = 0;
  feedback = 0;
  chips: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  audio?: AudioContext;
  soundEnabled = false;

  constructor() { super('level2'); }

  create(data: { elapsed?: number; soundEnabled?: boolean } = {}) {
    this.state = {
      checkpoint: 0, attemptsRemaining: 5, inLoop: false, enteredTree: false,
      axeCollected: false, destroyedBranches: [], trophyCollected: false, completed: false,
    };
    this.mode = 'outside';
    this.p = { x: 85, y: 684, vx: 0, vy: 0, ground: true, face: 1, rotation: 0 };
    this.elapsed = data.elapsed ?? 0;
    this.soundEnabled = data.soundEnabled ?? document.querySelector('#sound')?.getAttribute('aria-pressed') === 'true';
    this.standing = 0; this.coyote = 0; this.jumpBuffer = 0; this.launchRemaining = 0;
    this.loopAngle = 0; this.holeTime = 0; this.swing = 0; this.feedback = 0;
    this.hook = undefined; this.chips = [];
    // The first four trunks grow taller; smaller alternating branches lead into the loop.
    this.branches = [
      { x: 40, y: 700, w: 105, h: 18 },
      { x: 160, y: 660, w: 65, h: 52, slime: true },
      { x: 290, y: 603, w: 70, h: 109, slime: true },
      { x: 427, y: 542, w: 85, h: 170, slime: true },
      { x: 565, y: 480, w: 90, h: 232, slime: true },
      { x: 704, y: 425, w: 85, h: 12, slime: true },
      { x: 775, y: 369, w: 65, h: 12, slime: true },
      { x: 680, y: 315, w: 74, h: 12, slime: true },
      { x: 590, y: 280, w: 105, h: 13 },
    ].map(b => ({ ...b, stood: 0 }));
    this.barriers = [200, 400, 620, 850, 1080, 1280, 1510].map((y, i) => ({
      x: 1730, y, w: 490, h: i === 6 ? 24 : 16, stood: 0, unstable: i === 2 || i === 4,
    }));
    this.art = this.add.graphics();
    this.moving = this.add.graphics().setDepth(2);
    this.keys = this.input.keyboard!.addKeys('A,D,W,S,LEFT,RIGHT,UP,DOWN,SPACE,F,G,R') as typeof this.keys;
    this.input.keyboard!.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.label(30, 24, '02 / THE LOOP TREE', 18).setScrollFactor(0).setDepth(5);
    this.hud = this.label(1170, 25, '', 15).setOrigin(1, 0).setScrollFactor(0).setDepth(5);
    this.note = this.label(600, 737, '', 14).setOrigin(.5, 1).setScrollFactor(0).setDepth(5);
    this.label(43, 636, 'start ↓', 20);
    this.label(322, 715, 'up through the branches ↗', 15);
    this.label(467, 54, 'the green loop', 20);
    this.label(838, 220, 'hole ↓', 18);
    this.label(1001, 181, 'inside the tree', 16);
    this.label(1054, 659, 'finish ↓', 17);
    this.label(1740, 113, 'Inside Owen’s hollow tree', 24);
    this.label(1742, 244, 'Walk into the axe, then F: one whack.', 17);
    this.label(1742, 662, 'These branches wobble if you wait too long.', 16);
    this.label(1742, 1140, 'The trophy is on the next branch ↓', 18);
    this.label(1925, 1462, 'finish ↓', 24);
    document.querySelector('h1 small')!.textContent = 'Level 2';
    document.title = 'Puzzle Maker — Owen’s Level 2';
    document.querySelector('footer')!.innerHTML = '<span><b>A D / ← →</b> move · <b>W S / ↑ ↓</b> loop · <b>Space</b> jump / slime · <b>F</b> axe · <b>G</b> hold to grapple</span><span><b>R</b> restart Level 2</span>';
    document.querySelector('#game')!.setAttribute('aria-label', 'Puzzle Maker Level 2. Arrows or WASD to move, Space to jump or use slime, G to grapple, F to chop with the axe.');
    const soundButton = document.querySelector<HTMLButtonElement>('#sound')!;
    const refreshSound = () => {
      soundButton.textContent = this.soundEnabled ? 'Sound on' : 'Sound off';
      soundButton.setAttribute('aria-pressed', String(this.soundEnabled));
    };
    refreshSound();
    soundButton.onclick = () => { this.soundEnabled = !this.soundEnabled; refreshSound(); this.tone('pickup'); };
    this.cameras.main.setScroll(0, 0);
    this.drawWorld(); this.message(); this.drawMoving(0);
  }

  label(x: number, y: number, text: string, size: number) {
    return this.add.text(x, y, text, {
      fontFamily: 'Comic Sans MS, Trebuchet MS, cursive', fontSize: size, color: '#51483f',
    });
  }

  wood(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color = 0x936039) {
    const points = [{ x: x + 3, y }, { x: x + w - 6, y: y - 2 },
      { x: x + w + 2, y: y + h - 3 }, { x: x + 4, y: y + h + 2 }];
    g.fillStyle(color, .87); g.fillPoints(points, true);
    g.lineStyle(2, INK, .85); g.strokePoints(points, true);
    g.lineStyle(1.5, 0xf3d4a0, .23);
    for (let i = 7; i < w - 3; i += 9) g.lineBetween(x + i, y + 4, x + i - 3, y + h - 3);
  }

  loopPoint(angle: number) {
    // Broad uneven oval, with a slightly flattened right side like the pencil drawing.
    const a = Math.PI / 2 + angle;
    return { x: 660 + 180 * Math.cos(a) + 9 * Math.sin(2 * a), y: 165 + 115 * Math.sin(a) };
  }

  drawWorld() {
    const g = this.art; g.clear();
    g.fillStyle(0xfffdf5, .53); g.fillRoundedRect(15, 50, 1170, 675, 5);
    this.wood(g, 840, 254, 140, 460, 0x644b3d);
    // The visible hollow at the top connects the loop's exit to the inside view.
    g.fillStyle(0x302d27); g.fillEllipse(908, 257, 116, 28);
    g.lineStyle(3, 0xb19979); g.strokeEllipse(908, 257, 116, 28);
    const points = Array.from({ length: 100 }, (_, i) => this.loopPoint(i / 99 * Math.PI * 2));
    g.lineStyle(27, 0x93bc66, .75); g.strokePoints(points);
    g.lineStyle(2, 0x666448, .8); g.strokePoints(points);
    g.lineStyle(2, 0xc3db9f, .85);
    for (let i = 0; i < 100; i++) {
      const a = i / 100 * Math.PI * 2, p = this.loopPoint(a);
      g.lineBetween(p.x - 7, p.y - 8, p.x + 4, p.y + 8);
    }
    g.lineStyle(17, 0x93bc66, .8); g.lineBetween(660, 280, 844, 257);
    g.lineStyle(2, INK, .6); g.lineBetween(660, 280, 844, 257);
    this.branches.forEach((b, i) => {
      if (i === 0) {
        g.fillStyle(0xe2cf60); g.fillRect(b.x, b.y, b.w, b.h);
        g.fillStyle(0x9ac47f); g.fillRect(b.x + 8, b.y + 4, b.w - 16, 8);
      } else {
        this.wood(g, b.x, b.y, b.w, b.h);
        if (i >= 5) { g.lineStyle(5, 0x70523b); g.lineBetween(b.x + b.w, b.y + 5, 850, b.y + 10); }
        if (b.slime) {
          g.fillStyle(0x8fc957, .95); g.fillRoundedRect(b.x + b.w - 25, b.y - 7, 23, 10, 4);
          g.fillStyle(0xc7e8a3, .7); g.fillEllipse(b.x + b.w - 14, b.y - 4, 12, 3);
        }
      }
    });
    // A small diagram of the separate hollow tree, as on the right of Owen's page.
    this.wood(g, 1012, 224, 160, 460, 0x78604d);
    g.fillStyle(0xf2e7cd, .92); g.fillRoundedRect(1036, 230, 119, 432, 32);
    g.lineStyle(2, INK, .7);
    for (let y = 283; y < 650; y += 65) g.lineBetween(1036, y, 1149, y - 5);
    g.lineStyle(1.5, INK, .5); g.lineBetween(984, 262, 1004, 262); g.lineBetween(1004, 262, 997, 255);
    // Interior is a second part of this same scene; the camera moves into it.
    this.wood(g, 1685, 80, 70, 1500, 0x5e4436);
    this.wood(g, 2205, 80, 75, 1500, 0x5e4436);
    g.fillStyle(0xfff4dc, .67); g.fillRoundedRect(1750, 81, 455, 1495, 60);
    g.lineStyle(2, INK, .1);
    for (let i = 0; i < 160; i++) {
      const x = 1760 + (i * 137) % 430, y = 100 + (i * 79) % 1430;
      g.lineBetween(x, y, x + 7, y - 2);
    }
  }

  message(text?: string) {
    this.hud.setText(`${this.state.attemptsRemaining} / 5 attempts  ·  ${this.state.axeCollected ? 'Axe ✓  ·  ' : ''}${this.state.trophyCollected ? 'Trophy ✓' : this.mode === 'outside' ? 'Climb ↗' : ''}`);
    if (text) { this.note.setText(text); this.feedback = 3.5; return; }
    if (this.feedback > 0) return;
    this.note.setText(this.mode === 'outside'
      ? 'Climb toward the green loop. Space on green slime helps you reach the next branch.'
      : this.mode === 'loop' ? 'Stick to the loop! Hold → / D / W to go around; ← / A / S to reverse.'
      : this.mode === 'hole' ? 'Down the hole… into the same hollow tree.'
      : this.state.trophyCollected ? 'Trophy collected. One last whack, then down to the finish.'
      : this.state.axeCollected ? 'F: one whack per branch. Collect the trophy before the last drop.'
      : 'Pick up the axe on your left. Then F to chop the branch beneath your feet.');
  }

  tone(kind: 'chop' | 'slime' | 'pickup') {
    if (!this.soundEnabled) return;
    try {
      this.audio ??= new AudioContext(); void this.audio.resume();
      const a = this.audio, t = a.currentTime, o = a.createOscillator(), v = a.createGain();
      o.type = kind === 'chop' ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(kind === 'chop' ? 180 : 280, t);
      o.frequency.exponentialRampToValueAtTime(kind === 'chop' ? 45 : 700, t + .12);
      v.gain.setValueAtTime(.09, t); v.gain.exponentialRampToValueAtTime(.001, t + .18);
      o.connect(v); v.connect(a.destination); o.start(t); o.stop(t + .19);
      if (kind === 'chop') {
        const buffer = a.createBuffer(1, Math.floor(a.sampleRate * .07), a.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length) * .18;
        const noise = a.createBufferSource(); noise.buffer = buffer; noise.connect(a.destination); noise.start(t);
      }
    } catch { /* Audio is optional. */ }
  }

  fail() {
    this.state.attemptsRemaining--;
    if (this.state.attemptsRemaining === 0) {
      this.scene.restart({ elapsed: this.elapsed, soundEnabled: this.soundEnabled });
      return;
    }
    const b = this.state.enteredTree ? this.barriers[this.state.checkpoint] : this.branches[this.state.checkpoint];
    // A failed descent may have destroyed its checkpoint's floor. Restore only that floor.
    if (this.state.enteredTree) this.state.destroyedBranches = this.state.destroyedBranches.filter(i => i !== this.state.checkpoint);
    Object.assign(this.p, { x: b.x + b.w / 2, y: b.y - 16, vx: 0, vy: 0, ground: true, rotation: 0 });
    this.standing = this.state.checkpoint; this.hook = undefined; this.launchRemaining = 0;
    this.coyote = 0; this.jumpBuffer = 0;
    this.barriers.forEach(b => b.stood = 0);
    this.message('Back at your latest branch — your collected tools and trophy are safe.');
  }

  jump() {
    const b = this.branches[this.standing], next = this.branches[this.standing + 1];
    if (this.mode === 'outside' && b?.slime && next && this.p.x >= b.x + b.w - 34 && this.p.x <= b.x + b.w + 8) {
      const vy = -505;
      const height = next.y - b.y;
      const flight = (-vy + Math.sqrt(vy * vy + 2 * GRAVITY * height)) / GRAVITY;
      this.p.vx = (next.x + next.w / 2 - this.p.x) / flight;
      this.p.vy = vy; this.launchRemaining = flight;
      this.tone('slime');
    } else { this.p.vy = -430; }
    this.p.ground = false; this.jumpBuffer = 0; this.coyote = 0;
  }

  chop() {
    if (this.mode !== 'inside' || !this.state.axeCollected || this.swing > 0) return;
    this.swing = .27;
    if (!this.p.ground || this.standing < 0 || this.standing === 6) return;
    if (this.standing === 5 && !this.state.trophyCollected) {
      this.message('The trophy is on this branch — walk over and collect it first.'); return;
    }
    this.breakBranch(this.standing);
  }

  breakBranch(index: number) {
    if (this.state.destroyedBranches.includes(index)) return;
    this.state.destroyedBranches.push(index); this.tone('chop');
    const b = this.barriers[index];
    for (let i = 0; i < 9; i++) this.chips.push({
      x: this.p.x + (i - 4) * 11, y: b.y, vx: (i - 4) * 20, vy: -70 - i * 6, life: .5,
    });
    this.p.ground = false; this.standing = -1; this.coyote = 0;
  }

  enterLoop() {
    this.mode = 'loop'; this.state.inLoop = true; this.loopAngle = 0;
    this.hook = undefined; this.launchRemaining = 0; this.feedback = 0; this.message();
  }

  enterTree() {
    this.mode = 'inside'; this.state.inLoop = false; this.state.enteredTree = true;
    this.state.checkpoint = 0; this.standing = -1;
    Object.assign(this.p, { x: 1900, y: 131, vx: 0, vy: 0, rotation: 0, ground: false });
    this.cameras.main.setScroll(1400, 0); this.cameras.main.fadeIn(350);
    this.feedback = 0; this.message();
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta / 1000, .033);
    this.elapsed += dt;
    this.cameras.main.setBackgroundColor(Phaser.Display.Color.HSLToColor((this.elapsed / 180) % 1, .38, .9).color);
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      this.scene.restart({ elapsed: this.elapsed, soundEnabled: this.soundEnabled }); return;
    }
    if (this.state.completed) return;
    this.feedback = Math.max(0, this.feedback - dt);
    this.swing = Math.max(0, this.swing - dt);
    const k = this.keys, p = this.p;
    const left = k.A.isDown || k.LEFT.isDown, right = k.D.isDown || k.RIGHT.isDown;
    const up = k.W.isDown || k.UP.isDown, down = k.S.isDown || k.DOWN.isDown;

    if (this.mode === 'loop') {
      const direction = Number(right || up) - Number(left || down);
      this.loopAngle = Phaser.Math.Clamp(this.loopAngle + direction * dt * .95, 0, Math.PI * 2);
      const point = this.loopPoint(this.loopAngle);
      p.rotation = this.loopAngle;
      p.x = point.x + Math.sin(p.rotation) * 16; p.y = point.y - Math.cos(p.rotation) * 16;
      p.vx = direction * 150; p.vy = 0; p.ground = true;
      if (this.loopAngle >= Math.PI * 2) { this.mode = 'hole'; this.holeTime = 0; this.feedback = 0; }
    } else if (this.mode === 'hole') {
      this.holeTime += dt; p.rotation = 0; p.ground = false;
      const t = Math.min(1, this.holeTime / 1.3);
      p.x = Phaser.Math.Linear(660, 908, t); p.y = Phaser.Math.Linear(264, 241, t);
      if (this.holeTime > 1.3) p.y += (this.holeTime - 1.3) * 140;
      if (this.holeTime - dt < 1.65 && this.holeTime >= 1.65) this.cameras.main.fadeOut(300);
      if (this.holeTime >= 2) this.enterTree();
    } else {
      if (Phaser.Input.Keyboard.JustDown(k.SPACE)) this.jumpBuffer = .13;
      else this.jumpBuffer -= dt;
      if (p.ground) this.coyote = .1; else this.coyote -= dt;
      if (this.launchRemaining <= 0) p.vx = (Number(right) - Number(left)) * 210;
      else this.launchRemaining -= dt;
      if (left || right) p.face = right ? 1 : -1;
      if (this.jumpBuffer > 0 && this.coyote > 0) this.jump();
      if (Phaser.Input.Keyboard.JustDown(k.F)) this.chop();
      if (k.G.isDown && !this.hook && this.mode === 'outside' && this.launchRemaining <= 0) {
        const next = this.branches[this.state.checkpoint + 1];
        if (next && Math.hypot(next.x + next.w / 2 - p.x, next.y - 25 - p.y) < 240) {
          this.hook = { x: next.x + next.w / 2, y: next.y - 25 };
        }
      }
      if (!k.G.isDown) this.hook = undefined;
      if (this.hook) {
        const dx = this.hook.x - p.x, dy = this.hook.y - p.y, length = Math.hypot(dx, dy);
        if (length > 5) { p.vx = dx / length * 240; p.vy = dy / length * 240; p.ground = false; }
        else { p.x = this.hook.x; p.y = this.hook.y + 9; p.vx = 0; p.vy = 0; this.hook = undefined; }
      }
      const oldY = p.y;
      if (!this.hook) p.vy += GRAVITY * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.ground = false; this.standing = -1;
      const surfaces = this.mode === 'inside' ? this.barriers : this.branches;
      for (let i = 0; i < surfaces.length; i++) {
        if (this.mode === 'inside' && this.state.destroyedBranches.includes(i)) continue;
        const b = surfaces[i];
        if (p.vy >= 0 && oldY + 16 <= b.y + 5 && p.y + 16 >= b.y && p.x + 9 > b.x && p.x - 9 < b.x + b.w) {
          p.y = b.y - 16; p.vy = 0; p.ground = true; this.standing = i;
          this.launchRemaining = 0;
          this.state.checkpoint = Math.max(this.state.checkpoint, i);
          break;
        }
      }
      if (this.mode === 'outside') {
        p.x = Phaser.Math.Clamp(p.x, 25, 990);
        if (p.y > 780) { this.fail(); return; }
        if (this.standing === 8 && p.x > 626) this.enterLoop();
      } else {
        p.x = Phaser.Math.Clamp(p.x, 1762, 2192);
        this.barriers.forEach((b, i) => {
          b.stood = b.unstable && this.standing === i ? b.stood + dt : 0;
          if (b.stood > 20) this.breakBranch(i);
        });
        if (!this.state.axeCollected && Math.abs(p.x - 1800) < 26 && Math.abs(p.y - 184) < 32) {
          this.state.axeCollected = true; this.tone('pickup'); this.message('Axe collected! Press F for one satisfying whack.');
        }
        if (!this.state.trophyCollected && Math.abs(p.x - 2090) < 28 && Math.abs(p.y - 1264) < 32) {
          this.state.trophyCollected = true; awardTrophy(this, 2); this.tone('pickup'); this.message('Trophy collected. The finish is just below!');
        }
        if (this.standing === 6 && this.state.trophyCollected) { this.complete(); return; }
        if (p.y > 1640) { this.fail(); return; }
      }
    }
    if (this.mode === 'inside') {
      const desired = Phaser.Math.Clamp(p.y - 320, 0, 870);
      this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, desired, Math.min(1, dt * 5));
    }
    this.message(); this.drawMoving(dt);
  }

  axe(g: Phaser.GameObjects.Graphics, x: number, y: number, angle = 0) {
    g.save(); g.translateCanvas(x, y); g.rotateCanvas(angle);
    g.lineStyle(5, 0x9d713e); g.lineBetween(0, 13, 0, -14);
    g.fillStyle(0xaeb8ba); g.fillPoints([{ x: -3, y: -15 }, { x: 16, y: -20 }, { x: 19, y: -7 }, { x: 0, y: -8 }], true);
    g.lineStyle(1.5, INK); g.strokePoints([{ x: -3, y: -15 }, { x: 16, y: -20 }, { x: 19, y: -7 }, { x: 0, y: -8 }], true);
    g.restore();
  }

  drawMoving(dt: number) {
    const g = this.moving; g.clear();
    if (this.mode === 'inside') {
      this.barriers.forEach((b, i) => {
        if (this.state.destroyedBranches.includes(i)) return;
        const shake = b.stood > 16 ? Math.sin(this.elapsed * 22) * 2 : 0;
        this.wood(g, b.x, b.y + shake, b.w, b.h, b.unstable ? 0xa08053 : 0x8c603d);
        if (b.unstable) {
          g.lineStyle(1.5, INK, .65);
          g.strokePoints([{ x: 1940, y: b.y }, { x: 1948, y: b.y + 6 }, { x: 1943, y: b.y + 10 }]);
          if (b.stood > 16) { g.lineBetween(1943, b.y + 10, 1954, b.y + 16); }
        }
      });
      if (!this.state.axeCollected) this.axe(g, 1800, 175, .3);
      if (!this.state.trophyCollected) {
        g.lineStyle(4, 0xb08a24); g.strokeCircle(2074, 1244, 10); g.strokeCircle(2105, 1244, 10);
        g.fillStyle(0xe9c63e); g.fillRect(2078, 1229, 24, 27);
        g.lineStyle(4, 0xb08a24); g.lineBetween(2090, 1256, 2090, 1273);
        g.fillRect(2073, 1272, 34, 6);
      }
    }
    this.chips = this.chips.filter(c => c.life > 0);
    for (const c of this.chips) {
      c.life -= dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 450 * dt;
      g.fillStyle(0x9c704b, Math.max(0, c.life * 2)); g.fillRect(c.x, c.y, 7, 3);
    }
    if (this.hook) { g.lineStyle(1.5, INK); g.lineBetween(this.p.x, this.p.y - 8, this.hook.x, this.hook.y); g.strokeCircle(this.hook.x, this.hook.y, 5); }
    // Same grey Sneeker, orange head and hands, zigzag mask, and belt; no bow in this level.
    const p = this.p;
    g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(p.rotation);
    const stride = p.ground ? Math.sin(this.elapsed * 15) * Math.min(Math.abs(p.vx) / 210, 1) * 3 : 2;
    g.lineStyle(7, 0x838786); g.lineBetween(-4, 6, -7 - stride, 16); g.lineBetween(4, 6, 7 + stride, 16);
    this.wood(g, -7, -12, 14, 20, 0x858b88);
    g.lineStyle(5, 0x858b88); g.lineBetween(-7, -8, -15, -5); g.lineBetween(7, -8, 15, -5);
    g.fillStyle(0xe19a74); g.fillRect(-18, -8, 5, 6); g.fillRect(13, -8, 5, 6);
    g.fillStyle(0xdf916f); g.fillEllipse(0, -23, 25, 28);
    g.lineStyle(1.5, INK); g.strokeEllipse(0, -23, 25, 28);
    g.fillStyle(0xf0be9a); g.fillRect(-11, -29, 22, 7);
    g.lineStyle(1.2, INK); g.strokePoints([{ x: -11, y: -23 }, { x: -6, y: -25 }, { x: -2, y: -21 }, { x: 3, y: -25 }, { x: 7, y: -22 }, { x: 11, y: -24 }]);
    g.lineBetween(-6, -28, -6, -25); g.lineBetween(6, -28, 6, -25); g.lineBetween(-3, -16, 3, -16);
    g.fillStyle(0xc68e67); g.fillRect(-8, 3, 16, 4); g.lineStyle(1, INK); g.strokeRect(-3, 2, 6, 6); g.lineBetween(0, -8, 0, -2);
    if (this.state.axeCollected) this.axe(g, p.face * 18, -5, this.swing > 0 ? -1.1 + (1 - this.swing / .27) * 2.8 : .25);
    g.restore();
  }

  complete() {
    this.state.completed = true; this.state.axeCollected = false; this.state.inLoop = false;
    this.mode = 'complete'; this.hook = undefined; this.moving.clear();
    this.scene.start('level3', { elapsed: this.elapsed });
  }
}
