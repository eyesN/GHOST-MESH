import React from 'react';

interface RadarScanProps {
  scanning: boolean;
  onScan: () => void;
  peerCount: number;
  isDarkMode: boolean;
}

export const RadarScan: React.FC<RadarScanProps> = ({ scanning, onScan, peerCount, isDarkMode }) => {
  
  // Theme-based colors
  const borderColor = isDarkMode ? 'border-slate-700' : 'border-slate-300';
  const bgColor = isDarkMode ? 'bg-slate-900' : 'bg-white/50 backdrop-blur';
  const gridColor = isDarkMode ? '#10b981' : '#059669';

  return (
    <div className={`relative w-full h-48 ${bgColor} rounded-lg border ${borderColor} overflow-hidden flex items-center justify-center mb-4 transition-colors duration-300`}>
      {/* Grid Lines */}
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{
             backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
             backgroundSize: '20px 20px'
           }}>
      </div>

      {/* Radar Sweep */}
      {scanning && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="w-40 h-40 border-2 border-emerald-500/30 rounded-full relative animate-pulse-slow">
                <div className="absolute top-1/2 left-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent to-emerald-500 origin-left animate-radar opacity-50"></div>
            </div>
        </div>
      )}

      {/* Center Point */}
      <div className="absolute z-20 w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>

      {/* Controls / Info */}
      <div className="absolute bottom-3 left-3 z-30 flex flex-col gap-1">
        <span className={`text-[10px] ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600 font-bold'} font-mono tracking-wider ml-1`}>
          ACTIVE NODES: {peerCount}
        </span>
      </div>

      <button 
        onClick={onScan}
        disabled={scanning}
        className={`absolute bottom-3 right-3 z-30 px-3 py-1 text-xs font-mono rounded transition-colors border ${
            isDarkMode 
            ? 'bg-emerald-900/50 hover:bg-emerald-800/50 border-emerald-500/50 text-emerald-400' 
            : 'bg-white/80 hover:bg-emerald-50 border-emerald-500 text-emerald-600 font-bold shadow-sm'
        }`}
      >
        {scanning ? 'SCANNING...' : 'INIT_SCAN'}
      </button>
    </div>
  );
};