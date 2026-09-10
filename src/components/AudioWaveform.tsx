import React, { useEffect, useState } from 'react';

interface AudioWaveformProps {
  isActive: boolean;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ isActive }) => {
  const [bars, setBars] = useState<number[]>([20, 40, 60, 40, 20]);

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setBars(Array.from({ length: 5 }, () => Math.floor(Math.random() * 80) + 10));
      }, 100);
    } else {
      setBars([20, 20, 20, 20, 20]);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex items-center justify-center space-x-1 h-12">
      {bars.map((height, i) => (
        <div
          key={i}
          className={`w-2 rounded-full bg-amber-200 transition-all duration-100 ease-in-out ${isActive ? 'shadow-[0_0_10px_#fde68a]' : 'opacity-50'}`}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
};
