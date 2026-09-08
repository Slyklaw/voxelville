import { createGL, resizeCanvas } from "./util/gl.js";
import { build, attributes, uniforms } from "./engine/shader.js";
import { createBuffer, createTexture2D } from "./engine/texture.js";
import { Camera } from "./engine/camera.js";
import { Input, attachInput } from "./engine/input.js";
import { buildAtlas } from "./engine/atlas.js";
import { ATLAS_SIZE, TILE_SIZE, ATLAS_GRID, BLOCKS, isBlockSolid, isBlockUnbreakable } from "./world/block.js";
import { World } from "./world/world.js";
import { CHUNK_SIZE } from "./world/chunk.js";
import { buildChunkMesh } from "./world/blockmesh.js";
import { Player } from "./entity/player.js";
import { raycastBlock } from "./physics/raycast.js";
import { HUD } from "./ui/hud.js";
import { saveWorld, loadWorld } from "./storage/save.js";
import { ParticleSystem } from "./engine/particles.js";
import { Hand } from "./entity/hand.js";
import { loadSettings, saveSettings } from "./storage/settings.js";
import { createSettingsPanel } from "./ui/settings.js";

export const VERSION = "v0.1.0";

const canvas = document.getElementById("gl");
// Splash progress (Phase 18): the overlay is plain HTML so it paints before
// the module finishes loading the world; each stage below advances the bar.
const splashFill = document.getElementById("splash-fill");
function setSplash(pct) {
  if (splashFill) splashFill.style.width = `${Math.max(5, Math.min(100, pct))}%`;
}
function hideSplash() {
  const splash = document.getElementById("splash");
  if (splash) splash.style.display = "none";
}

// Settings load before worldgen so the spawn-time chunk square honors them.
const settings = loadSettings();
let sensitivity = settings.sensitivity;
const { gl, isWebGL2 } = createGL(canvas);
console.log(`[voxelville] WebGL ${isWebGL2 ? "2.0" : "1.0"} context acquired`);

attachInput(canvas);

let paused = false;
let settingsPanel = null; // created after the HUD, below
function openSettings() {
  paused = true;
  if (settingsPanel) settingsPanel.open();
}
function resumeGame() {
  if (settingsPanel) settingsPanel.close();
  paused = false;
  Input.requestPointerLock(canvas);
}
Input.setLockChangeHandler((locked) => {
  console.log(`[voxelville] pointer lock ${locked ? "acquired" : "released"}`);
  // Esc while locked drops the lock (browser-reserved) — that opens settings.
  if (!locked) openSettings();
});

const camera = new Camera({ fov: 70, near: 0.1, far: 1000 });

// ---------- Atlas ----------
const atlasPixels = buildAtlas();
const atlasTex = createTexture2D(gl, { min: gl.NEAREST, mag: gl.NEAREST, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE });
gl.bindTexture(gl.TEXTURE_2D, atlasTex);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ATLAS_SIZE, ATLAS_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, atlasPixels);
setSplash(30);

