import { createGL, resizeCanvas } from "./util/gl.js";
import { build, attributes, uniforms } from "./engine/shader.js";
import { createBuffer, createTexture2D } from "./engine/texture.js";
import { Camera } from "./engine/camera.js";
import { Input, attachInput } from "./engine/input.js";
import { buildAtlas } from "./engine/atlas.js";
import { ATLAS_SIZE } from "./world/block.js";
import { World } from "./world/world.js";
import { CHUNK_SIZE } from "./world/chunk.js";
import { buildChunkMesh } from "./world/blockmesh.js";

const canvas = document.getElementById("gl");
const { gl, isWebGL2 } = createGL(canvas);
console.log(`[voxelville] WebGL ${isWebGL2 ? "2.0" : "1.0"} context acquired`);

attachInput(canvas);
Input.setLockChangeHandler((locked) => {
  console.log(`[voxelville] pointer lock ${locked ? "acquired" : "released"}`);
});

const camera = new Camera({ fov: 70, near: 0.1, far: 1000 });

// ---------- Atlas ----------
const atlasPixels = buildAtlas();
const atlasTex = createTexture2D(gl, { min: gl.NEAREST, mag: gl.NEAREST, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE });
gl.bindTexture(gl.TEXTURE_2D, atlasTex);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ATLAS_SIZE, ATLAS_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, atlasPixels);

// ---------- Block shader ----------
const blockVertSrc = `#version 300 es
in vec3 a_pos;
in vec2 a_uv;
in vec3 a_light;
uniform mat4 u_mvp;
out vec2 v_uv;
out vec3 v_light;
void main() {
  gl_Position = u_mvp * vec4(a_pos, 1.0);
  v_uv = a_uv;
  v_light = a_light;
}
`;
const blockFragSrc = `#version 300 es
precision highp float;
in vec2 v_uv;
in vec3 v_light;
out vec4 outColor;
uniform sampler2D u_tex;
void main() {
  vec4 c = texture(u_tex, v_uv);
  if (c.a < 0.5) discard;
  outColor = vec4(c.rgb * v_light, 1.0);
}
`;
const blockProg = build(gl, blockVertSrc, blockFragSrc);
const blockLocs = {
  attribs: attributes(gl, blockProg, ["a_pos", "a_uv", "a_light"]),
  uniforms: uniforms(gl, blockProg, ["u_mvp", "u_tex"]),
};

// ---------- Sky shader (fullscreen gradient) ----------
const skyVertSrc = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  gl_Position = vec4(a_pos, 0.999, 1.0);
  v_uv = a_pos * 0.5 + 0.5;
}
`;
const skyFragSrc = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec3 top = vec3(0.40, 0.62, 0.92);
  vec3 horizon = vec3(0.78, 0.88, 0.96);
  vec3 c = mix(horizon, top, smoothstep(0.5, 1.0, v_uv.y));
  outColor = vec4(c, 1.0);
}
`;
const skyProg = build(gl, skyVertSrc, skyFragSrc);
const skyLocs = attributes(gl, skyProg, ["a_pos"]);
const skyVbo = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array([
  -1, -1,  1, -1,  1,  1,
  -1, -1,  1,  1, -1,  1,
]));

// ---------- World + lighting ----------
const world = new World(1337);
const RENDER_RADIUS = 4; // 4-chunk radius = 8x8 area = 128x128 blocks
world.ensureChunksAround(0, 0, RENDER_RADIUS);

const LIGHT_DIR = [0.4, 1.0, 0.3];
{
  const l = Math.hypot(LIGHT_DIR[0], LIGHT_DIR[1], LIGHT_DIR[2]);
  LIGHT_DIR[0] /= l; LIGHT_DIR[1] /= l; LIGHT_DIR[2] /= l;
}
const AMBIENT = 0.45;
const faceNormals = [
  [ 1,  0,  0], [-1,  0,  0],
  [ 0,  1,  0], [ 0, -1,  0],
  [ 0,  0,  1], [ 0,  0, -1],
];
const faceLight = faceNormals.map((n) => {
  const d = n[0] * LIGHT_DIR[0] + n[1] * LIGHT_DIR[1] + n[2] * LIGHT_DIR[2];
  const k = Math.max(0, d) * 0.6;
  return [AMBIENT + k, AMBIENT + k, AMBIENT + k];
});

// ---------- Build chunk meshes ----------
// For each loaded chunk, build (or rebuild) a VBO/IBO.
const chunkGl = new Map(); // key -> { vbo, ibo, indexCount, dirty }

