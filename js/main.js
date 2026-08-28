import { createGL, resizeCanvas } from "./util/gl.js";

const canvas = document.getElementById("gl");
const { gl, isWebGL2 } = createGL(canvas);
console.log(`[voxelville] WebGL ${isWebGL2 ? "2.0" : "1.0"} context acquired`);

if (!isWebGL2) {
  console.warn("[voxelville] WebGL 2.0 unavailable; fallback path not yet implemented");
}

gl.clearColor(0.12, 0.18, 0.32, 1.0);

let lastTime = performance.now();
let fpsAccum = 0;
let fpsFrames = 0;
let fpsTimer = 0;
let fpsDisplay = 0;

function frame(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  resizeCanvas(canvas, gl);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  fpsAccum += dt;
  fpsFrames += 1;
  fpsTimer += dt;
  if (fpsTimer >= 1.0) {
    fpsDisplay = Math.round(fpsFrames / fpsAccum);
    fpsAccum = 0;
    fpsFrames = 0;
    fpsTimer = 0;
    console.log(`[voxelville] FPS: ${fpsDisplay}`);
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
