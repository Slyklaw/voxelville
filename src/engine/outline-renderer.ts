import * as THREE from 'three';

export class OutlineRenderer {
  private outlineMesh: THREE.InstancedMesh;

  constructor(sourceMesh: THREE.InstancedMesh) {
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
    });

    this.outlineMesh = new THREE.InstancedMesh(
      sourceMesh.geometry,
      outlineMaterial,
      sourceMesh.instanceMatrix.array.length / 16, // max instances
    );
    this.outlineMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  /**
   * Copy instance matrices from source mesh and scale for outline effect.
   * Must be called each frame before renderOutline().
   * @param sourceMesh - The InstancedMesh to generate outlines for
   */
  update(sourceMesh: THREE.InstancedMesh): void {
    const dummy = new THREE.Object3D();

    for (let i = 0; i < sourceMesh.count; i++) {
      sourceMesh.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

      // Scale up 8% for outline border
      dummy.scale.multiplyScalar(1.08);
      dummy.updateMatrix();
      this.outlineMesh.setMatrixAt(i, dummy.matrix);
    }

    this.outlineMesh.count = sourceMesh.count;
    this.outlineMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Add outline mesh to scene (for batched rendering).
   */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.outlineMesh);
  }

  /**
   * Remove outline mesh from scene (after batched rendering).
   */
  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.outlineMesh);
  }

  dispose(): void {
    (this.outlineMesh.material as THREE.Material).dispose();
    this.outlineMesh.dispose();
  }
}
