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

    // Generate terrain (large world with lots of empty space around town)
    const world = createWorld(80);
    world.generate(42);
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

    // Build road cross - 3-wide roads, raised above terrain
    // Horizontal road (runs east-west, covers z=-1,0,1)
    for (let x = -20; x <= 20; x++) {
      for (let dz = -1; dz <= 1; dz++) {
        roadGrid.placeRoad(x, dz);
        const terrainY = getTerrainHeight(world, x, dz);
        buildingRenderer.addBuilding('road_tile', new THREE.Vector3(x, terrainY + 1, dz));
      }
    }
    // Vertical road (runs north-south, covers x=-1,0,1, excluding intersection)
    for (let z = -20; z <= 20; z++) {
      if (z >= -1 && z <= 1) continue; // Skip intersection (already placed)
      for (let dx = -1; dx <= 1; dx++) {
        roadGrid.placeRoad(dx, z);
        const terrainY = getTerrainHeight(world, dx, z);
        buildingRenderer.addBuilding('road_tile', new THREE.Vector3(dx, terrainY + 1, z));
      }
    }

    // Create initial buildings - well-spaced town layout
    // Roads run -20 to +20, buildings placed in quadrants around the crossroads
    const buildingInstances: BuildingInstance[] = [];
    let bid = 0;

    function addBuilding(
      modelId: string,
      pos: THREE.Vector3,
      cap: number,
      type: BuildingType,
    ): void {
      // Adjust Y to sit on top of terrain
      const terrainY = getTerrainHeight(world, Math.round(pos.x), Math.round(pos.z));
      const adjustedPos = new THREE.Vector3(pos.x, terrainY, pos.z);

      buildingRenderer.addBuilding(modelId, adjustedPos);
      buildingInstances.push({
        id: bid++,
        type,
        position: adjustedPos.clone(),
        capacity: cap,
        occupancy: 0,
        modelId,
      });
    }

    // --- City blocks: 1 building per block, 10-unit grid spacing ---
    // Northwest quadrant: Residential houses (5 blocks)
    addBuilding('house_cottage', new THREE.Vector3(-15, 0, -5), 4, 'house');
    addBuilding('house_two_storey', new THREE.Vector3(-15, 0, -15), 6, 'house');
    addBuilding('house_row_house', new THREE.Vector3(-5, 0, -15), 5, 'house');
    addBuilding('house_cottage', new THREE.Vector3(-5, 0, -5), 4, 'house');

    // Northeast quadrant: Office district (4 blocks)
    addBuilding('office_tower', new THREE.Vector3(5, 0, -5), 10, 'office');
    addBuilding('office_small', new THREE.Vector3(5, 0, -15), 7, 'office');
    addBuilding('office_tower', new THREE.Vector3(15, 0, -5), 10, 'office');
    addBuilding('office_small', new THREE.Vector3(15, 0, -15), 7, 'office');

    // Southeast quadrant: Commercial / stores (4 blocks)
    addBuilding('store_corner_shop', new THREE.Vector3(5, 0, 5), 4, 'store');
    addBuilding('store_market_stall', new THREE.Vector3(5, 0, 15), 3, 'store');
    addBuilding('store_corner_shop', new THREE.Vector3(15, 0, 5), 4, 'store');
    addBuilding('store_market_stall', new THREE.Vector3(15, 0, 15), 3, 'store');

    // Southwest quadrant: Community buildings (4 blocks)
    addBuilding('park_basic', new THREE.Vector3(-5, 0, 5), 999, 'park');
    addBuilding('party_hall', new THREE.Vector3(-5, 0, 15), 50, 'party_hall');
    addBuilding('park_basic', new THREE.Vector3(-15, 0, 5), 999, 'park');
    addBuilding('cleaning_depot', new THREE.Vector3(-15, 0, 15), 2, 'cleaning_depot');

    // Simulation loop with growth system
    const simLoop = new SimulationLoop(stateManager, buildingInstances, 42);
    const movementSystem = new MovementSystem(roadGrid, stateManager);
    simLoop.setMovementSystem(movementSystem);
    simLoop.setRoadGrid(roadGrid);
    simLoop.setBuildingRenderer(buildingRenderer);
    simLoop.setWorld(world);
    simLoop.start();

    // Spawn initial characters spread across the town
    for (let i = 0; i < 20; i++) {
      const model = ALL_CHARACTER_MODELS[i % ALL_CHARACTER_MODELS.length];
      const x = rng.nextInt(-16, 16);
      const z = rng.nextInt(-16, 16);
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
    initOutlines(ctx, outlinePairs);

    // Render loop (using setTimeout to bypass vsync for accurate FPS measurement)
    let running = true;
    function animate(): void {
      if (!running) return;
      setTimeout(animate, 0);

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

      renderWithOutlines(ctx, outlinePairs);
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
