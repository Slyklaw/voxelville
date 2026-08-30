export class AABB {
  constructor(x = 0, y = 0, z = 0, w = 0, h = 0, d = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    this.h = h;
    this.d = d;
  }

  static from(minX, minY, minZ, maxX, maxY, maxZ) {
    return new AABB(
      minX, minY, minZ,
      maxX - minX, maxY - minY, maxZ - minZ
    );
  }

  minX() { return this.x; }
  minY() { return this.y; }
  minZ() { return this.z; }
  maxX() { return this.x + this.w; }
  maxY() { return this.y + this.h; }
  maxZ() { return this.z + this.d; }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  translate(dx, dy, dz) {
    this.x += dx;
    this.y += dy;
    this.z += dz;
    return this;
  }

  copy(other) {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
    this.w = other.w;
    this.h = other.h;
    this.d = other.d;
    return this;
  }

  clone() {
    return new AABB(this.x, this.y, this.z, this.w, this.h, this.d);
  }
}

// The block at world coords (x,y,z) has an AABB [x, y, z] -> [x+1, y+1, z+1].
export function blockAABB(x, y, z, out) {
  out.x = x;
  out.y = y;
  out.z = z;
  out.w = 1;
  out.h = 1;
  out.d = 1;
  return out;
}
