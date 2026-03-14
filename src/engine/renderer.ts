import * as THREE from 'three';
import { OutlineRenderer } from './outline-renderer';

export interface RendererContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cleanup: () => void;
}

// Type for mesh-outline pairs
export interface MeshWithOutline {
  mesh: THREE.InstancedMesh;
  outline: OutlineRenderer;
}

/**
 * Create an OutlineRenderer for an InstancedMesh.
 * Returns a MeshWithOutline pair for use in renderWithOutlines().
 */
export function createOutlineFor(mesh: THREE.InstancedMesh): MeshWithOutline {
  return {
    mesh,
    outline: new OutlineRenderer(mesh),
  };
}

/**
 * Two-pass render: outlines first, then main meshes.
 * Outlines are batched into a single render pass.
 * @param ctx - Renderer context
 * @param pairs - Array of mesh+outline pairs to render
 * @param updateCamera - Optional camera update callback
 */
export function renderWithOutlines(
  ctx: RendererContext,
  pairs: MeshWithOutline[],
  updateCamera?: () => void,
): void {
  if (updateCamera) updateCamera();

  // Update all outline matrices first
  for (const pair of pairs) {
    pair.outline.update(pair.mesh);
  }

  // Add all outline meshes to scene at once
  for (const pair of pairs) {
    pair.outline.addToScene(ctx.scene);
  }

  // Pass 1: Single render for all outlines
  ctx.renderer.render(ctx.scene, ctx.camera);

  // Remove all outline meshes from scene
  for (const pair of pairs) {
    pair.outline.removeFromScene(ctx.scene);
  }

  // Pass 2: Render main meshes
  ctx.renderer.render(ctx.scene, ctx.camera);
}

export function initRenderer(canvas: HTMLCanvasElement): RendererContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(30, 30, 30);
  camera.lookAt(0, 0, 0);

  // Add ambient + directional light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 15);
  scene.add(directionalLight);

  function onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener('resize', onResize);

  function cleanup(): void {
    window.removeEventListener('resize', onResize);
    renderer.dispose();
  }

  return { scene, camera, renderer, cleanup };
}

export function render(
  ctx: RendererContext,
  updateCamera?: () => void,
): void {
  if (updateCamera) updateCamera();
  ctx.renderer.render(ctx.scene, ctx.camera);
}
