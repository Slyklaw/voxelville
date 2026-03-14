import { useState, useEffect, useRef } from 'react';
import { uiState } from './ui-state';

/**
 * HUD overlay showing population count and happiness meter.
 * Polls uiState every 100ms for updates.
 * Includes FPS counter.
 */
export function Hud() {
  const [population, setPopulation] = useState(0);
  const [happiness, setHappiness] = useState(0);
  const [fps, setFps] = useState(0);
  const frameTimes = useRef<number[]>([]);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setPopulation(uiState.population);
      setHappiness(uiState.happiness);
    }, 100);

    // FPS calculation - runs every frame via requestAnimationFrame
    let rafId: number;
    const measureFps = () => {
      const now = performance.now();
      const delta = now - lastTime.current;
      lastTime.current = now;

      frameTimes.current.push(delta);
      if (frameTimes.current.length > 60) {
        frameTimes.current.shift();
      }

      // Calculate average FPS from recent frame times
      const avg = frameTimes.current.reduce((a, b) => a + b, 0) / frameTimes.current.length;
      setFps(Math.round(1000 / avg));

      rafId = requestAnimationFrame(measureFps);
    };
    rafId = requestAnimationFrame(measureFps);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const happinessPercent = Math.round(happiness * 100);
  
  // Color coding based on happiness level
  const getBarColor = () => {
    if (happiness > 0.7) return 'bg-green-500';
    if (happiness > 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // FPS color coding
  const getFpsColor = () => {
    if (fps >= 50) return 'text-green-600';
    if (fps >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg w-48">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">FPS</span>
        <span className={`text-lg font-bold ${getFpsColor()}`}>{fps}</span>
      </div>

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
