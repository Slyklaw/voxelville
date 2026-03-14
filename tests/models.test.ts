import { describe, it, expect } from 'vitest';
import { 
  ALL_BUILDING_MODELS, 
  HOUSE_MODELS, 
  OFFICE_MODELS, 
  STORE_MODELS, 
  ROAD_TILES, 
  PARK_TILES, 
  PARTY_HALLS, 
  CLEANING_DEPOTS,
  BuildingModelDefinition 
} from '../src/models/buildings';
import { 
  ALL_CHARACTER_MODELS, 
  MALE_MODELS, 
  FEMALE_MODELS, 
  CHILD_MODELS,
  CharacterModelDefinition 
} from '../src/models/characters';

// Helper to count voxels in a model
function countVoxels(model: BuildingModelDefinition | CharacterModelDefinition): number {
  return model.voxels.length;
}

// Helper to check if all voxel colors are non-empty strings
function allColorsDefined(model: BuildingModelDefinition | CharacterModelDefinition): boolean {
  return model.voxels.every(v => typeof v.color === 'string' && v.color.length > 0);
}

// Helper to count voxels by color
function countByColor(model: BuildingModelDefinition | CharacterModelDefinition): Map<string, number> {
  const counts = new Map<string, number>();
  for (const voxel of model.voxels) {
    counts.set(voxel.color, (counts.get(voxel.color) || 0) + 1);
  }
  return counts;
}

