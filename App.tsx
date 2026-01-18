import React, { useState, useEffect } from 'react';
import { User } from './types';
import { SwipeStart } from './components/SwipeStart';
import { MeshInterface } from './components/MeshInterface';
import { mockSql } from './utils/db';

type AppState = 'SPLASH' | 'LOGIN' | 'MESH';

export default function App() {
  const [appState, setAppState] = useState<AppState>('SPLASH');
  const [user, setUser] = useState<User | null>(null);
  
  // Login State
  const [usernameInput, setUsernameInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check for existing session
    const storedUser = mockSql.getUser();
    if (storedUser) {
        setUser(storedUser);
        // If user exists, we can skip login, but we still show splash for effect
        // or jump straight to splash -> mesh.
    }
  }, []);

  const handleSplashUnlock = () => {
    if (user) {
        setAppState('MESH');
    } else {
        setAppState('LOGIN');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const u = usernameInput;
    
    // VALIDATION RULES
    // 1. Min 4 letters
    if (u.length < 4) {
        setError("Username must be at least 4 characters.");
        return;
    }
    
    // 2. Cannot start or end with special character (Alphanumeric start/end)
    const startEndRegex = /^[a-zA-Z0-9].*[a-zA-Z0-9]$/;
    // 3. To be "safe", generally allow alphanumeric + underscore in middle, but prompt says "type any username" with start/end constraints.
    // We will strict check start and end.
    
    if (!startEndRegex.test(u)) {
        setError("Cannot start or end with a special character.");
        return;
    }

    // Create User
    const newUser: User = {
        id: crypto.randomUUID(),
        username: u,
        publicKey: crypto.randomUUID().substring(0, 16),
        avatarUrl: `https://ui-avatars.com/api/?name=${u}&background=10b981&color=fff`
    };

    if (mockSql.saveUser(newUser)) {
        setUser(newUser);
        setAppState('MESH');
    } else {
        setError("Database Error: Could not save identity.");
    }
  };

  if (appState === 'SPLASH') {
    return (
        <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-between p-8 overflow-hidden relative">
            <div className="absolute inset-0 z-0">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-900 to-slate-900"></div>
                 <div className="w-full h-full opacity-10" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, #10b981 25%, #10b981 26%, transparent 27%, transparent 74%, #10b981 75%, #10b981 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #10b981 25%, #10b981 26%, transparent 27%, transparent 74%, #10b981 75%, #10b981 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}></div>
            </div>
            
            <div className="z-10 mt-32 text-center animate-pulse-slow">
                <div className="w-20 h-20 mx-auto bg-emerald-500 rounded-2xl rotate-45 mb-8 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                    <div className="w-16 h-16 bg-slate-900 -rotate-45 flex items-center justify-center">
                         <span className="text-3xl font-bold text-white">G</span>
                    </div>
                </div>
                <h1 className="text-4xl font-bold text-white tracking-widest mb-2 font-mono">GHOSTMESH</h1>
                <p className="text-emerald-500/80 text-xs tracking-[0.5em] uppercase">Decentralized Protocol</p>
            </div>

            <div className="z-10 w-full mb-12">
                <SwipeStart onUnlock={handleSplashUnlock} />
            </div>
        </div>
    );
  }

  if (appState === 'LOGIN') {
      return (
        <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
             {/* Matrix-like background effect */}
             <div className="absolute inset-0 opacity-5 pointer-events-none text-emerald-500 overflow-hidden text-[10px] leading-3 font-mono break-all">
                {Array(2000).fill(0).map(() => Math.random() > 0.5 ? '1' : '0').join('')}
             </div>

            <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-lg border border-slate-700 p-8 rounded-2xl shadow-2xl z-10">
                <div className="text-center mb-8">
                     <h2 className="text-2xl font-bold text-white mb-2">Identity Configuration</h2>
                     <p className="text-slate-400 text-sm">Establish your unique node signature.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-mono text-emerald-500 uppercase tracking-wider mb-2">Username</label>
                        <input 
                            type="text" 
                            value={usernameInput}
                            onChange={(e) => setUsernameInput(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all text-center text-lg font-mono tracking-wide placeholder-slate-600"
                            placeholder="ENTER_ID"
                        />
                        <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
                            <span>Min 4 characters</span>
                            <span>No special start/end</span>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-xs text-center flex items-center justify-center gap-2">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all transform hover:-translate-y-1 uppercase tracking-wider text-sm"
                    >
                        Initialize Node
                    </button>
                </form>
            </div>
        </div>
      );
  }

  return (
      <MeshInterface currentUser={user!} />
  );
}