function rebuildChunkMesh(key) {
  const chunk = world.chunks.get(key);
  if (!chunk) return;
  const [cs, cz] = key.split(",").map(Number);
  const mesh = buildChunkMesh(chunk, (x, y, z) => {
    if (y < 0) return 0;
    return world.getBlock(x, y, z);
  }, faceLight[0]);

  let entry = chunkGl.get(key);
  if (!entry) {
    entry = { vbo: gl.createBuffer(), ibo: gl.createBuffer(), indexCount: 0, dirty: false };
    chunkGl.set(key, entry);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, entry.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entry.ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
  entry.indexCount = mesh.indexCount;
  entry.dirty = false;
  console.log(`[voxelville] chunk ${key} rebuilt: ${mesh.indexCount / 6} quads, ${mesh.positions.length / 8} verts`);
}

for (const key of world.chunks.keys()) {
  rebuildChunkMesh(key);
}

const totalQuads = [...chunkGl.values()].reduce((s, e) => s + e.indexCount / 6, 0);
console.log(`[voxelville] world generated: ${world.chunks.size} chunks, ${totalQuads} quads`);

// ---------- GL state ----------
gl.clearColor(0.5, 0.7, 1.0, 1.0);
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
gl.frontFace(gl.CCW);

let lastTime = performance.now();
let fpsAccum = 0;
let fpsFrames = 0;
let fpsTimer = 0;

const sensitivity = 0.0025;

function frame(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  resizeCanvas(canvas, gl);
  const aspect = canvas.width / canvas.height;
  camera.setAspect(aspect);

  if (Input.isPointerLocked()) {
    camera.rotate(Input.mouseDeltaX() * sensitivity, Input.mouseDeltaY() * sensitivity);
  }
  Input.resetMouseDelta();

  const speed = (Input.isKeyDown("ShiftLeft") || Input.isKeyDown("ShiftRight")) ? 8 : 4;
  const fwd = camera.forward(new Float32Array(3));
  const right = camera.right(new Float32Array(3));
  let dx = 0, dy = 0, dz = 0;
  if (Input.isKeyDown("KeyW") || Input.isKeyDown("ArrowUp")) {
    dx += fwd[0] * speed * dt; dy += fwd[1] * speed * dt; dz += fwd[2] * speed * dt;
  }
  if (Input.isKeyDown("KeyS") || Input.isKeyDown("ArrowDown")) {
    dx -= fwd[0] * speed * dt; dy -= fwd[1] * speed * dt; dz -= fwd[2] * speed * dt;
  }
  if (Input.isKeyDown("KeyD") || Input.isKeyDown("ArrowRight")) {
    dx += right[0] * speed * dt; dy += right[1] * speed * dt; dz += right[2] * speed * dt;
  }
  if (Input.isKeyDown("KeyA") || Input.isKeyDown("ArrowLeft")) {
    dx -= right[0] * speed * dt; dy -= right[1] * speed * dt; dz -= right[2] * speed * dt;
  }
  if (Input.isKeyDown("Space")) dy += speed * dt;
  if (Input.isKeyDown("ControlLeft") || Input.isKeyDown("ControlRight")) dy -= speed * dt;
  if (dx || dy || dz) camera.move(dx, dy, dz);

  // ---- Render ----
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Sky (depth test still on; vertex emits gl_Position.z = 0.999 to be behind everything)
  gl.depthMask(false);
  gl.useProgram(skyProg);
  gl.bindBuffer(gl.ARRAY_BUFFER, skyVbo);
  gl.enableVertexAttribArray(skyLocs);
  gl.vertexAttribPointer(skyLocs, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.depthMask(true);

  // World
  const vp = camera.getViewProj();
  gl.useProgram(blockProg);
  gl.uniformMatrix4fv(blockLocs.uniforms.u_mvp, false, vp);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, atlasTex);
  gl.uniform1i(blockLocs.uniforms.u_tex, 0);

  for (const [, entry] of chunkGl) {
    if (entry.indexCount === 0) continue;
    gl.bindBuffer(gl.ARRAY_BUFFER, entry.vbo);
    gl.enableVertexAttribArray(blockLocs.attribs.a_pos);
    gl.vertexAttribPointer(blockLocs.attribs.a_pos, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(blockLocs.attribs.a_uv);
    gl.vertexAttribPointer(blockLocs.attribs.a_uv, 2, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(blockLocs.attribs.a_light);
    gl.vertexAttribPointer(blockLocs.attribs.a_light, 3, gl.FLOAT, false, 32, 20);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entry.ibo);
    gl.drawElements(gl.TRIANGLES, entry.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  fpsAccum += dt;
  fpsFrames += 1;
  fpsTimer += dt;
  if (fpsTimer >= 1.0) {
    const fps = Math.round(fpsFrames / fpsAccum);
    console.log(`[voxelville] FPS: ${fps}`);
    fpsAccum = 0;
    fpsFrames = 0;
    fpsTimer = 0;
  }

  requestAnimationFrame(frame);
}

// Spawn the camera above the world center.
camera.position[0] = 0;
camera.position[1] = 18;
camera.position[2] = 0;
camera.yaw = -Math.PI / 2;
camera.pitch = -0.5;
camera._dirty = true;

requestAnimationFrame(frame);
