# Voxelville — Design Document

A vanilla-faithful Minecraft clone implemented in pure HTML/CSS/JavaScript with **zero external dependencies** (no npm, no Three.js, no Webpack, no anything). Rendering uses a custom WebGL pipeline written from scratch. All assets (textures, sounds, fonts) are procedurally generated at runtime or inlined as data URIs.

---

## 1. Goals & Non-Goals

### Goals
- Faithfully reproduce the core Minecraft gameplay loop: explore, gather, craft, build, survive.
- Run in a single static HTML file dropped into any modern browser.
- 60 FPS on integrated graphics at 1080p for render distances up to 8 chunks.
- World persistence via IndexedDB / localStorage.
- First-person and third-person camera modes.
- Full block-breaking/placing with hitbox-based raycasting.
- Survive the night cycle against hostile mobs.
- Multiplayer via WebRTC datachannel peer-to-peer (serverless, opt-in).

### Non-Goals
- No mods, plugins, datapacks, or custom servers.
- No redstone (out of scope for v1).
- No Nether, End, or dimensions in v1 (planned v2).
- No console/PE parity features (chalkboards, education edition).
- No marketplace / skin store.
- No ray-traced lighting (fake lighting / ambient occlusion only).

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Markup | HTML5 + `<canvas>` | Single rendering surface. |
| Styling | CSS3 | HUD only. No CSS frameworks. |
| Language | Vanilla JavaScript (ES2022) | Modules via `<script type="module">`. |
| Graphics | WebGL 2.0 (with WebGL 1 fallback) | Custom engine; no Three.js/Babylon. |
| Audio | Web Audio API | Procedurally synthesized sounds. |
| Input | Pointer Lock API, `KeyboardEvent`, `Gamepad API` | Standard browser APIs. |
| Storage | IndexedDB (worlds), localStorage (settings) | Persistent world saves. |
| Networking | WebRTC `RTCPeerConnection` + `RTCDataChannel` | Peer-to-peer multiplayer. |
| Build | None | Files served directly. Optional: tiny `build.js` concatenator. |
| Testing | Custom assertion harness + headless WebGL | No Jest/Vitest. |

### File Layout
```
/
  index.html
  css/
    hud.css
  js/
    main.js               # entry, game loop
    engine/
      gl.js               # WebGL context, helpers
      shader.js           # shader compile/link
      mesh.js             # VBO/VAO mgmt
      texture.js          # texture atlas mgmt
      camera.js           # view/projection matrices
      frustum.js          # frustum culling
      noise.js            # Perlin/Simplex noise
    world/
      chunk.js            # chunk container
      chunkmesh.js        # greedy/naive mesher
      world.js            # world state, generators
      biome.js            # biome selection
      block.js            # block registry
      blockstates.js      # block state table
      light.js            # light propagation
    entity/
      entity.js           # base entity class
      player.js           # local player
      mob.js              # mob AI base
      zombies.js
      skeletons.js
      creepers.js
      pig.js
      cow.js
      sheep.js
      chicken.js
    physics/
      aabb.js             # axis-aligned bounding box
      collision.js        # swept-AABB resolution
      raycast.js          # block raycast
    inventory/
      inventory.js        # player inventory
      crafting.js         # recipe registry
      furnace.js
      chest.js
      anvil.js
      enchanting.js
    ui/
      hud.js              # hotbar, health, hunger
      inventoryui.js
      pause.js
      chat.js
      debug.js
    audio/
      synth.js            # WebAudio synth
      sounds.js           # sound registry
    net/
      peer.js             # WebRTC peer
      protocol.js         # packet codec
    storage/
      save.js             # world persistence
      settings.js         # user settings
    util/
      math.js
      random.js           # Mulberry32 / xoshiro
      bitfield.js
      pool.js             # object pooling
```

---

## 3. Rendering Engine

### 3.1 Pipeline Overview
- **Forward renderer**, one pass, no post-processing chain in v1.
- **Chunk-based world**: 16×16×384 (X×Z×Y) sections.
- **Mesher**: culled face mesher (one quad per visible face per block). Greedy meshing planned for v2.
- **Texture atlas**: 16×16 px per tile, single 1024×1024 RGBA8 texture (or 2048×2048 for HD resource pack compat).
- **Materials**: opaque pass, then alpha-test cutout pass (leaves, glass, flowers), then transparent pass (water), then translucent (stained glass) — order-independent transparency disabled; uses sorted draw.

### 3.2 Vertex Format
```
position:    vec3 (float32 × 3)   // block-local 0..1 coords
uv:          vec2 (float32 × 2)   // atlas coords
light:       uint16               // 4-bit sky + 4-bit block + 4-bit AO + 4-bit anim
ao:          uint8                // baked AO per vertex
color:       uint8 × 4            // biome tint (grass/leaves/water)
normal:      int8 × 3             // face normal encoded
```
Total: 24 bytes/vertex. Indexed drawing with `uint32` indices.

### 3.3 Shaders
- **block.vert** — applies MVP, passes world position, uv, light, ao, color, normal.
- **block.frag** — samples atlas, applies light × AO × color × ambient, fog mix, hand-held torch flicker, biome tint blend.
- **entity.vert/frag** — same as blocks but uses entity texture array layer, supports hurt overlay (red flash), invisibility (translucent).
- **sky.vert/frag** — fullscreen quad for sky gradient + sun/moon discs + stars.
- **cloud.vert/frag** — billboarded plane scrolling.
- **particle.vert/frag** — point sprites with rotation.
- **line.vert/frag** — selection box outline, hit markers, debug lines.
- **gui.vert/frag** — HUD icons (orthographic).

All shaders written by hand as template strings; no GLSL preprocessor library.

### 3.4 Lighting Model
- **Block light** (torches, lava, glowstone): 0–15, falls off 1 per block, propagates through air and partial-through transparent blocks.
- **Sky light**: 0–15, falls off 1 per block downward, unaffected by night/day (time of day changes ambient term).
- **Ambient occlusion**: precomputed per vertex using neighbor block analysis (4 samples per corner).
- **Smooth lighting**: neighbor face comparison produces soft AO blends identical to vanilla.
- No dynamic point lights, no shadows. Sun/moon light direction is constant straight down.

### 3.5 Frustum Culling & LOD
- Per-chunk AABB tested against 6 frustum planes.
- Frustum-vs-sphere test for entities.
- Distance-based mesh skip: chunks > render distance are not meshed.
- `gl.drawElements` per chunk; no instancing needed in v1 (planned v2 with `multiDrawElements`).

### 3.6 Sky
- Gradient (zenith→horizon) using world time.
- Sun disc: 30 px, moves in arc based on time.
- Moon disc: opposite arc, with phase cycle every 8 days.
- Stars: 1500 points, brightness based on moon phase, visible at night.
- Void fog below Y = -64 (rendered as solid bedrock color).

### 3.7 Clouds
- 2D billboarded plane at cloud height (Y = 192).
- Texture generated procedurally (Perlin-worley hybrid).
- Scrolls in X direction at 0.3 blocks/second.
- Opacity 0.8.

### 3.8 Fog
- Linear fog, start at `renderDistance × 0.5` chunks, end at `renderDistance` chunks.
- Color matches sky horizon.
- Underwater: replaces with murky blue-green, denser.

### 3.9 Performance Targets
- 8 chunks render distance: 30 FPS minimum, 60 FPS target on integrated GPU.
- Chunk mesh built off main thread via `Worker`.
- Meshing budget: max 4 chunk rebuilds per frame.
- Frustum-culled draw calls: typically 50–200 per frame.
- Vertex throughput: ~2M verts/frame at 8 chunks.

---

## 4. World Generation

### 4.1 Coordinate System
- **Block coordinates**: 32-bit integers, signed. X=east, Y=up, Z=south.
- **Chunk coordinates**: floor(block / 16).
- **Block-local coordinates**: 0..15 within chunk.
- World height: -64 to 320 (Y).
- Sea level: Y = 62.

### 4.2 Seed & Determinism
- 64-bit world seed (string input hashed with splitmix64).
- All RNG derives from `(seed XOR chunkX*341873128712L XOR chunkZ*132897987541L)`.
- No floating-point cross-platform drift: use `Math.fround` only for output, all math in double.

### 4.3 Generation Pipeline
1. **Biome map** (per chunk): temperature noise + humidity noise → biome.
2. **Base terrain** (per column): 3-octave Perlin, scaled by biome.
3. **Caves**: 3D Perlin threshold; carver passes (ravines, mineshafts).
4. **Ores**: replace-stone passes with frequency tables.
5. **Surface decoration**: grass, dirt, sand, gravel, clay, snow layer.
6. **Vegetation**: trees, flowers, mushrooms, cacti, sugar cane, pumpkins.
7. **Structures**: villages, temples, dungeons, strongholds, mineshafts, shipwrecks, ocean monuments, woodland mansions, pillager outposts, igloos, desert wells, fossils.
8. **Spawn animals** & **mob spawners** in dungeons.

