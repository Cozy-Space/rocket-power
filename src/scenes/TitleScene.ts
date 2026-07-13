import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, LEVELS } from '../config';
import { loadProgress } from '../game/progressStore';
import { firstUnfinished } from '../game/rules/progress';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const continueAt = firstUnfinished(loadProgress(), LEVELS.length);

    this.add
      .text(cx, GAME_HEIGHT * 0.3, 'ROCKET POWER', {
        fontFamily: 'monospace',
        fontSize: '72px',
        color: '#dfe6ee',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        GAME_HEIGHT * 0.5,
        'Fly through the cave and land softly on the pad.\n\n' +
          '↑/W/I  hold to thrust      ←→/AD/JL  rotate      R  restart\n\n' +
          'L  select level',
        {
          fontFamily: 'monospace',
          fontSize: '24px',
          color: '#8899aa',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, GAME_HEIGHT * 0.72, `Press ENTER to fly LEVEL ${continueAt + 1}`, {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#48bb78',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    prompt.on('pointerup', () => this.launch(continueAt));
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    const levels = this.add
      .text(16, 16, '▤ LEVELS', { fontFamily: 'monospace', fontSize: '22px', color: '#8899aa' })
      .setInteractive({ useHandCursor: true });
    levels.on('pointerup', () => this.scene.start('level-select'));

    this.input.keyboard?.once('keydown-ENTER', () => this.launch(continueAt));
    this.input.keyboard?.once('keydown-SPACE', () => this.launch(continueAt));
    this.input.keyboard?.once('keydown-L', () => this.scene.start('level-select'));
  }

  private launch(levelIndex: number): void {
    this.scene.start('game', { levelIndex });
  }
}
