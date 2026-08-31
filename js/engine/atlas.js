import { TILE_SIZE, ATLAS_GRID, ATLAS_SIZE, TILE } from "../world/block.js";

// 32-bit PRNG (Mulberry32) seeded per tile for deterministic procedural output.
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

const paletteCache = new Map();

function getPalette(name) {
  if (paletteCache.has(name)) return paletteCache.get(name);
  const pal = palettes[name];
  paletteCache.set(name, pal);
  return pal;
}

const palettes = {
  grass_top:  ["#5ea13a", "#4f8d2f", "#477f2a", "#3d7024"],
  grass_side: ["#8b6a3a", "#7a5c30", "#6c5028", "#5d4522"],
  grass_dirt: ["#8b6a3a", "#7a5c30", "#6c5028", "#5d4522"],
  dirt:       ["#8b6a3a", "#7a5c30", "#6c5028", "#5d4522"],
  stone:      ["#8a8a8a", "#787878", "#6c6c6c", "#5e5e5e"],
  sand:       ["#e8d995", "#d8c97f", "#c9ba6c", "#b6a85e"],
  water:      ["#3a64c8", "#2f55b0", "#274a9a", "#1f3f86"],
  log_side:   ["#6b4a26", "#5a3e1f", "#4d3519", "#3f2b14"],
  log_top:    ["#a08760", "#8a7050", "#766144", "#605038"],
  planks:     ["#b88a3e", "#a37a36", "#8e6a2e", "#775a25"],
  leaves:     ["#3f7a25", "#35691f", "#2c5a19", "#244c14"],
  glass:      ["#cfdcec", "#bfd2e4", "#aec5dc", "#9bb6d2"],
  cobble:     ["#7a7a7a", "#6a6a6a", "#5a5a5a", "#4a4a4a"],
  bedrock:    ["#3a3a3a", "#2e2e2e", "#232323", "#1a1a1a"],
};

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function fillTile(buf, ox, oy, palette, pattern) {
  const pal = palette.map(hexToRgb);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const idx = pattern(x, y, pal);
      const r = pal[idx][0];
      const g = pal[idx][1];
      const b = pal[idx][2];
      const i = ((oy + y) * ATLAS_SIZE + (ox + x)) * 4;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }
}

