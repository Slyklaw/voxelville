import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { initRenderer, createOutlineFor, renderWithOutlines, MeshWithOutline } from './engine/renderer';
import { getVoxelGeometry } from './engine/voxel-mesh';
import { getMaterial } from './engine/materials';
import { OrbitCamera } from './engine/camera';
import { InstancedPool } from './engine/instancing';
import { ALL_BUILDING_MODELS, BuildingModelDefinition } from './models/buildings';
import { ALL_CHARACTER_MODELS, CharacterModelDefinition } from './models/characters';

// Combine all models for viewing
interface ViewableModel {
  id: string;
  category: 'building' | 'character';
  type: string;
  size: [number, number, number];
  voxels: Array<{ x: number; y: number; z: number; color: string }>;
}

function toViewable(building: BuildingModelDefinition): ViewableModel {
  return {
    id: building.id,
    category: 'building',
    type: building.type,
    size: building.size,
    voxels: building.voxels,
  };
}

function toViewableChar(char: CharacterModelDefinition): ViewableModel {
  return {
    id: char.id,
    category: 'character',
    type: char.type,
    size: char.size,
    voxels: char.voxels,
  };
}

const ALL_MODELS: ViewableModel[] = [
  ...ALL_BUILDING_MODELS.map(toViewable),
  ...ALL_CHARACTER_MODELS.map(toViewableChar),
];

