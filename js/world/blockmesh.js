import { BLOCKS, isBlockOpaque } from "./block.js";
import { tileUV } from "../engine/atlas.js";

// Face order in BLOCKS: +x, -x, +y, -y, +z, -z
// Vertex order per face: BL, BR, TR, TL (counter-clockwise when viewed from outside).
// 4 vertices × (pos3, uv2, normal3) per face.

const FACES = [
  // +X (right)
  {
    n: [1, 0, 0],
    v: [
      [0.5, -0.5,  0.5], [0.5, -0.5, -0.5], [0.5,  0.5, -0.5], [0.5,  0.5,  0.5],
    ],
    uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
  // -X (left)
  {
    n: [-1, 0, 0],
    v: [
      [-0.5, -0.5, -0.5], [-0.5, -0.5,  0.5], [-0.5,  0.5,  0.5], [-0.5,  0.5, -0.5],
    ],
    uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
  // +Y (top)
  {
    n: [0, 1, 0],
    v: [
      [-0.5,  0.5,  0.5], [ 0.5,  0.5,  0.5], [ 0.5,  0.5, -0.5], [-0.5,  0.5, -0.5],
    ],
    uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
  // -Y (bottom)
  {
    n: [0, -1, 0],
    v: [
      [-0.5, -0.5, -0.5], [ 0.5, -0.5, -0.5], [ 0.5, -0.5,  0.5], [-0.5, -0.5,  0.5],
    ],
    uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
  // +Z (front)
  {
    n: [0, 0, 1],
    v: [
      [-0.5, -0.5,  0.5], [ 0.5, -0.5,  0.5], [ 0.5,  0.5,  0.5], [-0.5,  0.5,  0.5],
    ],
    uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
  // -Z (back)
  {
    n: [0, 0, -1],
    v: [
      [ 0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5,  0.5, -0.5], [ 0.5,  0.5, -0.5],
    ],
    uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
];

// Per-vertex layout: pos(3) + uv(2) + normal(3) = 8 floats
export const BLOCK_VERTEX_FLOATS = 8;
export const BLOCK_FLOATS_PER_FACE = 4 * BLOCK_VERTEX_FLOATS;
export const BLOCK_INDICES_PER_FACE = 6;
export const BLOCK_FACES = 6;

const FACE_TILE_INDEX = {
  0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5,
};

// Build a single lit block (no culling) with all 6 faces and a constant light per face.
// `light` is a [r, g, b] color in 0..1; same for every vertex of the face.
// `x,y,z` is the world block position (integer).
export function buildBlockFaces(blockId, x, y, z, light) {
  const block = BLOCKS[blockId];
  if (!block || !block.faces) return null;

  const positions = new Float32Array(BLOCK_FLOATS_PER_FACE * BLOCK_FACES);
  const indices = new Uint16Array(BLOCK_INDICES_PER_FACE * BLOCK_FACES);

  let vOff = 0;
  let iOff = 0;

  for (let f = 0; f < BLOCK_FACES; f++) {
    const face = FACES[f];
    const tile = block.faces[f];
    if (tile < 0) continue;
    const [u0, v0, u1, v1] = tileUV(tile);

    // Per-face diffuse tint (already computed by caller; same value for all 4 verts of this face).
    const lr = light[0];
    const lg = light[1];
    const lb = light[2];

    const baseVertex = vOff;

    for (let i = 0; i < 4; i++) {
      const v = face.v[i];
      const uv = face.uv[i];
      const o = vOff * 8;
      positions[o + 0] = x + v[0];
      positions[o + 1] = y + v[1];
      positions[o + 2] = z + v[2];
      // Map face-local UV (0..1) into atlas tile UV.
      positions[o + 3] = uv[0] === 0 ? u0 : u1;
      positions[o + 4] = uv[1] === 0 ? v0 : v1;
      // a_light is a per-face diffuse tint, not the world-space normal.
      positions[o + 5] = lr;
      positions[o + 6] = lg;
      positions[o + 7] = lb;
      vOff++;
    }

    const base = iOff;
    indices[base + 0] = baseVertex + 0;
    indices[base + 1] = baseVertex + 1;
    indices[base + 2] = baseVertex + 2;
    indices[base + 3] = baseVertex + 0;
    indices[base + 4] = baseVertex + 2;
    indices[base + 5] = baseVertex + 3;
    iOff += 6;
  }

  return { positions, indices, count: iOff };
}
