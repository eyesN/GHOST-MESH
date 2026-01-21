import React from 'react';

interface RadarScanProps {
  scanning: boolean;
  onScan: () => void;
  peerCount: number;
  frequency: string;
  onFrequencyChange: (newFreq: string) => void;
}

export const RadarScan: React.FC<RadarScanProps> = ({ scanning, onScan, peerCount, frequency, onFrequencyChange }) => {
  
  const adjustFrequency = (direction: 'UP' | 'DOWN') => {
      const current = parseFloat(frequency);
      // Standard Wi-Fi channel spacing is 0.005 GHz (5 MHz)
      const step = 0.005;
      const next = direction === 'UP' ? current + step : current - step;
      // Clamp reasonable range (e.g., 2.4GHz band)
      if (next < 2.400 || next > 2.500) return;
      
      onFrequencyChange(next.toFixed(3));
  };

  return (
    <div className="relative w-full h-48 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex items-center justify-center mb-4">
      {/* Grid Lines */}
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{
             backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)',
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

      {/* Controls */}
      <div className="absolute bottom-3 left-3 z-30 flex flex-col gap-1">
        <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded border border-slate-700 backdrop-blur-sm">
            <button 
                onClick={() => adjustFrequency('DOWN')}
                className="w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-emerald-500 text-[10px] rounded"
            >
                -
            </button>
            <span className="text-[10px] text-emerald-400 font-mono tracking-wider min-w-[70px] text-center">
             {frequency} GHz
            </span>
            <button 
                onClick={() => adjustFrequency('UP')}
                className="w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-emerald-500 text-[10px] rounded"
            >
                +
            </button>
        </div>
        
        <span className="text-[10px] text-emerald-600 font-mono tracking-wider ml-1">
          ACTIVE NODES: {peerCount}
        </span>
      </div>

      <button 
        onClick={onScan}
        disabled={scanning}
        className="absolute bottom-3 right-3 z-30 px-3 py-1 bg-emerald-900/50 hover:bg-emerald-800/50 border border-emerald-500/50 text-emerald-400 text-xs font-mono rounded transition-colors"
      >
        {scanning ? 'SCANNING...' : 'INIT_SCAN'}
      </button>
    </div>
  );
};