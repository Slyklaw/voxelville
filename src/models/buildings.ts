/**
 * Building model definitions for Voxelville
 * 
 * Each building is a simple voxel structure:
 * - Houses: 3-5 voxels wide × 4-6 voxels tall × 3-5 deep
 * - Offices: 3-4 voxels wide × 5-8 voxels tall × 3-4 deep
 * - Stores: 2-3 voxels wide × 2-3 voxels tall × 2-3 deep
 * - Roads: flat 1×1×0 tiles
 * - Parks: 3×3×1 with vegetation
 * - Party Hall: 3×3×3 with decorations
 * - Cleaning Depot: 2×2×2 simple structure
 */

export interface BuildingModelDefinition {
  id: string;
  type: 'house' | 'office' | 'store' | 'road' | 'park' | 'party_hall' | 'cleaning_depot';
  size: [number, number, number]; // width, height, depth in voxels
  voxels: Array<{
    x: number;
    y: number;
    z: number;
    color: string;
  }>;
}

// Helper to create house voxels
function createHouseVoxels(
  width: number,
  height: number,
  depth: number,
  wallColor: string,
  roofColor: string,
  windowColor: string,
  doorColor: string,
): Array<{ x: number; y: number; z: number; color: string }> {
  const voxels: Array<{ x: number; y: number; z: number; color: string }> = [];
  
  // Create walls
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        // Only create walls on edges
        if (x === 0 || x === width - 1 || z === 0 || z === depth - 1) {
          voxels.push({ x, y, z, color: wallColor });
        }
      }
    }
  }
  
  // Create roof
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      voxels.push({ x, y: height - 1, z, color: roofColor });
    }
  }
  
  // Add windows on front (z=0)
  for (let x = 1; x < width - 1; x += 2) {
    for (let y = 1; y < height - 2; y++) {
      // Replace wall with window
      const index = voxels.findIndex(v => v.x === x && v.y === y && v.z === 0);
      if (index !== -1) {
        voxels[index].color = windowColor;
      }
    }
  }
  
  // Add door on front
  if (width >= 3) {
    const doorX = Math.floor(width / 2);
    for (let y = 0; y < 2; y++) {
      const index = voxels.findIndex(v => v.x === doorX && v.y === y && v.z === 0);
      if (index !== -1) {
        voxels[index].color = doorColor;
      }
    }
  }
  
  return voxels;
}

// Helper to create office voxels
function createOfficeVoxels(
  width: number,
  height: number,
  depth: number,
  wallColor: string,
  windowColor: string,
): Array<{ x: number; y: number; z: number; color: string }> {
  const voxels: Array<{ x: number; y: number; z: number; color: string }> = [];
  
  // Create walls
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        // Only create walls on edges
        if (x === 0 || x === width - 1 || z === 0 || z === depth - 1) {
          voxels.push({ x, y, z, color: wallColor });
        }
      }
    }
  }
  
  // Add windows on all sides
  for (let y = 1; y < height - 1; y++) {
    // Front and back (z=0 and z=depth-1)
    for (let x = 1; x < width - 1; x += 2) {
      voxels.push({ x, y, z: 0, color: windowColor });
      voxels.push({ x, y, z: depth - 1, color: windowColor });
    }
    // Left and right (x=0 and x=width-1)
    for (let z = 1; z < depth - 1; z += 2) {
      voxels.push({ x: 0, y, z, color: windowColor });
      voxels.push({ x: width - 1, y, z, color: windowColor });
    }
  }
  
  return voxels;
}

// Helper to create store voxels
function createStoreVoxels(
  width: number,
  height: number,
  depth: number,
  wallColor: string,
  awningColor: string,
  windowColor: string,
): Array<{ x: number; y: number; z: number; color: string }> {
  const voxels: Array<{ x: number; y: number; z: number; color: string }> = [];
  
  // Create walls
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        // Only create walls on edges
        if (x === 0 || x === width - 1 || z === 0 || z === depth - 1) {
          voxels.push({ x, y, z, color: wallColor });
        }
      }
    }
  }
  
  // Add awning on front
  for (let x = 0; x < width; x++) {
    voxels.push({ x, y: height, z: 0, color: awningColor });
  }
  
  // Add windows on front
  for (let x = 1; x < width - 1; x++) {
    voxels.push({ x, y: 1, z: 0, color: windowColor });
  }
  
  return voxels;
}

// Helper to create park voxels
function createParkVoxels(
  width: number,
  depth: number,
  grassColor: string,
  treeTrunkColor: string,
  treeLeavesColor: string,
  benchColor: string,
  flowerColors: string[],
): Array<{ x: number; y: number; z: number; color: string }> {
  const voxels: Array<{ x: number; y: number; z: number; color: string }> = [];
  
  // Create grass base
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      voxels.push({ x, y: 0, z, color: grassColor });
    }
  }
  
  // Add a tree in the center
  const treeX = Math.floor(width / 2);
  const treeZ = Math.floor(depth / 2);
  
  // Tree trunk
  voxels.push({ x: treeX, y: 1, z: treeZ, color: treeTrunkColor });
  voxels.push({ x: treeX, y: 2, z: treeZ, color: treeTrunkColor });
  
  // Tree leaves
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      voxels.push({ x: treeX + dx, y: 3, z: treeZ + dz, color: treeLeavesColor });
    }
  }
  
  // Add a bench
  const benchX = treeX - 1;
  const benchZ = treeZ + 1;
  voxels.push({ x: benchX, y: 1, z: benchZ, color: benchColor });
  voxels.push({ x: benchX + 1, y: 1, z: benchZ, color: benchColor });
  
  // Add flowers
  const flowerPositions = [
    { x: 0, z: 0 },
    { x: width - 1, z: 0 },
    { x: 0, z: depth - 1 },
    { x: width - 1, z: depth - 1 },
  ];
  
  flowerPositions.forEach((pos, i) => {
    const color = flowerColors[i % flowerColors.length];
    voxels.push({ x: pos.x, y: 1, z: pos.z, color });
  });
  
  return voxels;
}

