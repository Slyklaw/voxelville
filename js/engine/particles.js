// Block-break particle puff.
//
// A small pool of billboarded quads. Each particle has a position, velocity,
// lifetime, and a color sampled from the broken block's face texture. The
// renderer draws them as 0.2 m quads colored with that sample, fading out as
// the particle ages.
//
// The pool is fixed-size (256). When full, the oldest particle is recycled
// (FIFO) — that's fine because they only live 0.5 s anyway.

const POOL_SIZE = 256;
const PARTICLE_LIFE = 0.5;       // seconds
const PARTICLE_SIZE = 0.20;      // world-space meters per side
const PARTICLE_GRAVITY = 6.0;    // m/s² downward
const SPAWN_PER_BREAK = 8;
const SPAWN_SPEED = 2.5;         // peak radial speed at spawn

export class ParticleSystem {
  constructor() {
    // Pre-allocated arrays — no per-frame allocations on the hot path.
    this.pos = new Float32Array(POOL_SIZE * 3);   // xyz per particle
    this.vel = new Float32Array(POOL_SIZE * 3);
    this.color = new Float32Array(POOL_SIZE * 3); // linear RGB 0..1
    this.age = new Float32Array(POOL_SIZE);       // seconds since spawn
    this.alive = new Uint8Array(POOL_SIZE);       // 0/1

    this._head = 0; // ring-buffer write cursor (FIFO recycle)
    this._quadBuffer = null;
    this._instancePos = null;
    this._instanceColor = null; // vec4: rgb + alpha (fade)
    this._initialized = false;
  }

