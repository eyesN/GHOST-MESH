import React, { useState, useEffect } from 'react';
import { User } from './types';
import { MeshInterface } from './components/MeshInterface';
import { mockSql } from './utils/db';
import { AnimatedAuthButton } from './components/AnimatedAuthButton';

type AppState = 'SPLASH' | 'AUTH' | 'MESH';
type AuthMode = 'SIGN_IN' | 'SIGN_UP';

export default function App() {
  const [appState, setAppState] = useState<AppState>('SPLASH');
  const [authMode, setAuthMode] = useState<AuthMode>('SIGN_IN');
  const [user, setUser] = useState<User | null>(null);
  
  // Auth Inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check for existing session
    const storedUser = mockSql.getSession();
    if (storedUser) {
        setUser(storedUser);
    }
  }, []);

  const handleAuthAction = async () => {
    setError('');
    
    // Simulate network delay for the animation
    await new Promise(r => setTimeout(r, 500));

    if (username.length < 3) {
        setError("Username too short.");
        throw new Error();
    }
    if (password.length < 3) {
        setError("Password too weak.");
        throw new Error();
    }

    let result;
    if (authMode === 'SIGN_UP') {
        result = mockSql.registerUser(username, password);
    } else {
        result = mockSql.loginUser(username, password);
    }

    if ('error' in result) {
        setError(result.error);
        throw new Error(result.error);
    } else {
        mockSql.saveSession(result as User);
        setUser(result as User);
        setTimeout(() => setAppState('MESH'), 500); // Wait for success animation
    }
  };

  const handleSplashNav = (mode: AuthMode) => {
      setAuthMode(mode);
      setAppState('AUTH');
      setError('');
      setUsername('');
      setPassword('');
  };

  if (appState === 'SPLASH') {
    return (
        <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-8 overflow-hidden relative font-sans">
            {/* Background Grid */}
            <div className="absolute inset-0 z-0 opacity-20" style={{
                backgroundImage: 'linear-gradient(rgba(16,185,129,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }}></div>
            
            <div className="z-10 text-center mb-16 relative">
                {/* Dashed Border Box Simulation */}
                <div className="absolute -inset-8 border-2 border-dashed border-indigo-500/30 rounded-lg animate-pulse-slow"></div>
                
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl rotate-45 mb-10 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                    <div className="w-20 h-20 bg-slate-900 -rotate-45 flex items-center justify-center">
                         <span className="text-4xl font-bold text-white">G</span>
                    </div>
                </div>
                <h1 className="text-4xl font-bold text-white tracking-widest mb-3 font-mono">GHOSTMESH</h1>
                <p className="text-emerald-500/80 text-xs tracking-[0.6em] uppercase">Decentralized Protocol</p>
            </div>

            <div className="z-10 w-full max-w-xs space-y-4">
                <button 
                    onClick={() => handleSplashNav('SIGN_IN')}
                    className="w-full py-4 border-2 border-emerald-500 text-emerald-400 font-bold tracking-wider rounded-lg hover:bg-emerald-500/10 transition-colors uppercase text-sm"
                >
                    Sign In
                </button>
                <button 
                    onClick={() => handleSplashNav('SIGN_UP')}
                    className="w-full py-4 bg-emerald-600 text-white font-bold tracking-wider rounded-lg hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all transform hover:-translate-y-1 uppercase text-sm"
                >
                    Sign Up
                </button>
            </div>
        </div>
    );
  }

  if (appState === 'AUTH') {
      return (
        <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
             {/* Matrix-like background effect */}
             <div className="absolute inset-0 opacity-5 pointer-events-none text-emerald-500 overflow-hidden text-[10px] leading-3 font-mono break-all">
                {Array(2000).fill(0).map(() => Math.random() > 0.5 ? '1' : '0').join('')}
             </div>

             <div className="absolute top-8 left-8">
                 <button onClick={() => setAppState('SPLASH')} className="text-slate-500 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                 </button>
             </div>

            <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl shadow-2xl z-10 relative overflow-hidden">
                {/* Decorative Dashed Line Top */}
                <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

                <div className="text-center mb-8">
                     <h2 className="text-2xl font-bold text-white mb-2 font-mono">Identity Configuration</h2>
                     <p className="text-slate-400 text-xs uppercase tracking-wider">
                         {authMode === 'SIGN_UP' ? 'Establish your unique node signature.' : 'Authenticate Access to Mesh Node.'}
                     </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">
                            Enter Credentials <span className="opacity-50 font-normal normal-case ml-2">(Must be written in bold)</span>
                        </label>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-600 text-white px-4 py-4 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all text-center text-lg font-bold tracking-wide placeholder-slate-700"
                            placeholder="USERNAME"
                        />
                    </div>

                    <div>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-600 text-white px-4 py-4 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all text-center text-lg font-bold tracking-wide placeholder-slate-700"
                            placeholder={authMode === 'SIGN_UP' ? "CREATE PASSWORD" : "PASSWORD"}
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-xs text-center font-bold animate-pulse">
                            Error: {error}
                        </div>
                    )}

                    <div className="pt-2">
                        <AnimatedAuthButton 
                            onClick={handleAuthAction} 
                            label={authMode === 'SIGN_UP' ? "INITIALIZE NODE" : "AUTHENTICATE"} 
                        />
                    </div>

                    <div className="text-center">
                        <button 
                            onClick={() => setAuthMode(authMode === 'SIGN_UP' ? 'SIGN_IN' : 'SIGN_UP')}
                            className="text-slate-500 text-xs hover:text-white underline decoration-slate-600 underline-offset-4"
                        >
                            {authMode === 'SIGN_UP' ? "Already have a node? Sign In" : "Need a node? Sign Up"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return (
      <MeshInterface currentUser={user!} />
  );
}