### 4.4 Biomes
The 79 default biomes (vanilla 1.20), grouped:
- **Plains**, **Sunflower Plains**
- **Desert**, **Desert Hills**, **Desert Lakes**
- **Savanna**, **Savanna Plateau**, **Shattered Savanna**
- **Forest**, **Flower Forest**, **Birch Forest**, **Old Growth Birch Forest**, **Tall Birch Forest**, **Dark Forest**, **Dark Forest Hills**
- **Taiga**, **Old Growth Spruce Taiga**, **Old Growth Pine Taiga**, **Snowy Taiga**
- **Snowy Plains**, **Ice Spikes**, **Snowy Beach**
- **Mountains**, **Wooded Mountains**, **Gravelly Mountains**, **Modified Gravelly Mountains**, **Jagged Peaks**, **Stony Peaks**, **Frozen Peaks**
- **Meadow**, **Grove**, **Snowy Slopes**
- **Cherry Grove**
- **Mangrove Swamp**, **Swamp**, **Swamp Hills**
- **Mushroom Fields**, **Mushroom Field Shore**
- **Beach**, **Stone Shore**
- **River**, **Frozen River**
- **Ocean**, **Deep Ocean**, **Warm Ocean**, **Lukewarm Ocean**, **Cold Ocean**, **Deep Warm Ocean**, **Deep Lukewarm Ocean**, **Deep Cold Ocean**, **Deep Frozen Ocean**
- **Jungle**, **Bamboo Jungle**, **Sparse Jungle**, **Old Growth Jungle**
- **Badlands**, **Eroded Badlands**, **Wooded Badlands**, **Modified Badlands**, **Modified Wooded Badlands**
- **Dripstone Caves**, **Lush Caves**, **Deep Dark**
- **Nether Wastes**, **Soul Sand Valley**, **Crimson Forest**, **Warped Forest**, **Basalt Deltas** (v2 only)

### 4.5 Terrain Features
- **Default blocks**: stone, dirt, grass, sand, gravel, clay, sand, snow block, ice, packed ice, blue ice, mycelium, podzol, coarse dirt, rooted dirt, moss block, mud, muddy mangrove roots.
- **Stone variants**: deepslate (below Y=0), tuff, calcite, diorite, andesite, granite, dripstone blocks.
- **Ore distribution** (vein count, size, max Y, distribution):
  - Coal: 20 veins, size 17, range 0–319, uniform below Y=128, triangular above.
  - Copper: 16 veins, size 8, range -16–112, triangular.
  - Iron: 20 veins, size 9, range -64–320, triangular.
  - Gold: 2 veins size 9 (below 32), 1 vein size 4 (above 32) range -64–32 high triangle.
  - Redstone: 4 veins size 8 (below 16), 8 veins size 7 (above 16) range -64–15.
  - Diamond: 1 vein size 7 (below 16), 4 size 4 (above 16) range -64–16.
  - Lapis: 1 vein size 7 (below 0) range -64–64.
  - Emerald: 100 veins size 1 (mountains only) range -16–320.
  - Ancient Debris: 2 veins size 3 in nether range.

### 4.6 Trees
- **Oak**, **Birch**, **Spruce**, **Jungle (large)**, **Acacia**, **Dark Oak**, **Mangrove (with roots)**, **Cherry Blossom**, **Azalea**, **Flowering Azalea**.
- Each has trunk height range, leaf radius, growth shape, and biome restrictions.
- Saplings grow over time when bonemealed or by world tick.

### 4.7 Structures
| Structure | Material palette | Generation rules |
|---|---|---|
| Village | Oak/spruce/acacia/jungle/savanna/taiga/snowy variants | Plausibility filter, road network, bell, well, jobs |
| Desert Temple | Sandstone | 4 loot chests, trapped dispensers, hidden TNT floor |
| Jungle Temple | Mossy cobblestone | 2 chests, dispensers, puzzle, lever |
| Witch Hut | Spruce + dark oak fence | Cauldron, pop in to spawn witch |
| Igloo | Snow + ice | Basement with zombie villager + golden apple chest |
| Ocean Monument | Prismarine variants | Elder guardians, sponge rooms, gold blocks |
| Woodland Mansion | Dark oak variants | Three floors, secret rooms, illager spawns |
| Stronghold | Stone bricks | End portal, libraries, silverfish spawners, storerooms |
| Mineshaft | Oak planks + fences + rails | Procedural tunnels, webbing, spider spawners |
| Desert Well | Sandstone | Water source in middle |
| Fossil | Bone block | Buried in sand/sandstone/clay |
| Pillager Outpost | Dark oak logs | Allays in cage, captain, banners, target practice |
| Ancient City | Deepslate variants + sculk | Warden spawn, reinforced deepslate, chests, soul fire |
| Trail Ruins | Suspicious sand/gravel | Suspicious brushing required |
| Shipwreck | Oak/spruce/birch planks | 3 variants: upright, sideways, beached |
| Buried Treasure | Chest with treasure map | Sand beaches |
| Pillager Outpost | Dark oak | Captain, alarm, banners |
| Ruined Portal | Obsidian + crying obsidian | Various sizes, may have a chest |
| Nether Fortress | Nether brick (v2) | Blaze spawners, bridges, loot |
| Bastion Remnant | Blackstone variants (v2) | Hoglin stables, treasure room |
| End Cities | End stone brick (v2) | Shulkers, ships |

### 4.8 Caves
- **Dripstone Caves**: pointed dripstone (stalactites/stalagmites), dripstone blocks, water lakes, mud.
- **Lush Caves**: azalea, moss, glow berries, cave vines, dripleaf, moss carpet.
- **Deep Dark**: sculk sensor, sculk shrieker, sculk catalyst, sculk veins, reinforced deepslate.

### 4.9 World Border
- 29,999,984 × 29,999,984 block area (default).
- Visible purple particle wall, knockback damage when crossed.

---

## 5. Blocks

### 5.1 Block Registry
Single source of truth; each block has:
```js
{
  id: number,           // 0..65535
  name: string,         // 'minecraft:stone'
  hardness: number,     // mining time multiplier
  resistance: number,   // explosion resistance
  tool: 'pickaxe'|'axe'|'shovel'|'hoe'|'shears'|'sword'|null,
  toolTier: 'wood'|'stone'|'iron'|'diamond'|'netherite'|'gold'|null,
  material: 'solid'|'dirt'|'plant'|'leaves'|'wood'|'glass'|'sand'|'snow'|'fluid'|'fire'|'portal'|'climbable'|'web'|'bed'|'door'|'rails'|'redstone'|'lantern'|'coral'|'bamboo'|'cactus'|'slab'|'stair'|'fence'|'wall'|'chest'|'sign'|...,
  lightEmission: 0..15,
  lightFilter: 0..15,   // opacity for light
  opaque: bool,
  full: bool,           // full 1m³ cube
  collision: AABB,      // custom shape
  randomTick: bool,
  flammable: bool,
  replaceable: bool,
  canPlace: fn,
  onBreak: fn,
  onPlace: fn,
  tick: fn,
  drops: Table,
  states: {...},        // block states
  model: 'cube'|'cross'|'plant'|'xshape'|'torch'|'fire'|'fluid'|'door'|'bed'|'slab'|'stair'|'fence'|'wall'|'chest'|'sign'|'banner'|'skull'|'head'|'flowerpot'|'rail'|'lever'|'button'|'pressure_plate'|'tripwire'|'candle'|'amethyst'|'sculk'|'hanging_roots'|'pointed_dripstone'|'sculk_vein'|...
}
```

### 5.2 Full Block List (vanilla 1.20, ~720 blocks)
**Stone family**
Stone, Cobblestone, Mossy Cobblestone, Stone Bricks, Mossy Stone Bricks, Cracked Stone Bricks, Chiseled Stone Bricks, Smooth Stone, Polished Granite/Andesite/Diorite, Granite/Andesite/Diorite, Pillar Quartz, Quartz Bricks, Chiseled Quartz, Smooth Quartz, Marble (not in vanilla — skip), Sandstone variants (4), Red Sandstone variants (4), Prismarine variants (3), Purpur variants, Blackstone variants, Cobbled Deepslate + variants, Tuff, Calcite, Amethyst Block, Budding Amethyst, all 4 Amethyst Bud sizes, all 4 Amethyst Cluster sizes, Basalt + Polished Basalt, Smooth Basalt, End Stone + variants (v2).

