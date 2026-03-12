import { useState, useCallback } from 'react';
import { uiState } from './ui-state';

interface SliderProps {
  initialValue?: number;
}

/**
 * Play/Work slider component.
 * Positioned at bottom-center of screen.
 * Updates uiState.sliderValue on change (immediate UI feedback).
 */
export function Slider({ initialValue = 0.5 }: SliderProps) {
  const [value, setValue] = useState(initialValue);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(event.target.value);
    setValue(newValue);
    uiState.setSliderValue(newValue);
  }, []);

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg w-64">
      <div className="flex justify-between mb-2 text-sm font-medium text-gray-700">
        <span>More Play</span>
        <span>More Work</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={handleChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}
