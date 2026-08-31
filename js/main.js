import { createGL, resizeCanvas } from "./util/gl.js";
import { build, attributes, uniforms } from "./engine/shader.js";
import { createBuffer, createTexture2D } from "./engine/texture.js";
import { Camera } from "./engine/camera.js";
import { Input, attachInput } from "./engine/input.js";
import { buildAtlas } from "./engine/atlas.js";
import { ATLAS_SIZE, BLOCKS, isBlockSolid } from "./world/block.js";
import { World } from "./world/world.js";
import { CHUNK_SIZE } from "./world/chunk.js";
import { buildChunkMesh } from "./world/blockmesh.js";
import { Player } from "./entity/player.js";
import { raycastBlock } from "./physics/raycast.js";
import { HUD } from "./ui/hud.js";

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

// ---------- Line shader (selection box) ----------
const lineVertSrc = `#version 300 es
in vec3 a_pos;
uniform mat4 u_mvp;
void main() {
  gl_Position = u_mvp * vec4(a_pos, 1.0);
}
`;
const lineFragSrc = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec3 u_color;
void main() {
  outColor = vec4(u_color, 1.0);
}
`;
const lineProg = build(gl, lineVertSrc, lineFragSrc);
const lineLocs = {
  attribs: attributes(gl, lineProg, ["a_pos"]),
  uniforms: uniforms(gl, lineProg, ["u_mvp", "u_color"]),
};

// 12 edges of a unit cube as 24 vertices (so each endpoint is its own vertex
// and gl.LINES connects them).
function makeSelectionBoxLines(size) {
  const s = size * 0.5;
  return new Float32Array([
    -s, -s, -s,   s, -s, -s,
     s, -s, -s,   s, -s,  s,
     s, -s,  s,  -s, -s,  s,
    -s, -s,  s,  -s, -s, -s,
    -s,  s, -s,   s,  s, -s,
     s,  s, -s,   s,  s,  s,
     s,  s,  s,  -s,  s,  s,
    -s,  s,  s,  -s,  s, -s,
    -s, -s, -s,  -s,  s, -s,
     s, -s, -s,   s,  s, -s,
     s, -s,  s,   s,  s,  s,
    -s, -s,  s,  -s,  s,  s,
  ]);
}
const selectionVbo = createBuffer(gl, gl.ARRAY_BUFFER, makeSelectionBoxLines(1.0), gl.DYNAMIC_DRAW);
const SELECTION_INDICES = 24;

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

function rebuildAround(x, y, z) {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);
  const lx = x - cx * CHUNK_SIZE;
  const lz = z - cz * CHUNK_SIZE;
  // The chunk holding the block, plus any neighbor that shares a boundary
  // face (because the face-culling depends on the block on the other side).
  const keys = [`${cx},${cz}`];
  if (lx === 0)              keys.push(`${cx - 1},${cz}`);
  if (lx === CHUNK_SIZE - 1) keys.push(`${cx + 1},${cz}`);
  if (lz === 0)              keys.push(`${cx},${cz - 1}`);
  if (lz === CHUNK_SIZE - 1) keys.push(`${cx},${cz + 1}`);
  for (const k of keys) rebuildChunkMesh(k);
}

for (const key of world.chunks.keys()) {
  rebuildChunkMesh(key);
}

const totalQuads = [...chunkGl.values()].reduce((s, e) => s + e.indexCount / 6, 0);
console.log(`[voxelville] world generated: ${world.chunks.size} chunks, ${totalQuads} quads`);

// ---------- HUD ----------
const hudCanvas = document.getElementById("hud-canvas");
const hud = new HUD(hudCanvas, atlasPixels);

// ---------- Block interaction ----------
const PICK_REACH = 5.0;
const PLACE_REACH = 5.0;

function aabbIntersectsBlock(box, bx, by, bz) {
  return (
    box.x < bx + 1 &&
    box.x + box.w > bx &&
    box.y < by + 1 &&
    box.y + box.h > by &&
    box.z < bz + 1 &&
    box.z + box.d > bz
  );
}

function tryBreak() {
  const origin = camera.position;
  const dir = camera.forward(new Float32Array(3));
  const hit = raycastBlock((x, y, z) => world.getBlock(x, y, z), origin, dir, PICK_REACH);
  if (!hit.hit || hit.t < 0.01) return;
  const id = world.getBlock(hit.x, hit.y, hit.z);
  if (id === 0) return;
  if (!isBlockSolid(id)) return; // can't break water/etc yet
  world.setBlock(hit.x, hit.y, hit.z, 0);
  rebuildAround(hit.x, hit.y, hit.z);
  console.log(`[voxelville] broke block ${id} at (${hit.x}, ${hit.y}, ${hit.z})`);
}

function tryPlace() {
  const origin = camera.position;
  const dir = camera.forward(new Float32Array(3));
  const hit = raycastBlock((x, y, z) => world.getBlock(x, y, z), origin, dir, PLACE_REACH);
  if (!hit.hit || hit.t < 0.01) return;
  const px = hit.x + hit.nx;
  const py = hit.y + hit.ny;
  const pz = hit.z + hit.nz;
  if (world.getBlock(px, py, pz) !== 0) return;
  const blockId = hud.getSelectedBlock();
  if (!blockId) return;
  if (aabbIntersectsBlock(player.box, px, py, pz)) return;
  world.setBlock(px, py, pz, blockId);
  rebuildAround(px, py, pz);
  console.log(`[voxelville] placed block ${blockId} at (${px}, ${py}, ${pz})`);
}

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

// ---- Player ----
const player = new Player(camera, world);
player.setPosition(0, 18, 0);
camera.yaw = -Math.PI / 2;
camera.pitch = -0.2;
player.syncCamera();

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  resizeCanvas(canvas, gl);
  const aspect = canvas.width / canvas.height;
  camera.setAspect(aspect);

  if (Input.isPointerLocked()) {
    camera.rotate(Input.mouseDeltaX() * sensitivity, -Input.mouseDeltaY() * sensitivity);
  }
  Input.resetMouseDelta();

  if (Input.consumeKeyPress("KeyF")) player.toggleFly();

  // Hotbar: 1..9 to pick a slot, mouse wheel to cycle.
  for (let i = 0; i < 9; i++) {
    if (Input.consumeKeyPress("Digit" + (i + 1))) hud.setSlot(i);
  }
  for (let i = 0; i < 9; i++) {
    if (Input.consumeKeyPress("Numpad" + (i + 1))) hud.setSlot(i);
  }
  const wheel = Input.consumeWheel();
  if (wheel !== 0) hud.cycleSlot(Math.sign(wheel));

  // Block break / place.
  if (Input.consumeMouseLeft())  tryBreak();
  if (Input.consumeMouseRight()) tryPlace();

  player.update(dt);

  // Raycast once per frame for the selection box.
  const selOrigin = camera.position;
  const selDir = camera.forward(new Float32Array(3));
  const selHit = raycastBlock((x, y, z) => world.getBlock(x, y, z), selOrigin, selDir, PICK_REACH);

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

  // Selection box (wireframe outline of the targeted block).
  if (selHit.hit && selHit.t > 0.01) {
    gl.useProgram(lineProg);
    const mvp = camera.getViewProj();
    gl.uniform3f(lineLocs.uniforms.u_color, 0.0, 0.0, 0.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, selectionVbo);
    gl.enableVertexAttribArray(lineLocs.attribs.a_pos);
    gl.vertexAttribPointer(lineLocs.attribs.a_pos, 3, gl.FLOAT, false, 0, 0);
    gl.lineWidth(2.0);
    // Snap the wireframe to the exact block bounds (centered at
    // selHit + 0.5) and push it outward along the face normal so the
    // back edges of the box don't z-fight with the block's back faces.
    const cx = selHit.x + 0.5, cy = selHit.y + 0.5, cz = selHit.z + 0.5;
    const offset = 0.005;
    const tx = cx + selHit.nx * offset;
    const ty = cy + selHit.ny * offset;
    const tz = cz + selHit.nz * offset;
    // m_new = mvp * T(tx,ty,tz). Only the translation column changes.
    const m = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      m[i]      = mvp[i];
      m[4 + i]  = mvp[4 + i];
      m[8 + i]  = mvp[8 + i];
      m[12 + i] = mvp[i] * tx + mvp[4 + i] * ty + mvp[8 + i] * tz + mvp[12 + i];
    }
    gl.uniformMatrix4fv(lineLocs.uniforms.u_mvp, false, m);
    gl.drawArrays(gl.LINES, 0, SELECTION_INDICES);
    gl.lineWidth(1.0);
    gl.disableVertexAttribArray(lineLocs.attribs.a_pos);
  }

  // HUD (2D overlay).
  hud.draw();

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

requestAnimationFrame(frame);