**Wood family**
Oak Log, Spruce Log, Birch Log, Jungle Log, Acacia Log, Dark Oak Log, Mangrove Log, Cherry Log, all 8 Stripped variants, all 8 Wood variants, all 8 Stripped Wood variants, all 8 Planks, all 8 Stairs, all 8 Slabs, all 8 Fences, all 8 Fence Gates, all 8 Doors, all 8 Trapdoors, all 8 Pressure Plates, all 8 Buttons, all 8 Signs (wall + standing), all 8 Hanging Signs, all 8 Boats (v2 with physics, v1 placed items), Mangrove Roots, Mushroom Stem, Crimson/Warped Stems + Hyphae (v2).

**Dirt family**
Dirt, Coarse Dirt, Rooted Dirt, Mud, Muddy Mangrove Roots, Grass Block, Mycelium, Podzol, Dirt Path, Farmland, Moss Block, Moss Carpet, Snow Block, Snow Layer (8 heights), Clay, Hardened Clay (Terracotta, 16 colors), Glazed Terracotta (16 colors), Concrete (16 colors), Concrete Powder (16 colors).

**Sand family**
Sand, Red Sand, Gravel, Soul Sand, Soul Soil, Sandstone variants, Red Sandstone variants.

**Ore family**
Coal Ore, Deepslate Coal Ore, Iron Ore, Deepslate Iron Ore, Copper Ore, Deepslate Copper Ore, Gold Ore, Deepslate Gold Ore, Redstone Ore (lit + unlit), Deepslate Redstone Ore (lit + unlit), Diamond Ore, Deepslate Diamond Ore, Emerald Ore, Deepslate Emerald Ore, Lapis Ore, Deepslate Lapis Ore, Nether Quartz Ore, Ancient Debris (v2), Gilded Blackstone (v2), Raw Ore blocks (Iron/Gold/Copper).

**Fluid blocks**
Water (flowing + source), Lava (flowing + source).

**Plant family**
Grass, Fern, Tall Grass, Large Fern, Dead Bush, Seagrass, Tall Seagrass, Kelp, Kelp Plant, Sugar Cane, Bamboo (shoot + stalk), Cactus, Lily Pad, Vine, Glow Lichen, Cave Vines, Spore Blossom, Hanging Roots, Mangrove Propagule, Azalea, Flowering Azalea, Pitcher Plant, Torchflower, Dripleaf (small + big), Sculk Vein, Sculk, Sculk Catalyst, Sculk Sensor, Sculk Shrieker, Reinforced Deepslate, Big Dripleaf Stem, Small Dripleaf.

**Flower family**
Poppy, Blue Orchid, Allium, Azure Bluet, Red Tulip, Orange Tulip, White Tulip, Pink Tulip, Oxeye Daisy, Cornflower, Lily of the Valley, Wither Rose, Sunflower, Lilac, Rose Bush, Peony, Pitcher Plant.

**Crop family**
Wheat (8 stages), Carrots (4 stages), Potatoes (4 stages), Beetroots (4 stages), Melon Stem (8 stages), Pumpkin Stem (8 stages), Sweet Berry Bush (4 stages), Cocoa Beans (3 stages), Sugar Cane (item block), Bamboo (8 stages), Chorus Flower (v2), Nether Wart (v2).

**Sapling family**
Oak, Spruce, Birch, Jungle, Acacia, Dark Oak, Mangrove Propagule, Cherry, Azalea, Flowering Azalea.

**Leaf family**
Oak, Spruce, Birch, Jungle, Acacia, Dark Oak, Mangrove, Cherry, Azalea, Flowering Azalea.

**Mushroom family**
Brown Mushroom, Red Mushroom, Crimson Fungus, Warped Fungus (v2), Mushroom Stem (block), Mushroom Blocks (3 variants × 6 caps), Brown Mushroom Block, Red Mushroom Block.

**Coral family**
Brain Coral, Bubble Coral, Fire Coral, Horn Coral, Tube Coral, dead variants × 5, Coral Block × 5, Coral Fan × 5, Coral Wall Fan × 5 (v1: render but skip live coral blocks requiring water).

**Sapling/Sapling-bearing**
See Plant family.

**Mob-spawner**
Spawner (single block with custom mob, delay, range).

**Functional blocks**
Crafting Table, Furnace, Lit Furnace, Blast Furnace, Lit Blast Furnace, Smoker, Lit Smoker, Anvil, Chipped Anvil, Damaged Anvil, Grindstone, Stonecutter, Loom, Cartography Table, Fletching Table, Smithing Table, Brewing Stand, Enchanting Table, Enchanting Table (with book), Lectern, Bookshelf, Chest, Trapped Chest, Ender Chest, Barrel, Shulker Box (16 colors), Dispenser, Dropper, Hopper, Observer, Daylight Detector, Repeater, Comparator, Lever, Stone Button, Wooden Button (all 6 wood), Tripwire Hook, Tripwire, Pressure Plate (all 6 wood + stone + light weighted + heavy weighted), TNT, Target, Bell, Bee Nest, Beehive, Honeycomb Block, Slime Block, Honey Block, Respawn Anchor (v2), Conduit, Lodestone, Lightning Rod, Sculk Sensor, Calibrated Sculk Sensor, Note Block, Jukebox, Lectern, Item Frame, Glow Item Frame, Painting, Flower Pot, Decorated Pot, Suspicious Sand, Suspicious Gravel, Sniffer Egg, Dragon Egg (v2), End Gateway (v2), End Portal (v2), End Portal Frame (v2).

**Light blocks**
Torch (5 woods + soul), Lantern (regular + soul), Redstone Lamp, Glowstone, Shroomlight, Jack o'Lantern, Sea Lantern, Froglight (3 variants), Amethyst Cluster (4), Sculk Vein, Cave Vine (lit), Candle (single + 16 colors), Cake (with candles), End Rod (v2), Fire, Soul Fire, Campfire, Soul Campfire, Beacon, Redstone Torch (off), Redstone Lamp (on/off), Redstone Block, Sea Pickle (lit), Magma Block (emits light v1 no, v2 yes — skip).

**Piston family**
Piston, Sticky Piston, Piston Head, Moving Piston (technical). v1: cosmetic, no redstone.

**Glass family**
Glass, Tinted Glass, Stained Glass (16 colors), Glass Pane, Stained Glass Pane (16).

**Wool**
White, Orange, Magenta, Light Blue, Yellow, Lime, Pink, Gray, Light Gray, Cyan, Purple, Blue, Brown, Green, Red, Black.

**Carpet**
Same 16 colors.

**Bed**
Same 16 colors, head + foot.

**Banner**
16 colors, 16 patterns × 16 colors.

**Banners/Signs**
Standing & wall variants, all 16 colors.

**Rugs** (v1.20)
Not in vanilla — skip.

**Candle**
1 + 16 colors, can be placed in clusters up to 4.

**Smithing & smithing templates**
Armor Trim Templates: Bolt, Coast, Dune, Eye, Flow, Host, Raiser, Rib, Sentry, Shaper, Silence, Snout, Spire, Tide, Vex, Ward, Wayfinder, Wild.

**Nether items** (v2)
Netherrack, Soul Sand, Soul Soil, Basalt, Blackstone, Gilded Blackstone, Polished Blackstone, Polished Blackstone Bricks, Chiseled Polished Blackstone, Polished Blackstone Button, Polished Blackstone Pressure Plate, Nether Bricks, Red Nether Bricks, Chiseled Nether Bricks, Cracked Nether Bricks, Quartz Ore, Nether Wart, Warped Wart Block (v2), Crimson Nylium, Warped Nylium (v2), Shroomlight, Soul Lantern, Soul Torch, Soul Campfire, Soul Fire, Crying Obsidian, Glowstone, Respawn Anchor, Target, Lodestone.

**End items** (v2)
End Stone, End Stone Bricks, End Gateway, End Portal, End Portal Frame, Dragon Egg, Chorus Plant, Chorus Fruit, Popped Chorus Fruit, Purpur Block, Purpur Pillar, End Rod.

### 5.3 Block States
Each block has a `states` table; each state field encoded in a bitmask up to 16 bits total per block (vanilla allows more for some). Examples:
- `oak_log`: `axis` (x|y|z)
- `oak_stairs`: `facing` (n|s|e|w), `half` (top|bottom), `shape` (straight|inner_left|inner_right|outer_left|outer_right), `waterlogged`
- `fence`: `north,south,east,west` (connected bools), `waterlogged`
- `door`: `facing, half, hinge, open, powered`
- `bed`: `facing, occupied, part (head|foot)`
- `wheat`: `age` (0..7)
- `redstone_wire`: `power` (0..15), `north,south,east,west` (side connection)
- `repeater`: `delay, facing, locked, powered`
- `comparator`: `mode, facing, powered`
- `note_block`: `note` (0..24), `instrument`
- `tripwire`: `attached, disarmed, east, north, south, west, powered`
- `rail`: `shape (north_south, east_west, ascending_east, ascending_west, ascending_north, ascending_south, south_east, south_west, north_east, north_west)`
- `lever`: `face, facing, powered`
- `wall`: 4 directions + `up` (post) + variants