// ---------- Block shader ----------
const blockVertSrc = `#version 300 es
in vec3 a_pos;
in vec2 a_uv;
in vec3 a_light;
uniform mat4 u_mvp;
out vec2 v_uv;
out vec3 v_light;
out vec3 v_world;
void main() {
  gl_Position = u_mvp * vec4(a_pos, 1.0);
  v_uv = a_uv;
  v_light = a_light;
  v_world = a_pos;
}
`;
const blockFragSrc = `#version 300 es
precision highp float;
in vec2 v_uv;
in vec3 v_light;
in vec3 v_world;
out vec4 outColor;
uniform sampler2D u_tex;
uniform vec3 u_fogColor;
uniform vec2 u_fogRange;
uniform vec3 u_camPos;
uniform float u_useFog;
void main() {
  vec4 c = texture(u_tex, v_uv);
  if (c.a < 0.5) discard;
  vec3 rgb = c.rgb * v_light;
  if (u_useFog > 0.5) {
    float d = distance(v_world, u_camPos);
    float f = clamp((d - u_fogRange.x) / (u_fogRange.y - u_fogRange.x), 0.0, 1.0);
    rgb = mix(rgb, u_fogColor, f);
  }
  outColor = vec4(rgb, c.a);
}
`;
const FOG_COLOR = [0.78, 0.88, 0.96]; // matches the sky horizon below
const FOG_NEAR = 32.0;
const FOG_FAR = 80.0;
const blockProg = build(gl, blockVertSrc, blockFragSrc);
const blockLocs = {
  attribs: attributes(gl, blockProg, ["a_pos", "a_uv", "a_light"]),
  uniforms: uniforms(gl, blockProg, ["u_mvp", "u_tex", "u_fogColor", "u_fogRange", "u_camPos", "u_useFog"]),
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

// ---------- Particle shader (instanced billboarded quads) ----------
// Each instance has a world position and a color (with per-particle alpha so
// we can fade as the puff ages); the base quad (a 2D corner in {-0.5,+0.5}²)
// is scaled by u_size and projected to clip space directly (no view rotation —
// particles face the camera as a flat plane).
const particleVertSrc = `#version 300 es
in vec2 a_corner;
in vec3 a_instancePos;
in vec4 a_instanceColor;
uniform mat4 u_mvp;
uniform float u_size;
out vec4 v_color;
void main() {
  vec3 worldPos = a_instancePos + vec3(a_corner * u_size, 0.0);
  gl_Position = u_mvp * vec4(worldPos, 1.0);
  v_color = a_instanceColor;
}
`;
const particleFragSrc = `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 outColor;
void main() {
  outColor = v_color;
}
`;
const particleProg = build(gl, particleVertSrc, particleFragSrc);
const particleLocs = {
  attribs: attributes(gl, particleProg, ["a_corner", "a_instancePos", "a_instanceColor"]),
  uniforms: uniforms(gl, particleProg, ["u_mvp", "u_size"]),
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

// ---------- Particle system ----------
// Pools 256 billboarded quads. Tinted with the broken block's face color so
// the puff visually matches what the player just destroyed.
const particles = new ParticleSystem();
particles.initGL(gl);

// ---------- First-person hand ----------
// Two boxes (forearm + fist) in camera-local space. Reuses the block shader
// so the hand samples the same atlas. Swings on left-click to give mining
// feedback.
const hand = new Hand();
hand.initGL(gl);

// Average the inner 8x8 pixels of a face tile to get a representative color.
// Skips the border pixels so a thin highlight doesn't skew the result.
// Returns a fresh [r, g, b] in 0..1 (linear) on each call.
function sampleFaceColor(blockId, faceIndex) {
  const block = BLOCKS[blockId];
  if (!block || !block.faces) return [0.7, 0.7, 0.7];
  const tile = block.faces[faceIndex];
  if (tile == null || tile < 0) return [0.7, 0.7, 0.7];
  const col = tile % ATLAS_GRID;
  const row = Math.floor(tile / ATLAS_GRID);
  const ox = col * TILE_SIZE;
  const oy = row * TILE_SIZE;
  let r = 0, g = 0, b = 0, n = 0;
  // Average over the inner 8x8 of the 16x16 tile.
  for (let py = 4; py < 12; py++) {
    for (let px = 4; px < 12; px++) {
      const i = ((oy + py) * ATLAS_SIZE + (ox + px)) * 4;
      r += atlasPixels[i];
      g += atlasPixels[i + 1];
      b += atlasPixels[i + 2];
      n++;
    }
  }
  // atlasPixels is sRGB-ish; treat as linear for our flat-color shading.
  return [r / n / 255, g / n / 255, b / n / 255];
}

// Map a hit's normal vector (nx, ny, nz) — each axis in {-1, 0, +1} — to the
// face index used in BLOCKS[].faces. Order is +x, -x, +y, -y, +z, -z.
function faceIndexFromNormal(nx, ny, nz) {
  if (nx ===  1) return 0;
  if (nx === -1) return 1;
  if (ny ===  1) return 2;
  if (ny === -1) return 3;
  if (nz ===  1) return 4;
  return 5; // nz === -1
}

// ---------- World + lighting ----------
const DEFAULT_SEED = 1337;

async function buildWorld() {
  const saved = await loadWorld().catch((err) => {
    console.warn(`[voxelville] load failed, starting fresh: ${err.message}`);
    return null;
  });
  if (saved) {
    const world = new World(saved.seed);
    for (const c of saved.chunks) world.setChunkBlocks(c.cx, c.cz, c.blocks);
    console.log(`[voxelville] loaded save: seed=${saved.seed}, ${saved.chunks.length} chunks`);
    return world;
  }
  const world = new World(DEFAULT_SEED);
  console.log(`[voxelville] no save found, generating fresh world with seed ${DEFAULT_SEED}`);
  return world;
}

const world = await buildWorld();
setSplash(60);
world.ensureChunksAround(0, 0, settings.renderDistance);

// Debounced auto-save: any block change schedules a write 500ms later.
// Repeated changes within the window reset the timer so we only save once the
// player has stopped modifying the world.
let saveTimer = null;
function scheduleAutoSave() {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveWorld(world).then(
      () => console.log("[voxelville] auto-saved"),
      (err) => console.warn(`[voxelville] auto-save failed: ${err.message}`)
    );
  }, 500);
}
async function manualSave() {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    await saveWorld(world);
    console.log("[voxelville] manual save complete");
  } catch (err) {
    console.warn(`[voxelville] manual save failed: ${err.message}`);
  }
}

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
// For each loaded chunk, build (or rebuild) two VBOs/IBOs: opaque and
// transparent. The renderer draws opaque first, then transparent with alpha
// blending and depth writes off, sorted back-to-front.
//
// Chunks mark themselves dirty when a block changes (Chunk.set /
// World.setBlock). The per-frame rebuildDirtyChunks() loop picks those up,
// also rebuilding boundary neighbors whose faces face the dirty chunk.
const chunkGl = new Map(); // key -> { cx, cz, opaque:{vbo,ibo,indexCount}, transparent:{vbo,ibo,indexCount} }

