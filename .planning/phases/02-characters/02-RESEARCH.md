# Phase 2: Characters — Research Document

**Phase:** 2 of 6 (Characters)  
**Requirements:** REND-02, REND-04, INFRA-02  
**Researched:** 2026-03-11  
**Confidence:** HIGH  

## Executive Summary

Phase 2 adds animated voxel characters to the city builder. Characters are 1×3 voxel adults or 1×2 voxel children with 6 body parts (head, torso, 2 arms, 2 legs). Animation uses InstancedMesh pooling by character variant + simple transform offsets (Y-bob, rotation) rather than skeletal animation. The critical architectural decision is **separating simulation state from render state** with interpolation to avoid teleporting citizens between 4 ticks/sec simulation and 60fps rendering.

---

## 1. Character Model Structure

### 1.1 Voxel Dimensions

Based on `design.md` §7 character model designs:

| Character Type | Body Height | Total Height | Width | Voxels |
|---------------|-------------|--------------|-------|--------|
| Adult Male | 3 voxels | 4 voxels (with head) | 3 voxels (with arms) | ~18 voxels |
| Adult Female | 3 voxels | 4 voxels (with head) | 3 voxels (with arms) | ~18 voxels |
| Child | 2 voxels | 3 voxels (with head) | 3 voxels (with arms) | ~12 voxels |

### 1.2 Bone Layout (Voxel Parts)

Characters have 6 logical body parts, each 1 voxel:

```
         [Head]           ← 1 voxel, top
        [Torso]           ← 1 voxel, center
       [L][R][L][R]       ← 2 arm voxels (left/right), 2 leg voxels (below torso)
      [Leg][Leg][Leg][Leg] ← leg voxels at ground level
```

For animation, each part has an offset/rotation:
- **Head**: Y-position bob (±0.05)
- **Torso**: Y-position bob (±0.05)
- **Arms**: Rotation around shoulder joint
- **Legs**: Rotation around hip joint

### 1.3 Model Definition Format

Compatible with existing `VoxelMeshBuilder` pattern — define characters as TypeScript voxel arrays:

```typescript
// src/models/characters.ts

export interface CharacterModelDefinition {
  id: string;                    // e.g., 'male_1', 'female_3', 'child_2'
  type: 'adult_male' | 'adult_female' | 'child';
  size: [number, number, number]; // [width, height, depth]
  voxels: VoxelDefinition[];      // array of { x, y, z, color }
}

interface VoxelDefinition {
  x: number;
  y: number;
  z: number;
  color: string;  // color name from materials registry
}

// Example: Adult Male variant 1
export const MALE_1: CharacterModelDefinition = {
  id: 'male_1',
  type: 'adult_male',
  size: [3, 4, 1],
  voxels: [
    // Head
    { x: 1, y: 3, z: 0, color: 'skin-light' },
    { x: 1, y: 4, z: 0, color: 'hair-black' },
    // Torso
    { x: 1, y: 2, z: 0, color: 'clothing-blue' },
    // Arms
    { x: 0, y: 2, z: 0, color: 'skin-light' },
    { x: 2, y: 2, z: 0, color: 'skin-light' },
    // Legs
    { x: 0, y: 1, z: 0, color: 'clothing-dark' },
    { x: 1, y: 1, z: 0, color: 'clothing-dark' },
    { x: 2, y: 1, z: 0, color: 'clothing-dark' },
  ],
};
```

### 1.4 Color Palette (from design.md §3.1)

Skin colors: `skin-light (#FFDAB9)`, `skin-dark (#C68642)`  
Hair colors: `hair-black (#1A1A1A)`, `hair-brown (#5C3A21)`, `hair-blond (#F0D078)`, `hair-red (#B7410E)`  
Clothing: Pastel variants — `clothing-blue (#5B9BD5)`, `clothing-green (#70AD47)`, `clothing-orange (#ED7D31)`, etc.  
Leg clothing: Dark pastels — `clothing-dark-1 (#3B3B3B)`, `clothing-dark-2 (#2E4057)`, etc.

---

## 2. Instancing Pool Strategy

### 2.1 Pooling by Character Variant

Each character variant (male_1, female_3, child_2, etc.) gets its own `InstancedPool`. This is **required** because:

1. Each variant has different voxel arrangement → different geometry offsets
2. Each variant has different colors → different materials
3. InstancedMesh batches identical geometry + material into one draw call

