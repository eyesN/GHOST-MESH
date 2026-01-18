import React, { useState, useEffect } from 'react';

interface SwipeStartProps {
  onUnlock: () => void;
}

export const SwipeStart: React.FC<SwipeStartProps> = ({ onUnlock }) => {
  const [value, setValue] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setValue(val);
    if (val >= 98) {
      onUnlock();
    }
  };

  const handleEnd = () => {
    if (value < 98) {
      setValue(0); // Snap back if not completed
    }
  };

  return (
    <div className="w-full max-w-xs mx-auto relative h-14 bg-slate-800/50 rounded-full border border-slate-700 backdrop-blur-sm overflow-hidden group">
      <div 
        className="absolute inset-y-0 left-0 bg-emerald-500/20 transition-all duration-75"
        style={{ width: `${value}%` }}
      />
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`text-xs font-mono uppercase tracking-[0.2em] transition-opacity duration-300 ${value > 20 ? 'opacity-0' : 'text-slate-400 opacity-70 group-hover:opacity-100'}`}>
          Swipe to Initialize
        </span>
        <div 
            className="absolute left-0 transition-opacity duration-300"
            style={{ 
                opacity: 1 - (value/50),
                transform: `translateX(${value * 3}px)`
            }}
        >
             <svg className="w-5 h-5 text-emerald-500 animate-pulse ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
             </svg>
        </div>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={handleChange}
        onTouchEnd={handleEnd}
        onMouseUp={handleEnd}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      
      {/* Thumb visual simulated */}
      <div 
        className="absolute top-1 left-1 bottom-1 w-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)] pointer-events-none transition-all duration-75"
        style={{ left: `calc(${value}% - ${value > 90 ? 48 : 0}px + 4px)` }}
      >
        <svg className="w-6 h-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
    </div>
  );
};