function rebuildChunkMesh(key) {
  const chunk = world.chunks.get(key);
  if (!chunk) return;
  const mesh = buildChunkMesh(chunk, (x, y, z) => {
    if (y < 0) return 0;
    return world.getBlock(x, y, z);
  }, faceLight[0]);

  let entry = chunkGl.get(key);
  if (!entry) {
    entry = {
      cx: chunk.cx,
      cz: chunk.cz,
      opaque: { vbo: gl.createBuffer(), ibo: gl.createBuffer(), indexCount: 0 },
      transparent: { vbo: gl.createBuffer(), ibo: gl.createBuffer(), indexCount: 0 },
    };
    chunkGl.set(key, entry);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, entry.opaque.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.opaque.positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entry.opaque.ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.opaque.indices, gl.STATIC_DRAW);
  entry.opaque.indexCount = mesh.opaque.indexCount;

  gl.bindBuffer(gl.ARRAY_BUFFER, entry.transparent.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.transparent.positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entry.transparent.ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.transparent.indices, gl.STATIC_DRAW);
  entry.transparent.indexCount = mesh.transparent.indexCount;

  chunk.dirty = false;
}

// Find chunks that need a rebuild: any chunk flagged dirty, plus any loaded
// chunk that shares a chunk boundary with a dirty chunk (its faces on that
// boundary depend on the neighbor's state and must be re-evaluated).
//
// Streaming (Phase 17) can dirty a dozen chunks in one frame when the player
// crosses a border, so rebuilds are budgeted and nearest-first: the chunks
// around the player resolve first, the rest follow over the next frames.
// Anything not rebuilt keeps its dirty flag for a later frame.
const MESH_BUDGET = 4; // design §3.9: max 4 chunk rebuilds per frame
function rebuildDirtyChunks() {
  const dirtyKeys = [];
  for (const [key, chunk] of world.chunks) {
    if (chunk.dirty) dirtyKeys.push(key);
  }
  if (dirtyKeys.length === 0) return;

  const toRebuild = new Set(dirtyKeys);
  for (const key of dirtyKeys) {
    const [cx, cz] = key.split(",").map(Number);
    const neighbors = [
      `${cx - 1},${cz}`,
      `${cx + 1},${cz}`,
      `${cx},${cz - 1}`,
      `${cx},${cz + 1}`,
    ];
    for (const n of neighbors) {
      if (world.chunks.has(n)) toRebuild.add(n);
    }
  }
  // Nearest-first around the player's chunk so the visible area wins.
  const pcx = Math.floor((player.box.x + player.width * 0.5) / CHUNK_SIZE);
  const pcz = Math.floor((player.box.z + player.width * 0.5) / CHUNK_SIZE);
  const ordered = [...toRebuild].sort((a, b) => {
    const [ax, az] = a.split(",").map(Number);
    const [bx, bz] = b.split(",").map(Number);
    return (ax - pcx) ** 2 + (az - pcz) ** 2 - ((bx - pcx) ** 2 + (bz - pcz) ** 2);
  });
  for (const key of ordered.slice(0, MESH_BUDGET)) rebuildChunkMesh(key);
}

