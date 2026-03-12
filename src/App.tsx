import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { initRenderer, render } from './engine/renderer';
import { getVoxelGeometry } from './engine/voxel-mesh';
import { getMaterial } from './engine/materials';
import { OrbitCamera } from './engine/camera';
import { InstancedPool } from './engine/instancing';
import { CharacterRenderer } from './engine/character-renderer';
import { BuildingRenderer } from './engine/building-renderer';
import { createWorld } from './simulation/world';
import {
  CharacterStateManager,
  updateSimulation,
} from './simulation/character-state';
import { RoadGrid } from './simulation/road-grid';
import { placeBuilding } from './simulation/grid-placement';
import { ALL_CHARACTER_MODELS } from './models/characters';
import { SeededRNG } from './utils/rng';
import { Slider } from './ui/Slider';
import { Hud } from './ui/Hud';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = initRenderer(canvas);

    // Orbit camera
    const orbitCamera = new OrbitCamera(ctx.camera, canvas);
    canvas.style.cursor = 'grab';

    // Create world
    const world = createWorld(20);
    world.generate(42);

    // Build instanced pools per color
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

    // Populate terrain instances
    for (const tile of tiles) {
      const pool = pools.get(tile.color);
      if (!pool) continue;
      pool.addInstance(new THREE.Vector3(tile.x, tile.y, tile.z));
    }

    // Add all terrain pools to scene
    for (const pool of pools.values()) {
      ctx.scene.add(pool.meshInstance);
    }

    // Characters
    const charRenderer = new CharacterRenderer(ctx.scene);
    const stateManager = new CharacterStateManager();
    const rng = new SeededRNG(42);

    // Spawn some characters at random ground positions
    for (let i = 0; i < 20; i++) {
      const model = ALL_CHARACTER_MODELS[i % ALL_CHARACTER_MODELS.length];
      const x = rng.nextInt(-8, 8);
      const z = rng.nextInt(-8, 8);
      const position = new THREE.Vector3(x, 0, z);
      const index = charRenderer.addCharacter(model.id, position);
      const entityId = i;
      stateManager.createCharacter(entityId, model.id, position);
      // Set the instance index in the sim state
      const sim = stateManager.getCharacter(entityId);
      if (sim) sim.instanceIndex = index;
    }

    // Buildings - Road network and placement
    const buildingRenderer = new BuildingRenderer(ctx.scene);
    const roadGrid = new RoadGrid();
    
    // Place roads in a cross pattern
    // Horizontal line from (-10,0) to (10,0)
    for (let x = -10; x <= 10; x++) {
      roadGrid.placeRoad(x, 0);
      // Add road tile visually
      buildingRenderer.addBuilding('road_tile', new THREE.Vector3(x, 0.5, 0));
    }
    
    // Vertical line from (0,-10) to (0,10)
    for (let z = -10; z <= 10; z++) {
      roadGrid.placeRoad(0, z);
      // Add road tile visually (skip center to avoid duplicate)
      if (z !== 0) {
        buildingRenderer.addBuilding('road_tile', new THREE.Vector3(0, 0.5, z));
      }
    }
    
    // Place buildings adjacent to roads
    // Houses near the roads
    placeBuilding(2, 1, 'house_cottage', buildingRenderer, roadGrid);
    placeBuilding(2, -1, 'house_two_storey', buildingRenderer, roadGrid);
    placeBuilding(-2, 1, 'house_row_house', buildingRenderer, roadGrid);
    
    // Office near the road
    placeBuilding(5, 0, 'office_tower', buildingRenderer, roadGrid);
    
    // Store near the road
    placeBuilding(0, 5, 'store_market_stall', buildingRenderer, roadGrid);
    
    // Park adjacent to road (3x3, needs to be adjacent)
    placeBuilding(3, 3, 'park_basic', buildingRenderer, roadGrid);

    // Simulate animation state changes
    let simInterval: number | undefined;
    function startSimulation(): void {
      simInterval = window.setInterval(() => {
        const animStates: Array<'idle' | 'walk' | 'work' | 'party'> = [
          'idle', 'walk', 'work', 'party',
        ];
        for (const entityId of stateManager.getAllEntityIds()) {
          const sim = stateManager.getCharacter(entityId);
          if (!sim) continue;
          const newAnim = animStates[Math.floor(Math.random() * animStates.length)];
          // Slight random movement
          const newX = sim.position.x + (rng.nextInt(-1, 1));
          const newZ = sim.position.z + (rng.nextInt(-1, 1));
          updateSimulation(sim, new THREE.Vector3(newX, 0, newZ), newAnim);
        }
      }, 250);
    }
    startSimulation();

    // Render loop
    let running = true;
    function animate(): void {
      if (!running) return;
      requestAnimationFrame(animate);

      // Update character positions from interpolated render states
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

      render(ctx);
    }
    animate();

    // Cleanup on unmount
    return () => {
      running = false;
      if (simInterval) clearInterval(simInterval);
      orbitCamera.dispose();
      charRenderer.dispose();
      buildingRenderer.dispose();
      for (const pool of pools.values()) {
        ctx.scene.remove(pool.meshInstance);
        pool.dispose();
      }
      ctx.cleanup();
    };
  }, []);

  return (
    <div className="w-full h-screen relative">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
        <h1 className="text-xl font-bold text-gray-800">VoxelVille</h1>
        <p className="text-sm text-gray-600">Drag to orbit · Scroll to zoom</p>
      </div>
      <Hud />
      <Slider initialValue={0.5} />
    </div>
  );
}

export default App;
