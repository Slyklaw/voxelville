// Block registry. Tile indices reference positions in the procedural atlas.
// Atlas layout: 16x16 grid of 16x16 tiles = 256x256 image.

export const TILE_SIZE = 16;
export const ATLAS_GRID = 16;
export const ATLAS_SIZE = TILE_SIZE * ATLAS_GRID;

export const TILE = {
  AIR: -1,
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WATER: 5,
  LOG_SIDE: 6,
  LOG_TOP: 7,
  PLANKS: 8,
  LEAVES: 9,
  GLASS: 10,
  COBBLESTONE: 11,
  BEDROCK: 12,
};

// Per-block atlas face indices. Order: +x, -x, +y, -y, +z, -z (right, left, top, bottom, front, back).
// Most blocks are uniform; grass uses green-top + dirt-sides; logs use wood-sides + ring top/bottom.
export const BLOCKS = {
  0: { name: "air", isSolid: false, isOpaque: false, isTransparent: true, faces: null },
  1: {
    name: "grass",
    isSolid: true,
    isOpaque: true,
    isTransparent: false,
    faces: [TILE.GRASS_SIDE, TILE.GRASS_SIDE, TILE.GRASS_TOP, TILE.DIRT, TILE.GRASS_SIDE, TILE.GRASS_SIDE],
  },
  2: { name: "dirt", isSolid: true, isOpaque: true, isTransparent: false, faces: [TILE.DIRT, TILE.DIRT, TILE.DIRT, TILE.DIRT, TILE.DIRT, TILE.DIRT] },
  3: { name: "stone", isSolid: true, isOpaque: true, isTransparent: false, faces: [TILE.STONE, TILE.STONE, TILE.STONE, TILE.STONE, TILE.STONE, TILE.STONE] },
  4: { name: "sand", isSolid: true, isOpaque: true, isTransparent: false, faces: [TILE.SAND, TILE.SAND, TILE.SAND, TILE.SAND, TILE.SAND, TILE.SAND] },
  5: { name: "water", isSolid: false, isOpaque: false, isTransparent: true, faces: [TILE.WATER, TILE.WATER, TILE.WATER, TILE.WATER, TILE.WATER, TILE.WATER] },
  6: { name: "log", isSolid: true, isOpaque: true, isTransparent: false, faces: [TILE.LOG_SIDE, TILE.LOG_SIDE, TILE.LOG_TOP, TILE.LOG_TOP, TILE.LOG_SIDE, TILE.LOG_SIDE] },
  7: { name: "planks", isSolid: true, isOpaque: true, isTransparent: false, faces: [TILE.PLANKS, TILE.PLANKS, TILE.PLANKS, TILE.PLANKS, TILE.PLANKS, TILE.PLANKS] },
  8: { name: "leaves", isSolid: true, isOpaque: true, isTransparent: false, faces: [TILE.LEAVES, TILE.LEAVES, TILE.LEAVES, TILE.LEAVES, TILE.LEAVES, TILE.LEAVES] },
  9: { name: "glass", isSolid: true, isOpaque: false, isTransparent: true, faces: [TILE.GLASS, TILE.GLASS, TILE.GLASS, TILE.GLASS, TILE.GLASS, TILE.GLASS] },
  10: { name: "cobblestone", isSolid: true, isOpaque: true, isTransparent: false, faces: [TILE.COBBLESTONE, TILE.COBBLESTONE, TILE.COBBLESTONE, TILE.COBBLESTONE, TILE.COBBLESTONE, TILE.COBBLESTONE] },
  11: { name: "bedrock", isSolid: true, isOpaque: true, isTransparent: false, unbreakable: true, faces: [TILE.BEDROCK, TILE.BEDROCK, TILE.BEDROCK, TILE.BEDROCK, TILE.BEDROCK, TILE.BEDROCK] },
};

export function isBlockSolid(id) {
  const b = BLOCKS[id];
  return b ? b.isSolid : false;
}
export function isBlockOpaque(id) {
  const b = BLOCKS[id];
  return b ? b.isOpaque : false;
}
export function isBlockTransparent(id) {
  const b = BLOCKS[id];
  return b ? b.isTransparent : false;
}
export function isBlockUnbreakable(id) {
  const b = BLOCKS[id];
  return b ? !!b.unbreakable : false;
}
