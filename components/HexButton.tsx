import React from 'react';

interface HexButtonProps {
  onClick: () => void;
  active: boolean;
}

// Renamed internally to reflect new "Bubble/Square" design, though file name persists for now
export const HexButton: React.FC<HexButtonProps> = ({ onClick, active }) => {
  return (
    <button 
      onClick={onClick}
      className={`
        group relative w-14 h-14 flex items-center justify-center 
        transition-all duration-300 ease-out
        border-2 
        ${active 
          ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] rounded-2xl' 
          : 'bg-slate-800/80 backdrop-blur-sm border-slate-600 hover:border-emerald-500/50 hover:bg-slate-700 rounded-xl'
        }
      `}
      aria-label="Toggle Mesh Search"
    >
      {/* Icon */}
      <div className={`transition-colors duration-300 ${active ? 'text-slate-900' : 'text-emerald-500'}`}>
        {active ? (
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        ) : (
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        )}
      </div>
    </button>
  );
};