import { AABB } from "./aabb.js";
import { isBlockSolid } from "../world/block.js";

const EPS = 1e-6;

// Move `box` by (dx, dy, dz) against solid blocks in `world`. Resolves one
// axis at a time so the player can slide along walls and floors without
// sticking to them.
//
// `world` must expose getBlock(x, y, z) -> id.
//
// Returns { dx, dy, dz, onGround, hitX, hitY, hitZ } where onGround is true
// if a downward move was stopped by a block, and hitX/Y/Z are the collision
// axis flags. The caller should zero velocity components on hit axes.
export function moveWithCollision(world, box, dx, dy, dz) {
  const block = new AABB();
  let onGround = false;
  let hitX = false;
  let hitY = false;
  let hitZ = false;

  if (dx !== 0) {
    box.x += dx;
    const hit = findCollidingBlock(world, box, block);
    if (hit) {
      if (dx > 0) box.x = hit.x - box.w;
      else        box.x = hit.x + 1;
      hitX = true;
    }
  }

  if (dy !== 0) {
    box.y += dy;
    const hit = findCollidingBlock(world, box, block);
    if (hit) {
      if (dy > 0) box.y = hit.y - box.h;
      else        { box.y = hit.y + 1; onGround = true; }
      hitY = true;
    }
  }

  if (dz !== 0) {
    box.z += dz;
    const hit = findCollidingBlock(world, box, block);
    if (hit) {
      if (dz > 0) box.z = hit.z - box.d;
      else        box.z = hit.z + 1;
      hitZ = true;
    }
  }

  return { dx, dy, dz, onGround, hitX, hitY, hitZ };
}

// Returns the first solid block whose AABB intersects `box`, written to `out`,
// or null. The block is also snapped flush to the box on the axis we moved on
// by the caller.
function findCollidingBlock(world, box, out) {
  const minX = Math.floor(box.x + EPS);
  const maxX = Math.floor(box.x + box.w - EPS);
  const minY = Math.floor(box.y + EPS);
  const maxY = Math.floor(box.y + box.h - EPS);
  const minZ = Math.floor(box.z + EPS);
  const maxZ = Math.floor(box.z + box.d - EPS);

  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        if (!isBlockSolid(world.getBlock(x, y, z))) continue;
        out.x = x; out.y = y; out.z = z;
        out.w = 1; out.h = 1; out.d = 1;
        if (intersects(box, out)) return out;
      }
    }
  }
  return null;
}

function intersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y &&
    a.z < b.z + b.d &&
    a.z + a.d > b.z
  );
}