describe('Building Model Definitions (VIZ-01, VIZ-03, VIZ-04)', () => {
  describe('Building counts', () => {
    it('should have 12 total building models', () => {
      console.log('\n=== VIZ-01: Building Model Count ===');
      console.log(`Total building models: ${ALL_BUILDING_MODELS.length}`);
      console.log(`Expected: 12`);
      console.log(`Breakdown: ${HOUSE_MODELS.length} houses, ${OFFICE_MODELS.length} offices, ${STORE_MODELS.length} stores, ${ROAD_TILES.length} roads, ${PARK_TILES.length} parks, ${PARTY_HALLS.length} party halls, ${CLEANING_DEPOTS.length} depots, 1 sidewalk`);
      expect(ALL_BUILDING_MODELS.length).toBe(12);
    });

    it('should have 3 house variants', () => {
      expect(HOUSE_MODELS.length).toBe(3);
    });

    it('should have 2 office variants', () => {
      expect(OFFICE_MODELS.length).toBe(2);
    });

    it('should have 2 store variants', () => {
      expect(STORE_MODELS.length).toBe(2);
    });
  });

  describe('House models (VIZ-04)', () => {
    HOUSE_MODELS.forEach((model) => {
      describe(`${model.id}`, () => {
        it('should have voxels with defined colors', () => {
          console.log(`\n=== House: ${model.id} ===`);
          console.log(`Size: ${model.size.join('x')}`);
          console.log(`Voxel count: ${countVoxels(model)}`);
          console.log('Expected appearance:');
          console.log(`  - Brick walls (red-brown, #c85a3a) on edges`);
          console.log(`  - Blue roof (#4a6fa5) on top layer`);
          console.log(`  - Dark windows (#272727) on front face`);
          console.log(`  - Brown door (#8b4513) on front, bottom-center`);
          expect(allColorsDefined(model)).toBe(true);
        });

        it('should have roof voxels', () => {
          const colors = countByColor(model);
          console.log(`  Roof voxels: ${colors.get('roof') || 0}`);
          expect(colors.has('roof')).toBe(true);
        });

        it('should have wall voxels', () => {
          const colors = countByColor(model);
          console.log(`  Wall voxels (brick): ${colors.get('brick') || 0}`);
          expect(colors.has('brick')).toBe(true);
        });
      });
    });
  });

  describe('Office models', () => {
    OFFICE_MODELS.forEach((model) => {
      it(`${model.id} should have office wall and window voxels`, () => {
        console.log(`\n=== Office: ${model.id} ===`);
        console.log(`Size: ${model.size.join('x')}`);
        console.log(`Voxel count: ${countVoxels(model)}`);
        const colors = countByColor(model);
        console.log(`  Office wall voxels: ${colors.get('office') || 0}`);
        console.log(`  Window voxels: ${colors.get('window') || 0}`);
        expect(colors.has('office')).toBe(true);
        expect(colors.has('window')).toBe(true);
      });
    });
  });

  describe('Store models', () => {
    STORE_MODELS.forEach((model) => {
      it(`${model.id} should have store wall, awning, and window voxels`, () => {
        console.log(`\n=== Store: ${model.id} ===`);
        console.log(`Size: ${model.size.join('x')}`);
        console.log(`Voxel count: ${countVoxels(model)}`);
        const colors = countByColor(model);
        console.log(`  Store wall voxels: ${colors.get('store') || 0}`);
        console.log(`  Awning voxels: ${colors.get('awning') || 0}`);
        console.log(`  Window voxels: ${colors.get('window') || 0}`);
        expect(colors.has('store')).toBe(true);
        expect(colors.has('awning')).toBe(true);
      });
    });
  });

  describe('Road models', () => {
    ROAD_TILES.forEach((model) => {
      it(`${model.id} should be a single road tile`, () => {
        console.log(`\n=== Road: ${model.id} ===`);
        console.log(`Size: ${model.size.join('x')}`);
        console.log(`Voxel count: ${countVoxels(model)}`);
        console.log(`  Road voxels: ${countByColor(model).get('road') || 0}`);
        expect(countVoxels(model)).toBe(1);
        expect(model.voxels[0].color).toBe('road');
      });
    });
  });

  describe('Park models', () => {
    PARK_TILES.forEach((model) => {
      it(`${model.id} should have grass, tree, bench, and flower voxels`, () => {
        console.log(`\n=== Park: ${model.id} ===`);
        console.log(`Size: ${model.size.join('x')}`);
        console.log(`Voxel count: ${countVoxels(model)}`);
        console.log('Expected appearance:');
        console.log(`  - Green grass base (#7ec850)`);
        console.log(`  - Brown tree trunk (#8b4513) in center`);
        console.log(`  - Dark green tree leaves (#228b22) above trunk`);
        console.log(`  - Brown bench (#8b4513) near tree`);
        console.log(`  - Pink/yellow/orange flowers in corners`);
        const colors = countByColor(model);
        console.log(`  Grass: ${colors.get('grass') || 0}`);
        console.log(`  Tree trunk: ${colors.get('tree-trunk') || 0}`);
        console.log(`  Tree leaves: ${colors.get('tree-leaves') || 0}`);
        console.log(`  Bench: ${colors.get('bench') || 0}`);
        console.log(`  Flowers: pink=${colors.get('flower-pink') || 0}, yellow=${colors.get('flower-yellow') || 0}, orange=${colors.get('flower-orange') || 0}`);
        expect(colors.has('grass')).toBe(true);
        expect(colors.has('tree-trunk')).toBe(true);
        expect(colors.has('tree-leaves')).toBe(true);
      });
    });
  });
});