### 5.4 Custom Models
- `cross` (flowers, grass, tall grass, sugar cane top)
- `plant` (single quad, optionally offset)
- `xshape` (coral fans)
- `torch` (small model, attached to face)
- `fire` (animated billboard)
- `fluid` (height-mapped, corner-flowing, alpha-blended)
- `door` (two-part with hinge)
- `bed` (two-part, head + foot)
- `slab`, `stair`, `fence`, `wall`, `pane` (procedural geometry from blockstates)
- `chest` (single block, animated open/close lid, v1: cosmetic only)
- `sign` (post + plank, text rendered via in-game font)

---

## 6. Items

### 6.1 Item Registry
Same structure as blocks but `type = 'item'`. Items include:
- All tool types (sword, pickaxe, axe, shovel, hoe, shears, fishing rod, flint and steel, shield, bow, crossbow, trident, brush).
- All armor pieces (helmet, chestplate, leggings, boots) for 6 materials × 4 pieces = 24, plus 5 horse armors.
- Food items (60+).
- Bucket variants.
- Spawn eggs (every mob).
- Potions, splash potions, lingering potions, tipped arrows.
- Maps, books, written books.
- Music discs (12 + 2 new).
- Banners, banner patterns.
- Fireworks (star + rocket).
- All blocks as items.

