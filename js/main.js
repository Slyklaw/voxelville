import { createGL, resizeCanvas } from "./util/gl.js";
import { build, attributes, uniforms } from "./engine/shader.js";
import { createBuffer, createTexture2D, makeCheckerPixels } from "./engine/texture.js";
import { Camera } from "./engine/camera.js";
import { Input, attachInput } from "./engine/input.js";
import { buildAtlas, atlasToCanvas, tileUV } from "./engine/atlas.js";
import { ATLAS_SIZE, BLOCKS } from "./world/block.js";

const canvas = document.getElementById("gl");
const { gl, isWebGL2 } = createGL(canvas);
console.log(`[voxelville] WebGL ${isWebGL2 ? "2.0" : "1.0"} context acquired`);

attachInput(canvas);
Input.setLockChangeHandler((locked) => {
  console.log(`[voxelville] pointer lock ${locked ? "acquired" : "released"}`);
});

const camera = new Camera({ fov: 70, near: 0.1, far: 1000 });

// ---------- Triangle (Phase 1 carryover) ----------
const triVertSrc = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
out vec2 v_uv;
uniform mat2 u_rot;
uniform vec2 u_aspect;
void main() {
  vec2 p = u_rot * a_pos;
  p /= u_aspect;
  gl_Position = vec4(p, 0.0, 1.0);
  v_uv = a_uv;
}
`;
const triFragSrc = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_tex;
void main() {
  outColor = texture(u_tex, v_uv);
}
`;
{
  const prog = build(gl, triVertSrc, triFragSrc);
  const locs = {
    attribs: attributes(gl, prog, ["a_pos", "a_uv"]),
    uniforms: uniforms(gl, prog, ["u_rot", "u_aspect", "u_tex"]),
  };
  const triVerts = new Float32Array([
    0.0,  0.6,
   -0.6, -0.4,
    0.6, -0.4,
  ]);
  const triUvs = new Float32Array([
    0.5, 0.0,
    0.0, 1.0,
    1.0, 1.0,
  ]);
  const vbo = createBuffer(gl, gl.ARRAY_BUFFER, triVerts);
  const uvbo = createBuffer(gl, gl.ARRAY_BUFFER, triUvs);
  const tex = createTexture2D(gl);
  const pixels = makeCheckerPixels(16);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 16, 16, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  window.__phase1 = { prog, locs, vbo, uvbo, tex };
}

// ---------- Wireframe cube (Phase 2 carryover) ----------
const cubeVertSrc = `#version 300 es
in vec3 a_pos;
in vec3 a_color;
uniform mat4 u_mvp;
out vec3 v_color;
void main() {
  gl_Position = u_mvp * vec4(a_pos, 1.0);
  v_color = a_color;
}
`;
const cubeFragSrc = `#version 300 es
precision highp float;
in vec3 v_color;
out vec4 outColor;
void main() {
  outColor = vec4(v_color, 1.0);
}
`;
const cubeProg = build(gl, cubeVertSrc, cubeFragSrc);
const cubeLocs = {
  attribs: attributes(gl, cubeProg, ["a_pos", "a_color"]),
  uniforms: uniforms(gl, cubeProg, ["u_mvp"]),
};
const cubeEdges = [
  [-0.5, -0.5, -0.5], [ 0.5, -0.5, -0.5],
  [ 0.5, -0.5, -0.5], [ 0.5, -0.5,  0.5],
  [ 0.5, -0.5,  0.5], [-0.5, -0.5,  0.5],
  [-0.5, -0.5,  0.5], [-0.5, -0.5, -0.5],
  [-0.5,  0.5, -0.5], [ 0.5,  0.5, -0.5],
  [ 0.5,  0.5, -0.5], [ 0.5,  0.5,  0.5],
  [ 0.5,  0.5,  0.5], [-0.5,  0.5,  0.5],
  [-0.5,  0.5,  0.5], [-0.5,  0.5, -0.5],
  [-0.5, -0.5, -0.5], [-0.5,  0.5, -0.5],
  [ 0.5, -0.5, -0.5], [ 0.5,  0.5, -0.5],
  [ 0.5, -0.5,  0.5], [ 0.5,  0.5,  0.5],
  [-0.5, -0.5,  0.5], [-0.5,  0.5,  0.5],
];
const cubePositions = new Float32Array(cubeEdges.length * 3);
const cubeColors = new Float32Array(cubeEdges.length * 3);
for (let i = 0; i < cubeEdges.length; i++) {
  cubePositions[i * 3 + 0] = cubeEdges[i][0];
  cubePositions[i * 3 + 1] = cubeEdges[i][1];
  cubePositions[i * 3 + 2] = cubeEdges[i][2];
  cubeColors[i * 3 + 0] = 1;
  cubeColors[i * 3 + 1] = 1;
  cubeColors[i * 3 + 2] = 1;
}
const cubeVbo = createBuffer(gl, gl.ARRAY_BUFFER, cubePositions);
const cubeCbo = createBuffer(gl, gl.ARRAY_BUFFER, cubeColors);
const cubeLineCount = cubeEdges.length;

