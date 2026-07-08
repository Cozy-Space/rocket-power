import Phaser from 'phaser';
import { AssetKeys } from '../assets/manifest';

/** Distance from sprite center to where the exhaust flame is drawn. */
const FLAME_OFFSET = 32;

export class Rocket {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly flame: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.flame = scene.add.image(x, y + FLAME_OFFSET, AssetKeys.Flame).setVisible(false);
    this.sprite = scene.physics.add.sprite(x, y, AssetKeys.Rocket);
    // Arcade bodies are axis-aligned boxes; a smaller body keeps rotated
    // sprites from colliding with walls they visibly don't touch.
    this.body.setSize(16, 36);
    // Sync the flame AFTER physics has written the body's new transform to
    // the sprite (POST_UPDATE). Doing this in scene.update() reads last
    // frame's transform and the flame visibly trails the rocket at speed.
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateFlame, this);
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  /**
   * Applies thrust acceleration along the rocket's facing (sprite art points
   * up), boosted up to `retroMultiplier` the more directly the facing opposes
   * the current velocity — braking burns bite harder than prograde ones.
   */
  thrust(accel: number, retroMultiplier = 1): void {
    const facing = this.sprite.rotation - Math.PI / 2;
    const { velocity } = this.body;
    const speed = velocity.length();
    let effectiveAccel = accel;
    if (speed > 0) {
      const opposition =
        -(Math.cos(facing) * velocity.x + Math.sin(facing) * velocity.y) / speed;
      if (opposition > 0) {
        effectiveAccel *= 1 + (retroMultiplier - 1) * opposition;
      }
    }
    this.sprite.scene.physics.velocityFromRotation(
      facing,
      effectiveAccel,
      this.body.acceleration,
    );
  }

  cutThrust(): void {
    this.body.setAcceleration(0, 0);
  }

  rotate(angularVelocityDeg: number): void {
    this.body.setAngularVelocity(angularVelocityDeg);
  }

  setFlameVisible(visible: boolean): void {
    this.flame.setVisible(visible);
  }

  /** Keeps the flame glued to the rocket's tail; runs on POST_UPDATE. */
  private updateFlame(): void {
    const tailAngle = this.sprite.rotation + Math.PI / 2;
    this.flame.setPosition(
      this.sprite.x + Math.cos(tailAngle) * FLAME_OFFSET,
      this.sprite.y + Math.sin(tailAngle) * FLAME_OFFSET,
    );
    this.flame.setRotation(this.sprite.rotation);
  }

  setAngle(deg: number): void {
    this.sprite.setAngle(deg);
  }

  /**
   * Re-anchors the sprite to its bottom-center (keeping its visual position)
   * so settle-phase rotation pivots on the base instead of the belly.
   */
  enterGroundPivot(): void {
    this.sprite.setOrigin(0.5, 1);
    this.sprite.y += this.sprite.displayHeight / 2;
  }

  /** Freezes the rocket in place after the run ends. */
  freeze(): void {
    this.body.stop();
    this.body.setAcceleration(0, 0);
    this.body.setAngularVelocity(0);
    this.body.moves = false;
    this.setFlameVisible(false);
  }

  markCrashed(): void {
    this.sprite.setTint(0xff4444);
  }
}