### 6.2 Item Stacking
- Stack size: 1–64 depending on item.
- NBT-equivalent: each stack has a flat data table (custom data, not Mojang's NBT).
- Tool damage, enchantments, custom names, lore, attribute modifiers, can-place-on, can-destroy, custom model data, potion effects, stored enchantments, hide_flags, block entity data, map data.

### 6.3 Tools
- **Tier**: Wood, Stone, Iron, Diamond, Netherite, Gold (no level req).
- **Damage per use**: pickaxe 1, axe 1, shovel 1, hoe 1, sword 1, shears 1, fishing rod 1 per catch, flint and steel 1 per use.
- **Mining speed multiplier** per tier per block.
- **Enchantability**: 5 (wood), 10 (stone), 14 (iron), 10 (diamond), 15 (gold), 12 (netherite).
- **Durability**: wood 59, stone 131, iron 250, diamond 1561, gold 32, netherite 2031.
- **Special**: shears break leaves/wool/vines; sword 1.5× damage, sweep attack; trident loyalty/channelling/riptide/impaling; crossbow multishot/quick charge/piercing; bow flame/infinity/power/punch.

### 6.4 Armor
- Defense points: leather 1–4, gold 1.5–5, chainmail 2–5, iron 2–6, diamond 3–8, netherite 3–8 + knockback resistance.
- Durability, enchantability as in vanilla.
- **Toughness**: 0, 0, 0, 0, 2, 3.
- **Knockback resistance**: 0, 0, 0, 0, 0, 0.1.

### 6.5 Food & Hunger
- Hunger: 0–20 shanks, saturation per food, eating duration, return containers.
- Variants: raw/cooked meat, fish variants, golden apple (4s regen I), enchanted golden apple (4s regen II + 2 min absorption IV + 5 min resistance I + 30s fire resist I), suspicious stew (1 stew = 1 effect).
- Effects of hunger: sprint disabled at <6, low health regen at 18+, kill at 0.

### 6.6 Potions
- 35 base potions × (regular, splash, lingering) × (2 min, 8 min) = ~150 potions.
- Brewing ingredient list, fuel (blaze powder), 3 stages.
- Custom effects: speed, slowness, strength, weakness, regen, instant health, instant damage, poison, fire resistance, water breathing, night vision, invisibility, blindness, jump boost, hunger, saturation, levitation, slow falling, glowing, luck, unluck, dolphins grace, hero of the village, bad omen.

### 6.7 Enchantments
- All 38 vanilla enchantments (excluding curses not yet in v1.20 — Curses of Binding and Vanishing are in).
- Enchanting table uses 3 SGA factors: tool enchantability, book enchantability, lapis.
- Anvil combines enchanted items, applies enchanted books, repairs, renames.
- Max enchanting level: 30; cost calculated per vanilla formula.

### 6.8 Music Discs
11 + 1 (others): 13, cat, blocks, chirp, far, mall, mellohi, stal, strad, ward, 11, wait, pigstep, otherside (v2: 5).

### 6.9 Arrows & Tipped Arrows
- Arrow, Spectral Arrow, Tipped Arrow (any potion → status arrow).

---

## 7. Crafting, Smelting & Recipes

### 7.1 Crafting Grid
- 3×3 crafting grid in inventory (in survival).
- Output slot, arrow indicator, recipe book (in v1 only shows known recipes, not search).
- Shaped, shapeless.

### 7.2 Furnace
- Smelting: 1 input + 1 fuel → 1 output, 200 ticks.
- Blast Furnace: ores + 2× speed.
- Smoker: food + 2× speed.
- Lit state, particle smoke, custom recipes per type.
- Fuel list: coal (80), charcoal (80), lava bucket (100), blaze rod (120), coal block (800), dried kelp block (200), bamboo (2.5), wooden items (5–15), etc.

### 7.3 Recipe List (v1 subset, ~600 recipes)
Every vanilla recipe is registered. Examples:
- 4 planks from 1 log
- 4 sticks from 2 planks (2×1)
- Crafting table from 4 planks
- Furnace from 8 cobblestone
- Chest from 8 planks (ring)
- Tools (pickaxe, axe, shovel, hoe, sword)
- Armor (helmet, chestplate, leggings, boots)
- Doors, trapdoors, fence, fence gate, stairs, slabs (all wood types)
- Beds (16 colors)
- Banners, carpets, candles, glass
- Food (bread, cake, cookies, pumpkin pie, mushroom stew, rabbit stew, beetroot soup, suspicious stew)
- Concrete, glazed terracotta, stained glass
- Sponge drying in furnace
- Smelting ores → ingots, raw food → cooked
- Smithing: netherite upgrade + armor trims + 11 smithing templates
- Banner patterns (with loom)
- Cartography (map zoom, lock, clone)
- Stonecutting (all stone variants)
- Grindstone (remove enchantment)

### 7.4 Anvil
- Combine enchantments.
- Combine damaged items (sum durability + 5% bonus).
- Apply enchanted book.
- Repair with material.
- Rename.
- XP cost caps at 39 per rename / combination.
- "Too Expensive!" at cost > 39.

### 7.5 Loom
- Apply banner patterns.
- Apply to shield.

### 7.6 Cartography Table
- Zoom out / clone / lock map.

### 7.7 Smithing Table
- Select template + base + material → trimmed item.
- Upgrade diamond gear to netherite.

### 7.8 Stonecutter
- All stone variants via dedicated UI.

### 7.9 Grindstone
- Strip enchantments (except curses), give XP.

### 7.10 Brewing
- 1 base potion (water bottle) + 1 ingredient → 1 result.
- 3-stage brewing: awkward → main → secondary modifiers.
- Brew time: 400 ticks.

### 7.11 Enchanting
- Place item + 1–3 lapis + select 1 of 3 offered enchantments.
- Enchantment seed derives from XP levels and decorative bookshelves (15 max effect).
- Cost & levels per vanilla.

---

## 8. Player

### 8.1 Player State
- Position (X, Y, Z), velocity, yaw, pitch.
- On ground flag, in water flag, in lava flag, climbing flag, gliding flag (elytra v2), flying flag (creative/spectator).
- Health (0–20), absorption (0–∞), hunger (0–20), saturation (0–20), air (0–300, while underwater).
- XP level, score, fire ticks (0–∞), freeze ticks (0–∞), fall distance, sprinting, sneaking, swimming, crawling, gliding, sleeping.
- Inventory (41 slots: armor 4, offhand 1, hotbar 9, main 27).
- Ended state (game over screen + respawn).
- Stats: time played, deaths, mob kills, items crafted, distance walked/fallen/flown/sneaked/swam/mined.

### 8.2 Camera Modes
- **First-person**: camera at player eye height (1.62 m).
- **Third-person back**: camera 4 m behind at slight elevation.
- **Third-person front**: mirror, used for seeing self.
- FOV: 70° normal, 90° sprinting, 110 speed II, reduced when sneaking or riding (v1: cosmetic only).
- View bobbing: hand bobs while walking.
- Hand swing animation for break/place/hit.
- View punch: damage tilt + shake.

### 8.3 Movement
- **Walk**: 4.317 m/s.
- **Sprint**: 5.612 m/s, 1.5× hunger drain.
- **Sneak**: 1.3 m/s, prevents edge-fall.
- **Swim**: 2.2 m/s, 7.1 m/s horizontal, 4.3 m/s vertical, jump 0.42 m.
- **Crawl**: 1.3 m/s, lower hitbox.
- **Fly** (creative/spectator): 11.0 m/s, 5× on sprint.
- **Jump**: 0.42 m vertical, depends on jump boost.
- **Gravity**: -32 m/s², fall damage applied if fall > 3 blocks (1 hp per block above 3).
- **Knockback**: from attacks/explosions.
- **Step assist**: 0.5 m step up if not sneaking.

### 8.4 Survival Mechanics
- **Health**: regenerates 1 hp/4s when hunger ≥ 18, or 1 hp/2s if saturation > 0; 1 hp/2s if regen effect.
- **Hunger**: drains faster sprinting/jumping/healing. 0.5 saturation per point of hunger drained if activity.
- **Sleeping**: skip night, requires bed within proximity and all players sleeping.
- **Death**: drops all items with 5 min despawn timer; respawn at world spawn / respawn anchor (v2).
- **Damage sources**: fall, fire, lava, suffocation (head in opaque block), drowning, cactus, sweet berry bush, magma block (v2), explosion, mob attack, projectile, magic, starvation, wither, freezing (powder snow v2).

### 8.5 Creative Mode
- Flight, no-clip, instant block break, unlimited items, no damage, no hunger, immunity to void.
- Inventory has all blocks (searchable).
- Mobs ignore player.

### 8.6 Spectator Mode
- Flight, no-clip, can view from mob POV, invisible, no interaction.

### 8.7 Adventure Mode
- Can only break blocks whose tags match "can_break".

### 8.8 Hardcore Mode
- Single life, locked to hard difficulty.

---

## 9. Physics

### 9.1 Collision
- Player AABB: 0.6 × 1.8 × 0.6 m.
- Eye height: 1.62 m.
- Crouch AABB: 0.6 × 1.5 × 0.6 m, eye 1.27 m.
- Crawl AABB: 0.6 × 0.625 m.
- Block AABB: 1 × 1 × 1 m default, custom for slabs, stairs, fences, walls, glass panes, chests, hoppers, etc.
- Resolution: 3-axis swept AABB (X then Y then Z per tick).
- Slope slip: blocks with full top face and lower neighbors act as ramps.

### 9.2 Block Raycast
- DDA traversal from camera, step 0.05 m.
- Returns first non-air block, hit position, face normal, sub-block coords.
- Max distance: 5 m (creative: 6 m).
- Penetrate flag for fluids (water sight check).

### 9.3 Entity Collision
- AABB vs AABB with sliding.
- Player vs mob pushes.
- Item entities float on water.
- Experience orbs home toward player.

### 9.4 Block Entity Collision
- Pressure plates: detect AABB of any entity.
- Tripwire: detect AABB of entities.
- Daylight detector: sky exposure.
- Buttons, levers: raycast hit.
- Doors: open if clicked.

### 9.5 Fluid Physics
- Water: applies drag (0.8 in X, 0.8 in Z, 0.5 Y) and buoyancy.
- Lava: applies drag and damage (1 hp/0.5s).
- Source blocks spread up to 7 blocks; flow rate calculated from level.
- Bucket fills/empties correctly.

### 9.6 Projectiles
- Gravity, drag, optional bouncing (egg, snowball), optional pickup (arrow).
- Arrows stick in blocks, deal damage, can be retrieved.

---

## 10. Lighting

### 10.1 Light Engine
- **Sky light** 0–15, falls off 1 per block downward (initial placement at world top = 15).
- **Block light** 0–15, falls off 1 per block, removed by opaque blocks, partial through transparent (configurable `lightFilter`).
- **Storage**: per-block nibble pair in chunk arrays.
- **Initial spread**: on chunk generation, run BFS to populate both channels.
- **Incremental updates**: BFS queues on block place/break.
- **Removals**: BFS down to find next brighter neighbor, then re-spread.

### 10.2 Sun & Moon
- Sun moves in arc Y = sin(t·2π/24000) × 1000-ish; clamped to ±512.
- Ambient color shifts with sun position: noon white, sunset orange, night blue, dawn pink.
- Sky and ambient light interpolated via smoothstep on time.

### 10.3 Time of Day
- 0 = dawn, 6000 = noon, 12000 = dusk, 18000 = midnight, 24000 = dawn.
- `/time set day|night|noon|midnight|<tick>`.
- `doDaylightCycle` gamerule.

### 10.4 Light Flash
- Ghast fireball, lightning, creeper explosion trigger 5-tick brightness flash.

### 10.5 Smooth Lighting
- Per-vertex AO from neighbor block analysis (4 samples per corner).
- Per-vertex face comparison produces soft AO blends.

---

## 11. Mobs

### 11.1 Mob Categories
- **Passive**: 24 species.
- **Neutral**: 5 species.
- **Hostile**: 33 species.
- **Boss**: 4 species.
- **Ambient**: 4 species.
- **Water**: 8 species.
- **NPC**: 5 species.

### 11.2 Mob List

**Passive (24)**
Allay, Armadillo (v2), Axolotl, Bat, Camel (v2), Cat, Chicken, Cod, Cow, Donkey, Frog, Glow Squid, Goat, Horse, Mooshroom, Mule, Ocelot, Parrot, Pig, Pufferfish, Rabbit, Salmon, Sheep, Sniffer, Snow Golem, Squid, Strider, Tropical Fish, Turtle, Villager, Wandering Trader, Bee, Fox, Dolphin, Llama, Panda, Polar Bear, Wolf, Iron Golem.

**Neutral (5)**
Bee, Dolphin, Iron Golem, Llama, Panda, Polar Bear, Wolf, Enderman (becomes hostile when looked at), Spider (becomes hostile at night), Zombie Villager (after cure is neutral), Wither (hostile), Hoglin (v2), Zoglin (v2).

**Hostile (33)**
Blaze (v2), Bogged (v2), Breeze (v2), Cave Spider, Creeper, Drowned, Elder Guardian, Endermite, Evoker, Ghast (v2), Guardian, Hoglin (v2), Husk, Magma Cube, Phantom, Piglin (v2), Piglin Brute (v2), Pillager, Ravager, Shulker (v2), Silverfish, Skeleton, Slime, Spider, Stray, Vex, Vindicator, Warden, Witch, Wither Skeleton (v2), Zoglin (v2), Zombie, Zombie Villager.

**Boss (4)**
Elder Guardian, Wither (v2), Ender Dragon (v2), Warden.

**Ambient (4)**
Bat.

**Water (8)**
Squid, Glow Squid, Cod, Salmon, Pufferfish, Tropical Fish, Dolphin, Turtle.

**NPC (5)**
Villager, Wandering Trader, Iron Golem, Snow Golem, Wandering Trader's Llamas.

### 11.3 Mob AI
- **State machine**: idle, wander, look_at_player, follow_player, attack, flee, jump, swim, fly, sit, breed.
- **Pathfinding**: A* over chunk-local navmesh (v1: simplified — solid block walkability + jump height).
- **Mob-specific behaviors**:
  - Villager: jobs, trades, breeding, gossip, schedule (work, sleep, gather, hide from raid bell).
  - Wandering Trader: spawns randomly, has llamas, trades for emeralds.
  - Iron Golem: attacks hostile mobs near villagers, offers poppy.
  - Wolf: tame with bones, follow owner, sit command, collar colors, breed.
  - Cat: tame with fish, follow owner, sit, gift dawn.
  - Parrot: tame with seeds, sit, shoulder ride, dance to music disc.
  - Bee: nest cycle, pollinate, sting, attack if provoked.
  - Fox: eat sweet berries, breed, attack chickens, baby fox trusts player.
  - Panda: personalities (lazy, worried, playful, weak, aggressive), breed, sneeze.
  - Axolotl: 5 variants, play dead, attack fish.
  - Frog: eat small slimes, lay eggs.
  - Allay: pickup items, deliver to noteblock, dance.
  - Warden: emerges from sculk, sonic boom attack, melee, vibration/sonic detection.
  - Pillager: crossbow attack, patrol, raid.
  - Evoker: fangs attack, vexes, totem of undying.
  - Vindicator: axe attack.
  - Ravager: charge attack, destroy crops/leaves.
  - Phantom: swoop attack, despawn if no sleep 3 days.
  - Slime/Magma Cube: split on death, size 1–4, jump attack.
  - Spider: climb walls, jump attack, neutral in day.
  - Cave Spider: poison attack, smaller.
  - Skeleton/Stray: ranged bow attack, dodge.
  - Zombie/Husk/Drowned: melee, knockback resistance, conversion in water (Drowned), burn in sun (Husk), break doors.
  - Creeper: explode, charged creeper (lightning), flee from cats/ocelots.
  - Witch: throw potions (harming, slowness, weakness, poison), heal self.
  - Enderman: teleport, pick up blocks, water damage, hostile if looked at.
  - Shulker: hide in shell, ranged homing bullet, attach to nearby block, color follows biome.

### 11.4 Spawning
- **Pack spawning**: spawn in packs of 1–4 with 2–4 chunk radius.
- **Mob cap**: 70 hostile, 10 ambient, 10 water, 5 water ambient, 70 passive.
- **Spawn rules**:
  - Hostile: light ≤ 7, 24-block radius around player, no spawners nearby.
  - Passive: grass block with 9×9 light ≥ 9, biome filter.
  - Water: water column with sky access.
- **Spawn cycle**: every tick, pick random chunk in spawn radius, attempt to spawn.
- **Mob spawner**: lit only when player within 16 blocks, spawns up to 6 mobs, delay 10–800 ticks, range 4 blocks.

### 11.5 Drops
Each mob has its own loot table; on death:
- Drop experience (1–3, sometimes with baby modifier 0–2 + additional).
- Item drops from pool with weights and conditions (smelt drops for zombies, equipment for skeletons, etc.).

### 11.6 Status Effects on Mobs
- Slowness, weakness, poison, wither, levitation, glowing, invisibility, regeneration, etc.

### 11.7 Boss Bar
Wither, Ender Dragon, Warden display boss bar to all players in same dimension.

---

## 12. Block Entities

A block entity is a block that stores extra NBT-like data:
- **Chest / Trapped Chest / Barrel / Shulker Box**: 27 slots, open/close animation, double chest combines to 54 slots, paired by facing.
- **Furnace / Blast Furnace / Smoker**: 3 slots, cook time, burn time, lit.
- **Hopper**: 5 slots, cooldown 8 ticks, transfers on top to bottom, can suck from above via entity pickup, lock with hopper minecart.
- **Dropper / Dispenser**: 9 slots, ejects items, dispenser applies bow/crossbow/throwable/water bucket/etc.
- **Brewing Stand**: 4 slots (1 ingredient, 3 potions), fuel slot.
- **Enchanting Table**: lapis slot, stored enchantment seed.
- **Anvil**: 3 slots (2 input, 1 output), cost, rename.
- **Beacon**: 1 slot, primary/secondary effects, levels, pyramid layer.
- **Conduit**: range, target, active when activated.
- **Bell**: ring direction, cooldown.
- **Lectern**: 1 book slot, page.
- **Note Block**: 25 notes × 16 instruments, triggered by redstone.
- **Jukebox**: 1 record slot.
- **Campfire / Soul Campfire**: 4 item slots (cooking).
- **Bee Nest / Beehive**: occupancy, anger, honey level.
- **Spawner**: mob type, spawn delay, range, maxNearbyEntities.
- **Command Block** (planned v2 with redstone).
- **Structure Block** (planned v2).
- **Jigsaw Block** (planned v2).
- **Sculk Sensor / Shrieker**: cooldown, last vibration.
- **Comparator / Repeater / Piston** (v2 redstone).
- **Flower Pot**: 1 flower/cactus/sapling item with optional item data.
- **Decorated Pot**: 4 sherds + banner pattern.
- **Head/Skull**: 5 types (skeleton, wither skeleton, zombie, creeper, dragon), rotation, owner, note block sound.
- **Banner**: 6 layers with pattern colors and types.
- **Shield**: 1 banner pattern copy.
- **Bed**: no data but paired head/foot.
- **Door**: hinge, open, powered.
- **Hanging Sign / Sign**: text 4 lines × 30 chars, color, glowing, waxed.
- **Item Frame / Glow Item Frame**: held item, rotation, fixed, map.
- **Painting**: variant, fixed.
- **Respawn Anchor** (v2): charges used.
- **Conduit**: target, range.
- **Lodestone**: tracks compass.
- **End Gateway** (v2), **End Portal** (v2).
- **Vault** (planned v2).

---

## 13. Redstone (planned v2, stubbed in v1)

### 13.1 Components
- Wire, repeater, comparator, torch, button, lever, pressure plate, tripwire, daylight detector, observer, target, sculk sensor, dispenser/dropper, piston, hopper, rail, detector rail, powered rail, activator rail, TNT, bell, note block.

### 13.2 Simulation
- Tick rate 10 Hz, parallel to game ticks.
- Components provide `getPower()`, `setPower()`.
- Update graph via BFS with depth limit 1000 (vanilla cap).
- Quasi-connectivity for pistons.

### 13.3 v1 Stub
- Power level 0, no logic. Placeable but inert.

---

## 14. Audio

### 14.1 Sound System
- Web Audio API, single AudioContext, master gain.
- Sounds played via short procedural samples or precomputed PCM arrays.
- Categories: master, music, blocks, hostile, neutral, players, ambient, voice.
- 3D positional: atan2(panning), distance falloff, Doppler disabled in v1.
- Volume sliders per category.
- Subtitles toggle.

### 14.2 Sound List (300+)
- **Block sounds**: stone, grass, dirt, sand, gravel, wood, metal, glass, cloth, sand, snow, ladder, slime, soul sand, coral, bamboo, basalt, bone block, chain, chorus fruit, fire, froglight, glowstone, grass, honeycomb, lava, leaves, lily pad, mushroom block, nether wart, nether sprouts, nether wood, plant, pointed dripstone, sculk, sculk vein, sculk sensor, shiny glow berries, smithing table, sponge, stem, suspicious, vine, web, wool, amethyst block, anvil, etc.
- **Mob sounds**: ambient, hurt, death, step, attack, special per mob.
- **Item sounds**: bow, crossbow, trident, fishing rod, bucket fill/empty, bottle, brush, food eat, armor equip, etc.
- **Player sounds**: breathing, hurt, death, level up, splash, swim, burp, chorus teleport.
- **Music**: 12 background tracks (Sweden, Minecraft, Clark, Danny, etc.) + 14 music disc tracks.
- **UI sounds**: click, hover, close, experience orb, anvil land, pick up, etc.
- **Weather**: rain, thunder.

### 14.3 Procedural Synthesis
- Most block sounds generated with noise + filter envelopes.
- Step sounds: filtered noise burst, length 100 ms, varied per material.
- Ambient cave: low-frequency noise loop.

### 14.4 Music
- Generative ambient system inspired by C418:
  - Pad with sine + reverb, 4 chord patterns, 2 melodies.
  - Plays in 20-minute cycle, fades in over 60s, fades out 30s.
  - Disabled in peaceful by default.

---

## 15. User Interface

### 15.1 HUD (Heads-Up Display)
- **Hotbar**: 9 slots at bottom-center, selected slot highlighted, item count, durability bar.
- **Health**: 10 hearts (or 20 in 1/2-heart), regenerate animation, damage tilt.
- **Hunger**: 10 meat shanks, food exhaustion animation.
- **XP bar**: green, level number above, freeze above 32 levels.
- **Air bubbles**: when underwater, replaces XP bar.
- **Mount health**: when riding, replaces XP.
- **Boss bar**: at top of screen, named, color.
- **Action bar**: chat messages at bottom, item name, totems.
- **Hotbar slot numbers** (1–9, custom binding allowed).
- **Off-hand slot**: left of hotbar.
- **Crosshair**: + or custom.
- **Hand swing**: 3D item in first-person.
- **Paper doll**: spectator/3rd person.
- **Status effect icons**: top-right, durations, ambient particles.
- **Scoreboard**: sidebar or below name.
- **Sleep fade**: dark overlay, "You can sleep now" message.
- **Chat**: bottom-left, history, commands.
- **Tab list**: list of players with ping, health.

### 15.2 Inventory Screen
- 41 slots: 27 main, 9 hotbar, 4 armor, 1 offhand.
- 2×2 crafting grid (survival) or 3×3 + recipe book (creative).
- Item tooltips: name, lore, attributes, enchantments, durability, can-place-on, can-destroy.
- Search box (creative only).
- Craft button, recipe book.

### 15.3 Pause Menu
- Resume, Settings, Save and Quit to Title, Disconnect (multiplayer), Advancements.
- Pause toggles game to menu state, stops world ticks.

### 15.4 Settings
- **Video**: Render Distance (2–32), Graphics (Fancy/Fast), Smooth Lighting, VSync, Fullscreen, Max FPS (60/120/uncapped), View Bobbing, GUI Scale (1–4 small to 4 large), Brightness, Clouds (Off/Fancy/Fast), Particles (Minimal/Decreased/All), Entity Shadows, Depth of Field, Camera vignette, mipmap levels.
- **Audio**: Master, Music, Blocks, Hostile, Neutral, Players, Ambient, Voice volumes; Subtitle scale; Subtitles on/off.
- **Controls**: Key bindings, mouse sensitivity, invert Y, touch / gamepad mappings.
- **Language**: 50+ (v1: en_US only, design open to more).
- **Resource Packs**: load from file picker.
- **Accessibility**: High Contrast, Monochrome Text, Dyslexic-friendly font, narrator, screen reader hook.

### 15.5 Title Screen
- Background: panorama of biomes (rotating).
- Buttons: Singleplayer, Multiplayer, Options, Quit, Mojang logo, version, copyright.

### 15.6 In-game Menus
- Advancements (30 tabs, 100+ advancements, progress, reward toast).
- Statistics.
- Recipe Book (v1: hidden in survival, full list in creative).
- Chat.
- Command console.
- Debug screen (F3): position, chunk, biome, light, FPS, entity count, TPS, etc.

### 15.7 Chat & Commands
- Chat input box, history up arrow.
- Tabs: All, Sent, System.
- Clickable links (coordinates, /msg).
- Commands (see below).

### 15.8 Tooltips
- Hover shows name, lore, attributes, enchantments, custom data.

---

## 16. Commands

### 16.1 Implemented (v1)
- `/help [page|command]`
- `/gamemode survival|creative|adventure|spectator [player]`
- `/give <player> <item> [count] [nbt]`
- `/clear [player] [item] [maxCount]`
- `/kill [player]`
- `/tp <player> <target>` / `/teleport`
- `/spawnpoint [player] [pos]`
- `/setworldspawn [pos]`
- `/time set <day|night|noon|midnight|<value>|add>`
- `/time query day|daytime|gametime`
- `/weather clear|rain|thunder [duration]`
- `/difficulty peaceful|easy|normal|hard`
- `/gamerule <rule> [value]`
- `/effect give|clear <player> <effect> [seconds] [amplifier] [hideParticles]`
- `/enchant <player> <enchantment> [level]`
- `/xp set|add|query <player> <amount>`
- `/seed`
- `/locatebiome <biome>` (v1.20)
- `/locatestructure <structure>`
- `/summon <entity> [pos] [nbt]`
- `/playsound <sound> <source> [player] [pos] [volume] [pitch] [minVolume]`
- `/stopsound <player> [source] [sound]`
- `/tell|msg|w <player> <message>`
- `/me <action>`
- `/say <message>`
- `/team` (add/remove/join/leave/list/msg/empty/color/friendlyFire/seeFriendlyInvisibles/prefix/suffix)
- `/scoreboard` (objectives, players)
- `/title <player> title|subtitle|actionbar|times|clear <json>`
- `/tellraw <player> <json>`
- `/trigger <objective> [add|set] <value>`
- `/data get|merge|remove <target> [path] [value]`
- `/attribute <target> <attribute> get|base|modifier`
- `/bossbar add|remove|set|list|get`
- `/schedule function <id> <time>`
- `/function <id>`
- `/return <value>`
- `/execute if|unless|as|at|store ... run <command>`
- `/fill <pos1> <pos2> <block> [oldBlockHandling]`
- `/clone <begin> <end> <destination> [masked|replace|filtered] [force|move|normal]`
- `/setblock <pos> <block> [destroy|keep|replace]`
- `/testforblock <pos> <block>` (deprecated)
- `/ride <target> <vehicle>`
- `/spectate [target]`
- `/defaultgamemode`
- `/worldborder center|set|add|damage|get|warning`
- `/seed`
- `/list` (uuids)

### 16.2 Gamerules
doDaylightCycle, doFireTick, doMobLoot, doMobSpawning, doTileDrops, keepInventory, mobGriefing, pvp, randomTickSpeed, sendCommandFeedback, showCoordinates, showDeathMessages, spawnRadius, tntExplodes, fireDamage, drowningDamage, fallDamage, freezeDamage, doPatrolSpawning, doTraderSpawning, doWardenSpawning, projectilesCanBreakBlocks, immediateRespawn, respawnBlocksExplode, reduceDebugInfo, maxEntityCramming, universalAnger, doVinesSpread, doWeatherCycle, mobExplosionDropDecay, snowAccumulationHeight, waterSourceConversion, lavaSourceConversion, commandBlockOutput, spawnerBlocksEnabled, etc.

---

## 17. Multiplayer (WebRTC P2P)

### 17.1 Model
- Serverless: players act as peers to each other.
- Host-authoritative world state; non-host clients send inputs only.
- Up to 8 players per session (v1).
- Discovery: copy/paste an offer SDP, accept answer SDP (manual exchange).

### 17.2 Lifecycle
1. Host creates session → generates SDP offer + ICE candidates.
2. Host shares offer via link / code.
3. Client pastes offer → creates answer → sends back.
4. Host accepts answer → ICE connectivity established.
5. DataChannel opens, handshake, world sync.

### 17.3 Protocol
- Custom packet protocol over `RTCDataChannel`.
- Packet types: handshake, keepalive, player_state, block_change, entity_state, chat, sound, time, weather, inventory_sync, chunk_data, particle.
- Reliable channel for state, unreliable for entity/player updates.
- 30 Hz entity interpolation, 20 Hz player input.
- Tick sync via host heartbeat.
- Anti-cheat: v1 minimal, host is trusted.

### 17.4 World Sync
- Players share seed, world format version.
- Host streams chunks to joining players.
- Save format: 1 host save, peer caches.

### 17.5 Voice Chat (v2)
- Audio via separate peer connection, Opus codec.

---

## 18. Storage & World Format

### 18.1 Save Format
- World: IndexedDB key `world:<id>`, value is a structured file tree:
  - `level.dat` — world data (name, seed, time, weather, gamerules, spawn, border).
  - `playerdata/<uuid>.dat` — per-player data (inventory, enderchest, stats, advancements, position, health, XP).
  - `region/r.<x>.<z>.mca` — 32×32 chunk regions.
  - `entities/` — global entity list.
  - `data/` — map data, scoreboards, statistics.
  - `advancements/` — advancement progress.
- v1 simplified: single `world.bin` blob per save, internal offsets.

### 18.2 Chunk Format
- 16×16×384 = 98,304 blocks.
- Block IDs: varint (up to 4 bytes).
- Block states: palette-based (single, indirect, indirect-indirect).
- Light: 2 nibbles per block.
- Heightmap: 4×16×16 (256, world surface, motion blocking, motion blocking no leaves).
- Biomes: 4×4×4 packed, 3-bit ID.
- Block entities: list of {pos, type, data}.

### 18.3 Save Strategy
- Save every 30s (auto).
- Save on quit.
- Save on autosave tick (3000 ticks).
- Player per-save: every 5s while connected.
- Async save: snapshot world in worker, write to IndexedDB.

### 18.4 Settings
- Stored in `localStorage`:
  - Controls, video, audio, language, resource pack list.

---

## 19. Resource Packs

### 19.1 Format
- ZIP file with `pack.mcmeta` and assets/ and data/ folders.
- Custom textures, models, sounds, languages, fonts, shaders, post-processing (no full custom shaders in v1; FFP only).

### 19.2 Loading
- User picks file via `<input type="file">`.
- Unzipped in worker (or streamed in-memory).
- Higher resolution: scale up to 2048 atlas.

### 19.3 pack.mcmeta
```json
{
  "pack": {
    "pack_format": 15,
    "description": "My Pack"
  }
}
```

---

## 20. Procedural Asset Generation

### 20.1 Textures
- All default textures procedurally generated on first load.
- Base palette per material: 4 shades (top-left, top-right, bottom-left, bottom-right).
- Per-pixel: pixelart-style generation, optional Perlin noise overlay, dithering.
- 16×16 default, optionally 32×32, 64×64, 128×128, 256×256, 512×512.

### 20.2 Animations
- Animated textures: 2–16 frames, frame interval.
- Water, lava, fire, portal, magma, prismarine (rotating), nether portal, end portal (v2), kelp, bamboo, seagrass, chorus flower (v2), froglight, sculk sensor, candle, respawn anchor (v2), conduit (v2), twisting vines (v2), weeping vines (v2), soul fire, soul campfire, campfires, blaze powder, clock, compass, recovery compass, lodestone compass, enchanted glint overlay.

### 20.3 Sounds
- See §14.3.

### 20.4 Music
- See §14.4.

---

## 21. Procedural World (v1.20 features)

### 21.1 Trail Ruins
- Buried structure of suspicious gravel, 5 variants.
- Brushing reveals items (pottery sherds, armor trims, emerald, wheat, bottle o' enchanting, brush, etc.).

### 21.2 Cherry Grove biome
- Pink cherry leaves, petals particle.
- Petals fall when wind blows.

### 21.3 Archaeology
- 4 brushable blocks: suspicious sand, suspicious gravel.
- 9 pottery sherds: arms up, blade, brewer, burn, danger, explorer, friend, heart, heartbreak, howl, miner, mourner, plenty, prize, scarab, shelter, skull, snort, breach (v1.20.5).
- Decorated Pots: 4 sherds + 1 banner pattern.

### 21.4 Sniffer
- Snifflet egg → Sniffer.
- Sniffer sniffs out torchflower seeds, pitcher pods.
- New plants: torchflower, pitcher plant.

### 21.5 Breeze (v2)
- Hostile mob, wind charge projectile, can knock player.

### 21.6 Bogged (v2)
- Skeleton variant with mushrooms, shoots poisonous arrows.

---

## 22. Weather

### 22.1 Rain
- Activated by `/weather rain` or random chance.
- Rain particles fall.
- Sky darkens.
- No fire spread.
- Lightning strike chance.
- Rain volume slider.

### 22.2 Thunderstorm
- Lightning strikes entities within 3×3 area.
- Triggers mob spawn buffs (skeleton trap horse).
- Thunder volume.
- Sky is darkest.

### 22.3 Snow
- Cold biomes.
- Snow particles fall slowly, accumulate on top of solid blocks.
- Snow layers stack up to 8.

---

## 23. Particle System

### 23.1 Types
- Block break, block place, block dust (footstep, fall).
- Liquid splash, bubble, fishing.
- Mob-specific: heart, anger, villager trades, witch magic, totem, enchant glint, smoke, large smoke, flame, lava, heart of the sea conduit (v2), sneeze (panda), happy villager, mycelium, soul, ash, white ash, warthog (v2), sculk charge, sculk sensor, sonic boom, egg crack, dragon breath (v2), end rod (v2), totem of undying, fireworks, dripleaf, spore blossom, cherry leaves, sniffer sniffing, brushing, decorated pot sherds.

### 23.2 Implementation
- Single mesh, per-vertex aging, GPU-attached.
- Max 4096 particles.
- Spawn on event, decouple from world sim.

---

## 24. Animations

### 24.1 Player
- Walking, sprinting, sneaking, swimming, crawling, falling, sleeping, dying, attacking, mining, placing, eating, drinking, bow draw, crossbow load, shield block, elytra (v2), riding (v2), sleeping.

### 24.2 Mob
- Per-mob model: head turn, walk cycle, run, idle, attack, hurt, death, sleep (cats, villagers), sit, dance (parrot, piglin).

### 24.3 Skeleton Format
- Procedural rigs: bones, IK for arms, inverse kinematics on mob head tracking.
- v1: pre-baked keyframe per state, interpolated.

---

## 25. Performance

### 25.1 Chunk Loading
- Spawn chunks always loaded.
- Distance-based: chunks within 2 render distance always loaded; outside loaded as needed, with priority based on player movement.

### 25.2 Render Distance
- Slider 2–32 chunks, default 8.
- Cloud height proportional.

### 25.3 Simulation Distance
- Slider 2–16, default 8.
- Mobs beyond sim distance don't tick.

### 25.4 Multithreading
- Worker pool (2–4) for chunk meshing and lighting.
- Main thread: render, input, player physics, mob AI near player.

### 25.5 Garbage Collection
- Object pooling for particles, entities, packets.
- Typed arrays for all hot data.
- Avoid allocations per frame.

### 25.6 GC Pressure
- Use DataView + ArrayBuffer for serialization, not JSON.
- Reuse temp vectors.

### 25.7 Draw Call Batching
- One draw call per chunk per material.
- Sort by texture + light for state changes.

### 25.8 LOD
- v1: only one LOD.
- v2: simplified meshes at distance.

---

## 26. Accessibility

- **High contrast UI**: bold colors, white on black.
- **Color blind modes**: deuteranopia, protanopia, tritanopia filter.
- **Dyslexic font toggle**.
- **Subtitles**: speech bubbles, mob ambient.
- **Key rebinding**: every action.
- **Toggle vs hold**: sprint, sneak, attack.
- **Camera shake toggle**: explosions.
- **Reduced motion**: disable bobbing.
- **Voice / screen reader**: announcement of events.
- **One-hand mode**: tap to attack.

---

## 27. Modding / Extensibility (planned v2)

- Data-driven blocks, items, recipes, advancements, worldgen via JSON.
- Plugin API: hook into events, register custom packets.
- Scripting: sandboxed JS via `eval` in worker (no DOM access).

---

## 28. Testing

### 28.1 Unit Tests
- Block registry completeness.
- Recipe symmetry.
- Loot table weight sums to 100.
- Enchantment logic.
- Pathfinding correctness.
- Light propagation.

### 28.2 Integration Tests
- World load/save roundtrip.
- Chunk boundary consistency.
- Mob spawn eligibility.
- Multiplayer join/leave.

### 28.3 Visual Regression
- Per-biome screenshot diffing with threshold.
- Per-mob pose diffing.

### 28.4 Headless WebGL
- Use headless Chromium with custom WebGL stub.
- Or `node-webgl` via `@kmamal/headless-gl` (in dev only).

### 28.5 Performance Benchmarks
- Chunk gen: ms per chunk.
- Meshing: tris per ms.
- Lighting: BFS ticks per second.
- Mob AI: ticks per second.

---

## 29. Security

### 29.1 Sandbox
- No `eval` from network data.
- Resource pack parsing: schema-validated JSON, file size cap.
- Multiplayer SDP: signed offer with server key (when matchmaking server is online).
- World save: backup before overwrite.

### 29.2 Privacy
- Telemetry opt-in only.
- No third-party CDNs.
- No analytics in singleplayer.

### 29.3 Input Validation
- All commands parse, clamp, validate.
- All block place operations reject if not in valid range.

---

## 30. Deployment

### 30.1 Static Hosting
- Single HTML file deployable on any static host.
- Service worker for offline play (optional).

### 30.2 Build Script (optional)
- `build.js` concatenates JS files in order, embeds in `<script>`.
- Minifies with `terser` (dev dep only).
- Strips comments.

### 30.3 Versioning
- `VERSION` constant in `main.js`.
- World format version: 1.20.5 = 4082.
- Migration: each major world version reads old format.

### 30.4 CI (optional)
- GitHub Actions: lint with eslint (dev dep), run unit tests, build, deploy to GitHub Pages.

---

## 31. Open Questions / Future Work

- Real redstone implementation is large; needs careful design.
- Nether/End dimensions share most code with overworld.
- Modding API is large; needs isolation boundaries.
- Mobile (touch) controls: tap, drag, virtual gamepad.
- Controller support: full gamepad mappings, radial menu.
- VR support: out of scope; design supports it later.
- Server hosting: would need signaling server + TURN server; design uses manual offer exchange for v1.

---

## 32. Acceptance Criteria (v1.0)

- [ ] Player can spawn in default world, walk, jump, sneak, sprint, swim.
- [ ] Player can break and place every solid block.
- [ ] Lighting propagates correctly through transparent blocks.
- [ ] Day/night cycle, weather, time commands all work.
- [ ] All 79 biomes generate.
- [ ] All 720+ blocks are placeable and visually correct.
- [ ] All 30+ passive mobs and 30+ hostile mobs spawn, move, and have AI.
- [ ] All recipes craftable; furnace cooks; brewing brews; anvil combines.
- [ ] Inventory 41 slots, hotbar, offhand, armor.
- [ ] Health, hunger, air, XP, status effects all update.
- [ ] World saves and loads from IndexedDB.
- [ ] Settings persist to localStorage.
- [ ] Custom resource pack loads from file picker.
- [ ] 60 FPS at 8 chunks render distance on integrated graphics.
- [ ] Multiplayer (P2P) supports 2+ players, world state syncs, chat works.
- [ ] Music and procedural sounds play correctly.
- [ ] No console errors during normal play.
- [ ] Total HTML+CSS+JS size under 5 MB unminified (target), under 1 MB minified.
- [ ] No external dependencies in runtime (all open source vanilla).
- [ ] Works offline once loaded.
- [ ] Works in latest Chrome, Firefox, Safari, Edge.

---

## 33. Out of Scope (v1, planned v2)

- Redstone simulation
- Nether and End dimensions
- Elytra flight
- Server-authoritative multiplayer
- Modding API
- Server-side anti-cheat
- Custom shader packs (GLSL injection)
- Marketplace, skin store
- Telemetry dashboards
- Realms
- Cross-play with Java/Bedrock editions
