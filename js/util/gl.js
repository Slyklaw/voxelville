export function createGL(canvas) {
  const opts = {
    alpha: false,
    antialias: true,
    depth: true,
    stencil: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  };

  let gl = canvas.getContext("webgl2", opts);
  let isWebGL2 = true;
  if (!gl) {
    isWebGL2 = false;
    gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
  }
  if (!gl) {
    throw new Error("WebGL is not supported in this browser");
  }

  return { gl, isWebGL2 };
}

export function resizeCanvas(canvas, gl) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
}
