import type Phaser from 'phaser';

// Session-only collection: choosing/replaying a level keeps trophies already earned.
export function awardTrophy(scene: Phaser.Scene, level: number) {
  const trophies: number[] = scene.registry.get('trophies') ?? [];
  if (!trophies.includes(level)) scene.registry.set('trophies', [...trophies, level]);
}

export function hasTrophy(scene: Phaser.Scene, level: number): boolean {
  return (scene.registry.get('trophies') ?? []).includes(level);
}
