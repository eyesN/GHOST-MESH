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
        relative h-14 font-bold uppercase tracking-[0.15em] text-xs transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center overflow-hidden
        ${state === 'IDLE' ? 'w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/20 hover:shadow-xl hover:shadow-emerald-900/30 transform hover:-translate-y-0.5' : ''}
        ${state === 'LOADING' ? 'w-14 bg-slate-800 rounded-full cursor-wait shadow-inner border border-slate-700' : ''}
        ${state === 'SUCCESS' ? 'w-14 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30' : ''}
      `}
    >
      {/* Label Text */}
      <span className={`absolute transition-all duration-300 ${state === 'IDLE' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 translate-y-2'}`}>
        {label}
      </span>

      {/* Loading Spinner */}
      <div className={`absolute transition-all duration-500 ${state === 'LOADING' ? 'opacity-100 scale-100' : 'opacity-0 scale-50 rotate-180'}`}>
        <svg className="animate-spin h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      {/* Success Checkmark */}
      <div className={`absolute transition-all duration-500 ${state === 'SUCCESS' ? 'opacity-100 scale-100 roate-0' : 'opacity-0 scale-50 rotate-[-45deg]'}`}>
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </button>
  );
};