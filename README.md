# Voxelville

A tiny Minecraft clone in pure HTML/CSS/JavaScript — zero dependencies, no
build step. Custom WebGL renderer, procedural terrain and textures, world
persistence in the browser.

## Run it

Serve the folder statically (module scripts need `http://`, not `file://`):

```sh
python3 -m http.server
```

Then open `http://localhost:8000` and click the canvas to capture the mouse.

## Controls

| Input | Action |
|---|---|
| Click canvas | Capture mouse (pointer lock) |
| Mouse | Look |
| W / A / S / D | Walk (Ctrl = sprint, Shift = sneak) |
| Space | Jump (fly mode: ascend; Shift = descend) |
| Left click | Break block (swings the hand) |
| Right click | Place selected block |
| 1–9 / mouse wheel | Hotbar slot |
| F | Toggle fly |
| F2 | Save world now (auto-saves after edits too) |
| Esc | Settings (render distance, sensitivity, fullscreen) |

World persists across reloads via IndexedDB; settings via localStorage.

## Layout

- `index.html` — canvas, HUD layer, splash, settings panel
- `js/main.js` — game loop, renderer, chunk streaming
- `js/engine/` — shaders, camera, input, particles, hand mesh
- `js/world/` — blocks, chunks, terrain, trees
- `js/entity/` — player, first-person hand
- `js/storage/` — world saves (IndexedDB), settings (localStorage)
- `design.md` — full Minecraft-scale target; `plan.md` — build phases