// Patterns: return palette index 0..3.
const patterns = {
  // Grass top: small irregular clumps of slightly-darker pixels (mimics grass blades).
  // Seeded by position so it doesn't look like uniform noise when stretched.
  grass_top(x, y) {
    // Cluster centers placed on a rough grid with jitter.
    const cx = ((x * 1103515245 + 12345) >>> 0) % 16;
    const cy = ((y * 2246822519 + 1) >>> 0) % 16;
    const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
    if (d2 < 4) return 2;
    if (d2 < 9) return 1;
    return 0;
  },
  // Grass side: top 4 rows green, row 4 = transition (alternating), rows 5..15 = dirt with specks.
  grass_side(x, y) {
    if (y < 4) return patterns.grass_top(x, y);
    if (y === 4) {
      // Transition: most of the row is grass, with 1-2 dirt intrusions per row.
      const inv = ((x * 7) % 5) === 0;
      return inv ? 2 : 0;
    }
    // Dirt body: occasional darker speck.
    const speck = (x * 13 + y * 19) % 7 === 0;
    return speck ? 2 : ((x * 3 + y * 5) % 4);
  },
  dirt(x, y) {
    // Slight bias toward lighter shades, with sparse darker pixels.
    const base = ((x * 11 + y * 17) % 4);
    if ((x * 7 + y * 13) % 11 === 0) return 2;
    return base;
  },
  stone(x, y) {
    // Mottled grey.
    const base = ((x * 13 + y * 19) % 4);
    if ((x * 5 + y * 11) % 13 === 0) return 3;
    return base;
  },
  sand(x, y) {
    // Mostly uniform light with sparse darker grains.
    const base = ((x * 17 + y * 23) % 4);
    if ((x * 3 + y * 7) % 9 === 0) return 1;
    return base;
  },
  water(x, y) {
    // Slight wave pattern.
    const wave = Math.sin(x * 0.8 + y * 0.3) * 0.5 + 0.5;
    return wave > 0.5 ? 1 : 0;
  },
  log_side(x, y) {
    // Vertical bark: dark edges, lighter center, sparse vertical streaks.
    if (x === 0 || x === 15) return 3;
    if (x === 1 || x === 14) return 2;
    if (x % 4 === 0) return 2;
    return ((x + y) % 2) ? 0 : 1;
  },
  log_top(x, y) {
    // Concentric rings.
    const dx = x - 7.5;
    const dy = y - 7.5;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > 7) return 0;
    if (r > 5.5) return 1;
    if (r > 4) return 2;
    if (r > 2.5) return 1;
    return 0;
  },
  planks(x, y) {
    // Horizontal plank lines: row 0, 4, 8, 12 are seams.
    if (y % 4 === 0) return 0;
    if (y % 4 === 1) return 1;
    // Vertical grain lines at x = 5, 10.
    if (x === 5 || x === 10) return 2;
    return 1;
  },
  leaves(x, y) {
    // Patchy with a few darker "shadow" leaves.
    const base = ((x * 7 + y * 11 + ((x * y) % 5)) % 4);
    if ((x + y * 3) % 7 === 0) return 3;
    return base;
  },
  glass(x, y) {
    if (x === 0 || y === 0 || x === 15 || y === 15) return 3;
    return 0;
  },
  cobble(x, y) {
    // Irregular mortar lines + cobble shape.
    if (x === 0 || y === 0 || x === 15 || y === 15) return 3;
    if (x === 8 || y === 4 || y === 12) return 3;
    if (x === 4 && y < 4) return 2;
    if (x === 12 && y > 11) return 2;
    return ((x * y + x + y) % 3) ? 0 : 1;
  },
  bedrock(x, y) {
    // Coarse, dark, irregular.
    if ((x * 23 + y * 29 + (x ^ y)) % 5 === 0) return 3;
    return ((x * 23 + y * 29 + (x ^ y)) % 4);
  },
};

// Map TILE -> { palette, pattern, seed }
const tileDefs = {
  [TILE.GRASS_TOP]:  { palette: "grass_top", pattern: "grass_top" },
  [TILE.GRASS_SIDE]: { palette: "grass_top", pattern: "grass_side" }, // top strip; body filled separately
  [TILE.DIRT]:       { palette: "dirt", pattern: "dirt" },
  [TILE.STONE]:      { palette: "stone", pattern: "stone" },
  [TILE.SAND]:       { palette: "sand", pattern: "sand" },
  [TILE.WATER]:      { palette: "water", pattern: "water" },
  [TILE.LOG_SIDE]:   { palette: "log_side", pattern: "log_side" },
  [TILE.LOG_TOP]:    { palette: "log_top", pattern: "log_top" },
  [TILE.PLANKS]:     { palette: "planks", pattern: "planks" },
  [TILE.LEAVES]:     { palette: "leaves", pattern: "leaves" },
  [TILE.GLASS]:      { palette: "glass", pattern: "glass" },
  [TILE.COBBLESTONE]:{ palette: "cobble", pattern: "cobble" },
  [TILE.BEDROCK]:    { palette: "bedrock", pattern: "bedrock" },
};

