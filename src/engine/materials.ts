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
MATERIALS.set('sidewalk', createMaterial(0xc0c0c0));
  MATERIALS.set('brick', createMaterial(0xc85a3a));
  MATERIALS.set('roof', createMaterial(0x4a6fa5));
  MATERIALS.set('office', createMaterial(0x9bb8d3));
  MATERIALS.set('store', createMaterial(0xe8c547));
  MATERIALS.set('water', createMaterial(0x4a90d9));
  MATERIALS.set('sand', createMaterial(0xf0d078));
  MATERIALS.set('dirt', createMaterial(0x8b6f47));
  MATERIALS.set('stone', createMaterial(0x808080));
  MATERIALS.set('wood', createMaterial(0x8b4513));

  // Character colors
  // Skin
  MATERIALS.set('skin-light', createMaterial(0xFFDAB9));
  MATERIALS.set('skin-dark', createMaterial(0xC68642));

  // Hair
  MATERIALS.set('hair-black', createMaterial(0x1A1A1A));
  MATERIALS.set('hair-brown', createMaterial(0x5C3A21));
  MATERIALS.set('hair-blond', createMaterial(0xF0D078));
  MATERIALS.set('hair-red', createMaterial(0xB7410E));

  // Clothing (light)
  MATERIALS.set('clothing-blue', createMaterial(0x5B9BD5));
  MATERIALS.set('clothing-green', createMaterial(0x70AD47));
  MATERIALS.set('clothing-orange', createMaterial(0xED7D31));
  MATERIALS.set('clothing-purple', createMaterial(0x9DC3E6));
  MATERIALS.set('clothing-pink', createMaterial(0xFFB6C1));

  // Clothing (dark)
  MATERIALS.set('clothing-dark-1', createMaterial(0x3B3B3B));
  MATERIALS.set('clothing-dark-2', createMaterial(0x2E4057));
  MATERIALS.set('clothing-dark-3', createMaterial(0x4A4A4A));
  MATERIALS.set('clothing-dark-4', createMaterial(0x3D3D3D));
  MATERIALS.set('clothing-dark-5', createMaterial(0x4B4B4B));

  // Building materials
  // Structural
  MATERIALS.set('window', createMaterial(0x272727));
  MATERIALS.set('door', createMaterial(0x8B4513));
  MATERIALS.set('awning', createMaterial(0xE8C547));
  MATERIALS.set('bunting', createMaterial(0x4ECDC4));

  // Nature
  MATERIALS.set('tree-trunk', createMaterial(0x8B4513));
  MATERIALS.set('tree-leaves', createMaterial(0x228B22));

  // Flowers
  MATERIALS.set('flower-pink', createMaterial(0xFF69B4));
  MATERIALS.set('flower-yellow', createMaterial(0xFFD700));
  MATERIALS.set('flower-orange', createMaterial(0xFF4500));

  // Furniture
  MATERIALS.set('bench', createMaterial(0x8B4513));
}

export function getMaterial(colorName: string): THREE.MeshLambertMaterial | undefined {
  initMaterials();
  return MATERIALS.get(colorName);
}