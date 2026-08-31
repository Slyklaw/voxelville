import { BLOCKS, TILE, isBlockOpaque } from "./block.js";
import { tileUV } from "../engine/atlas.js";

// Face order: +x, -x, +y, -y, +z, -z
const FACES = [
  { n: [1, 0, 0],  v: [[0.5,-0.5, 0.5],[0.5,-0.5,-0.5],[0.5, 0.5,-0.5],[0.5, 0.5, 0.5]], uv: [[0,0],[1,0],[1,1],[0,1]] },
  { n: [-1, 0, 0], v: [[-0.5,-0.5,-0.5],[-0.5,-0.5, 0.5],[-0.5, 0.5, 0.5],[-0.5, 0.5,-0.5]], uv: [[0,0],[1,0],[1,1],[0,1]] },
  { n: [0, 1, 0],  v: [[-0.5, 0.5, 0.5],[ 0.5, 0.5, 0.5],[ 0.5, 0.5,-0.5],[-0.5, 0.5,-0.5]], uv: [[0,0],[1,0],[1,1],[0,1]] },
  { n: [0,-1, 0],  v: [[-0.5,-0.5,-0.5],[ 0.5,-0.5,-0.5],[ 0.5,-0.5, 0.5],[-0.5,-0.5, 0.5]], uv: [[0,0],[1,0],[1,1],[0,1]] },
  { n: [0, 0, 1],  v: [[-0.5,-0.5, 0.5],[ 0.5,-0.5, 0.5],[ 0.5, 0.5, 0.5],[-0.5, 0.5, 0.5]], uv: [[0,0],[1,0],[1,1],[0,1]] },
  { n: [0, 0,-1],  v: [[ 0.5,-0.5,-0.5],[-0.5,-0.5,-0.5],[-0.5, 0.5,-0.5],[ 0.5, 0.5,-0.5]], uv: [[0,0],[1,0],[1,1],[0,1]] },
];

// Neighbor offsets corresponding to each face (in world block coords, relative to this block).
const NEIGHBOR_OFFSETS = [
  [ 1,  0,  0], // +X
  [-1,  0,  0], // -X
  [ 0,  1,  0], // +Y
  [ 0, -1,  0], // -Y
  [ 0,  0,  1], // +Z
  [ 0,  0, -1], // -Z
];

const FLOATS_PER_VERT = 8; // pos3 + uv2 + light3
const VERTS_PER_FACE = 4;
const INDICES_PER_FACE = 6;

// Build a single block's mesh (no neighbor culling). Returns Float32Array positions
// (8 floats per vertex) and Uint16Array indices (6 per face), with a baseVertex offset
// baked into the indices (so a single chunk buffer can hold many blocks).
export function buildBlockFaces(blockId, x, y, z, light, baseVertex) {
  const block = BLOCKS[blockId];
  if (!block || !block.faces) return null;

  const positions = new Float32Array(VERTS_PER_FACE * FLOATS_PER_VERT * 6);
  const indices = new Uint16Array(INDICES_PER_FACE * 6);

  let vOff = 0;
  let iOff = 0;
  const base = baseVertex | 0;

  for (let f = 0; f < 6; f++) {
    const face = FACES[f];
    const tile = block.faces[f];
    if (tile < 0) continue;
    const [u0, v0, u1, v1] = tileUV(tile);
    const lr = light[0];
    const lg = light[1];
    const lb = light[2];

    for (let i = 0; i < 4; i++) {
      const v = face.v[i];
      const uv = face.uv[i];
      const o = vOff * FLOATS_PER_VERT;
      positions[o + 0] = x + 0.5 + v[0];
      positions[o + 1] = y + 0.5 + v[1];
      positions[o + 2] = z + 0.5 + v[2];
      // Atlas V=0 is the top of the source image; face "top" (uv.y=1) should sample the top.
      positions[o + 3] = uv[0] === 0 ? u0 : u1;
      positions[o + 4] = uv[1] === 0 ? v1 : v0;
      positions[o + 5] = lr;
      positions[o + 6] = lg;
      positions[o + 7] = lb;
      vOff++;
    }

    const ibase = iOff;
    indices[ibase + 0] = base + iOff + 0;
    indices[ibase + 1] = base + iOff + 1;
    indices[ibase + 2] = base + iOff + 2;
    indices[ibase + 3] = base + iOff + 0;
    indices[ibase + 4] = base + iOff + 2;
    indices[ibase + 5] = base + iOff + 3;
    iOff += 4;
  }

  return { positions, indices, vertexCount: vOff, indexCount: iOff };
}

