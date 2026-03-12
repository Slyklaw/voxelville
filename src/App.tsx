import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { initRenderer, render } from './engine/renderer';
import { getVoxelGeometry } from './engine/voxel-mesh';
import { getMaterial } from './engine/materials';
import { OrbitCamera } from './engine/camera';
import { InstancedPool } from './engine/instancing';
import { createWorld } from './simulation/world';

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

    // Populate instances
    for (const tile of tiles) {
      const pool = pools.get(tile.color);
      if (!pool) continue;
      pool.addInstance(new THREE.Vector3(tile.x, tile.y, tile.z));
    }

    // Add all pools to scene
    for (const pool of pools.values()) {
      ctx.scene.add(pool.meshInstance);
    }

    // Render loop
    let running = true;
    function animate(): void {
      if (!running) return;
      requestAnimationFrame(animate);
      render(ctx);
    }
    animate();

    // Cleanup on unmount
    return () => {
      running = false;
      orbitCamera.dispose();
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
    </div>
  );
}

export default App;
