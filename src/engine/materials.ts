import * as THREE from 'three';

const MATERIALS = new Map<string, THREE.MeshLambertMaterial>();

function createMaterial(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

function initMaterials(): void {
  if (MATERIALS.size > 0) return;
  MATERIALS.set('sky', createMaterial(0x87ceeb));
  MATERIALS.set('grass', createMaterial(0x7ec850));
  MATERIALS.set('road', createMaterial(0x6b6b6b));
  MATERIALS.set('brick', createMaterial(0xc85a3a));
  MATERIALS.set('roof', createMaterial(0x4a6fa5));
  MATERIALS.set('office', createMaterial(0x9bb8d3));
  MATERIALS.set('store', createMaterial(0xe8c547));
  MATERIALS.set('water', createMaterial(0x4a90d9));
  MATERIALS.set('sand', createMaterial(0xf0d078));
  MATERIALS.set('dirt', createMaterial(0x8b6f47));
  MATERIALS.set('stone', createMaterial(0x808080));
  MATERIALS.set('wood', createMaterial(0x8b4513));
}

export function getMaterial(colorName: string): THREE.MeshLambertMaterial | undefined {
  initMaterials();
  return MATERIALS.get(colorName);
}