for (const key of world.chunks.keys()) {
  rebuildChunkMesh(key);
}

const totalQuads = [...chunkGl.values()].reduce(
  (s, e) => s + e.opaque.indexCount / 6 + e.transparent.indexCount / 6,
  0
);
console.log(`[voxelville] world generated: ${world.chunks.size} chunks, ${totalQuads} quads`);
setSplash(90);

// ---------- HUD ----------
const hudCanvas = document.getElementById("hud-canvas");
const hud = new HUD(hudCanvas, atlasPixels);
hud.version = VERSION;

// ---------- Settings panel ----------
settingsPanel = createSettingsPanel({
  panel: document.getElementById("settings"),
  initial: settings,
  onChange(next) {
    settings.renderDistance = next.renderDistance;
    settings.sensitivity = next.sensitivity;
    sensitivity = settings.sensitivity;
    saveSettings(settings);
    // Force the streamer to re-evaluate at the new radius immediately.
    lastStreamCX = Infinity;
    lastStreamCZ = Infinity;
  },
  onResume: resumeGame,
  onOpen: openSettings,
  isLocked: () => Input.isPointerLocked(),
  onFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  },
});

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
  if (isBlockUnbreakable(id)) return; // bedrock floor is permanent in v0.1
  // Spawn a particle burst at the block's center, tinted with the face the
  // player hit (so different sides of grass/logs read as distinct colors).
  const faceIndex = faceIndexFromNormal(hit.nx, hit.ny, hit.nz);
  const rgb = sampleFaceColor(id, faceIndex);
  particles.spawnBurst(
    [hit.x + 0.5, hit.y + 0.5, hit.z + 0.5],
    rgb
  );
  world.setBlock(hit.x, hit.y, hit.z, 0);
  scheduleAutoSave();
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
  scheduleAutoSave();
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

// ---- Player ----
const player = new Player(camera, world);
player.setPosition(0, 18, 0);
camera.yaw = -Math.PI / 2;
camera.pitch = -0.2;
player.syncCamera();

hud.player = player;

