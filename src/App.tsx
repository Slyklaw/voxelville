import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { initRenderer, createOutlineFor, initOutlines, renderWithOutlines, MeshWithOutline } from './engine/renderer';
import { getVoxelGeometry } from './engine/voxel-mesh';
import { getMaterial } from './engine/materials';
import { OrbitCamera } from './engine/camera';
import { InstancedPool } from './engine/instancing';
import { CharacterRenderer } from './engine/character-renderer';
import { BuildingRenderer } from './engine/building-renderer';
import { CharacterStateManager } from './simulation/character-state';
import { RoadGrid } from './simulation/road-grid';
import { createWorld, getTerrainHeight } from './simulation/world';
import { SimulationLoop, BuildingInstance } from './simulation/simulation-tick';
import { MovementSystem } from './simulation/movement-system';
import { ALL_CHARACTER_MODELS } from './models/characters';
import { SeededRNG } from './utils/rng';
import { Slider } from './ui/Slider';
import { Hud } from './ui/Hud';
import type { BuildingType } from './simulation/types';
function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = initRenderer(canvas);
    const orbitCamera = new OrbitCamera(ctx.camera, canvas);
    canvas.style.cursor = 'grab';

    // Generate flat terrain
    const world = createWorld(80);
    world.generate(42);

    // Road positions (3-wide roads at z=-20,0,20 and x=-20,0,20)
    const roadPositions = new Set<string>();
    const worldEdge = 39;

    // Collect all road positions and remove grass there
    function addRoadPositions(x1: number, z1: number, x2: number, z2: number): void {
      if (x1 === x2) {
        const minZ = Math.min(z1, z2);
        const maxZ = Math.max(z1, z2);
        for (let z = minZ; z <= maxZ; z++) {
          for (let dx = -1; dx <= 1; dx++) {
            roadPositions.add(`${x1 + dx},${z}`);
          }
        }
      } else {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        for (let x = minX; x <= maxX; x++) {
          for (let dz = -1; dz <= 1; dz++) {
            roadPositions.add(`${x},${z1 + dz}`);
          }
        }
      }
    }

    // Define road grid
    addRoadPositions(-worldEdge, -20, worldEdge, -20);
    addRoadPositions(-worldEdge, 0, worldEdge, 0);
    addRoadPositions(-worldEdge, 20, worldEdge, 20);
    addRoadPositions(-20, -worldEdge, -20, worldEdge);
    addRoadPositions(0, -worldEdge, 0, worldEdge);
    addRoadPositions(20, -worldEdge, 20, worldEdge);

    // Remove grass tiles where roads will go
    world.removeTilesWhere(t => {
      const key = `${t.x},${t.z}`;
      return roadPositions.has(key);
    });

    // Generate sidewalks as terrain tiles (replace grass with sidewalk)
    const blockCenters = [-30, -10, 10, 30];
    for (const bx of blockCenters) {
      for (const bz of blockCenters) {
        // Sidewalk perimeter around each block
        const min = 3;   // Block edge (just inside road zone)
        const max = 17;  // Block edge
        for (let i = min; i <= max; i++) {
          const x1 = bx - 7 + i;
          const z1 = bz - 7 + i;
          // West/east edges of block (skip if in road zone)
          if (x1 < -20 || x1 > 20) {
            world.addTile({ x: bx - 7, y: 0, z: z1, color: 'sidewalk' });
            world.addTile({ x: bx + 7, y: 0, z: z1, color: 'sidewalk' });
          }
          // North/south edges of block (skip if in road zone)
          if (z1 < -20 || z1 > 20) {
            world.addTile({ x: x1, y: 0, z: bz - 7, color: 'sidewalk' });
            world.addTile({ x: x1, y: 0, z: bz + 7, color: 'sidewalk' });
          }
        }
      }
    }

    // Now count terrain tiles and create pools
    const tiles = world.getTiles();
    const colorCounts = new Map<string, number>();
    for (const tile of tiles) {
      colorCounts.set(tile.color, (colorCounts.get(tile.color) ?? 0) + 1);
    }

    const geometry = getVoxelGeometry();
    const pools = new Map<string, InstancedPool>();

    for (const [colorName, count] of colorCounts) {
      const material = getMaterial(colorName);
      if (!material) continue;
      const pool = new InstancedPool(geometry, material, count);
      pools.set(colorName, pool);
    }

    for (const tile of tiles) {
      const pool = pools.get(tile.color);
      if (!pool) continue;
      pool.addInstance(new THREE.Vector3(tile.x, tile.y, tile.z));
    }

    for (const pool of pools.values()) {
      ctx.scene.add(pool.meshInstance);
    }

    // Log pool info for debugging
    console.log(`[POOLS] Terrain colors: ${colorCounts.size}, Total terrain tiles: ${tiles.length}`);
    colorCounts.forEach((count, color) => {
      console.log(`  ${color}: ${count} tiles`);
    });

    // Create outline pairs for terrain pools (static - never moves)
    const outlinePairs: MeshWithOutline[] = [];
    for (const pool of pools.values()) {
      outlinePairs.push(createOutlineFor(pool.meshInstance, true));
    }

    // Characters
    const charRenderer = new CharacterRenderer(ctx.scene);
    const stateManager = new CharacterStateManager();
    const rng = new SeededRNG(42);

    // Buildings and simulation
    const buildingRenderer = new BuildingRenderer(ctx.scene);
    const roadGrid = new RoadGrid();

    // Helper to place a 3-wide road segment at y=0
    function placeRoadLine(x1: number, z1: number, x2: number, z2: number): void {
      if (x1 === x2) {
        const minZ = Math.min(z1, z2);
        const maxZ = Math.max(z1, z2);
        for (let z = minZ; z <= maxZ; z++) {
          for (let dx = -1; dx <= 1; dx++) {
            roadGrid.placeRoad(x1 + dx, z);
            buildingRenderer.addBuilding('road_tile', new THREE.Vector3(x1 + dx, 0, z));
          }
        }
      } else {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        for (let x = minX; x <= maxX; x++) {
          for (let dz = -1; dz <= 1; dz++) {
            roadGrid.placeRoad(x, z1 + dz);
            buildingRenderer.addBuilding('road_tile', new THREE.Vector3(x, 0, z1 + dz));
          }
        }
      }
    }

    // Place roads at y=0 (grass already removed)
    placeRoadLine(-worldEdge, -20, worldEdge, -20);
    placeRoadLine(-worldEdge, 0, worldEdge, 0);
    placeRoadLine(-worldEdge, 20, worldEdge, 20);
    placeRoadLine(-20, -worldEdge, -20, worldEdge);
    placeRoadLine(0, -worldEdge, 0, worldEdge);
    placeRoadLine(20, -worldEdge, 20, worldEdge);

    // City blocks - 1 larger building per block, placed at y=1
    const buildingInstances: BuildingInstance[] = [];
    let bid = 0;

    function addBuilding(modelId: string, x: number, z: number, cap: number, type: BuildingType): void {
      buildingRenderer.addBuilding(modelId, new THREE.Vector3(x, 1, z));
      buildingInstances.push({
        id: bid++, type, position: new THREE.Vector3(x, 1, z),
        capacity: cap, occupancy: 0, modelId,
      });
    }

    // Northwest blocks (x<0, z<0): Large residential houses
    addBuilding('house_two_storey', -10, -10, 6, 'house');
    addBuilding('house_two_storey', -30, -10, 6, 'house');
    addBuilding('house_row_house', -10, -30, 5, 'house');
    addBuilding('house_row_house', -30, -30, 5, 'house');

    // Northeast blocks (x>0, z<0): Tall offices
    addBuilding('office_tower', 10, -10, 10, 'office');
    addBuilding('office_tower', 30, -10, 10, 'office');
    addBuilding('office_tower', 10, -30, 10, 'office');
    addBuilding('office_small', 30, -30, 7, 'office');

    // Southeast blocks (x>0, z>0): Stores
    addBuilding('store_corner_shop', 10, 10, 4, 'store');
    addBuilding('store_corner_shop', 30, 10, 4, 'store');
    addBuilding('store_market_stall', 10, 30, 3, 'store');
    addBuilding('store_market_stall', 30, 30, 3, 'store');

    // Southwest blocks (x<0, z>0): Community buildings
    addBuilding('park_basic', -10, 10, 999, 'park');
    addBuilding('party_hall', -30, 10, 50, 'party_hall');
    addBuilding('park_basic', -10, 30, 999, 'park');
    addBuilding('cleaning_depot', -30, 30, 2, 'cleaning_depot');

    // Simulation loop with growth system
    const simLoop = new SimulationLoop(stateManager, buildingInstances, 42);
    const movementSystem = new MovementSystem(roadGrid, stateManager);
    simLoop.setMovementSystem(movementSystem);
    simLoop.setRoadGrid(roadGrid);
    simLoop.setBuildingRenderer(buildingRenderer);
    simLoop.setWorld(world);
    simLoop.start();

    // Spawn characters near roads
    for (let i = 0; i < 20; i++) {
      const model = ALL_CHARACTER_MODELS[i % ALL_CHARACTER_MODELS.length];
      const x = rng.nextInt(-35, 35);
      const z = rng.nextInt(-35, 35);
      const terrainY = getTerrainHeight(world, x, z);
      const position = new THREE.Vector3(x, terrainY, z);
      const index = charRenderer.addCharacter(model.id, position);
      stateManager.createCharacter(i, model.id, position);
      const sim = stateManager.getCharacter(i);
      if (sim) sim.instanceIndex = index;
    }

    // Create outline pairs - buildings are static, characters are dynamic
    for (const mesh of buildingRenderer.getMeshes()) {
      outlinePairs.push(createOutlineFor(mesh, true));
    }
    for (const mesh of charRenderer.getMeshes()) {
      outlinePairs.push(createOutlineFor(mesh, false));
    }

    // Add all outline meshes to scene once (hidden by default)
    // Set to true to enable outlines (performance hit!)
    const ENABLE_OUTLINES = false;
    if (ENABLE_OUTLINES) {
      initOutlines(ctx, outlinePairs);
    }

    // Render loop with performance logging
    let running = true;
    let frameCount = 0;
    let lastLogTime = performance.now();
    const timings: Record<string, number> = {};

    function animate(): void {
      if (!running) return;
      setTimeout(animate, 0);

      const frameStart = performance.now();

      // Character updates
      const charStart = performance.now();
      for (const entityId of stateManager.getAllEntityIds()) {
        const renderState = stateManager.getRenderState(entityId);
        const sim = stateManager.getCharacter(entityId);
        if (!renderState || !sim) continue;
        charRenderer.updateCharacterInstance(
          sim.modelId,
          sim.instanceIndex,
          renderState,
        );
      }
      timings['charUpdate'] = (timings['charUpdate'] || 0) + performance.now() - charStart;

      // Render
      const renderStart = performance.now();
      if (ENABLE_OUTLINES) {
        renderWithOutlines(ctx, outlinePairs);
      } else {
        ctx.renderer.render(ctx.scene, ctx.camera);
      }
      timings['render'] = (timings['render'] || 0) + performance.now() - renderStart;

      timings['total'] = (timings['total'] || 0) + performance.now() - frameStart;

      // Log every 60 frames
      frameCount++;
      const now = performance.now();
      if (now - lastLogTime > 2000) {
        const avg = (key: string) => (timings[key] / frameCount).toFixed(2);
        console.log(`[PERF] Frames: ${frameCount}, Avg ms/frame:`);
        console.log(`  Total: ${avg('total')}ms`);
        console.log(`  CharUpdate: ${avg('charUpdate')}ms`);
        console.log(`  Render: ${avg('render')}ms`);
        console.log(`  Outline pairs: ${outlinePairs.length}`);
        console.log(`  Characters: ${stateManager.getAllEntityIds().length}`);
        Object.keys(timings).forEach(k => timings[k] = 0);
        frameCount = 0;
        lastLogTime = now;
      }
    }
    animate();

    // Cleanup
    return () => {
      running = false;
      simLoop.stop();
      orbitCamera.dispose();
      charRenderer.dispose();
      buildingRenderer.dispose();
      for (const pool of pools.values()) {
        ctx.scene.remove(pool.meshInstance);
        pool.dispose();
      }
      for (const pair of outlinePairs) {
        pair.outline.dispose();
      }
      ctx.cleanup();
    };
  }, []);

  return (
    <div className="w-full h-screen relative">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
        <h1 className="text-xl font-bold text-gray-800">VoxelVille</h1>
        <p className="text-sm text-gray-600">Drag to orbit · Scroll to zoom</p>
        <a
          href="/viewer.html"
          target="_blank"
          className="mt-2 inline-block px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-medium no-underline"
        >
          Model Viewer →
        </a>
      </div>
      <Hud />
      <Slider initialValue={0.5} />
    </div>
  );
}

export default App;