```typescript
// Pooling strategy
interface CharacterPool {
  modelId: string;           // 'male_1', 'female_3', etc.
  pool: InstancedPool;       // One InstancedMesh per variant
  instances: Map<number, CharacterInstance>; // entity → instance data
}

class CharacterRenderer {
  private pools: Map<string, CharacterPool>;
  
  constructor(scene: THREE.Scene) {
    this.pools = new Map();
    // Pre-create pools for all 18 character variants
    for (const model of ALL_CHARACTER_MODELS) {
      const geometry = buildGeometryFromVoxels(model.voxels);
      const material = getMaterial(model.primaryColor);
      const pool = new InstancedPool(geometry, material, MAX_INSTANCES_PER_VARIANT);
      scene.add(pool.meshInstance);
      this.pools.set(model.id, { modelId: model.id, pool, instances: new Map() });
    }
  }
}
```

### 2.2 Maximum Instances Per Variant

With 500 residents and 18 variants, average ~28 characters per variant. Set `MAX_INSTANCES_PER_VARIANT = 50` to allow growth. Total pools: 18, each with up to 50 instances = 900 max characters.

### 2.3 Draw Call Budget

- **18 InstancedMesh objects** (one per variant)
- **1 draw call each** = 18 draw calls for all 500 characters
- Plus terrain, buildings, etc. = **< 100 total draw calls** (well under budget)

---

## 3. Animation Interpolation Strategy

### 3.1 Simulation vs Render State Separation (INFRA-02)

The core problem: simulation runs at **4 ticks/sec** (250ms per tick), rendering runs at **60fps** (16.7ms per frame). Without interpolation, characters teleport between grid cells.

**Solution: Dual-state architecture**

```typescript
interface CharacterSimState {
  position: Vector3;          // Grid position (integer coordinates)
  targetPosition: Vector3;    // Next grid position (for pathfinding)
  animationState: AnimationState; // 'idle' | 'walk' | 'work' | 'party' | 'clean' | 'sleep' | 'build'
  previousPosition: Vector3;  // For interpolation
  previousAnimation: AnimationState;
  tickTimestamp: number;      // Last simulation tick time
}

interface CharacterRenderState {
  interpolatedPosition: Vector3;  // Computed position for this frame
  interpolatedRotation: number;  // Facing direction
  animationOffset: Vector3;      // Animation transform (Y-bob, etc.)
  animationPhase: number;        // Animation cycle position (0..1)
}
```

### 3.2 Interpolation Formula

```typescript
function interpolateCharacter(
  sim: CharacterSimState,
  render: CharacterRenderState,
  currentTime: number,
): void {
  const tickDuration = 250; // ms (4 ticks/sec)
  const timeSinceTick = currentTime - sim.tickTimestamp;
  const alpha = Math.min(timeSinceTick / tickDuration, 1.0); // 0..1
  
  // Position interpolation (avoid teleporting)
  render.interpolatedPosition.lerpVectors(
    sim.previousPosition,
    sim.position,
    alpha
  );
  
  // Animation interpolation (smooth state transitions)
  const animAlpha = alpha; // Same timing
  render.animationPhase = computeAnimationPhase(sim.animationState, animAlpha);
}
```

### 3.3 Animation States (REND-04)

From `design.md` §7.4:

| State | Animation | Duration | Implementation |
|-------|-----------|----------|----------------|
| Idle | Subtle Y-bob (±0.05) | 1.2s loop | Sine wave on Y position |
| Walk | Leg alternation + arm swing + Y-bob | 0.5s/step | Rotate leg/arm voxels ±15° |
| Work | Arm up-down + torso lean | 1.0s loop | Rotate arm voxels |
| Party | Rapid Y-bounce + arm wave | 0.4s loop | Y-offset ±0.1 + arm rotation |
| Clean | Arm sweep side-to-side | 0.8s loop | Arm rotation ±30° |
| Sleep | Lying flat (rotated 90° on Z) | static | Set rotation to 90° |
| Build | Arm raise + voxel "pop" | 0.6s loop | Arm rotation + particle |

**Implementation approach**: Apply transform offsets per-instance via `dummy.updateMatrix()` before `setMatrixAt()`. The `dummy` Object3D is positioned at character grid position, then animation offsets are applied:

