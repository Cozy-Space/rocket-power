import Phaser from 'phaser';
import { AssetKeys, imageManifest, type AssetKey } from '../assets/manifest';

/**
 * Draws placeholder textures for every manifest entry with source 'generated'.
 * Once real art exists, flip the manifest entry to source 'file' — this scene
 * then simply skips it.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const generators: Partial<Record<AssetKey, () => void>> = {
      [AssetKeys.Rocket]: () => this.generateRocket(),
      [AssetKeys.Flame]: () => this.generateFlame(),
      [AssetKeys.CaveTiles]: () => this.generateCaveTiles(),
    };

    for (const entry of imageManifest) {
      if (entry.source !== 'generated') continue;
      const generate = generators[entry.key];
      if (!generate) {
        throw new Error(`No texture generator for asset key '${entry.key}'`);
      }
      generate();
    }

    this.scene.start('preload');
  }

  private generateRocket(): void {
    const g = this.add.graphics();
    // fins
    g.fillStyle(0xff5a5a);
    g.fillTriangle(6, 30, 0, 46, 6, 46);
    g.fillTriangle(18, 30, 24, 46, 18, 46);
    // body
    g.fillStyle(0xdfe6ee);
    g.fillRoundedRect(4, 8, 16, 36, 5);
    // nose cone
    g.fillStyle(0xff5a5a);
    g.fillTriangle(12, 0, 4, 14, 20, 14);
    // window
    g.fillStyle(0x3aa0ff);
    g.fillCircle(12, 22, 4);
    g.generateTexture(AssetKeys.Rocket, 24, 48);
    g.destroy();
  }

  private generateFlame(): void {
    const g = this.add.graphics();
    g.fillStyle(0xff9a2a);
    g.fillTriangle(8, 24, 1, 0, 15, 0);
    g.fillStyle(0xffe066);
    g.fillTriangle(8, 15, 4, 0, 12, 0);
    g.generateTexture(AssetKeys.Flame, 16, 24);
    g.destroy();
  }

  /** 128x64 texture with two 64x64 tiles: [0] rock, [1] landing pad surface. */
  private generateCaveTiles(): void {
    const g = this.add.graphics();
    // tile 0: rock
    g.fillStyle(0x4a5568);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x2d3748);
    g.fillRect(0, 0, 64, 4);
    g.fillRect(0, 60, 64, 4);
    g.fillRect(0, 0, 4, 64);
    g.fillRect(60, 0, 4, 64);
    g.fillStyle(0x5d6b81);
    g.fillRect(14, 16, 10, 10);
    g.fillRect(38, 36, 12, 8);
    // tile 1: landing pad surface
    g.fillStyle(0x2d3748);
    g.fillRect(64, 0, 64, 64);
    g.fillStyle(0x48bb78);
    g.fillRect(64, 0, 64, 10);
    g.fillStyle(0xf6e05e);
    g.fillRect(72, 14, 12, 6);
    g.fillRect(108, 14, 12, 6);
    g.generateTexture(AssetKeys.CaveTiles, 128, 64);
    g.destroy();
  }
}
