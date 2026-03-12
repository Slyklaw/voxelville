import * as THREE from 'three';

const dummy = new THREE.Object3D();

export class InstancedPool {
  private mesh: THREE.InstancedMesh;
  private _count = 0;

  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    maxInstances: number,
  ) {
    this.mesh = new THREE.InstancedMesh(geometry, material, maxInstances);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  get meshInstance(): THREE.InstancedMesh {
    return this.mesh;
  }

  addInstance(position: THREE.Vector3, scale?: THREE.Vector3, rotation?: THREE.Euler): number {
    const index = this._count;
    dummy.position.copy(position);
    if (scale) {
      dummy.scale.copy(scale);
    } else {
      dummy.scale.set(1, 1, 1);
    }
    if (rotation) {
      dummy.rotation.copy(rotation);
    } else {
      dummy.rotation.set(0, 0, 0);
    }
    dummy.updateMatrix();
    this.mesh.setMatrixAt(index, dummy.matrix);
    this._count++;
    this.mesh.count = this._count;
    this.mesh.instanceMatrix.needsUpdate = true;
    return index;
  }

  updateInstance(index: number, position: THREE.Vector3, scale?: THREE.Vector3, rotation?: THREE.Euler): void {
    dummy.position.copy(position);
    if (scale) {
      dummy.scale.copy(scale);
    } else {
      dummy.scale.set(1, 1, 1);
    }
    if (rotation) {
      dummy.rotation.copy(rotation);
    } else {
      dummy.rotation.set(0, 0, 0);
    }
    dummy.updateMatrix();
    this.mesh.setMatrixAt(index, dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this._count = 0;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  get count(): number {
    return this._count;
  }

  dispose(): void {
    this.mesh.dispose();
  }
}