// A face is visible when the neighbor block is either missing, transparent, or
// (for the special transparent-transparent case) different.
function shouldDrawFace(selfId, neighborId) {
  if (neighborId === 0) return true; // air
  if (selfId === neighborId) {
    // Same block: never cull (e.g. two water blocks share a face).
    return false;
  }
  const self = BLOCKS[selfId];
  const neigh = BLOCKS[neighborId];
  if (!self || !neigh) return true;
  // Draw the face if either block is not fully opaque.
  return !self.isOpaque || !neigh.isOpaque;
}

// Build a chunk's mesh in one pass, splitting opaque from transparent geometry
// so the renderer can draw them in separate passes (opaque first with depth
// writes, transparent second with alpha blending).
//
// light is a per-face precomputed diffuse color (single [r,g,b] for the whole chunk for v0.1).
export function buildChunkMesh(chunk, getNeighborBlock, light) {
  const SIZE = 16;
  const opaquePos = [];
  const opaqueIdx = [];
  const transPos = [];
  const transIdx = [];
  let opaqueBase = 0;
  let transBase = 0;

  for (let lx = 0; lx < SIZE; lx++) {
    for (let y = 0; y < 16; y++) {
      for (let lz = 0; lz < SIZE; lz++) {
        const id = chunk.get(lx, y, lz);
        if (id === 0) continue;
        const block = BLOCKS[id];
        if (!block || !block.faces) continue;

        const wx = chunk.cx * SIZE + lx;
        const wy = y;
        const wz = chunk.cz * SIZE + lz;

        const positions = block.isTransparent ? transPos : opaquePos;
        const indices   = block.isTransparent ? transIdx  : opaqueIdx;
        let base        = block.isTransparent ? transBase : opaqueBase;

        for (let f = 0; f < 6; f++) {
          const off = NEIGHBOR_OFFSETS[f];
          const nx = wx + off[0];
          const ny = wy + off[1];
          const nz = wz + off[2];
          const neighborId = getNeighborBlock(nx, ny, nz);
          if (!shouldDrawFace(id, neighborId)) continue;

          const face = FACES[f];
          const tile = block.faces[f];
          if (tile < 0) continue;
          const [u0, v0, u1, v1] = tileUV(tile);
          const lr = light[0];
          const lg = light[1];
          const lb = light[2];

          for (let i = 0; i < 4; i++) {
            const v = face.v[i];
            const uv = face.uv[i];
            positions.push(wx + 0.5 + v[0], wy + 0.5 + v[1], wz + 0.5 + v[2]);
            positions.push(uv[0] === 0 ? u0 : u1);
            positions.push(uv[1] === 0 ? v1 : v0);
            positions.push(lr, lg, lb);
          }
          indices.push(base + 0, base + 1, base + 2, base + 0, base + 2, base + 3);
          base += 4;
        }

        if (block.isTransparent) transBase = base;
        else                      opaqueBase = base;
      }
    }
  }

  const opaquePositions = new Float32Array(opaquePos);
  const opaqueIndices   = opaquePos.length === 0 ? new Uint16Array(0) : new Uint16Array(opaqueIdx);
  const transPositions  = new Float32Array(transPos);
  const transIndices    = transPos.length === 0 ? new Uint16Array(0) : new Uint16Array(transIdx);

  return {
    opaque: {
      positions: opaquePositions,
      indices: opaqueIndices,
      indexCount: opaqueIndices.length,
    },
    transparent: {
      positions: transPositions,
      indices: transIndices,
      indexCount: transIndices.length,
    },
  };
}
