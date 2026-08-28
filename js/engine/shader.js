export function compile(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    const kind = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
    throw new Error(`[shader] ${kind} compile failed:\n${log}\n--- source ---\n${source}`);
  }
  return sh;
}

export function link(gl, vs, fs) {
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`[shader] program link failed:\n${log}`);
  }
  return prog;
}

export function build(gl, vertSrc, fragSrc) {
  const vs = compile(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  const prog = link(gl, vs, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return prog;
}

export function uniforms(gl, prog, names) {
  const out = {};
  for (const n of names) {
    out[n] = gl.getUniformLocation(prog, n);
  }
  return out;
}

export function attributes(gl, prog, names) {
  const out = {};
  for (const n of names) {
    out[n] = gl.getAttribLocation(prog, n);
  }
  return out;
}
