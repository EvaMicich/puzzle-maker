import Phaser from 'phaser';

export type Character = 'sneaker' | 'banana';
export function selectedCharacter(scene: Phaser.Scene): Character {
  return scene.registry.get('character') === 'banana' ? 'banana' : 'sneaker';
}

/** Local coordinates share the existing player's feet and tool anchors. Pure artwork. */
export function drawBanana(g: Phaser.GameObjects.Graphics, stride = 0) {
  g.lineStyle(7, 0xe68e70);
  g.lineBetween(-5, 5, -6 - stride, 16); g.lineBetween(5, 5, 7 + stride, 16);
  g.lineStyle(6, 0xe68e70); g.lineBetween(-8, -9, -18, -8); g.lineBetween(8, -9, 18, -8);
  const body = [{ x: 0, y: -39 }, { x: 8, y: -37 }, { x: 12, y: -26 },
    { x: 11, y: -4 }, { x: 8, y: 8 }, { x: 1, y: 10 }, { x: -7, y: 4 },
    { x: -12, y: -11 }, { x: -10, y: -29 }, { x: -6, y: -36 }];
  g.fillStyle(0xf0cf29); g.fillPoints(body, true);
  g.lineStyle(1.3, 0xd4b52c); g.strokePoints(body, true);
  g.lineStyle(1, 0xfff2a4, .65);
  g.lineBetween(-6, -29, -8, -10); g.lineBetween(-5, -1, 1, 7); g.lineBetween(6, -32, 8, -22);
  g.fillStyle(0x966530); g.fillCircle(0, -29, 2.8);
  g.fillStyle(0xeaa17f); g.fillEllipse(0, -13, 13, 17);
  g.lineStyle(1.7, 0x666044); g.strokeEllipse(0, -13, 13, 17);
  g.lineStyle(1.8, 0x51483f); g.lineBetween(-2.5, -16, -2.5, -12); g.lineBetween(2.5, -16, 2.5, -12);
  g.strokePoints([{ x: -3, y: -9 }, { x: 0, y: -7 }, { x: 3, y: -9 }]);
}

function previewSneaker(g: Phaser.GameObjects.Graphics) {
  g.lineStyle(7, 0x838786); g.lineBetween(-4, 6, -7, 16); g.lineBetween(4, 6, 7, 16);
  g.fillStyle(0x858b88); g.fillRect(-7, -12, 14, 20);
  g.lineStyle(5, 0x858b88); g.lineBetween(-7, -8, -15, -5); g.lineBetween(7, -8, 15, -5);
  g.fillStyle(0xe19a74); g.fillRect(-18, -8, 5, 6); g.fillRect(13, -8, 5, 6);
  g.fillStyle(0xdf916f); g.fillEllipse(0, -23, 25, 28);
  g.lineStyle(1.5, 0x51483f); g.strokeEllipse(0, -23, 25, 28);
  g.fillStyle(0xf0be9a); g.fillRect(-11, -29, 22, 7);
  g.lineStyle(1.2, 0x51483f); g.strokePoints([{ x: -11, y: -23 }, { x: -6, y: -25 }, { x: -2, y: -21 }, { x: 3, y: -25 }, { x: 7, y: -22 }, { x: 11, y: -24 }]);
  g.lineBetween(-6, -28, -6, -25); g.lineBetween(6, -28, 6, -25); g.lineBetween(-3, -16, 3, -16);
  g.fillStyle(0xc68e67); g.fillRect(-8, 3, 16, 4); g.strokeRect(-3, 2, 6, 6);
}

export class CharacterSelect extends Phaser.Scene {
  choice: Character = 'sneaker';
  elapsed = 0;
  frame!: Phaser.GameObjects.Graphics;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  constructor() { super('characters'); }
  create() {
    this.choice = selectedCharacter(this);
    this.frame = this.add.graphics();
    this.keys = this.input.keyboard!.addKeys('LEFT,RIGHT,A,D,ENTER,SPACE') as typeof this.keys;
    this.input.keyboard!.addCapture(['LEFT', 'RIGHT', 'SPACE']);
    document.querySelector('h1 small')!.textContent = 'Choose your character';
    document.title = 'Puzzle Maker — Choose your character';
    document.querySelector('footer')!.innerHTML = '<span><b>← → / A D</b> choose · <b>Enter / Space</b> play</span><span>Or click your character.</span>';
    document.querySelector('#game')!.setAttribute('aria-label', 'Choose your character: Sneaker or Banana Man. Left and right to choose, Enter to play, or click a character. Both have identical abilities.');
    document.querySelector<HTMLButtonElement>('#levels')!.disabled = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { document.querySelector<HTMLButtonElement>('#levels')!.disabled = false; });
    const text = (x: number, y: number, value: string, size: number) => this.add.text(x, y, value, {
      fontFamily: 'Comic Sans MS, Trebuchet MS, cursive', fontSize: size, color: '#51483f',
    }).setOrigin(.5);
    text(600, 118, 'CHOOSE YOUR CHARACTER', 34);
    text(600, 173, 'Two of Owen’s characters. The same adventure.', 18);
    (['sneaker', 'banana'] as Character[]).forEach((character, i) => {
      const x = 380 + i * 440;
      const g = this.add.graphics(); g.save(); g.translateCanvas(x, 428); g.scaleCanvas(3.2, 3.2);
      if (character === 'banana') drawBanana(g); else previewSneaker(g);
      g.restore();
      text(x, 514, character === 'banana' ? 'BANANA MAN' : 'SNEAKER', 25);
      const card = this.add.zone(x, 379, 340, 338).setName(character).setInteractive({ useHandCursor: true });
      card.on('pointerover', () => { this.choice = character; this.drawChoice(); });
      card.on('pointerdown', () => this.choose(character));
    });
    text(600, 618, 'Run, jump, grapple and use the same tools with either character.', 17);
    text(600, 661, '← → to choose · Enter to play', 16);
    this.drawChoice();
  }
  drawChoice() {
    this.frame.clear();
    for (let i = 0; i < 2; i++) {
      const active = (i === 0 ? 'sneaker' : 'banana') === this.choice;
      this.frame.fillStyle(0xfff9e9, .65); this.frame.fillRoundedRect(210 + i * 440, 210, 340, 338, 10);
      this.frame.lineStyle(active ? 3 : 1, active ? 0x907c4e : 0xb2a995);
      this.frame.strokeRoundedRect(210 + i * 440, 210, 340, 338, 10);
    }
  }
  choose(character: Character) {
    this.registry.set('character', character); this.registry.set('trophies', []);
    this.scene.start('level');
  }
  update(_time: number, delta: number) {
    this.elapsed += Math.min(delta / 1000, .033);
    this.cameras.main.setBackgroundColor(Phaser.Display.Color.HSLToColor((this.elapsed / 180) % 1, .38, .9).color);
    const pressed = (key: string) => Phaser.Input.Keyboard.JustDown(this.keys[key]);
    if (pressed('LEFT') || pressed('A')) { this.choice = 'sneaker'; this.drawChoice(); }
    if (pressed('RIGHT') || pressed('D')) { this.choice = 'banana'; this.drawChoice(); }
    if (pressed('ENTER') || pressed('SPACE')) this.choose(this.choice);
  }
}
