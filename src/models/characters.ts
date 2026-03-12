/**
 * Character model definitions for Voxelville
 * 
 * Each character is a simple voxel structure:
 * - Adults (male/female): 3 voxels wide × 4 voxels tall × 1 deep
 * - Children: 3 voxels wide × 3 voxels tall × 1 deep
 * 
 * Each variant has distinct hair, skin, and clothing colors.
 */

export interface CharacterModelDefinition {
  id: string;
  type: 'adult_male' | 'adult_female' | 'child';
  size: [number, number, number]; // width, height, depth in voxels
  voxels: Array<{
    x: number;
    y: number;
    z: number;
    color: string;
  }>;
}

// Helper to create a character structure
function createAdultVoxels(
  skinColor: string,
  hairColor: string,
  clothingColor: string,
): Array<{ x: number; y: number; z: number; color: string }> {
  return [
    // Head (top row)
    { x: 0, y: 3, z: 0, color: hairColor },
    { x: 1, y: 3, z: 0, color: hairColor },
    { x: 2, y: 3, z: 0, color: hairColor },
    
    // Face row
    { x: 0, y: 2, z: 0, color: skinColor },
    { x: 1, y: 2, z: 0, color: skinColor },
    { x: 2, y: 2, z: 0, color: skinColor },
    
    // Torso
    { x: 0, y: 1, z: 0, color: clothingColor },
    { x: 1, y: 1, z: 0, color: clothingColor },
    { x: 2, y: 1, z: 0, color: clothingColor },
    
    // Legs
    { x: 0, y: 0, z: 0, color: clothingColor },
    { x: 1, y: 0, z: 0, color: clothingColor },
    { x: 2, y: 0, z: 0, color: clothingColor },
  ];
}

function createChildVoxels(
  skinColor: string,
  hairColor: string,
  clothingColor: string,
): Array<{ x: number; y: number; z: number; color: string }> {
  return [
    // Head (top row)
    { x: 0, y: 2, z: 0, color: hairColor },
    { x: 1, y: 2, z: 0, color: hairColor },
    { x: 2, y: 2, z: 0, color: hairColor },
    
    // Face row
    { x: 0, y: 1, z: 0, color: skinColor },
    { x: 1, y: 1, z: 0, color: skinColor },
    { x: 2, y: 1, z: 0, color: skinColor },
    
    // Torso
    { x: 0, y: 0, z: 0, color: clothingColor },
    { x: 1, y: 0, z: 0, color: clothingColor },
    { x: 2, y: 0, z: 0, color: clothingColor },
  ];
}

// Male models (5 variants)
export const MALE_MODELS: CharacterModelDefinition[] = [
  {
    id: 'male_1',
    type: 'adult_male',
    size: [3, 4, 1],
    voxels: createAdultVoxels('skin-light', 'hair-black', 'clothing-blue'),
  },
  {
    id: 'male_2',
    type: 'adult_male',
    size: [3, 4, 1],
    voxels: createAdultVoxels('skin-dark', 'hair-brown', 'clothing-green'),
  },
  {
    id: 'male_3',
    type: 'adult_male',
    size: [3, 4, 1],
    voxels: createAdultVoxels('skin-light', 'hair-blond', 'clothing-orange'),
  },
  {
    id: 'male_4',
    type: 'adult_male',
    size: [3, 4, 1],
    voxels: createAdultVoxels('skin-dark', 'hair-red', 'clothing-purple'),
  },
  {
    id: 'male_5',
    type: 'adult_male',
    size: [3, 4, 1],
    voxels: createAdultVoxels('skin-light', 'hair-brown', 'clothing-pink'),
  },
];

// Female models (5 variants)
export const FEMALE_MODELS: CharacterModelDefinition[] = [
  {
    id: 'female_1',
    type: 'adult_female',
    size: [3, 4, 1],
    voxels: createAdultVoxels('skin-light', 'hair-red', 'clothing-blue'),
  },
  {
    id: 'female_2',
    type: 'adult_female',
    size: [3, 4, 1],
    voxels: createAdultVoxels('skin-dark', 'hair-black', 'clothing-green'),
  },
  {
    id: 'female_3',
    type: 'adult_female',
    size: [3, 4, 1],
    voxels: createAdultVoxels('skin-light', 'hair-blond', 'clothing-orange'),
  },
  {
    id: 'female_4',
    type: 'adult_female',
    size: [3, 4, 1],
    voxels: createAdultVoxels('skin-dark', 'hair-brown', 'clothing-purple'),
  },
  {
    id: 'female_5',
    type: 'adult_female',
    size: [3, 4, 1],
    voxels: createAdultVoxels('skin-light', 'hair-red', 'clothing-pink'),
  },
];

// Child models (8 variants)
export const CHILD_MODELS: CharacterModelDefinition[] = [
  {
    id: 'child_1',
    type: 'child',
    size: [3, 3, 1],
    voxels: createChildVoxels('skin-light', 'hair-black', 'clothing-blue'),
  },
  {
    id: 'child_2',
    type: 'child',
    size: [3, 3, 1],
    voxels: createChildVoxels('skin-dark', 'hair-brown', 'clothing-green'),
  },
  {
    id: 'child_3',
    type: 'child',
    size: [3, 3, 1],
    voxels: createChildVoxels('skin-light', 'hair-blond', 'clothing-orange'),
  },
  {
    id: 'child_4',
    type: 'child',
    size: [3, 3, 1],
    voxels: createChildVoxels('skin-dark', 'hair-red', 'clothing-purple'),
  },
  {
    id: 'child_5',
    type: 'child',
    size: [3, 3, 1],
    voxels: createChildVoxels('skin-light', 'hair-brown', 'clothing-pink'),
  },
  {
    id: 'child_6',
    type: 'child',
    size: [3, 3, 1],
    voxels: createChildVoxels('skin-dark', 'hair-black', 'clothing-orange'),
  },
  {
    id: 'child_7',
    type: 'child',
    size: [3, 3, 1],
    voxels: createChildVoxels('skin-light', 'hair-red', 'clothing-blue'),
  },
  {
    id: 'child_8',
    type: 'child',
    size: [3, 3, 1],
    voxels: createChildVoxels('skin-dark', 'hair-blond', 'clothing-green'),
  },
];

// Combined array of all 18 character models
export const ALL_CHARACTER_MODELS: CharacterModelDefinition[] = [
  ...MALE_MODELS,
  ...FEMALE_MODELS,
  ...CHILD_MODELS,
];

// Helper to get a model by ID
export function getCharacterModel(id: string): CharacterModelDefinition | undefined {
  return ALL_CHARACTER_MODELS.find(model => model.id === id);
}