export function buildAtlas() {
  const buf = new Uint8Array(ATLAS_SIZE * ATLAS_SIZE * 4);

  for (const [tileStr, def] of Object.entries(tileDefs)) {
    const tile = parseInt(tileStr, 10);
    const col = tile % ATLAS_GRID;
    const row = Math.floor(tile / ATLAS_GRID);
    const ox = col * TILE_SIZE;
    const oy = row * TILE_SIZE;
    const pal = getPalette(def.palette);
    const rng = mulberry32(seedFromString(`${tile}:${def.pattern}`));
    const noisyRng = mulberry32(seedFromString(`salt:${tile}`));

    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        let idx = patterns[def.pattern](x, y, pal);
        // Subtle noise: 10% chance to shift by 1.
        if (noisyRng() < 0.1) idx = (idx + 1) & 3;
        const c = hexToRgb(pal[idx]);
        const i = ((oy + y) * ATLAS_SIZE + (ox + x)) * 4;
        buf[i] = c[0];
        buf[i + 1] = c[1];
        buf[i + 2] = c[2];
        buf[i + 3] = 255;
      }
    }

    // Grass side composite:
    //   rows 0..3   = grass_top pattern (irregular green clumps)
    //   row 4       = transition: mostly green with 1-2 dirt intrusions
    //   rows 5..15  = dirt body (brown) with sparse darker specks
    if (tile === TILE.GRASS_SIDE) {
      const grassPal = palettes.grass_top.map(hexToRgb);
      const dirtPal = palettes.dirt.map(hexToRgb);

      // rows 0..3: grass-top pattern
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const idx = patterns.grass_top(x, y);
          const c = grassPal[idx];
          const i = ((oy + y) * ATLAS_SIZE + (ox + x)) * 4;
          buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
        }
      }
      // row 4: transition
      for (let x = 0; x < TILE_SIZE; x++) {
        const isDirtIntrusion = (x === 2) || (x === 7) || (x === 13);
        const c = isDirtIntrusion ? dirtPal[2] : grassPal[0];
        const i = ((oy + 4) * ATLAS_SIZE + (ox + x)) * 4;
        buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
      }
      // rows 5..15: dirt body
      for (let y = 5; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const speck = (x * 13 + y * 19) % 7 === 0;
          const base = ((x * 3 + y * 5) % 4);
          const cIdx = speck ? 2 : base;
          const c = dirtPal[cIdx];
          const i = ((oy + y) * ATLAS_SIZE + (ox + x)) * 4;
          buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
        }
      }
    }

    // Alpha pass: carve holes in glass and make water translucent.
    //   Glass interior pixels (palette index 0) get alpha=0 so the discard in
    //   the fragment shader leaves a hole; border pixels (palette index 3)
    //   keep alpha=255 so the frame stays visible.
    //   Water gets alpha ~0.7 so it reads as a translucent blue surface.
    if (tile === TILE.GLASS) {
      const pal = palettes.glass.map(hexToRgb);
      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const idx = patterns.glass(x, y, pal);
          const i = ((oy + y) * ATLAS_SIZE + (ox + x)) * 4;
          buf[i + 3] = idx === 0 ? 0 : 255;
        }
      }
    } else if (tile === TILE.WATER) {
      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const i = ((oy + y) * ATLAS_SIZE + (ox + x)) * 4;
          buf[i + 3] = 178; // ~0.7
        }
      }
    }
  }

  return buf;
}

export function atlasToCanvas(buf) {
  const c = document.createElement("canvas");
  c.width = ATLAS_SIZE;
  c.height = ATLAS_SIZE;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(ATLAS_SIZE, ATLAS_SIZE);
  img.data.set(buf);
  ctx.putImageData(img, 0, 0);
  return c;
}

// Returns UV rect [u0, v0, u1, v1] (0..1) for a tile index.
export function tileUV(tileIndex) {
  const col = tileIndex % ATLAS_GRID;
  const row = Math.floor(tileIndex / ATLAS_GRID);
  const u0 = col / ATLAS_GRID;
  const v0 = row / ATLAS_GRID;
  const u1 = u0 + 1 / ATLAS_GRID;
  const v1 = v0 + 1 / ATLAS_GRID;
  return [u0, v0, u1, v1];
}