  // Lazily allocate GL resources. Called once during init by main.js.
  initGL(gl) {
    if (this._initialized) return;
    this._initialized = true;

    // Two-triangle quad in the XY plane, centered at origin, side = 1.
    // Drawn with a per-instance offset + uniform size so this buffer never
    // changes.
    this._quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -0.5, -0.5,
       0.5, -0.5,
       0.5,  0.5,
      -0.5, -0.5,
       0.5,  0.5,
      -0.5,  0.5,
    ]), gl.STATIC_DRAW);

    this._instancePos = gl.createBuffer();
    this._instanceColor = gl.createBuffer();
    // Pre-allocate storage so a partial draw doesn't read garbage.
    gl.bindBuffer(gl.ARRAY_BUFFER, this._instancePos);
    gl.bufferData(gl.ARRAY_BUFFER, POOL_SIZE * 3 * 4, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceColor);
    gl.bufferData(gl.ARRAY_BUFFER, POOL_SIZE * 4 * 4, gl.DYNAMIC_DRAW);
  }

  // Spawn 8 particles at `origin` tinted with `rgb` (linear 0..1, length 3).
  spawnBurst(origin, rgb) {
    const ox = origin[0], oy = origin[1], oz = origin[2];
    for (let i = 0; i < SPAWN_PER_BREAK; i++) {
      const slot = this._head;
      this._head = (this._head + 1) % POOL_SIZE;

      const o = slot * 3;
      this.pos[o    ] = ox;
      this.pos[o + 1] = oy;
      this.pos[o + 2] = oz;

      // Random direction in unit sphere, scaled by SPAWN_SPEED.
      let dx, dy, dz, len;
      do {
        dx = Math.random() * 2 - 1;
        dy = Math.random() * 2 - 1;
        dz = Math.random() * 2 - 1;
        len = dx * dx + dy * dy + dz * dz;
      } while (len > 1 || len < 1e-4);
      const inv = SPAWN_SPEED / Math.sqrt(len);
      this.vel[o    ] = dx * inv;
      this.vel[o + 1] = dy * inv + 1.0; // bias upward so the puff rises
      this.vel[o + 2] = dz * inv;

      // Per-particle color jitter so the puff doesn't look flat.
      const j = 0.85 + Math.random() * 0.3;
      this.color[o    ] = rgb[0] * j;
      this.color[o + 1] = rgb[1] * j;
      this.color[o + 2] = rgb[2] * j;

      this.age[slot] = 0;
      this.alive[slot] = 1;
    }
  }

  // Advance all live particles. dt is in seconds.
  update(dt) {
    for (let i = 0; i < POOL_SIZE; i++) {
      if (!this.alive[i]) continue;
      const o = i * 3;
      this.vel[o + 1] -= PARTICLE_GRAVITY * dt;
      this.pos[o]     += this.vel[o]     * dt;
      this.pos[o + 1] += this.vel[o + 1] * dt;
      this.pos[o + 2] += this.vel[o + 2] * dt;
      this.age[i] += dt;
      if (this.age[i] >= PARTICLE_LIFE) {
        this.alive[i] = 0;
      }
    }
  }

  // Issue the GL draw calls. Caller is responsible for having set up the
  // camera (view-projection) uniform and any common GL state (depth mask,
  // blend, program).
  render(gl, program, attribs, uniforms, viewProj) {
    if (!this._initialized) return;

    // Pack live-particle data into dense Float32Arrays — only the live slots.
    let liveCount = 0;
    const posArr = new Float32Array(POOL_SIZE * 3);
    const colorArr = new Float32Array(POOL_SIZE * 4);
    for (let i = 0; i < POOL_SIZE; i++) {
      if (!this.alive[i]) continue;
      const src = i * 3;
      const dst3 = liveCount * 3;
      const dst4 = liveCount * 4;
      posArr[dst3]     = this.pos[src];
      posArr[dst3 + 1] = this.pos[src + 1];
      posArr[dst3 + 2] = this.pos[src + 2];
      // Fade: 1 at birth, 0 at death. Slight ease-in to the fade so the puff
      // holds its color for the first ~30% of life.
      const t = this.age[i] / PARTICLE_LIFE;
      const fade = t < 0.3 ? 1.0 : 1.0 - (t - 0.3) / 0.7;
      colorArr[dst4]     = this.color[src];
      colorArr[dst4 + 1] = this.color[src + 1];
      colorArr[dst4 + 2] = this.color[src + 2];
      colorArr[dst4 + 3] = fade;
      liveCount++;
    }
    if (liveCount === 0) return;

    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.u_mvp, false, viewProj);
    gl.uniform1f(uniforms.u_size, PARTICLE_SIZE);

    // Per-vertex quad corner (-0.5..+0.5 on each axis).
    gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuffer);
    gl.enableVertexAttribArray(attribs.a_corner);
    gl.vertexAttribPointer(attribs.a_corner, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(attribs.a_corner, 0);

    // Per-instance position.
    gl.bindBuffer(gl.ARRAY_BUFFER, this._instancePos);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, posArr.subarray(0, liveCount * 3));
    gl.enableVertexAttribArray(attribs.a_instancePos);
    gl.vertexAttribPointer(attribs.a_instancePos, 3, gl.FLOAT, false, 12, 0);
    gl.vertexAttribDivisor(attribs.a_instancePos, 1);

    // Per-instance RGBA color (alpha = fade).
    gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceColor);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, colorArr.subarray(0, liveCount * 4));
    gl.enableVertexAttribArray(attribs.a_instanceColor);
    gl.vertexAttribPointer(attribs.a_instanceColor, 4, gl.FLOAT, false, 16, 0);
    gl.vertexAttribDivisor(attribs.a_instanceColor, 1);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, liveCount);

    // Reset divisors so other passes (chunk meshes, lines) don't stay instanced.
    gl.vertexAttribDivisor(attribs.a_corner, 0);
    gl.vertexAttribDivisor(attribs.a_instancePos, 0);
    gl.vertexAttribDivisor(attribs.a_instanceColor, 0);
    gl.disableVertexAttribArray(attribs.a_corner);
    gl.disableVertexAttribArray(attribs.a_instancePos);
    gl.disableVertexAttribArray(attribs.a_instanceColor);
  }
}