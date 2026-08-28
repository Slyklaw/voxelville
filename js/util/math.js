export const EPS = 1e-6;

export function vec3(x = 0, y = 0, z = 0) {
  return new Float32Array([x, y, z]);
}

export function v3copy(a) {
  return new Float32Array([a[0], a[1], a[2]]);
}

export function v3set(a, x, y, z) {
  a[0] = x;
  a[1] = y;
  a[2] = z;
  return a;
}

export function v3add(a, b) {
  return new Float32Array([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
}

export function v3sub(a, b) {
  return new Float32Array([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
}

export function v3scale(a, s) {
  return new Float32Array([a[0] * s, a[1] * s, a[2] * s]);
}

export function v3dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function v3cross(a, b) {
  return new Float32Array([
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]);
}

export function v3length(a) {
  return Math.hypot(a[0], a[1], a[2]);
}

export function v3normalize(a) {
  const len = v3length(a);
  if (len < EPS) return new Float32Array([0, 0, 0]);
  const inv = 1 / len;
  return new Float32Array([a[0] * inv, a[1] * inv, a[2] * inv]);
}

export function mat4() {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function m4identity(out) {
  out.fill(0);
  out[0] = out[5] = out[10] = out[15] = 1;
  return out;
}

export function m4copy(a) {
  return new Float32Array(a);
}

export function m4multiply(a, b) {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
      out[i * 4 + j] = s;
    }
  }
  return out;
}

export function m4perspective(out, fovYRad, aspect, near, far) {
  const f = 1 / Math.tan(fovYRad / 2);
  const nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

export function m4lookAt(out, eye, center, up) {
  const f = v3normalize(v3sub(center, eye));
  const s = v3normalize(v3cross(f, up));
  const u = v3cross(s, f);
  out[0] = s[0]; out[1] = u[0]; out[2] = -f[0]; out[3] = 0;
  out[4] = s[1]; out[5] = u[1]; out[6] = -f[1]; out[7] = 0;
  out[8] = s[2]; out[9] = u[2]; out[10] = -f[2]; out[11] = 0;
  out[12] = -v3dot(s, eye);
  out[13] = -v3dot(u, eye);
  out[14] = v3dot(f, eye);
  out[15] = 1;
  return out;
}

export function m4translate(out, x, y, z) {
  out[12] += x;
  out[13] += y;
  out[14] += z;
  return out;
}

export function m4rotateX(out, rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const a = new Float32Array(16);
  a[0] = 1; a[5] = c; a[6] = s; a[9] = -s; a[10] = c; a[15] = 1;
  return m4multiply(out, a);
}

export function m4rotateY(out, rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const a = new Float32Array(16);
  a[0] = c; a[2] = -s; a[5] = 1; a[8] = s; a[10] = c; a[15] = 1;
  return m4multiply(out, a);
}

export function m4rotateZ(out, rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const a = new Float32Array(16);
  a[0] = c; a[1] = s; a[4] = -s; a[5] = c; a[10] = 1; a[15] = 1;
  return m4multiply(out, a);
}

export function m4scale(out, x, y, z) {
  out[0] *= x; out[1] *= x; out[2] *= x; out[3] *= x;
  out[4] *= y; out[5] *= y; out[6] *= y; out[7] *= y;
  out[8] *= z; out[9] *= z; out[10] *= z; out[11] *= z;
  return out;
}

export function m4inverse(m) {
  const out = new Float32Array(16);
  const a = m;
  const b = out;
  b[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
  b[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
  b[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
  b[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
  b[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
  b[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
  b[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
  b[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
  b[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
  b[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
  b[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
  b[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
  b[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
  b[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
  b[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
  b[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
  let det = a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + a[3] * b[12];
  if (Math.abs(det) < EPS) return null;
  det = 1 / det;
  for (let i = 0; i < 16; i++) out[i] *= det;
  return out;
}

export function m4transpose(m) {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      out[j * 4 + i] = m[i * 4 + j];
  return out;
}

export function deg2rad(d) {
  return (d * Math.PI) / 180;
}
