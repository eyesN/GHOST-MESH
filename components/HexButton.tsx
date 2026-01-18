import React from 'react';

interface HexButtonProps {
  onClick: () => void;
  active: boolean;
}

export const HexButton: React.FC<HexButtonProps> = ({ onClick, active }) => {
  return (
    <button 
      onClick={onClick}
      className="group relative w-16 h-16 focus:outline-none"
      aria-label="Toggle Mesh Search"
    >
      {/* Hexagon Shape CSS */}
      <div className={`
        absolute inset-0 clip-hex transition-all duration-300 
        ${active 
            ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)] scale-110' 
            : 'bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-emerald-500/50'
        }
      `}>
         {/* Inner decoration */}
         {!active && <div className="absolute inset-0.5 clip-hex bg-slate-900/90 z-0"></div>}
      </div>

      {/* Icon */}
      <div className={`relative z-10 flex items-center justify-center w-full h-full transition-colors duration-300 ${active ? 'text-slate-900' : 'text-emerald-500'}`}>
        {active ? (
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        ) : (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        )}
      </div>

      <style>{`
        .clip-hex {
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }
      `}</style>
    </button>
  );
};