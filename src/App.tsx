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

    // Build road grid - 3-wide roads to world edges
    // World is 80x80, coordinates -40 to +39
    const worldEdge = 39;

    // Helper to place a 3-wide road segment
    function placeRoadLine(x1: number, z1: number, x2: number, z2: number): void {
      if (x1 === x2) {
        // Vertical line (varying z)
        const minZ = Math.min(z1, z2);
        const maxZ = Math.max(z1, z2);
        for (let z = minZ; z <= maxZ; z++) {
          for (let dx = -1; dx <= 1; dx++) {
            roadGrid.placeRoad(x1 + dx, z);
            buildingRenderer.addBuilding('road_tile', new THREE.Vector3(x1 + dx, 1, z));
          }
        }
      } else {
        // Horizontal line (varying x)
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        for (let x = minX; x <= maxX; x++) {
          for (let dz = -1; dz <= 1; dz++) {
            roadGrid.placeRoad(x, z1 + dz);
            buildingRenderer.addBuilding('road_tile', new THREE.Vector3(x, 1, z1 + dz));
          }
        }
      }
    }

    // Horizontal roads (east-west) at z = -20, 0, 20
    placeRoadLine(-worldEdge, -20, worldEdge, -20);
    placeRoadLine(-worldEdge, 0, worldEdge, 0);
    placeRoadLine(-worldEdge, 20, worldEdge, 20);

    // Vertical roads (north-south) at x = -20, 0, 20
    // Skip center segments already covered by horizontal roads
    placeRoadLine(-20, -worldEdge, -20, -21);
    placeRoadLine(-20, 21, -20, worldEdge);
    placeRoadLine(0, -worldEdge, 0, -21);
    placeRoadLine(0, 21, 0, worldEdge);
    placeRoadLine(20, -worldEdge, 20, -21);
    placeRoadLine(20, 21, 20, worldEdge);

    // City blocks in grid cells between roads
    // Blocks centered at: x = ±10, ±30 and z = ±10, ±30
    const buildingInstances: BuildingInstance[] = [];
    let bid = 0;

    function addBuilding(modelId: string, x: number, z: number, cap: number, type: BuildingType): void {
      const adjustedPos = new THREE.Vector3(x, 1, z);
      buildingRenderer.addBuilding(modelId, adjustedPos);
      buildingInstances.push({
        id: bid++, type, position: adjustedPos.clone(),
        capacity: cap, occupancy: 0, modelId,
      });
    }

    // Northwest blocks (x<0, z<0): Residential
    addBuilding('house_cottage', -10, -10, 4, 'house');
    addBuilding('house_two_storey', -30, -10, 6, 'house');
    addBuilding('house_row_house', -10, -30, 5, 'house');
    addBuilding('house_cottage', -30, -30, 4, 'house');

    // Northeast blocks (x>0, z<0): Offices
    addBuilding('office_tower', 10, -10, 10, 'office');
    addBuilding('office_small', 30, -10, 7, 'office');
    addBuilding('office_tower', 10, -30, 10, 'office');
    addBuilding('office_small', 30, -30, 7, 'office');

    // Southeast blocks (x>0, z>0): Stores
    addBuilding('store_corner_shop', 10, 10, 4, 'store');
    addBuilding('store_market_stall', 30, 10, 3, 'store');
    addBuilding('store_corner_shop', 10, 30, 4, 'store');
    addBuilding('store_market_stall', 30, 30, 3, 'store');

    // Southwest blocks (x<0, z>0): Community
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