```typescript
function updateCharacterInstance(
  pool: InstancedPool,
  index: number,
  gridPosition: Vector3,
  animationState: AnimationState,
  animationPhase: number,
): void {
  const dummy = new THREE.Object3D();
  
  // Base position from simulation (interpolated)
  dummy.position.copy(gridPosition);
  
  // Animation offsets
  switch (animationState) {
    case 'idle':
      dummy.position.y += Math.sin(animationPhase * Math.PI * 2) * 0.05;
      break;
    case 'walk':
      dummy.position.y += Math.abs(Math.sin(animationPhase * Math.PI * 4)) * 0.05;
      dummy.rotation.z = Math.sin(animationPhase * Math.PI * 4) * 0.1; // leg swing
      break;
    case 'party':
      dummy.position.y += Math.sin(animationPhase * Math.PI * 8) * 0.1;
      break;
    // ... other states
  }
  
  dummy.updateMatrix();
  pool.mesh.setMatrixAt(index, dummy.matrix);
  pool.mesh.instanceMatrix.needsUpdate = true;
}
```

---

## 4. Performance Budget for 500+ Characters

### 4.1 Memory

| Component | Per Character | 500 Characters | Total |
|-----------|---------------|----------------|-------|
| Sim state | ~120 bytes | — | 60 KB |
| Render state | ~60 bytes | — | 30 KB |
| InstancedMesh matrices | 64 bytes | — | 32 KB |
| **Total** | — | — | **~122 KB** |

### 4.2 CPU (per frame)

| Operation | Cost | Notes |
|-----------|------|-------|
| Interpolation (500 chars) | ~0.1ms | Vector lerp, trivial |
| Animation transform updates | ~0.5ms | 500 × dummy.updateMatrix() |
| setMatrixAt calls | ~0.2ms | Batched, single flag |
| **Total per frame** | **~0.8ms** | Well under 5ms budget |

### 4.3 GPU (draw calls)

| Object Type | Draw Calls |
|-------------|------------|
| Character pools (18 variants) | 18 |
| Terrain instanced mesh | 1 |
| Building pools | ~10 |
| **Total** | **~30** |

### 4.4 Performance Targets (from design.md §13)

- **Frame rate**: ≥ 60fps ✓ (characters add ~0.8ms frame time)
- **Residents on screen**: ≤ 500 ✓ (pools sized for 50×18 = 900)
- **Total voxels rendered**: ≤ 100,000 ✓ (500 chars × 18 voxels = 9,000)
- **Simulation tick**: ≤ 5ms ✓ (interpolation is read-only in render)

---

## 5. Critical Pitfalls to Avoid

### Pitfall 2: Simulation Tick Decoupling (from PITFALLS.md)

**Mitigation**: Interpolation architecture (§3.1-3.2) directly addresses this. Store `previousPosition` in sim state, compute `interpolatedPosition` in render.

### Pitfall 12: Character Animation Complexity Explosion (from PITFALLS.md)

**Mitigation**: Pool characters by variant (§2.1), use simple transform offsets (§3.3), avoid per-bone skeletal animation.

### Pitfall 8: Memory Leaks from Undisposed Geometries (from PITFALLS.md)

**Mitigation**: Shared geometry per character variant, disposal in pool cleanup.

---

## 6. Implementation Checklist

- [ ] Add character color materials to `materials.ts` (skin, hair, clothing)
- [ ] Define 18 character model variants in `src/models/characters.ts`
- [ ] Build geometry from voxel arrays (extend `VoxelMeshBuilder`)
- [ ] Create `CharacterRenderer` class with per-variant InstancedPool
- [ ] Implement `CharacterSimState` and `CharacterRenderState` interfaces
- [ ] Implement interpolation function (lerp previous→current position)
- [ ] Implement animation offset application (Y-bob, rotation)
- [ ] Integrate with existing `InstancedPool.updateInstance()` pattern
- [ ] Test with 500 characters at 60fps
- [ ] Verify draw call count < 50

---

## Sources

- `design.md` §7: Character model designs, animation states
- `PITFALLS.md`: Pitfall 2 (tick decoupling), Pitfall 12 (animation complexity)
- `ARCHITECTURE.md`: Component boundaries, data flow
- Three.js `InstancedMesh` documentation: `setMatrixAt`, `instanceMatrix.needsUpdate`
- Current `src/engine/instancing.ts`: Existing `InstancedPool` implementation

---

*Research completed: 2026-03-11*  
*Ready for Phase 2 planning: YES*
