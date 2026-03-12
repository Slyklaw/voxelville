import { useState, useEffect } from 'react';
import { uiState } from './ui-state';

/**
 * HUD overlay showing population count and happiness meter.
 * Polls uiState every 100ms for updates.
 */
export function Hud() {
  const [population, setPopulation] = useState(0);
  const [happiness, setHappiness] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPopulation(uiState.population);
      setHappiness(uiState.happiness);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const happinessPercent = Math.round(happiness * 100);
  
  // Color coding based on happiness level
  const getBarColor = () => {
    if (happiness > 0.7) return 'bg-green-500';
    if (happiness > 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg w-48">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">Population</span>
        <span className="text-lg font-bold text-gray-800">{population}</span>
      </div>
      
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">Happiness</span>
        <span className="text-sm font-bold text-gray-800">{happinessPercent}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${getBarColor()} transition-all duration-300`}
          style={{ width: `${happinessPercent}%` }}
        ></div>
      </div>
    </div>
  );
}
