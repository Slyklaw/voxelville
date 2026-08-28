import { vec3 } from "../util/math.js";
import { m4copy, m4perspective, m4lookAt, m4identity, m4multiply, m4rotateX, m4rotateY, m4translate, deg2rad } from "../util/math.js";

export class Camera {
  constructor({ fov = 70, near = 0.1, far = 1000, aspect = 1 } = {}) {
    this.position = vec3(0, 1.62, 5);
    this.yaw = -Math.PI / 2;
    this.pitch = 0;
    this.fov = fov;
    this.near = near;
    this.far = far;
    this.aspect = aspect;
    this._view = m4identity(new Float32Array(16));
    this._proj = m4identity(new Float32Array(16));
    this._viewProj = m4identity(new Float32Array(16));
    this._dirty = true;
  }

  setAspect(aspect) {
    if (aspect === this.aspect) return;
    this.aspect = aspect;
    this._dirty = true;
  }

  rotate(yawDelta, pitchDelta) {
    this.yaw += yawDelta;
    this.pitch += pitchDelta;
    const lim = Math.PI / 2 - 0.001;
    if (this.pitch > lim) this.pitch = lim;
    if (this.pitch < -lim) this.pitch = -lim;
    this._dirty = true;
  }

  move(dx, dy, dz) {
    this.position[0] += dx;
    this.position[1] += dy;
    this.position[2] += dz;
    this._dirty = true;
  }

  forward(out) {
    out[0] = Math.cos(this.pitch) * Math.cos(this.yaw);
    out[1] = Math.sin(this.pitch);
    out[2] = Math.cos(this.pitch) * Math.sin(this.yaw);
    return out;
  }

  right(out) {
    out[0] = -Math.sin(this.yaw);
    out[1] = 0;
    out[2] = Math.cos(this.yaw);
    return out;
  }

  getView() {
    if (!this._dirty) return this._view;
    this._recompute();
    return this._view;
  }

  getProj() {
    if (!this._dirty) return this._proj;
    this._recompute();
    return this._proj;
  }

  getViewProj() {
    if (!this._dirty) return this._viewProj;
    this._recompute();
    return this._viewProj;
  }

  _recompute() {
    const f = this.forward(new Float32Array(3));
    const target = [
      this.position[0] + f[0],
      this.position[1] + f[1],
      this.position[2] + f[2],
    ];
    m4lookAt(this._view, this.position, target, [0, 1, 0]);
    m4perspective(this._proj, deg2rad(this.fov), this.aspect, this.near, this.far);
    this._viewProj = m4multiply(this._proj, this._view);
    this._dirty = false;
  }
}
