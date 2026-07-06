import Phaser from 'phaser';
import { imageManifest, tilemapManifest } from '../assets/manifest';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload(): void {
    const bar = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 0, 8, 0x48bb78);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 320, 12).setStrokeStyle(1, 0x8899aa);
    this.load.on('progress', (value: number) => {
      bar.width = 316 * value;
    });

    for (const entry of imageManifest) {
      if (entry.source === 'file') {
        this.load.image(entry.key, entry.path);
      }
    }
    for (const entry of tilemapManifest) {
      this.load.tilemapTiledJSON(entry.key, entry.path);
    }
  }

  create(): void {
    this.scene.start('title');
  }
}
