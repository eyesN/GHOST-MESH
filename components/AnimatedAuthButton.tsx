import React, { useState } from 'react';

interface AnimatedAuthButtonProps {
  onClick: () => Promise<void>;
  label: string;
}

export const AnimatedAuthButton: React.FC<AnimatedAuthButtonProps> = ({ onClick, label }) => {
  const [state, setState] = useState<'IDLE' | 'LOADING' | 'SUCCESS'>('IDLE');

  const handleClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state !== 'IDLE') return;

    setState('LOADING');
    
    // Simulate min loading time for effect + actual action
    const minLoad = new Promise(resolve => setTimeout(resolve, 800));
    const action = onClick();

    try {
        await Promise.all([minLoad, action]);
        setState('SUCCESS');
    } catch (e) {
        setState('IDLE'); // Reset on error
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={state !== 'IDLE'}
      className={`
        relative h-14 font-bold uppercase tracking-wider text-sm transition-all duration-500 ease-in-out flex items-center justify-center overflow-hidden
        ${state === 'IDLE' ? 'w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.4)]' : ''}
        ${state === 'LOADING' ? 'w-14 bg-blue-600 rounded-full cursor-wait' : ''}
        ${state === 'SUCCESS' ? 'w-14 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.6)]' : ''}
      `}
    >
      {/* Label Text */}
      <span className={`absolute transition-all duration-300 ${state === 'IDLE' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
        {label}
      </span>

      {/* Loading Spinner */}
      <div className={`absolute transition-all duration-300 ${state === 'LOADING' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
         <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
         </svg>
      </div>

      {/* Success Checkmark */}
      <div className={`absolute transition-all duration-300 ${state === 'SUCCESS' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </button>
  );
};