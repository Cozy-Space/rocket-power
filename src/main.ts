import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GRAVITY_Y } from './config';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';

declare global {
  interface Window {
    /** Exposed for E2E test drivers. */
    rocketPower: Phaser.Game;
  }
}

window.rocketPower = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b0e14',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GRAVITY_Y },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, TitleScene, GameScene, UIScene],
});
