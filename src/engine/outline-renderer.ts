import * as THREE from 'three';

export class OutlineRenderer {
  private outlineMesh: THREE.InstancedMesh;
  private isStatic: boolean;
  private hasInitialized: boolean = false;

  constructor(sourceMesh: THREE.InstancedMesh, staticMesh: boolean = false) {
    this.isStatic = staticMesh;
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
   * For static meshes, only updates once then skips subsequent calls.
   * @param sourceMesh - The InstancedMesh to generate outlines for
   * @returns true if update was performed (dynamic), false if skipped (static)
   */
  update(sourceMesh: THREE.InstancedMesh): boolean {
    // Skip update for static outlines after first initialization
    if (this.isStatic && this.hasInitialized) return false;

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
    this.hasInitialized = true;
    return true;
  }

  /**
   * Get the instance count of the outline mesh.
   */
  get instanceCount(): number {
    return this.outlineMesh.count;
  }

  /**
   * Add outline mesh to scene once during initialization.
   */
  addToScene(scene: THREE.Scene): void {
    this.outlineMesh.visible = false;
    scene.add(this.outlineMesh);
  }

  /**
   * Show outline mesh for outline render pass.
   */
  show(): void {
    this.outlineMesh.visible = true;
  }

  /**
   * Hide outline mesh after outline render pass.
   */
  hide(): void {
    this.outlineMesh.visible = false;
  }

  dispose(): void {
    (this.outlineMesh.material as THREE.Material).dispose();
    this.outlineMesh.dispose();
  }
}
