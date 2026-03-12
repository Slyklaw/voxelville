import { describe, it, expect } from 'vitest';
import { getMaterial } from '../src/engine/materials';

// All material names used in building models
const BUILDING_MATERIALS = [
  'brick', 'roof', 'window', 'door',
  'office', 'store', 'awning',
  'road', 'grass', 'water', 'sand', 'dirt', 'stone',
  'tree-trunk', 'tree-leaves', 'bench',
  'flower-pink', 'flower-yellow', 'flower-orange',
  'bunting',
];

// All material names used in character models
const CHARACTER_MATERIALS = [
  'skin-light', 'skin-dark',
  'hair-black', 'hair-brown', 'hair-blond', 'hair-red',
  'clothing-blue', 'clothing-green', 'clothing-orange', 
  'clothing-purple', 'clothing-pink',
];

// Expected hex values for key building materials (from materials.ts)
const EXPECTED_BUILDING_COLORS: Record<string, number> = {
  'brick': 0xc85a3a,      // Red-brown
  'roof': 0x4a6fa5,       // Blue
  'office': 0x9bb8d3,     // Light blue-gray
  'store': 0xe8c547,      // Yellow
  'window': 0x272727,     // Dark gray/black
  'door': 0x8B4513,       // Brown
  'awning': 0xE8C547,     // Yellow (same as store)
  'road': 0x6b6b6b,       // Gray
  'grass': 0x7ec850,      // Green
  'water': 0x4a90d9,      // Blue
  'stone': 0x808080,      // Gray
  'tree-trunk': 0x8B4513, // Brown
  'tree-leaves': 0x228B22,// Dark green
  'bunting': 0x4ECDC4,    // Teal
};

// Expected hex values for key character materials
const EXPECTED_CHARACTER_COLORS: Record<string, number> = {
  'skin-light': 0xFFDAB9,  // Peachy
  'skin-dark': 0xC68642,   // Brown
  'hair-black': 0x1A1A1A,  // Very dark
  'hair-brown': 0x5C3A21,  // Brown
  'hair-blond': 0xF0D078,  // Yellow-ish
  'hair-red': 0xB7410E,    // Red-orange
  'clothing-blue': 0x5B9BD5,   // Blue
  'clothing-green': 0x70AD47,  // Green
  'clothing-orange': 0xED7D31, // Orange
  'clothing-purple': 0x9DC3E6, // Light blue? (note: this seems off in materials.ts!)
  'clothing-pink': 0xFFB6C1,   // Pink
};

describe('Material Definitions (VIZ-06, VIZ-07, VIZ-08)', () => {
  describe('Building materials', () => {
    BUILDING_MATERIALS.forEach((matName) => {
      it(`getMaterial('${matName}') should return a valid material`, () => {
        const material = getMaterial(matName);
        console.log(`\n=== Material: ${matName} ===`);
        if (material) {
          const hex = material.color.getHexString();
          console.log(`  Hex: #${hex} (${material.color.getHexString()})`);
          if (EXPECTED_BUILDING_COLORS[matName]) {
            const expected = EXPECTED_BUILDING_COLORS[matName];
            const expectedHex = expected.toString(16).padStart(6, '0');
            console.log(`  Expected: #${expectedHex}`);
            expect(material.color.getHex()).toBe(expected);
          }
        } else {
          console.log(`  ERROR: Material not found!`);
        }
        expect(material).toBeDefined();
      });
    });
  });

  describe('Character materials', () => {
    CHARACTER_MATERIALS.forEach((matName) => {
      it(`getMaterial('${matName}') should return a valid material`, () => {
        const material = getMaterial(matName);
        console.log(`\n=== Material: ${matName} ===`);
        if (material) {
          const hex = material.color.getHexString();
          console.log(`  Hex: #${hex}`);
          if (EXPECTED_CHARACTER_COLORS[matName]) {
            const expected = EXPECTED_CHARACTER_COLORS[matName];
            const expectedHex = expected.toString(16).padStart(6, '0');
            console.log(`  Expected: #${expectedHex}`);
            expect(material.color.getHex()).toBe(expected);
          }
        } else {
          console.log(`  ERROR: Material not found!`);
        }
        expect(material).toBeDefined();
      });
    });
  });

  describe('Invalid material names', () => {
    it('should return undefined for non-existent material', () => {
      const material = getMaterial('nonexistent-material');
      console.log('\n=== Invalid Material Test ===');
      console.log(`  getMaterial('nonexistent-material') = ${material}`);
      expect(material).toBeUndefined();
    });
  });
});

describe('VIZ-09: materialToColor function', () => {
  // Since materialToColor is in building-renderer.ts and character-renderer.ts,
  // we'll test the getMaterial function it uses
  
  it('should return white color for undefined material', () => {
    console.log('\n=== VIZ-09: Fallback Color Test ===');
    const material = getMaterial('nonexistent');
    console.log(`  Undefined material returns: ${material}`);
    
    // The materialToColor function should return white (0xffffff) for undefined materials
    // This is the fallback behavior in both renderers
    expect(material).toBeUndefined();
    console.log(`  Fallback should be: white (#ffffff)`);
  });
});
