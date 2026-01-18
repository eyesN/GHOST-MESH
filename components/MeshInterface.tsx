import React, { useState, useEffect, useRef } from 'react';
import { useMeshNetwork } from '../hooks/useMeshNetwork';
import { User, Message, MessageType } from '../types';
import { RadarScan } from './RadarScan';
import { MessageBubble } from './MessageBubble';
import { HexButton } from './HexButton';
import { generateSmartReply } from '../services/geminiService';

const AI_BOT_ID = 'GEMINI_AI_SECURE_BOT';

interface MeshInterfaceProps {
  currentUser: User;
}

export const MeshInterface: React.FC<MeshInterfaceProps> = ({ currentUser }) => {
  const { messages, peers, broadcastMessage, scanForPeers } = useMeshNetwork(currentUser);
  
  // 'STANDBY' is the Home Page. 'ACTIVE' is the Chat/Search Overlay.
  const [viewMode, setViewMode] = useState<'STANDBY' | 'ACTIVE'>('STANDBY');
  
  const [input, setInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedPeerId, setSelectedPeerId] = useState<string>('BROADCAST');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');

  // Network status check
  useEffect(() => {
    const updateStatus = () => setStatus(navigator.onLine ? 'ONLINE' : 'OFFLINE');
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
        window.removeEventListener('online', updateStatus);
        window.removeEventListener('offline', updateStatus);
    };
  }, []);

  // Auto scroll
  useEffect(() => {
    if (viewMode === 'ACTIVE' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, viewMode]);

  const handleToggleMode = () => {
    if (viewMode === 'STANDBY') {
        setViewMode('ACTIVE');
        setIsScanning(true);
        scanForPeers();
        setTimeout(() => setIsScanning(false), 3000);
    } else {
        setViewMode('STANDBY');
    }
  };

  const handleScan = () => {
    setIsScanning(true);
    scanForPeers();
    setTimeout(() => setIsScanning(false), 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (selectedPeerId === AI_BOT_ID) {
        broadcastMessage(input); 
        setInput('');
        const reply = await generateSmartReply(
            messages.filter(m => m.senderId === currentUser.id || m.senderId === AI_BOT_ID).map(m => m.content), 
            input
        );
        setTimeout(() => {
             broadcastMessage(`[AI ASSIST]: ${reply}`);
        }, 1500);
    } else {
        broadcastMessage(input);
        setInput('');
    }
  };

  const activePeers = Array.from(peers.values()) as User[];
  const filteredPeers = activePeers.filter(p => 
      p.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const isHealthy = status === 'ONLINE';

  return (
    <div className="relative h-screen w-full bg-slate-900 text-slate-100 overflow-hidden flex flex-col font-sans">
      
      {/* 2. Top Header - Always visible */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-start pointer-events-none">
          <div className="pointer-events-auto">
              <h1 className="text-2xl font-bold tracking-tighter text-white">
                  GHOST<span className="text-emerald-500">MESH</span>
              </h1>
              <div className="text-[10px] text-slate-500 font-mono tracking-widest mt-1">
                  SECURE P2P PROTOCOL
              </div>
          </div>

          <div className="flex flex-col items-end pointer-events-auto">
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur border border-slate-700 rounded-full px-3 py-1">
                  <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></span>
                  <span className={`text-xs font-bold ${isHealthy ? 'text-emerald-500' : 'text-red-500'}`}>
                      {isHealthy ? 'SYSTEM OPTIMAL' : 'OFFLINE'}
                  </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1 text-right">
                  NODE: {currentUser.username}
              </div>
          </div>
      </div>

      {/* HOME PAGE VIEW (STANDBY) */}
      <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-500 ${viewMode === 'ACTIVE' ? 'opacity-10 scale-95 blur-sm' : 'opacity-100 scale-100'}`}>
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 z-0 opacity-20" style={{
             backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }}></div>
          
          <div className="z-10 text-center space-y-4">
              <div className="w-32 h-32 mx-auto rounded-full border border-emerald-500/30 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-t border-emerald-500 animate-spin opacity-50"></div>
                  <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                        <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                        </svg>
                  </div>
              </div>
              <h2 className="text-slate-400 font-mono text-sm tracking-widest">AWAITING COMMAND</h2>
          </div>
      </div>

      {/* ACTIVE MODE OVERLAY (Chat + Search) */}
      <div className={`
        absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md transition-transform duration-500 ease-in-out flex flex-col md:flex-row
        ${viewMode === 'ACTIVE' ? 'translate-y-0' : 'translate-y-full'}
      `}>
          {/* Sidebar / Search Area */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/50 flex flex-col pt-20 md:pt-20">
             <div className="p-4">
                 <h3 className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-3">Area Scan</h3>
                 <RadarScan scanning={isScanning} onScan={handleScan} peerCount={activePeers.length} />
                 
                 <div className="mt-4 space-y-2">
                     <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Target Search</h3>
                     <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search Username..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none text-slate-200 pl-9"
                        />
                        <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                     </div>
                 </div>

                 <div className="mt-4 flex-1 overflow-y-auto max-h-[40vh] md:max-h-[50vh]">
                     <button 
                        onClick={() => setSelectedPeerId('BROADCAST')}
                        className={`w-full text-left px-3 py-3 mb-2 rounded-lg flex items-center gap-3 transition-colors ${selectedPeerId === 'BROADCAST' ? 'bg-emerald-900/20 border border-emerald-500/30' : 'hover:bg-slate-800'}`}
                    >
                        <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                             <span className="font-bold text-xs">ALL</span>
                        </div>
                        <div className="text-sm font-medium">Broadcast Channel</div>
                     </button>

                     <button 
                        onClick={() => setSelectedPeerId(AI_BOT_ID)}
                        className={`w-full text-left px-3 py-3 mb-2 rounded-lg flex items-center gap-3 transition-colors ${selectedPeerId === AI_BOT_ID ? 'bg-indigo-900/20 border border-indigo-500/30' : 'hover:bg-slate-800'}`}
                    >
                        <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-500">
                             <span className="font-bold text-xs">AI</span>
                        </div>
                        <div className="text-sm font-medium">Gemini NetSec</div>
                     </button>
                     
                     {filteredPeers.map(p => (
                         <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded cursor-pointer">
                             <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                             <span className="text-sm text-slate-300">{p.username}</span>
                         </div>
                     ))}
                 </div>
             </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col pt-4 md:pt-20">
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2" ref={scrollRef}>
                    <div className="text-center py-4">
                        <span className="text-xs font-mono text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
                            {selectedPeerId === 'BROADCAST' ? 'SECURE BROADCAST LINK ESTABLISHED' : 'ENCRYPTED DIRECT LINK'}
                        </span>
                    </div>
                   {messages.map((msg) => (
                        <MessageBubble 
                            key={msg.id} 
                            message={msg} 
                            isCurrentUser={msg.senderId === currentUser.id}
                            senderName={peers.get(msg.senderId)?.username} 
                        />
                    ))}
              </div>
              
              <div className="p-4 bg-slate-900/80 border-t border-slate-800">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Encrypted payload..."
                        className="flex-1 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                    />
                    <button type="submit" className="bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
              </div>
          </div>
      </div>

      {/* 2. Bottom Left Hex Button - Opens Search/Chat */}
      <div className="absolute bottom-6 left-6 z-50">
          <HexButton onClick={handleToggleMode} active={viewMode === 'ACTIVE'} />
      </div>

    </div>
  );
};