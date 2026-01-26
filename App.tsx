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
            setAppState('MESH');
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

    const handleLogout = () => {
        mockSql.clearSession();
        setUser(null);
        setAppState('SPLASH');
    };

    if (appState === 'SPLASH') {
        return (
            <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-8 overflow-hidden relative font-sans">
                {/* Elegant Background */}
                <div className="absolute inset-0 z-0 bg-slate-900 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05)_0%,transparent_50%)]"></div>

                <div className="z-10 text-center mb-12 relative animate-in fade-in zoom-in duration-700">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl rotate-45 mb-10 flex items-center justify-center shadow-2xl shadow-emerald-500/20 group transition-all duration-500 hover:rotate-[225deg]">
                        <div className="w-16 h-16 bg-slate-900 rounded-xl -rotate-45 flex items-center justify-center group-hover:rotate-[-225deg] transition-all duration-500">
                            <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-emerald-200">G</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-[0.2em] mb-3 font-mono">GHOST<span className="text-emerald-500">MESH</span></h1>
                    <p className="text-slate-400 text-xs tracking-[0.4em] uppercase opacity-60">Decentralized Protocol</p>
                </div>

                <div className="z-10 w-full max-w-xs space-y-4 animate-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-backwards">
                    <button
                        onClick={() => handleSplashNav('SIGN_IN')}
                        className="w-full py-4 border border-slate-700 text-slate-300 font-bold tracking-widest rounded-xl hover:bg-slate-800 hover:border-emerald-500/30 hover:text-white transition-all duration-300 uppercase text-xs"
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => handleSplashNav('SIGN_UP')}
                        className="w-full py-4 bg-emerald-600 text-white font-bold tracking-widest rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all duration-300 transform hover:-translate-y-0.5 uppercase text-xs"
                    >
                        Create Node
                    </button>
                </div>

                <div className="absolute bottom-8 text-slate-600 text-[10px] tracking-widest uppercase opacity-40">
                    Secure • Private • Distributed
                </div>
            </div>
        );
    }

    if (appState === 'AUTH') {
        return (
            <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">

                {/* Subtle background mesh */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
                </div>

                <div className="absolute top-8 left-8 z-20">
                    <button onClick={() => setAppState('SPLASH')} className="text-slate-500 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest transition-colors duration-300 group">
                        <div className="p-2 rounded-full border border-slate-700 group-hover:border-slate-500 transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </div>
                        <span>Return</span>
                    </button>
                </div>

                <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-slate-800/50 p-10 rounded-3xl shadow-2xl z-10 relative animate-in zoom-in-95 duration-500">

                    <div className="text-center mb-10">
                        <div className="inline-block p-3 rounded-full bg-slate-800/50 mb-4 border border-slate-700/50">
                            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={authMode === 'SIGN_UP' ? "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" : "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"} />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2 tracking-wide">{authMode === 'SIGN_UP' ? 'Initialize Node' : 'Authenticate'}</h2>
                        <p className="text-slate-500 text-xs uppercase tracking-widest">
                            {authMode === 'SIGN_UP' ? 'Create your secure identity' : 'Access your encrypted text store'}
                        </p>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Identity</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-800 text-white px-5 py-4 rounded-xl focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all duration-300 text-center font-medium placeholder-slate-700 tracking-wide"
                                placeholder="USERNAME"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Keyphrase</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-800 text-white px-5 py-4 rounded-xl focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all duration-300 text-center font-medium placeholder-slate-700 tracking-wide"
                                placeholder="PASSWORD"
                            />
                        </div>

                        {error && (
                            <div className="text-red-400 bg-red-950/20 border border-red-900/30 p-3 rounded-lg text-xs text-center font-bold animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        <div className="pt-4">
                            <AnimatedAuthButton
                                onClick={handleAuthAction}
                                label={authMode === 'SIGN_UP' ? "ESTABLISH NODE" : "ENTER MESH"}
                            />
                        </div>

                        <div className="text-center pt-2">
                            <button
                                onClick={() => { setAuthMode(authMode === 'SIGN_UP' ? 'SIGN_IN' : 'SIGN_UP'); setError(''); }}
                                className="text-slate-500 text-xs hover:text-emerald-400 transition-colors tracking-wide py-2"
                            >
                                {authMode === 'SIGN_UP' ? "Existing node? Sign In" : "New user? Create Signal"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Ensure user exists before rendering MeshInterface
    if (appState === 'MESH' && user) {
        return (
            <MeshInterface currentUser={user} onLogout={handleLogout} />
        );
    }

    return null;
}