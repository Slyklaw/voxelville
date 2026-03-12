/**
 * Shared mutable state between React UI components and simulation loop.
 * 
 * The simulation writes to population/happiness via updateStats().
 * The UI reads from uiState via polling (100ms) to avoid coupling
 * the React render loop with the Three.js render loop.
 */

// Shared mutable state object
export const uiState = {
  // Play/Work slider value (0-1, 0 = more play, 1 = more work)
  sliderValue: 0.5,
  
  // Build priority multipliers (0.7 - 1.3 range)
  buildPriority: {
    office: 1.0,
    store: 1.0,
    park: 1.0,
    partyhall: 1.0,
  },
  
  // Population count (written by simulation)
  population: 0,
  
  // Happiness (0-1, written by simulation)
  happiness: 0,
  
  /**
   * Update slider value and recalculate build priorities.
   * Called by Slider component when user drags.
   */
  setSliderValue(value: number): void {
    this.sliderValue = Math.max(0, Math.min(1, value));
    
    // Recalculate build priorities based on slider position
    // Slider: 0 = more play, 1 = more work
    // Play bonus = 1 - sliderValue
    // Work bonus = sliderValue
    // office/store = 0.7 + (0.6 * workBonus)
    // park/partyhall = 0.7 + (0.6 * playBonus)
    const playBonus = 1 - this.sliderValue;
    const workBonus = this.sliderValue;
    
    // Work buildings
    this.buildPriority.office = 0.7 + (0.6 * workBonus);
    this.buildPriority.store = 0.7 + (0.6 * workBonus);
    
    // Play buildings
    this.buildPriority.park = 0.7 + (0.6 * playBonus);
    this.buildPriority.partyhall = 0.7 + (0.6 * playBonus);
  },
  
  /**
   * Update population and happiness stats.
   * Called by simulation loop every 4 ticks (1 second).
   */
  updateStats(population: number, happiness: number): void {
    this.population = population;
    this.happiness = Math.max(0, Math.min(1, happiness));
  },
};
