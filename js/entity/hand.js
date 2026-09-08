// First-person right hand.
//
// A tiny 3D model rendered as two boxes (forearm + fist) attached to the
// camera's view. The hand vertices are built in camera-local space
// (right=+X, up=+Y, forward=-Z) so that `proj * vertex` makes the hand
// appear glued to the lower-right of the view no matter where the player
// looks. (We skip the view matrix because it cancels out — the hand's
// world position equals the camera's world position.)
//
// The hand swings when the player left-clicks: a single 200 ms cycle
// (0→1→0) rotates the whole arm about the shoulder (down-right-behind the
// camera) with pitch + yaw + roll and a forward thrust, so the fist arcs
// inward toward screen center like a punch thrown from the shoulder. The
// rotation is folded into the MVP each frame.
//
// Drawn after the world with depth-test on, depth-write on. Culling is
// disabled during the draw so the hand reads correctly mid-swing, when
// face orientations rotate in and out of front-facing.

import { tileUV } from "../engine/atlas.js";

// Hand dimensions in meters. Sized to read clearly in the lower-right of
// the view (Minecraft-style first-person hand).
const FORE_W = 0.26;
const FORE_H = 0.26;
const FORE_L = 0.36;

const FIST_W = 0.30;
const FIST_H = 0.30;
const FIST_L = 0.20;

// Hand center positions in camera-local space (right=+X, up=+Y, forward=-Z).
// FORE_OFFSET puts the forearm in the lower-right of the view. Z keeps the
// back face of the forearm 0.52 m in front of the camera — well past the 0.1
// near plane so it doesn't z-clip — while the Y offset keeps the hand above
// the HUD hotbar even on very small canvases.
const FORE_OFFSET = { x: 0.34, y: -0.22, z: -0.70 };
// Fist sits at the far end of the forearm.
const FIST_OFFSET = {
  x: FORE_OFFSET.x,
  y: FORE_OFFSET.y,
  z: FORE_OFFSET.z - FORE_L * 0.5 - FIST_L * 0.5,
};

// Shoulder pivot: down, right, and behind the camera — where the arm would
// meet the torso. Rotating the whole hand about this point (instead of the
// wrist) swings the fist in an arc: it travels inward toward screen center
// and forward while pitching, like a punch, rather than seesawing up and
// down around the wrist.
const SHOULDER = { x: 0.42, y: -0.65, z: -0.35 };

// Secondary motion amplitudes, scaled by a 0→1→0 envelope so they vanish at
// rest: yaw turns the fist toward screen center, roll cants it, thrust
// punches it forward (-Z).
const PITCH_AMP = (22 * Math.PI) / 180;
const YAW_AMP = (14 * Math.PI) / 180;
const ROLL_AMP = (8 * Math.PI) / 180;
const THRUST = 0.08; // meters forward at mid-swing

const SWING_DURATION = 0.20; // seconds for one full 0→1→0 cycle

// Face order: +x, -x, +y, -y, +z, -z. Vertices are at +/-0.5 — multiply by
// the box half-extents to position the face.
//
// Each face's vertex order is CCW when viewed from outside the box (same
// convention as the chunk mesh), so CULL_FACE / BACK / CCW treats these as
// front-facing. The cross product (v1-v0) × (v2-v0) for each face points
// outward, confirming CCW-from-outside winding.
const FACES = [
  // +X: vertices traced BL → BR → TR → TL when viewed from +X (right-handed, +Y up, +Z right).
  { v: [[ 0.5,-0.5, 0.5],[ 0.5,-0.5,-0.5],[ 0.5, 0.5,-0.5],[ 0.5, 0.5, 0.5]], uv: [[0,0],[1,0],[1,1],[0,1]] },
  // -X.
  { v: [[-0.5,-0.5,-0.5],[-0.5,-0.5, 0.5],[-0.5, 0.5, 0.5],[-0.5, 0.5,-0.5]], uv: [[0,0],[1,0],[1,1],[0,1]] },
  // +Y.
  { v: [[-0.5, 0.5, 0.5],[ 0.5, 0.5, 0.5],[ 0.5, 0.5,-0.5],[-0.5, 0.5,-0.5]], uv: [[0,0],[1,0],[1,1],[0,1]] },
  // -Y.
  { v: [[-0.5,-0.5,-0.5],[ 0.5,-0.5,-0.5],[ 0.5,-0.5, 0.5],[-0.5,-0.5, 0.5]], uv: [[0,0],[1,0],[1,1],[0,1]] },
  // +Z.
  { v: [[-0.5,-0.5, 0.5],[ 0.5,-0.5, 0.5],[ 0.5, 0.5, 0.5],[-0.5, 0.5, 0.5]], uv: [[0,0],[1,0],[1,1],[0,1]] },
  // -Z.
  { v: [[ 0.5,-0.5,-0.5],[-0.5,-0.5,-0.5],[-0.5, 0.5,-0.5],[ 0.5, 0.5,-0.5]], uv: [[0,0],[1,0],[1,1],[0,1]] },
];

// Vertex layout matches the block mesh: pos3 + uv2 + light3 = 8 floats.

function pushBox(pos, idx, offset, size, light, uvTile) {
  const [u0, v0, u1, v1] = tileUV(uvTile);
  const sx = size[0] * 0.5;
  const sy = size[1] * 0.5;
  const sz = size[2] * 0.5;
  const base = pos.length / 8;
  for (let f = 0; f < 6; f++) {
    const face = FACES[f];
    for (let i = 0; i < 4; i++) {
      const v = face.v[i];
      const uv = face.uv[i];
      pos.push(
        offset.x + v[0] * sx,
        offset.y + v[1] * sy,
        offset.z + v[2] * sz,
        uv[0] === 0 ? u0 : u1,
        uv[1] === 0 ? v1 : v0,
        light[0], light[1], light[2]
      );
    }
    idx.push(base + f * 4 + 0, base + f * 4 + 1, base + f * 4 + 2, base + f * 4 + 0, base + f * 4 + 2, base + f * 4 + 3);
  }
}

