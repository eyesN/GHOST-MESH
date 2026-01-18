import React, { useState, useEffect, useRef } from 'react';
import { useMeshNetwork } from '../hooks/useMeshNetwork';
import { User, Message, MessageType } from '../types';
import { MessageBubble } from './MessageBubble';
import { HexButton } from './HexButton';
import { generateSmartReply } from '../services/geminiService';
import { mockSql } from '../utils/db';

const AI_BOT_ID = 'GEMINI_AI_SECURE_BOT';

interface MeshInterfaceProps {
  currentUser: User;
}

export const MeshInterface: React.FC<MeshInterfaceProps> = ({ currentUser }) => {
  const { messages, peers, broadcastMessage } = useMeshNetwork(currentUser);
  
  // Views: 'HOME' (Broadcast), 'SETTINGS', 'SELF_CHAT'
  const [currentView, setCurrentView] = useState<'HOME' | 'SETTINGS' | 'SELF_CHAT'>('HOME');
  
  const [input, setInput] = useState('');
  const [selfInput, setSelfInput] = useState('');
  const [selfMessages, setSelfMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selfScrollRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');

  // Load Self Messages
  useEffect(() => {
      setSelfMessages(mockSql.getSelfMessages());
  }, [currentView]);

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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (selfScrollRef.current) {
        selfScrollRef.current.scrollTop = selfScrollRef.current.scrollHeight;
    }
  }, [messages, selfMessages, currentView]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    broadcastMessage(input);
    
    // Check for AI trigger in broadcast for fun, or just keep standard
    if (input.toLowerCase().includes("@gemini")) {
         const reply = await generateSmartReply(
            messages.map(m => m.content), 
            input
        );
        setTimeout(() => {
             broadcastMessage(`[AI ASSIST]: ${reply}`);
        }, 1500);
    }
    
    setInput('');
  };

  const handleSelfMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selfInput.trim()) return;
      const msg = mockSql.saveSelfMessage(selfInput);
      setSelfMessages(prev => [...prev, msg]);
      setSelfInput('');
  };

  const isHealthy = status === 'ONLINE';

  // Inject Mock Peers into peer list display if needed, 
  // but for the Home Chat we focus on the message stream.
  // The prompt asked to add them to SQL, effectively they are "contacts".
  // We can show them in a "Contacts" modal, but for now let's focus on the requirements:
  // 1. Chat in Home Interface
  // 2. Settings button top right
  // 3. Self Chat via Hex Button

  return (
    <div className="relative h-screen w-full bg-slate-900 text-slate-100 overflow-hidden flex flex-col font-sans">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 z-50 h-16 shrink-0">
          <div>
              <h1 className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
                  GHOST<span className="text-emerald-500">MESH</span>
                  {currentView === 'SELF_CHAT' && <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-emerald-400">SELF_LINK</span>}
                  {currentView === 'HOME' && <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">BROADCAST</span>}
              </h1>
          </div>

          <button 
            onClick={() => setCurrentView(currentView === 'SETTINGS' ? 'HOME' : 'SETTINGS')}
            className={`p-2 rounded-full transition-colors ${currentView === 'SETTINGS' ? 'bg-emerald-500/20 text-emerald-500' : 'text-slate-400 hover:text-white'}`}
          >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
          </button>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
          
          {/* HOME CHAT VIEW */}
          {currentView === 'HOME' && (
              <>
                 <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-4" ref={scrollRef}>
                    {/* Background Radar Effect - subtle behind chat */}
                    <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-5">
                         <div className="w-64 h-64 border-2 border-emerald-500 rounded-full"></div>
                         <div className="absolute w-48 h-48 border border-emerald-500 rounded-full"></div>
                    </div>

                    <div className="text-center py-4 relative z-10">
                        <div className="inline-block px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700 text-[10px] text-slate-400 font-mono">
                             BROADCAST CHANNEL • {messages.length} MESSAGES
                        </div>
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
                 
                 <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 pl-24">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Broadcast message..."
                            className="flex-1 bg-slate-800 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-sm"
                        />
                        <button type="submit" className="bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-500">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                 </div>
              </>
          )}

          {/* SELF CHAT VIEW */}
          {currentView === 'SELF_CHAT' && (
              <>
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-4 bg-slate-950" ref={selfScrollRef}>
                    <div className="text-center py-4">
                        <div className="inline-block px-3 py-1 bg-indigo-900/30 rounded-full border border-indigo-500/30 text-[10px] text-indigo-400 font-mono">
                             PERSONAL SAFE • OBJECT STORAGE
                        </div>
                    </div>
                    {selfMessages.map((msg) => (
                         <div key={msg.id} className="flex flex-col items-end mb-4">
                            <div className="max-w-[80%] bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-lg text-sm">
                                {msg.content}
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                         </div>
                    ))}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 pl-24">
                    <form onSubmit={handleSelfMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={selfInput}
                            onChange={(e) => setSelfInput(e.target.value)}
                            placeholder="Save to self..."
                            className="flex-1 bg-slate-800 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-sm"
                        />
                        <button type="submit" className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-500">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </button>
                    </form>
                 </div>
              </>
          )}

          {/* SETTINGS VIEW */}
          {currentView === 'SETTINGS' && (
              <div className="absolute inset-0 bg-slate-900 z-40 flex flex-col items-center justify-start pt-12 px-6">
                   <h2 className="text-2xl font-bold text-white mb-8 tracking-widest">CONFIGURATION</h2>
                   
                   {/* Profile Button - Large */}
                   <button className="w-full max-w-sm aspect-square bg-slate-800 rounded-3xl border-2 border-slate-700 hover:border-emerald-500 transition-all flex flex-col items-center justify-center gap-6 group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative">
                            <img src={currentUser.avatarUrl} alt="Profile" className="w-32 h-32 rounded-full border-4 border-slate-900 shadow-2xl z-10" />
                            <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-slate-800 z-20 ${isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        </div>
                        
                        <div className="text-center z-10">
                            <h3 className="text-2xl font-bold text-white font-mono">{currentUser.username}</h3>
                            <p className="text-emerald-500 text-xs tracking-widest mt-1">ID: {currentUser.id.substring(0,8)}</p>
                        </div>

                        <div className="mt-4 px-4 py-1 bg-slate-900/50 rounded-full border border-slate-700 backdrop-blur-sm">
                             <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                                <span className="text-[10px] font-bold text-slate-300 uppercase">
                                    {isHealthy ? 'System Optimal' : 'System Offline'}
                                </span>
                             </div>
                        </div>
                   </button>

                   {/* Mock Peer List from SQL */}
                   <div className="mt-8 w-full max-w-sm">
                       <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Known Nodes (SQL)</h3>
                       <div className="space-y-2">
                           {mockSql.getKnownPeers().map(peer => (
                               <div key={peer.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                   <img src={peer.avatarUrl} className="w-8 h-8 rounded-full" />
                                   <div>
                                       <div className="text-sm font-medium text-slate-200">{peer.username}</div>
                                       <div className="text-[10px] text-slate-500">{peer.publicKey}</div>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
              </div>
          )}

      </div>

      {/* HEX BUTTON (Self Chat Toggle) */}
      <div className="absolute bottom-6 left-6 z-50">
          <HexButton 
            onClick={() => setCurrentView(currentView === 'SELF_CHAT' ? 'HOME' : 'SELF_CHAT')} 
            active={currentView === 'SELF_CHAT'} 
          />
      </div>

    </div>
  );
};