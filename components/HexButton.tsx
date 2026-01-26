import React from 'react';

interface HexButtonProps {
  onClick: () => void;
  active: boolean;
}

export const HexButton: React.FC<HexButtonProps> = ({ onClick, active }) => {
  return (
    <button
      onClick={onClick}
      className={`
        group relative w-14 h-14 flex items-center justify-center 
        transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${active
          ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 rounded-[20px] rotate-0 scale-110'
          : 'bg-white/10 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white hover:bg-white/20 hover:scale-105 shadow-lg rounded-2xl rotate-0'
        }
      `}
      aria-label="Toggle Mesh Search"
    >
      {/* Icon */}
      <div className={`transition-all duration-500 ${active ? 'rotate-0' : 'rotate-0'}`}>
        {active ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
      </div>
    </button>
  );
};