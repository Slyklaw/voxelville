// DDA voxel raycast. Steps along the ray from `origin` in `dir` (unit vector),
// testing blocks at integer coordinates via `getBlock`. Stops on the first
// non-air block within `maxDist`.
//
// Returns one of:
//   { hit: false }
//   { hit: true, x, y, z, nx, ny, nz, t }
// where (x,y,z) is the hit block coord, (nx,ny,nz) is the normal pointing
// from the hit face back toward the camera (-1, 0, +1 etc., each axis in
// {-1, 0, +1}), and t is the distance along the ray in world units.

const EPS = 1e-7;

export function raycastBlock(getBlock, origin, dir, maxDist) {
  let ox = origin[0], oy = origin[1], oz = origin[2];
  const dx = dir[0], dy = dir[1], dz = dir[2];

  let ix = Math.floor(ox);
  let iy = Math.floor(oy);
  let iz = Math.floor(oz);

  const stepX = dx > EPS ? 1 : dx < -EPS ? -1 : 0;
  const stepY = dy > EPS ? 1 : dy < -EPS ? -1 : 0;
  const stepZ = dz > EPS ? 1 : dz < -EPS ? -1 : 0;

  // tMaxX/Y/Z: distance along the ray to the next integer plane on each axis.
  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : Infinity;

  let tMaxX = stepX !== 0
    ? ((stepX > 0 ? (ix + 1) : ix) - ox) * tDeltaX
    : Infinity;
  let tMaxY = stepY !== 0
    ? ((stepY > 0 ? (iy + 1) : iy) - oy) * tDeltaY
    : Infinity;
  let tMaxZ = stepZ !== 0
    ? ((stepZ > 0 ? (iz + 1) : iz) - oz) * tDeltaZ
    : Infinity;

  let nx = 0, ny = 0, nz = 0;
  let t = 0;

  while (t <= maxDist) {
    if (getBlock(ix, iy, iz) !== 0) {
      return { hit: true, x: ix, y: iy, z: iz, nx, ny, nz, t };
    }
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        ix += stepX;
        t = tMaxX;
        tMaxX += tDeltaX;
        nx = -stepX; ny = 0; nz = 0;
      } else {
        iz += stepZ;
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        nx = 0; ny = 0; nz = -stepZ;
      }
    } else {
      if (tMaxY < tMaxZ) {
        iy += stepY;
        t = tMaxY;
        tMaxY += tDeltaY;
        nx = 0; ny = -stepY; nz = 0;
      } else {
        iz += stepZ;
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        nx = 0; ny = 0; nz = -stepZ;
      }
    }
  }

  return { hit: false };
}