// Phase 17 streamer: keep a render-distance square of generated terrain
// around the player. Runs only when the player enters a new chunk — crossing
// a border generates at most one fresh row/column, and meshing catches up
// over the next frames via the rebuild budget. Chunks are kept once loaded
// (memory is cheap at this size), and new ground is auto-saved.
let lastStreamCX = Infinity;
let lastStreamCZ = Infinity;
function streamChunks() {
  const pcx = Math.floor((player.box.x + player.width * 0.5) / CHUNK_SIZE);
  const pcz = Math.floor((player.box.z + player.width * 0.5) / CHUNK_SIZE);
  if (pcx === lastStreamCX && pcz === lastStreamCZ) return;
  lastStreamCX = pcx;
  lastStreamCZ = pcz;
  world.ensureChunksAround(pcx, pcz, settings.renderDistance);
  scheduleAutoSave();
}

let splashHidden = false;
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  resizeCanvas(canvas, gl);
  const aspect = canvas.width / canvas.height;
  camera.setAspect(aspect);

  if (!paused) {
  if (Input.isPointerLocked()) {
    camera.rotate(Input.mouseDeltaX() * sensitivity, -Input.mouseDeltaY() * sensitivity);
  }
  Input.resetMouseDelta();

  if (Input.consumeKeyPress("KeyF")) player.toggleFly();
  if (Input.consumeKeyPress("F2")) manualSave();

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
  if (Input.consumeMouseLeft()) {
    hand.triggerSwing();
    tryBreak();
  }
  if (Input.consumeMouseRight()) tryPlace();

  player.update(dt);
  streamChunks();
  rebuildDirtyChunks();
  particles.update(dt);
  hand.update(dt);
  } else {
    Input.resetMouseDelta();
    Input.consumeWheel();
  }

  // Raycast once per frame for the selection box.
  const selOrigin = camera.position;
  const selDir = camera.forward(new Float32Array(3));
  const selHit = raycastBlock((x, y, z) => world.getBlock(x, y, z), selOrigin, selDir, PICK_REACH);

  // ---- Render ----
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Sky (depth test still on; vertex emits gl_Position.z = 0.999 to sit
  // behind everything — LEQUAL so the far plane still accepts it).
  gl.depthMask(false);
  gl.depthFunc(gl.LEQUAL);
  gl.useProgram(skyProg);
  gl.bindBuffer(gl.ARRAY_BUFFER, skyVbo);
  gl.enableVertexAttribArray(skyLocs);
  gl.vertexAttribPointer(skyLocs, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.depthFunc(gl.LESS);
  gl.depthMask(true);

  // World
  const vp = camera.getViewProj();
  gl.useProgram(blockProg);
  gl.uniformMatrix4fv(blockLocs.uniforms.u_mvp, false, vp);
  gl.uniform3f(blockLocs.uniforms.u_fogColor, FOG_COLOR[0], FOG_COLOR[1], FOG_COLOR[2]);
  gl.uniform2f(blockLocs.uniforms.u_fogRange, FOG_NEAR, FOG_FAR);
  gl.uniform3f(blockLocs.uniforms.u_camPos, camera.position[0], camera.position[1], camera.position[2]);
  gl.uniform1f(blockLocs.uniforms.u_useFog, 1.0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, atlasTex);
  gl.uniform1i(blockLocs.uniforms.u_tex, 0);

  const setChunkAttribs = (entry) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, entry.vbo);
    gl.enableVertexAttribArray(blockLocs.attribs.a_pos);
    gl.vertexAttribPointer(blockLocs.attribs.a_pos, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(blockLocs.attribs.a_uv);
    gl.vertexAttribPointer(blockLocs.attribs.a_uv, 2, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(blockLocs.attribs.a_light);
    gl.vertexAttribPointer(blockLocs.attribs.a_light, 3, gl.FLOAT, false, 32, 20);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entry.ibo);
  };

  // Opaque pass: depth test on, depth write on, blending off. Chunks past
  // the render-distance setting are skipped (they stay loaded, just undrawn).
  gl.disable(gl.BLEND);
  gl.depthMask(true);
  const rd = settings.renderDistance;
  const pcx = Math.floor(camera.position[0] / CHUNK_SIZE);
  const pcz = Math.floor(camera.position[2] / CHUNK_SIZE);
  const inRange = (entry) => Math.abs(entry.cx - pcx) <= rd && Math.abs(entry.cz - pcz) <= rd;
  for (const [, entry] of chunkGl) {
    if (!inRange(entry)) continue;
    if (entry.opaque.indexCount === 0) continue;
    setChunkAttribs(entry.opaque);
    gl.drawElements(gl.TRIANGLES, entry.opaque.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  // Transparent pass: depth test on, depth write off, alpha blending on.
  // Sort chunk sub-meshes back-to-front by camera distance so alpha blending
  // composites correctly across chunks.
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);

  const cp = camera.position;
  const transparentChunks = [];
  for (const [, entry] of chunkGl) {
    if (!inRange(entry)) continue;
    if (entry.transparent.indexCount === 0) continue;
    const ccx = entry.cx * CHUNK_SIZE + CHUNK_SIZE * 0.5;
    const ccz = entry.cz * CHUNK_SIZE + CHUNK_SIZE * 0.5;
    const dx = cp[0] - ccx;
    const dz = cp[2] - ccz;
    transparentChunks.push({ entry, dist: dx * dx + dz * dz });
  }
  transparentChunks.sort((a, b) => b.dist - a.dist);

  for (const { entry } of transparentChunks) {
    setChunkAttribs(entry.transparent);
    gl.drawElements(gl.TRIANGLES, entry.transparent.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  // Restore state for subsequent passes.
  gl.depthMask(true);
  gl.disable(gl.BLEND);

  // Particle puff: alpha-blended, depth-test on, depth-write off. Drawn
  // after the transparent world pass so a burst always reads on top.
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  particles.render(gl, particleProg, particleLocs.attribs, particleLocs.uniforms, camera.getViewProj());
  gl.depthMask(true);
  gl.disable(gl.BLEND);

  // First-person hand: drawn with the block shader (vertex layout matches)
  // so the atlas-tinted surface reads as a skin tone. Culling is disabled
  // for the hand so both sides draw during the swing — the swing rotates
  // faces into and out of the camera's view, and we want every face to
  // contribute regardless of the instantaneous winding orientation.
  //
  // The hand is built in camera-local space and stays glued to the view by
  // applying projection only — `view` would cancel out anyway because the
  // hand's world position equals the camera's world position. The swing
  // rotation is folded in via `hand.applySwingTransform`.
  gl.useProgram(blockProg);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, atlasTex);
  gl.uniform1i(blockLocs.uniforms.u_tex, 0);
  gl.uniform1f(blockLocs.uniforms.u_useFog, 0.0); // hand is ~1 m out: fog must not touch it
  gl.bindBuffer(gl.ARRAY_BUFFER, hand.vbo);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, hand.ibo);
  gl.enableVertexAttribArray(blockLocs.attribs.a_pos);
  gl.vertexAttribPointer(blockLocs.attribs.a_pos, 3, gl.FLOAT, false, 32, 0);
  gl.enableVertexAttribArray(blockLocs.attribs.a_uv);
  gl.vertexAttribPointer(blockLocs.attribs.a_uv, 2, gl.FLOAT, false, 32, 12);
  gl.enableVertexAttribArray(blockLocs.attribs.a_light);
  gl.vertexAttribPointer(blockLocs.attribs.a_light, 3, gl.FLOAT, false, 32, 20);
  hand.applySwingTransform(hand._swingMvp, camera.getProj());
  gl.uniformMatrix4fv(blockLocs.uniforms.u_mvp, false, hand._swingMvp);
  gl.disable(gl.CULL_FACE);
  gl.drawElements(gl.TRIANGLES, hand.indexCount, gl.UNSIGNED_SHORT, 0);
  gl.enable(gl.CULL_FACE);

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

  if (!splashHidden) {
    splashHidden = true;
    setSplash(100);
    hideSplash();
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

requestAnimationFrame(frame);
