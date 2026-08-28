export function makeTriangle() {
  const verts = new Float32Array([
    0.0,  0.6, 0.0,
   -0.6, -0.4, 0.0,
    0.6, -0.4, 0.0,
  ]);
  const uvs = new Float32Array([
    0.5, 0.0,
    0.0, 1.0,
    1.0, 1.0,
  ]);
  return { verts, uvs, count: 3 };
}
