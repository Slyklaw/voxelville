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
 * @param mesh - The InstancedMesh to outline
 * @param isStatic - If true, outline matrices are only computed once (for non-moving geometry)
 */
export function createOutlineFor(mesh: THREE.InstancedMesh, isStatic: boolean = false): MeshWithOutline {
  return {
    mesh,
    outline: new OutlineRenderer(mesh, isStatic),
  };
}

/**
 * Initialize outline meshes - add to scene once (hidden).
 * @param ctx - Renderer context
 * @param pairs - Array of mesh+outline pairs
 */
export function initOutlines(
  ctx: RendererContext,
  pairs: MeshWithOutline[],
): void {
  for (const pair of pairs) {
    pair.outline.addToScene(ctx.scene);
  }
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

  // Update all outline matrices (static ones skip after first frame)
  const updateStart = performance.now();
  let dynamicCount = 0;
  for (const pair of pairs) {
    if (pair.outline.update(pair.mesh)) dynamicCount++;
  }
  const updateMs = performance.now() - updateStart;

  // Show all outlines for pass 1
  for (const pair of pairs) {
    pair.outline.show();
  }

  // Pass 1: Render outlines
  const outlineRenderStart = performance.now();
  ctx.renderer.render(ctx.scene, ctx.camera);
  const outlineRenderMs = performance.now() - outlineRenderStart;

  // Hide all outlines
  for (const pair of pairs) {
    pair.outline.hide();
  }

  // Pass 2: Render main meshes
  const mainRenderStart = performance.now();
  ctx.renderer.render(ctx.scene, ctx.camera);
  const mainRenderMs = performance.now() - mainRenderStart;

  // Log slow frames
  const totalMs = updateMs + outlineRenderMs + mainRenderMs;
  if (totalMs > 16) {
    console.log(`[RENDER SLOW] ${totalMs.toFixed(1)}ms: update=${updateMs.toFixed(1)}ms(${dynamicCount} dynamic), outline=${outlineRenderMs.toFixed(1)}ms, main=${mainRenderMs.toFixed(1)}ms`);
  }
}

export function initRenderer(canvas: HTMLCanvasElement): RendererContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // Disabled for better performance
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0)); // Fixed at 1.0 for performance

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
