import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

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
          '↑  hold to thrust      ←/→  rotate      R  restart',
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

    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('game'));
    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('game'));
  }
}
