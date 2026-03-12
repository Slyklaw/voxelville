import * as THREE from 'three';

const VOXEL_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

export function getVoxelGeometry(): THREE.BoxGeometry {
  return VOXEL_GEOMETRY;
}