export function ModelViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<ReturnType<typeof initRenderer> | null>(null);
  const cameraRef = useRef<OrbitCamera | null>(null);
  const poolRef = useRef<InstancedPool | null>(null);
  const outlineRef = useRef<MeshWithOutline | null>(null);
  const animRef = useRef<number>(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<'all' | 'building' | 'character'>('all');

  const currentModel = ALL_MODELS[currentIndex];

  // Filter models
  const filteredModels = filter === 'all'
    ? ALL_MODELS
    : ALL_MODELS.filter(m => m.category === filter);

  const filteredIndex = filteredModels.findIndex(m => m.id === currentModel?.id);
  const safeIndex = filteredIndex >= 0 ? filteredIndex : 0;

  const clearModel = useCallback(() => {
    if (outlineRef.current) {
      outlineRef.current.outline.dispose();
      outlineRef.current = null;
    }
    if (poolRef.current) {
      poolRef.current.dispose();
      poolRef.current = null;
    }
  }, []);

  // Display a specific model
  const displayModel = useCallback((model: ViewableModel) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    clearModel();

    // Create a neutral white material for per-instance coloring
    const neutralMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      flatShading: true,
    });

    const geometry = getVoxelGeometry();
    const pool = new InstancedPool(geometry, neutralMaterial, model.voxels.length);

    // Center the model at origin
    const centerX = (model.size[0] - 1) / 2;
    const centerY = 0;
    const centerZ = (model.size[2] - 1) / 2;

    for (const voxel of model.voxels) {
      const pos = new THREE.Vector3(
        voxel.x - centerX,
        voxel.y - centerY,
        voxel.z - centerZ,
      );
      const instanceIndex = pool.addInstance(pos);

      // Set per-instance color
      const material = getMaterial(voxel.color);
      if (material) {
        pool.meshInstance.setColorAt(instanceIndex, material.color);
        pool.meshInstance.instanceColor!.needsUpdate = true;
      }
    }

    ctx.scene.add(pool.meshInstance);
    poolRef.current = pool;

    // Create outline
    const outlinePair = createOutlineFor(pool.meshInstance);
    outlineRef.current = outlinePair;

    // Reset camera to view the model
    const cam = ctx.camera;
    const maxDim = Math.max(model.size[0], model.size[1], model.size[2]);
    const dist = maxDim * 2 + 5;
    cam.position.set(dist, dist, dist);
    cam.lookAt(0, 0, 0);
  }, [clearModel]);

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = initRenderer(canvas);
    ctxRef.current = ctx;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    ctx.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 15);
    ctx.scene.add(directionalLight);

    const camera = new OrbitCamera(ctx.camera, canvas);
    cameraRef.current = camera;

    // Start render loop — always render even before model is loaded
    function animate() {
      animRef.current = requestAnimationFrame(animate);
      if (ctxRef.current && outlineRef.current) {
        renderWithOutlines(ctxRef.current, [outlineRef.current]);
      } else if (ctxRef.current) {
        ctxRef.current.renderer.render(ctxRef.current.scene, ctxRef.current.camera);
      }
    }
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      clearModel();
      camera.dispose();
      ctx.cleanup();
    };
  }, [clearModel]);

  // Display model when filter or index changes
  useEffect(() => {
    if (filteredModels.length > 0) {
      const model = filteredModels[safeIndex];
      if (model) {
        setCurrentIndex(ALL_MODELS.findIndex(m => m.id === model.id));
        displayModel(model);
      }
    }
  }, [filter, safeIndex, filteredModels, displayModel]);

  const navigate = useCallback((direction: number) => {
    if (filteredModels.length === 0) return;
    const newIndex = (safeIndex + direction + filteredModels.length) % filteredModels.length;
    const model = filteredModels[newIndex];
    if (model) {
      setCurrentIndex(ALL_MODELS.findIndex(m => m.id === model.id));
      displayModel(model);
    }
  }, [filteredModels, safeIndex, displayModel]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigate(-1);
      } else if (e.key === 'ArrowRight') {
        navigate(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  if (!currentModel) {
    return <div>No models to display</div>;
  }

  // Group voxels by color for the info panel
  const colorCounts = new Map<string, number>();
  for (const voxel of currentModel.voxels) {
    colorCounts.set(voxel.color, (colorCounts.get(voxel.color) || 0) + 1);
  }

  return (
    <div className="w-full h-screen relative">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* Top-left: Title and Filter */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg">
        <h1 className="text-xl font-bold text-gray-800">Model Viewer</h1>
        <p className="text-sm text-gray-600 mb-2">Inspect models one by one</p>
        
        {/* Filter buttons */}
        <div className="flex gap-2">
          {(['all', 'building', 'character'] as const).map(f => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
              }}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filter === f
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {f === 'all' ? 'All' : f === 'building' ? 'Buildings' : 'Characters'}
            </button>
          ))}
        </div>
      </div>

      {/* Top-right: Model Info */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg max-w-xs">
        <div className="text-sm font-bold text-gray-800">
          {currentModel.category === 'building' ? '🏢' : '🧑'} {currentModel.id}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          Category: <span className="font-medium">{currentModel.category}</span>
        </div>
        <div className="text-xs text-gray-600">
          Type: <span className="font-medium">{currentModel.type}</span>
        </div>
        <div className="text-xs text-gray-600">
          Size: <span className="font-medium">{currentModel.size.join(' × ')}</span>
        </div>
        <div className="text-xs text-gray-600">
          Voxels: <span className="font-medium">{currentModel.voxels.length}</span>
        </div>
        
        {/* Color breakdown */}
        <div className="mt-2 border-t pt-2">
          <div className="text-xs font-medium text-gray-700 mb-1">Colors:</div>
          <div className="grid grid-cols-2 gap-1">
            {Array.from(colorCounts.entries()).map(([color, count]) => {
              const mat = getMaterial(color);
              const hex = mat ? '#' + mat.color.getHexString() : '#000000';
              return (
                <div key={color} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-3 h-3 rounded border border-gray-300"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-gray-600 truncate">
                    {color} ({count})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Navigation */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-lg px-6 py-3 shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-700"
        >
          ← Previous
        </button>
        
        <span className="text-sm text-gray-600 min-w-[120px] text-center">
          {safeIndex + 1} / {filteredModels.length}
        </span>
        
        <button
          onClick={() => navigate(1)}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-700"
        >
          Next →
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow text-xs text-gray-500">
        ← → arrows to navigate
      </div>
    </div>
  );
}