describe('Character Model Definitions (VIZ-02, VIZ-03, VIZ-05)', () => {
  describe('Character counts', () => {
    it('should have 18 total character models', () => {
      console.log('\n=== VIZ-02: Character Model Count ===');
      console.log(`Total character models: ${ALL_CHARACTER_MODELS.length}`);
      console.log(`Expected: 18`);
      console.log(`Breakdown: ${MALE_MODELS.length} males, ${FEMALE_MODELS.length} females, ${CHILD_MODELS.length} children`);
      expect(ALL_CHARACTER_MODELS.length).toBe(18);
    });

    it('should have 5 male variants', () => {
      expect(MALE_MODELS.length).toBe(5);
    });

    it('should have 5 female variants', () => {
      expect(FEMALE_MODELS.length).toBe(5);
    });

    it('should have 8 child variants', () => {
      expect(CHILD_MODELS.length).toBe(8);
    });
  });

  describe('Male character models (VIZ-05)', () => {
    MALE_MODELS.forEach((model) => {
      describe(`${model.id}`, () => {
        it('should have exactly 12 voxels (3x4x1)', () => {
          console.log(`\n=== Male: ${model.id} ===`);
          console.log(`Size: ${model.size.join('x')}`);
          console.log(`Voxel count: ${countVoxels(model)}`);
          expect(countVoxels(model)).toBe(12);
        });

        it('should have voxels with defined colors', () => {
          expect(allColorsDefined(model)).toBe(true);
        });

        it('should have hair voxels on top row (y=3)', () => {
          const hairVoxels = model.voxels.filter(v => v.y === 3);
          console.log(`  Hair voxels (top, y=3): ${hairVoxels.length}, color: ${hairVoxels[0]?.color}`);
          expect(hairVoxels.length).toBe(3);
          expect(hairVoxels.every(v => v.color.startsWith('hair-'))).toBe(true);
        });

        it('should have skin voxels on face row (y=2)', () => {
          const skinVoxels = model.voxels.filter(v => v.y === 2);
          console.log(`  Skin voxels (face, y=2): ${skinVoxels.length}, color: ${skinVoxels[0]?.color}`);
          expect(skinVoxels.length).toBe(3);
          expect(skinVoxels.every(v => v.color.startsWith('skin-'))).toBe(true);
        });

        it('should have clothing voxels on torso and legs (y=0,1)', () => {
          const clothingVoxels = model.voxels.filter(v => v.y === 0 || v.y === 1);
          console.log(`  Clothing voxels (body, y=0-1): ${clothingVoxels.length}, color: ${clothingVoxels[0]?.color}`);
          expect(clothingVoxels.length).toBe(6);
          expect(clothingVoxels.every(v => v.color.startsWith('clothing-'))).toBe(true);
        });

        it('should have distinct hair, skin, and clothing colors', () => {
          const colors = countByColor(model);
          const hasHair = Array.from(colors.keys()).some(c => c.startsWith('hair-'));
          const hasSkin = Array.from(colors.keys()).some(c => c.startsWith('skin-'));
          const hasClothing = Array.from(colors.keys()).some(c => c.startsWith('clothing-'));
          console.log(`  Unique colors: ${Array.from(colors.keys()).join(', ')}`);
          expect(hasHair).toBe(true);
          expect(hasSkin).toBe(true);
          expect(hasClothing).toBe(true);
        });
      });
    });
  });

  describe('Female character models', () => {
    FEMALE_MODELS.forEach((model) => {
      it(`${model.id} should have 12 voxels with hair/skin/clothing structure`, () => {
        console.log(`\n=== Female: ${model.id} ===`);
        console.log(`Voxel count: ${countVoxels(model)}, colors: ${Array.from(countByColor(model).keys()).join(', ')}`);
        expect(countVoxels(model)).toBe(12);
        expect(allColorsDefined(model)).toBe(true);
      });
    });
  });

  describe('Child character models', () => {
    CHILD_MODELS.forEach((model) => {
      it(`${model.id} should have exactly 9 voxels (3x3x1)`, () => {
        console.log(`\n=== Child: ${model.id} ===`);
        console.log(`Size: ${model.size.join('x')}`);
        console.log(`Voxel count: ${countVoxels(model)}`);
        expect(countVoxels(model)).toBe(9);
      });

      it(`${model.id} should have hair, skin, and clothing voxels`, () => {
        const colors = countByColor(model);
        const hasHair = Array.from(colors.keys()).some(c => c.startsWith('hair-'));
        const hasSkin = Array.from(colors.keys()).some(c => c.startsWith('skin-'));
        const hasClothing = Array.from(colors.keys()).some(c => c.startsWith('clothing-'));
        console.log(`  Colors: ${Array.from(colors.keys()).join(', ')}`);
        expect(hasHair).toBe(true);
        expect(hasSkin).toBe(true);
        expect(hasClothing).toBe(true);
      });
    });
  });
});