// Helper to create party hall voxels
function createPartyHallVoxels(
  width: number,
  height: number,
  depth: number,
  wallColor: string,
  buntingColor: string,
): Array<{ x: number; y: number; z: number; color: string }> {
  const voxels: Array<{ x: number; y: number; z: number; color: string }> = [];
  
  // Create walls
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        // Only create walls on edges
        if (x === 0 || x === width - 1 || z === 0 || z === depth - 1) {
          voxels.push({ x, y, z, color: wallColor });
        }
      }
    }
  }
  
  // Add bunting on top edges
  for (let x = 0; x < width; x++) {
    voxels.push({ x, y: height, z: 0, color: buntingColor });
    voxels.push({ x, y: height, z: depth - 1, color: buntingColor });
  }
  for (let z = 0; z < depth; z++) {
    voxels.push({ x: 0, y: height, z, color: buntingColor });
    voxels.push({ x: width - 1, y: height, z, color: buntingColor });
  }
  
  return voxels;
}

// Helper to create cleaning depot voxels
function createCleaningDepotVoxels(
  width: number,
  height: number,
  depth: number,
  stoneColor: string,
): Array<{ x: number; y: number; z: number; color: string }> {
  const voxels: Array<{ x: number; y: number; z: number; color: string }> = [];
  
  // Create simple stone structure
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        voxels.push({ x, y, z, color: stoneColor });
      }
    }
  }
  
  return voxels;
}

// House models (3 variants)
export const HOUSE_MODELS: BuildingModelDefinition[] = [
  {
    id: 'house_cottage',
    type: 'house',
    size: [3, 4, 3],
    voxels: createHouseVoxels(3, 4, 3, 'brick', 'roof', 'window', 'door'),
  },
  {
    id: 'house_two_storey',
    type: 'house',
    size: [4, 6, 4],
    voxels: createHouseVoxels(4, 6, 4, 'brick', 'roof', 'window', 'door'),
  },
  {
    id: 'house_row_house',
    type: 'house',
    size: [2, 5, 5],
    voxels: createHouseVoxels(2, 5, 5, 'brick', 'roof', 'window', 'door'),
  },
];

// Office models (2 variants)
export const OFFICE_MODELS: BuildingModelDefinition[] = [
  {
    id: 'office_small',
    type: 'office',
    size: [4, 5, 4],
    voxels: createOfficeVoxels(4, 5, 4, 'office', 'window'),
  },
  {
    id: 'office_tower',
    type: 'office',
    size: [3, 8, 3],
    voxels: createOfficeVoxels(3, 8, 3, 'office', 'window'),
  },
];

// Store models (2 variants)
export const STORE_MODELS: BuildingModelDefinition[] = [
  {
    id: 'store_corner_shop',
    type: 'store',
    size: [3, 3, 3],
    voxels: createStoreVoxels(3, 3, 3, 'store', 'awning', 'window'),
  },
  {
    id: 'store_market_stall',
    type: 'store',
    size: [2, 2, 2],
    voxels: createStoreVoxels(2, 2, 2, 'store', 'awning', 'window'),
  },
];

// Road tile (single flat tile)
export const ROAD_TILES: BuildingModelDefinition[] = [
  {
    id: 'road_tile',
    type: 'road',
    size: [1, 1, 1],
    voxels: [{ x: 0, y: 0, z: 0, color: 'road' }],
  },
];

// Park tile (3x3 with vegetation)
export const PARK_TILES: BuildingModelDefinition[] = [
  {
    id: 'park_basic',
    type: 'park',
    size: [3, 4, 3],
    voxels: createParkVoxels(3, 3, 'grass', 'tree-trunk', 'tree-leaves', 'bench', [
      'flower-pink',
      'flower-yellow',
      'flower-orange',
      'flower-pink',
    ]),
  },
];

// Party Hall
export const PARTY_HALLS: BuildingModelDefinition[] = [
  {
    id: 'party_hall',
    type: 'party_hall',
    size: [3, 3, 3],
    voxels: createPartyHallVoxels(3, 3, 3, 'store', 'bunting'),
  },
];

// Cleaning Depot
export const CLEANING_DEPOTS: BuildingModelDefinition[] = [
  {
    id: 'cleaning_depot',
    type: 'cleaning_depot',
    size: [2, 2, 2],
    voxels: createCleaningDepotVoxels(2, 2, 2, 'stone'),
  },
];

// Combined array of all building models
export const ALL_BUILDING_MODELS: BuildingModelDefinition[] = [
  ...HOUSE_MODELS,
  ...OFFICE_MODELS,
  ...STORE_MODELS,
  ...ROAD_TILES,
  ...PARK_TILES,
  ...PARTY_HALLS,
  ...CLEANING_DEPOTS,
];

// Helper to get a building model by ID
export function getBuildingModel(id: string): BuildingModelDefinition | undefined {
  return ALL_BUILDING_MODELS.find(model => model.id === id);
}