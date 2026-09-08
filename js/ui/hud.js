// 2D HUD overlay: crosshair + 9-slot hotbar.
//
// The HUD is drawn on a regular 2D canvas that is layered over the WebGL
// canvas via CSS. We match the device pixel ratio for crisp lines.

import { TILE_SIZE, ATLAS_GRID, ATLAS_SIZE, TILE, BLOCKS } from "../world/block.js";

const HOTBAR_BLOCKS = [1, 2, 3, 10, 4, 6, 7, 8, 9]; // grass, dirt, stone, cobble, sand, log, planks, leaves, glass

const SLOT_PX = 40;     // CSS pixels per slot
const SLOT_GAP = 2;
const ICON_PX = 32;     // CSS pixels per block icon inside the slot
const HOTBAR_BOTTOM = 16;
const HOTBAR_HEIGHT = SLOT_PX;

export class HUD {
  constructor(canvas, atlasPixels) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.atlasPixels = atlasPixels;
    this.player = null;
    this.version = "";
    this.selectedSlot = 0;
    this.hoveredSlot = -1; // -1 = not over any slot

    this.icons = new Map();
    for (const id of HOTBAR_BLOCKS) {
      const block = BLOCKS[id];
      if (!block || !block.faces) continue;
      // Prefer the top-face icon for the HUD.
      const tile = block.faces[2] >= 0 ? block.faces[2] : block.faces[0];
      this.icons.set(id, this.buildIcon(tile));
    }

    // Track which hotbar slot the mouse is over. Pointer lock steals normal
    // mouse events, so we ignore them in that case.
    window.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement) {
        this.hoveredSlot = -1;
        return;
      }
      this.hoveredSlot = this.slotAt(e.clientX, e.clientY);
    });
  }

  // Return the slot index under (x, y), or -1 if outside the hotbar.
  slotAt(x, y) {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const totalW = HOTBAR_BLOCKS.length * SLOT_PX + (HOTBAR_BLOCKS.length - 1) * SLOT_GAP;
    const x0 = Math.floor((w - totalW) / 2);
    const y0 = h - HOTBAR_BOTTOM - SLOT_PX;
    if (y < y0 || y >= y0 + SLOT_PX) return -1;
    if (x < x0 || x >= x0 + totalW) return -1;
    const rel = x - x0;
    const slotStride = SLOT_PX + SLOT_GAP;
    let i = Math.floor(rel / slotStride);
    if (i >= HOTBAR_BLOCKS.length) return -1;
    // Reject clicks in the inter-slot gap.
    if (rel - i * slotStride >= SLOT_PX) return -1;
    return i;
  }

  buildIcon(tileIndex) {
    // Read the 16x16 tile out of the atlas into an offscreen canvas, then
    // upscale with nearest-neighbor for crisp pixel art.
    const off = document.createElement("canvas");
    off.width = ICON_PX;
    off.height = ICON_PX;
    const offCtx = off.getContext("2d");
    const img = offCtx.createImageData(ICON_PX, ICON_PX);

    const col = tileIndex % ATLAS_GRID;
    const row = Math.floor(tileIndex / ATLAS_GRID);
    for (let y = 0; y < ICON_PX; y++) {
      const sy = Math.floor((y * TILE_SIZE) / ICON_PX);
      for (let x = 0; x < ICON_PX; x++) {
        const sx = Math.floor((x * TILE_SIZE) / ICON_PX);
        const src = ((row * TILE_SIZE + sy) * ATLAS_SIZE + (col * TILE_SIZE + sx)) * 4;
        const dst = (y * ICON_PX + x) * 4;
        img.data[dst]     = this.atlasPixels[src];
        img.data[dst + 1] = this.atlasPixels[src + 1];
        img.data[dst + 2] = this.atlasPixels[src + 2];
        img.data[dst + 3] = 255;
      }
    }
    offCtx.putImageData(img, 0, 0);
    return off;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw() {
    this.resize();
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    this.drawCrosshair(ctx, w, h);
    this.drawHotbar(ctx, w, h);
    this.drawTooltip(ctx, w, h);
    this.drawStatusText(ctx, w, h);
    this.drawVersion(ctx, w, h);
  }

  drawVersion(ctx, w, h) {
    if (!this.version) return;
    ctx.font = "11px monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillText(this.version, w - 7, h - 7);
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillText(this.version, w - 8, h - 8);
  }

  drawCrosshair(ctx, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const len = 6;
    const gap = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - len, cy); ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + len, cy);
    ctx.moveTo(cx, cy - len); ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + len);
    ctx.stroke();
  }

  drawHotbar(ctx, w, h) {
    const totalW = HOTBAR_BLOCKS.length * SLOT_PX + (HOTBAR_BLOCKS.length - 1) * SLOT_GAP;
    const x0 = Math.floor((w - totalW) / 2);
    const y0 = h - HOTBAR_BOTTOM - SLOT_PX;

    for (let i = 0; i < HOTBAR_BLOCKS.length; i++) {
      const x = x0 + i * (SLOT_PX + SLOT_GAP);
      const y = y0;
      const isSelected = i === this.selectedSlot;

      // Slot background.
      ctx.fillStyle = isSelected ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(x, y, SLOT_PX, SLOT_PX);

      // Border.
      ctx.strokeStyle = isSelected ? "rgba(255, 255, 255, 1.0)" : "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, SLOT_PX - 1, SLOT_PX - 1);

      // Icon.
      const id = HOTBAR_BLOCKS[i];
      const icon = this.icons.get(id);
      if (!icon) continue;
      const iconX = x + (SLOT_PX - ICON_PX) / 2;
      const iconY = y + (SLOT_PX - ICON_PX) / 2;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(icon, iconX, iconY, ICON_PX, ICON_PX);
    }
  }

  cycleSlot(delta) {
    const n = HOTBAR_BLOCKS.length;
    this.selectedSlot = (this.selectedSlot + delta + n) % n;
  }

  setSlot(index) {
    if (index < 0 || index >= HOTBAR_BLOCKS.length) return;
    this.selectedSlot = index;
  }

  getSelectedBlock() {
    return HOTBAR_BLOCKS[this.selectedSlot];
  }

  drawStatusText(ctx, w, h) {
    if (!this.player || !this.player.flying) return;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const text = "Flying: ON";
    const x = w / 2;
    const y = 8;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText(text, x, y);
  }

  drawTooltip(ctx, w, h) {
    if (this.hoveredSlot < 0) return;
    const id = HOTBAR_BLOCKS[this.hoveredSlot];
    const block = BLOCKS[id];
    if (!block) return;
    const label = block.name;

    // Slot geometry for positioning.
    const totalW = HOTBAR_BLOCKS.length * SLOT_PX + (HOTBAR_BLOCKS.length - 1) * SLOT_GAP;
    const x0 = Math.floor((w - totalW) / 2);
    const y0 = h - HOTBAR_BOTTOM - SLOT_PX;

    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const text = label.charAt(0).toUpperCase() + label.slice(1);
    const padding = 6;
    const metrics = ctx.measureText(text);
    const boxW = metrics.width + padding * 2;
    const boxH = 18;
    const slotCx = x0 + this.hoveredSlot * (SLOT_PX + SLOT_GAP) + SLOT_PX * 0.5;
    const boxX = Math.max(2, Math.min(w - boxW - 2, slotCx - boxW * 0.5));
    const boxY = y0 - boxH - 4;

    ctx.fillStyle = "rgba(16, 16, 16, 0.85)";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);
    ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
    ctx.fillText(text, slotCx, boxY + boxH - 3);
  }
}
