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
  onLogout: () => void;
}

export const MeshInterface: React.FC<MeshInterfaceProps> = ({ currentUser, onLogout }) => {
  const { messages, peers, broadcastMessage, scanForPeers } = useMeshNetwork(currentUser);
  
  // Navigation & State
  const [activeChatId, setActiveChatId] = useState<string | null>(null); 
  const [isLocatorOpen, setIsLocatorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false); // Sub-mode in settings
  
  // Inputs
  const [mainInput, setMainInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Delete Account Inputs
  const [delUsername, setDelUsername] = useState('');
  const [delPassword, setDelPassword] = useState('');
  const [delError, setDelError] = useState('');

  // Status
  const [status, setStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load Self Messages if active chat is SELF
  const [selfMessages, setSelfMessages] = useState<any[]>([]);

  useEffect(() => {
      if (activeChatId === SELF_ID) {
          setSelfMessages(mockSql.getSelfMessages());
      }
  }, [activeChatId]); 

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
    if (!activeChatId) return;

    if (activeChatId === SELF_ID) {
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

  const handleDeleteAccount = (e: React.FormEvent) => {
      e.preventDefault();
      setDelError('');
      const result = mockSql.deleteUser(delUsername, delPassword);
      if (typeof result === 'object' && 'error' in result) {
          setDelError(result.error);
      } else {
          onLogout();
      }
  };

  const isHealthy = status === 'ONLINE';

  // Combine Mock Peers and Real Peers for Contacts List logic
  const allContacts: User[] = [
      ...mockSql.getKnownPeers(),
      ...Array.from(peers.values())
  ].filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase()) && u.id !== currentUser.id);

  // Filter Messages for Active Chat
  const displayedMessages = activeChatId === SELF_ID 
      ? selfMessages 
      : activeChatId 
        ? messages.filter(m => {
          if (activeChatId === BROADCAST_ID) return !m.recipientId; 
          return (m.senderId === currentUser.id && m.recipientId === activeChatId) || 
                 (m.senderId === activeChatId && m.recipientId === currentUser.id);
        })
        : [];

  const activePeerName = activeChatId === BROADCAST_ID 
      ? 'BROADCAST' 
      : activeChatId === SELF_ID 
        ? 'Personal Safe' 
        : allContacts.find(c => c.id === activeChatId)?.username || 'Unknown Node';

  // Derived Active Conversations for the "Interactive Page" List
  // 1. Broadcast (Always)
  // 2. Self (Always)
  // 3. Any peer we have history with in `messages`
  const activeConversationIds = new Set<string>();
  messages.forEach(m => {
      if (m.recipientId && m.senderId === currentUser.id) activeConversationIds.add(m.recipientId);
      if (m.recipientId === currentUser.id) activeConversationIds.add(m.senderId);
  });

  const chatList = [
      { id: BROADCAST_ID, name: 'Broadcast Channel', type: 'BROADCAST', preview: 'Public Frequency' },
      { id: SELF_ID, name: 'Personal Safe', type: 'SELF', preview: 'Encrypted Notes' },
      ...Array.from(activeConversationIds).map(id => {
          const peer = allContacts.find(c => c.id === id);
          return {
              id,
              name: peer?.username || 'Unknown Signal',
              type: 'PRIVATE',
              preview: 'Encrypted Channel'
          };
      })
  ];

  // ----------------------------------------------------------------------------------
  // VIEW: ACTIVE CHAT
  // ----------------------------------------------------------------------------------
  if (activeChatId) {
    return (
        <div className="relative h-screen w-full bg-slate-900 text-slate-100 overflow-hidden flex flex-col font-sans">
             {/* Header */}
             <div className="flex items-center justify-between p-4 bg-slate-900/95 backdrop-blur-sm z-30 h-16 shrink-0 border-b border-slate-800/50">
                 <div className="flex items-center gap-3">
                     <div className={`w-3 h-3 rounded-full ${activeChatId === BROADCAST_ID ? 'bg-emerald-500' : 'bg-blue-500'} animate-pulse`}></div>
                     <h2 className="text-lg font-bold text-white tracking-wide">{activePeerName}</h2>
                 </div>
                 
                 {/* Close Button Bubble */}
                 <button 
                    onClick={() => setActiveChatId(null)}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center border border-slate-600 transition-colors"
                 >
                     <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                 </button>
             </div>

             {/* Messages */}
             <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4" ref={scrollRef}>
                {displayedMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-30">
                        <div className="w-24 h-24 rounded-full border border-slate-700 flex items-center justify-center mb-4">
                            <div className="w-16 h-16 rounded-full border border-slate-700/50"></div>
                        </div>
                        <p className="text-xs font-mono">BEGIN TRANSMISSION</p>
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

             {/* Input */}
             <div className="p-4 bg-slate-900 border-t border-slate-800 pl-4 relative z-20">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={mainInput}
                        onChange={(e) => setMainInput(e.target.value)}
                        placeholder={`Message ${activePeerName}...`}
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
    );
  }

  // ----------------------------------------------------------------------------------
  // VIEW: CHAT LIST (INTERACTIVE PAGE)
  // ----------------------------------------------------------------------------------
  return (
    <div className="relative h-screen w-full bg-slate-900 text-slate-100 overflow-hidden flex flex-col font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900/90 backdrop-blur-sm z-30 h-16 shrink-0 border-b border-slate-800/50">
          <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tighter text-white">
                  GHOST <span className="text-emerald-500">MESH</span>
              </h1>
          </div>

          <button 
            onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsDeleteMode(false); }}
            className="text-slate-400 hover:text-white transition-colors"
          >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
          </button>
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">Active Channels</h2>
          
          {chatList.map(chat => (
              <button 
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/30 rounded-xl p-4 flex items-center gap-4 transition-all group"
              >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                      ${chat.type === 'BROADCAST' ? 'bg-emerald-900/50 text-emerald-400' : 
                        chat.type === 'SELF' ? 'bg-indigo-900/50 text-indigo-400' : 
                        'bg-slate-700 text-slate-300'}`}
                  >
                      {chat.type === 'BROADCAST' && (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      )}
                      {chat.type === 'SELF' && (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      )}
                      {chat.type === 'PRIVATE' && (
                          <span className="font-bold font-mono">{chat.name.substring(0,2).toUpperCase()}</span>
                      )}
                  </div>
                  
                  <div className="flex-1 text-left">
                      <div className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{chat.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{chat.preview}</div>
                  </div>
                  
                  <div className="text-slate-600 group-hover:text-emerald-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
              </button>
          ))}
          
          <div className="mt-8 p-4 rounded-lg border border-dashed border-slate-700 text-center">
              <p className="text-xs text-slate-500 mb-2">Initialize new connection via Locator</p>
              <div className="w-2 h-2 bg-emerald-500 rounded-full mx-auto animate-ping"></div>
          </div>
      </div>

      {/* Hex Button (Locator) - Only visible in List View */}
      <div className="absolute bottom-6 left-6 z-30">
          <HexButton 
            onClick={() => setIsLocatorOpen(!isLocatorOpen)} 
            active={isLocatorOpen} 
          />
      </div>

      {/* SETTINGS OVERLAY */}
      {isSettingsOpen && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl z-50 flex flex-col items-center pt-20 px-6 animate-in fade-in duration-200">
               <button onClick={() => setIsSettingsOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white">
                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
               </button>
               
               <h2 className="text-xl font-bold text-white mb-8 tracking-widest font-mono">NODE CONFIGURATION</h2>
               
               {!isDeleteMode ? (
                   <>
                       {/* Profile Card */}
                       <div className="w-full max-w-sm bg-slate-800 rounded-3xl border border-slate-700 flex flex-col items-center justify-center p-8 gap-6 relative overflow-hidden shadow-2xl mb-8">
                            <div className="relative">
                                <img src={currentUser.avatarUrl} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-900 shadow-xl z-10" />
                                <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-slate-800 z-20 ${isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            </div>
                            
                            <div className="text-center z-10">
                                <h3 className="text-2xl font-bold text-white font-mono">{currentUser.username}</h3>
                                <p className="text-emerald-500 text-xs tracking-widest mt-1">ID: {currentUser.id.substring(0,8)}</p>
                            </div>
                       </div>

                       {/* Action Buttons */}
                       <div className="w-full max-w-sm space-y-4">
                           <button 
                               onClick={onLogout}
                               className="w-full py-4 bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 text-red-400 font-bold tracking-wider rounded-lg transition-colors uppercase text-sm"
                           >
                               Log Out
                           </button>
                           
                           <button 
                               onClick={() => setIsDeleteMode(true)}
                               className="w-full py-4 text-slate-500 hover:text-red-400 text-xs tracking-widest uppercase transition-colors"
                           >
                               Delete Account
                           </button>
                       </div>
                   </>
               ) : (
                   /* Delete Account Mode */
                   <div className="w-full max-w-sm bg-slate-800/90 border border-red-900/50 rounded-2xl p-6">
                        <h3 className="text-red-500 font-bold uppercase tracking-wider mb-4 text-center">Delete Account</h3>
                        <p className="text-slate-400 text-xs text-center mb-6">Enter credentials to permanently purge this node from the database.</p>
                        
                        <form onSubmit={handleDeleteAccount} className="space-y-4">
                            <input 
                                type="text"
                                value={delUsername}
                                onChange={(e) => setDelUsername(e.target.value)} 
                                placeholder="Username"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-red-500 focus:outline-none"
                            />
                            <input 
                                type="password"
                                value={delPassword}
                                onChange={(e) => setDelPassword(e.target.value)} 
                                placeholder="Password"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-red-500 focus:outline-none"
                            />
                            
                            {delError && <p className="text-red-400 text-xs text-center font-bold">{delError}</p>}

                            <div className="flex gap-2 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setIsDeleteMode(false)}
                                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold"
                                >
                                    Confirm Delete
                                </button>
                            </div>
                        </form>
                   </div>
               )}
          </div>
      )}

      {/* LOCATOR OVERLAY */}
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
                      <RadarScan scanning={true} onScan={scanForPeers} peerCount={allContacts.length} />
                 </div>
             </div>

             {/* Contacts List */}
             <div className="flex-1 overflow-y-auto px-6 pb-24">
                 <h3 className="text-slate-400 text-sm font-medium mb-4 ml-1">contacts</h3>
                 
                 <div className="space-y-3">
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
                     {allContacts.length === 0 && (
                         <div className="text-slate-600 text-center py-4 text-xs italic">No contacts found in proximity</div>
                     )}
                 </div>
             </div>

             {/* Close Button Only - No Input here as input is in Chat View */}
             <div className="absolute bottom-6 left-6 z-50">
                  {/* Reuse Hex Button to toggle OFF locator */}
                  <HexButton 
                    onClick={() => setIsLocatorOpen(false)} 
                    active={true} 
                  />
             </div>
        </div>
      )}

    </div>
  );
};