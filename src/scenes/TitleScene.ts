import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, LEVELS } from '../config';

const DIGIT_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

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
          '↑  hold to thrust      ←/→  rotate      R  restart\n\n' +
          `1-${LEVELS.length}  choose level`,
        {
          fontFamily: 'monospace',
          fontSize: '24px',
          color: '#8899aa',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, GAME_HEIGHT * 0.72, 'Press ENTER to launch', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#48bb78',
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.input.keyboard?.once('keydown-ENTER', () => this.launch(0));
    this.input.keyboard?.once('keydown-SPACE', () => this.launch(0));
    LEVELS.forEach((_, i) => {
      this.input.keyboard?.once(`keydown-${DIGIT_KEYS[i]}`, () => this.launch(i));
    });
  }

  private launch(levelIndex: number): void {
    this.scene.start('game', { levelIndex });
  }
}
