// Tree generation. A tree is a 4-block log trunk topped by a 5x5x3 leaf canopy.
//
// placeTree writes blocks via world.setBlock, which routes each block to the
// correct chunk (including neighboring chunks for canopy blocks near chunk
// edges). All affected chunks get their dirty flag set, so the renderer picks
// up the change on the next frame.
//
// The tree is anchored at column (wx, wz) with its trunk base at world Y = wy.
// wy should be the surface Y of that column (i.e. the topmost solid block).
// The total tree height is 7 blocks (4 trunk + 3 canopy). If wy + 6 exceeds
// CHUNK_HEIGHT the tree is skipped — the trunk and canopy would be clipped.
//
// Trunk:   (wx, wy..wy+3, wz) — 4 LOG blocks (replaces grass/sand at the base).
// Canopy:  a 5x5x3 box centered on (wx, wz) starting one block above the trunk.
//          Top of canopy = wy + 6.

import { CHUNK_HEIGHT } from "./chunk.js";

const LOG = 6;
const LEAVES = 8;

export function placeTree(world, wx, wz, wy) {
  // Skip if the canopy would exceed the world top.
  const top = wy + 6;
  if (top >= CHUNK_HEIGHT) return false;

  // Trunk.
  for (let dy = 0; dy < 4; dy++) {
    world.setBlock(wx, wy + dy, wz, LOG);
  }

  // Canopy: 5x5x3 box centered on (wx, wz), starting one block above the trunk.
  for (let dy = 0; dy < 3; dy++) {
    const y = wy + 4 + dy;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        world.setBlock(wx + dx, y, wz + dz, LEAVES);
      }
    }
  }
  return true;
}