import React, { useState, useEffect, useRef } from 'react';
import { useMeshNetwork } from '../hooks/useMeshNetwork';
import { User, Message } from '../types';
import { MessageBubble } from './MessageBubble';
import { HexButton } from './HexButton';
import { RadarScan } from './RadarScan';
import { generateSmartReply } from '../services/geminiService';
import { mockSql } from '../utils/db';

const BROADCAST_ID = 'BROADCAST';
const SELF_ID = 'SELF_SAFE';

interface MeshInterfaceProps {
  currentUser: User;
}

export const MeshInterface: React.FC<MeshInterfaceProps> = ({ currentUser }) => {
  const { messages, peers, broadcastMessage, scanForPeers } = useMeshNetwork(currentUser);
  
  // Navigation & State
  const [activeChatId, setActiveChatId] = useState<string>(BROADCAST_ID);
  const [isLocatorOpen, setIsLocatorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Inputs
  const [mainInput, setMainInput] = useState('');
  const [selfNoteInput, setSelfNoteInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Status
  const [status, setStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load Self Messages if active chat is SELF
  const [selfMessages, setSelfMessages] = useState<any[]>([]);

  useEffect(() => {
      if (activeChatId === SELF_ID) {
          setSelfMessages(mockSql.getSelfMessages());
      }
  }, [activeChatId, isLocatorOpen]); // Reload when locator opens (save action)

  // Network Status
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
  }, [messages, activeChatId, selfMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainInput.trim()) return;

    if (activeChatId === SELF_ID) {
        // Fallback if they are in self view and type in main box
        const msg = mockSql.saveSelfMessage(mainInput);
        setSelfMessages(prev => [...prev, msg]);
    } else {
        const recipient = activeChatId === BROADCAST_ID ? undefined : activeChatId;
        broadcastMessage(mainInput, recipient);

        // AI Mock Trigger for Broadcast
        if (activeChatId === BROADCAST_ID && mainInput.toLowerCase().includes("@gemini")) {
            const reply = await generateSmartReply(
                messages.filter(m => !m.recipientId).map(m => m.content), 
                mainInput
            );
            setTimeout(() => {
                broadcastMessage(`[AI ASSIST]: ${reply}`);
            }, 1500);
        }
    }
    setMainInput('');
  };

  const handleSaveToSelf = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selfNoteInput.trim()) return;
      mockSql.saveSelfMessage(selfNoteInput);
      setSelfNoteInput('');
      // Optional: Give feedback or stay in locator
  };

  const isHealthy = status === 'ONLINE';

  // Combine Mock Peers and Real Peers for Contacts List
  const allContacts = [
      { id: SELF_ID, username: 'Personal Safe', avatarUrl: currentUser.avatarUrl, publicKey: 'LOCAL_STORAGE' }, // Special contact
      ...mockSql.getKnownPeers(),
      ...Array.from(peers.values())
  ].filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

  // Filter Messages for Current View
  const displayedMessages = activeChatId === SELF_ID 
      ? selfMessages 
      : messages.filter(m => {
          if (activeChatId === BROADCAST_ID) return !m.recipientId; // Show broadcast only
          // Private: Show if (Sender is Me AND Recipient is Them) OR (Sender is Them AND Recipient is Me)
          return (m.senderId === currentUser.id && m.recipientId === activeChatId) || 
                 (m.senderId === activeChatId && m.recipientId === currentUser.id);
      });

  const activePeerName = activeChatId === BROADCAST_ID 
      ? 'BROADCAST' 
      : activeChatId === SELF_ID 
        ? 'SELF_LINK' 
        : allContacts.find(c => c.id === activeChatId)?.username || 'Unknown Node';

  return (
    <div className="relative h-screen w-full bg-slate-900 text-slate-100 overflow-hidden flex flex-col font-sans">
      
      {/* 1. TOP HEADER (Screenshot 2 Style) */}
      <div className="flex items-center justify-between p-4 bg-slate-900/90 backdrop-blur-sm z-30 h-16 shrink-0 border-b border-slate-800/50">
          <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tighter text-white">
                  GHOST <span className="text-emerald-500">MESH</span>
              </h1>
              <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-400 font-mono uppercase">
                  {activePeerName}
              </span>
          </div>

          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="text-slate-400 hover:text-white transition-colors"
          >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
          </button>
      </div>

      {/* 2. MAIN CHAT AREA (Screenshot 2 Style) */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4" ref={scrollRef}>
             {displayedMessages.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full opacity-30">
                     <div className="w-32 h-32 rounded-full border border-slate-700 flex items-center justify-center mb-4">
                        <div className="w-24 h-24 rounded-full border border-slate-700/50"></div>
                     </div>
                     <p className="text-xs font-mono">ENCRYPTED CHANNEL EMPTY</p>
                 </div>
             )}
             
             {activeChatId === BROADCAST_ID && displayedMessages.length > 0 && (
                <div className="flex justify-center mb-6 sticky top-0 z-10">
                     <div className="bg-slate-800/80 backdrop-blur border border-slate-700 text-slate-400 text-[10px] px-3 py-1 rounded-full font-mono uppercase">
                         Broadcast Channel • {displayedMessages.length} Messages
                     </div>
                </div>
             )}

             {displayedMessages.map((msg) => (
                <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    isCurrentUser={msg.senderId === currentUser.id || msg.senderId === 'SELF'}
                    senderName={allContacts.find(c => c.id === msg.senderId)?.username} 
                />
            ))}
          </div>
          
          {/* Main Input Area */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 pl-24 relative z-20">
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                    type="text"
                    value={mainInput}
                    onChange={(e) => setMainInput(e.target.value)}
                    placeholder={activeChatId === BROADCAST_ID ? "Broadcast message..." : `Message ${activePeerName}...`}
                    className="flex-1 bg-slate-800 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-sm border border-transparent placeholder-slate-600"
                />
                <button type="submit" className="bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-500 shadow-lg shadow-emerald-900/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>
          </div>
      </div>

      {/* 3. SETTINGS OVERLAY */}
      {isSettingsOpen && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl z-50 flex flex-col items-center pt-20 px-6 animate-in fade-in duration-200">
               <button onClick={() => setIsSettingsOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white">
                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
               </button>
               
               <h2 className="text-xl font-bold text-white mb-8 tracking-widest font-mono">NODE CONFIGURATION</h2>
               
               {/* Profile Button Card */}
               <div className="w-full max-w-sm aspect-square bg-slate-800 rounded-3xl border border-slate-700 flex flex-col items-center justify-center gap-6 relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 to-transparent"></div>
                    
                    <div className="relative">
                        <img src={currentUser.avatarUrl} alt="Profile" className="w-32 h-32 rounded-full border-4 border-slate-900 shadow-xl z-10" />
                        <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-slate-800 z-20 ${isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </div>
                    
                    <div className="text-center z-10">
                        <h3 className="text-2xl font-bold text-white font-mono">{currentUser.username}</h3>
                        <p className="text-emerald-500 text-xs tracking-widest mt-1">ID: {currentUser.id.substring(0,8)}</p>
                    </div>

                    <div className="px-4 py-1.5 bg-slate-900/80 rounded-full border border-slate-700 backdrop-blur-sm">
                         <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                {isHealthy ? 'System Optimal' : 'System Offline'}
                            </span>
                         </div>
                    </div>
               </div>
          </div>
      )}

      {/* 4. LOCATOR OVERLAY (Screenshot 3 Style) */}
      {isLocatorOpen && (
        <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col animate-in slide-in-from-bottom duration-300">
             {/* Top Search */}
             <div className="p-6 pt-8 pb-2">
                 <div className="relative">
                    <input 
                        type="text" 
                        placeholder="search here" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border-2 border-slate-700 rounded-full px-4 py-3 text-center text-slate-200 focus:border-emerald-500 focus:outline-none placeholder-slate-500 font-mono text-sm"
                    />
                    <svg className="absolute right-4 top-3.5 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                 </div>
                 
                 <div className="flex items-center justify-center my-4">
                     <span className="text-slate-600 text-xs font-bold uppercase tracking-widest">OR</span>
                 </div>
             </div>

             {/* Radar Box */}
             <div className="px-6 mb-6">
                 <div className="w-full h-40 border-2 border-slate-600 rounded-lg bg-slate-900 relative overflow-hidden flex items-center justify-center">
                      <RadarScan scanning={true} onScan={scanForPeers} peerCount={allContacts.length - 3} /> {/* -3 for mock/self offset approximation */}
                 </div>
             </div>

             {/* Contacts List */}
             <div className="flex-1 overflow-y-auto px-6 pb-24">
                 <h3 className="text-slate-400 text-sm font-medium mb-4 ml-1">contacts</h3>
                 
                 <div className="space-y-3">
                     {/* Broadcast Option */}
                     <button 
                         onClick={() => { setActiveChatId(BROADCAST_ID); setIsLocatorOpen(false); }}
                         className="w-full flex items-center gap-4 group"
                     >
                         <div className="w-2 h-0 border-l-4 border-transparent group-hover:border-emerald-500 h-8 transition-all"></div>
                         <div className="text-lg text-slate-300 group-hover:text-emerald-400 font-medium">Broadcast Channel</div>
                     </button>

                     {allContacts.map(contact => (
                         <button 
                            key={contact.id}
                            onClick={() => { setActiveChatId(contact.id); setIsLocatorOpen(false); }}
                            className="w-full flex items-center gap-4 group"
                         >
                             <div className="w-2 h-0 border-l-4 border-transparent group-hover:border-emerald-500 h-8 transition-all"></div>
                             <div className="text-lg text-slate-300 group-hover:text-emerald-400 font-medium">{contact.username}</div>
                         </button>
                     ))}
                 </div>
             </div>

             {/* Bottom Save-To-Self Bar */}
             <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 flex gap-2 items-center">
                 {/* Close Button (Green Square X) */}
                 <button 
                    onClick={() => setIsLocatorOpen(false)}
                    className="w-12 h-12 bg-emerald-500 rounded flex items-center justify-center hover:bg-emerald-400 transition-colors shadow-lg"
                 >
                     <svg className="w-6 h-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                 </button>

                 {/* Input */}
                 <form onSubmit={handleSaveToSelf} className="flex-1 flex gap-2">
                    <input 
                        type="text" 
                        value={selfNoteInput}
                        onChange={(e) => setSelfNoteInput(e.target.value)}
                        placeholder="Save to self" 
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                    />
                    
                    {/* Save Button (Purple/Indigo) */}
                    <button type="submit" className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center hover:bg-indigo-500 transition-colors shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </button>
                 </form>
             </div>
        </div>
      )}

      {/* 5. HEX BUTTON (Bottom Left) - Toggles Locator */}
      <div className="absolute bottom-6 left-6 z-30">
          <HexButton 
            onClick={() => setIsLocatorOpen(!isLocatorOpen)} 
            active={isLocatorOpen} 
          />
      </div>

    </div>
  );
};