// ---------- Phase 3: procedural atlas preview quad ----------
const atlasVerts = new Float32Array([
  -1, -1,  0, 1,
   1, -1,  1, 1,
   1,  1,  1, 0,
  -1, -1,  0, 1,
   1,  1,  1, 0,
  -1,  1,  0, 0,
]);
const atlasVbo = createBuffer(gl, gl.ARRAY_BUFFER, atlasVerts);

const atlasVertSrc = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
out vec2 v_uv;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  v_uv = a_uv;
}
`;
const atlasFragSrc = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_tex;
void main() {
  outColor = texture(u_tex, v_uv);
}
`;
const atlasProg = build(gl, atlasVertSrc, atlasFragSrc);
const atlasLocs = {
  attribs: attributes(gl, atlasProg, ["a_pos", "a_uv"]),
  uniforms: uniforms(gl, atlasProg, ["u_tex"]),
};

const atlasPixels = buildAtlas();
const atlasTex = createTexture2D(gl, { min: gl.NEAREST, mag: gl.NEAREST, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE });
gl.bindTexture(gl.TEXTURE_2D, atlasTex);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ATLAS_SIZE, ATLAS_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, atlasPixels);

// Surface a couple of tile UVs to the console for the sanity check.
const samples = [
  ["grass_top", "grass_top"],
  ["dirt", "dirt"],
  ["stone", "stone"],
  ["sand", "sand"],
  ["water", "water"],
  ["log_side", "log_side"],
  ["log_top", "log_top"],
  ["planks", "planks"],
  ["leaves", "leaves"],
  ["glass", "glass"],
  ["cobble", "cobble"],
  ["bedrock", "bedrock"],
];
for (const [name, key] of samples) {
  const id = Object.values(BLOCKS).find((b) => b.name === name);
  if (!id) continue;
}
const blockNames = Object.values(BLOCKS).map((b) => b.name).filter(Boolean);
console.log(`[voxelville] atlas generated: ${ATLAS_SIZE}x${ATLAS_SIZE}, blocks: ${blockNames.join(", ")}`);

gl.clearColor(0.12, 0.18, 0.32, 1.0);
gl.enable(gl.DEPTH_TEST);

let lastTime = performance.now();
let fpsAccum = 0;
let fpsFrames = 0;
let fpsTimer = 0;

const sensitivity = 0.0025;
let showAtlas = true;

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

  if (Input.consumeKeyPress("F1")) showAtlas = !showAtlas;

  if (!showAtlas) {
    const speed = (Input.isKeyDown("ShiftLeft") || Input.isKeyDown("ShiftRight")) ? 6 : 3;
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
  }

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (showAtlas) {
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(atlasProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.uniform1i(atlasLocs.uniforms.u_tex, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, atlasVbo);
    gl.enableVertexAttribArray(atlasLocs.attribs.a_pos);
    gl.vertexAttribPointer(atlasLocs.attribs.a_pos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(atlasLocs.attribs.a_uv);
    gl.vertexAttribPointer(atlasLocs.attribs.a_uv, 2, gl.FLOAT, false, 16, 8);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.enable(gl.DEPTH_TEST);
  } else {
    const vp = camera.getViewProj();
    gl.useProgram(cubeProg);
    gl.uniformMatrix4fv(cubeLocs.uniforms.u_mvp, false, vp);
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVbo);
    gl.enableVertexAttribArray(cubeLocs.attribs.a_pos);
    gl.vertexAttribPointer(cubeLocs.attribs.a_pos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeCbo);
    gl.enableVertexAttribArray(cubeLocs.attribs.a_color);
    gl.vertexAttribPointer(cubeLocs.attribs.a_color, 3, gl.FLOAT, false, 0, 0);
    gl.lineWidth(2);
    gl.drawArrays(gl.LINES, 0, cubeLineCount);
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