export class Hand {
  constructor() {
    this.swingT = 0;        // seconds since current swing started
    this.swinging = false;  // true while a swing is in progress

    this.vbo = null;
    this.ibo = null;
    this.indexCount = 0;
    this._initialized = false;

    // Reusable scratch matrix for the swing transform.
    this._swingMvp = new Float32Array(16);
    this._swingLocal = new Float32Array(16);
  }

  initGL(gl) {
    if (this._initialized) return;
    this._initialized = true;

    // Warm skin-ish tint via the light attribute (shader multiplies tex * light).
    // Values > 1.0 brighten the planks tile above its native palette so the
    // hand reads as flesh rather than dirty wood.
    const light = [1.20, 1.05, 0.85];
    const uvTile = 8; // planks — gives a beige-tinted surface under our light.

    const pos = [];
    const idx = [];
    pushBox(pos, idx, FORE_OFFSET, [FORE_W, FORE_H, FORE_L], light, uvTile);
    pushBox(pos, idx, FIST_OFFSET, [FIST_W, FIST_H, FIST_L], light, uvTile);

    const positions = new Float32Array(pos);
    const indices = new Uint16Array(idx);

    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    this.indexCount = indices.length;
  }

  triggerSwing() {
    if (this.swinging) return;
    this.swinging = true;
    this.swingT = 0;
  }

  update(dt) {
    if (!this.swinging) return;
    this.swingT += dt;
    if (this.swingT >= SWING_DURATION) {
      this.swingT = 0;
      this.swinging = false;
    }
  }

// Build a hand-local swing about the shoulder, folded into `base`.
// baseMVP = proj. We want mvp = proj * swingLocal, where swingLocal =
// T(S) * Ry(yaw) * Rx(pitch) * Rz(roll) * T(-S), plus a forward thrust —
// rotates the whole arm around the shoulder pivot in hand-local space.
  applySwingTransform(out, base) {
    if (!this.swinging) {
      for (let i = 0; i < 16; i++) out[i] = base[i];
      return;
    }
    // Smooth 0→-1→+0.3 swing curve. Two half-sines stitched together:
    //   t: 0..0.5  → angle: 0..-1   (drop down)
    //   t: 0.5..1  → angle: -1..+0.3 (snap back past neutral)
    const t = this.swingT / SWING_DURATION;
    let k;
    if (t < 0.5) {
      k = -Math.sin((t / 0.5) * (Math.PI * 0.5));
    } else {
      k = -Math.cos(((t - 0.5) / 0.5) * (Math.PI * 0.5)) * 0.7 + 0.3;
    }
    const pitch = k * PITCH_AMP; // chop, scaled to keep the arc modest
    const e = Math.sin(Math.PI * t); // 0→1→0 envelope for the extras
    const yaw = YAW_AMP * e;   // toward screen center mid-swing
    const roll = ROLL_AMP * e; // slight cant mid-swing

    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cr = Math.cos(roll), sr = Math.sin(roll);

    // R = Ry(yaw) * Rx(pitch) * Rz(roll). The Rx below uses the same sign
    // convention as the old wrist-only matrix so the chop keeps its feel:
    //   Rx = [[1,0,0],[0,cp,sp],[0,-sp,cp]]
    //   Ry = [[cy,0,sy],[0,1,0],[-sy,0,cy]]
    //   Rz = [[cr,-sr,0],[sr,cr,0],[0,0,1]]
    // A = Rx * Rz:
    const a00 = cr, a01 = -sr, a02 = 0;
    const a10 = cp * sr, a11 = cp * cr, a12 = sp;
    const a20 = -sp * sr, a21 = -sp * cr, a22 = cp;
    // R = Ry * A:
    const r00 = cy * a00 + sy * a20;
    const r01 = cy * a01 + sy * a21;
    const r02 = sy * a22;
    const r10 = a10;
    const r11 = a11;
    const r12 = a12;
    const r20 = -sy * a00 + cy * a20;
    const r21 = -sy * a01 + cy * a21;
    const r22 = cy * a22;

    // Translation: shoulder stays fixed (T = S - R*S), plus forward thrust.
    const sx = SHOULDER.x, sy2 = SHOULDER.y, sz = SHOULDER.z;
    const tx = sx - (r00 * sx + r01 * sy2 + r02 * sz);
    const ty = sy2 - (r10 * sx + r11 * sy2 + r12 * sz);
    const tz = sz - (r20 * sx + r21 * sy2 + r22 * sz) - THRUST * e;

    // swingLocal in column-major storage.
    const sl = this._swingLocal;
    sl[0] = r00; sl[1] = r10; sl[2] = r20; sl[3] = 0;
    sl[4] = r01; sl[5] = r11; sl[6] = r21; sl[7] = 0;
    sl[8] = r02; sl[9] = r12; sl[10] = r22; sl[11] = 0;
    sl[12] = tx; sl[13] = ty; sl[14] = tz; sl[15] = 1;

    // out = base * sl (column-major mat4 multiply).
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k2 = 0; k2 < 4; k2++) {
          sum += base[k2 * 4 + row] * sl[col * 4 + k2];
        }
        out[col * 4 + row] = sum;
      }
    }
  }
}