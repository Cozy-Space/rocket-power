import Phaser from 'phaser';

export interface LevelMarkers {
  spawn: { x: number; y: number };
  /** Evaluation-only rectangle over the pad's top face; not a physics body. */
  padRect: Phaser.Geom.Rectangle;
}

/**
 * Reads the Tiled object layer 'markers'. Levels must contain a point object
 * named 'spawn' and a rectangle named 'landing-pad' (see README).
 */
export function loadMarkers(map: Phaser.Tilemaps.Tilemap): LevelMarkers {
  const layer = map.getObjectLayer('markers');
  if (!layer) {
    throw new Error(`Tilemap '${map.scene.scene.key}' is missing the object layer 'markers'`);
  }

  const spawnObj = layer.objects.find((o) => o.name === 'spawn');
  const padObj = layer.objects.find((o) => o.name === 'landing-pad');
  if (!spawnObj || spawnObj.x === undefined || spawnObj.y === undefined) {
    throw new Error("Object layer 'markers' needs a point object named 'spawn'");
  }
  if (
    !padObj ||
    padObj.x === undefined ||
    padObj.y === undefined ||
    !padObj.width ||
    !padObj.height
  ) {
    throw new Error("Object layer 'markers' needs a rectangle object named 'landing-pad'");
  }

  return {
    spawn: { x: spawnObj.x, y: spawnObj.y },
    padRect: new Phaser.Geom.Rectangle(padObj.x, padObj.y, padObj.width, padObj.height),
  };
}
