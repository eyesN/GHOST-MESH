import React, { useState, useEffect, useRef } from 'react';
import { useMeshNetwork } from '../hooks/useMeshNetwork';
import { User, Message, MessageType } from '../types';
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

export const MeshInterface: React.FC<MeshInterfaceProps> = ({ currentUser: initialUser, onLogout }) => {
  // Use local state for user to reflect profile updates immediately
  const [currentUser, setCurrentUser] = useState(initialUser);
  
  // Frequency State
  const [frequency, setFrequency] = useState('2.412');

  const { messages, peers, broadcastMessage, scanForPeers } = useMeshNetwork(currentUser, frequency);
  
  // Navigation & State
  const [activeChatId, setActiveChatId] = useState<string | null>(null); 
  const [isLocatorOpen, setIsLocatorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  
  // Hotspot Feature
  const [isHotspotMode, setIsHotspotMode] = useState(false);
  
  // Inputs
  const [mainInput, setMainInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Settings Inputs
  const [editUsername, setEditUsername] = useState(currentUser.username);
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser.avatarUrl);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // If Hotspot is ON, force message type to HOTSPOT and ensure it behaves like a broadcast if desirable
        // But here we allow Hotspot messages in private chats too if the user really wants, 
        // though typically a Hotspot Broadcast is for the Broadcast channel.
        // Logic: If Hotspot Mode is active, message type is HOTSPOT.
        
        const type = isHotspotMode ? MessageType.HOTSPOT : MessageType.TEXT;
        const recipient = activeChatId === BROADCAST_ID ? undefined : activeChatId;
        
        broadcastMessage(mainInput, recipient, type);

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

  const toggleHotspot = () => {
      const newState = !isHotspotMode;
      setIsHotspotMode(newState);
      if (newState) {
          // Auto switch to broadcast channel when activating hotspot for ease of use
          setActiveChatId(BROADCAST_ID);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatarUrl(reader.result as string);
        setIsEditingProfile(true); // Enable save button
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
      setSettingsError('');
      if (editUsername.length < 3) {
          setSettingsError('Username too short');
          return;
      }

      const result = mockSql.updateUserProfile(currentUser.username, {
          username: editUsername,
          avatarUrl: editAvatarUrl
      });

      if ('error' in result) {
          setSettingsError(result.error);
      } else {
          setCurrentUser(result as User);
          mockSql.saveSession(result as User); // Update active session
          setIsEditingProfile(false);
      }
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

  const allContacts: User[] = ([
      ...mockSql.getKnownPeers(),
      ...Array.from(peers.values())
  ] as User[]).filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase()) && u.id !== currentUser.id);

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

  // Hotspot Overlay Style
  const hotspotGlow = isHotspotMode ? 'shadow-[inset_0_0_50px_rgba(245,158,11,0.1)] border-amber-500/20' : '';

  // ----------------------------------------------------------------------------------
  // VIEW: ACTIVE CHAT
  // ----------------------------------------------------------------------------------
  if (activeChatId) {
    return (
        <div className={`relative h-screen w-full bg-slate-900 text-slate-100 overflow-hidden flex flex-col font-sans transition-all duration-500 ${isHotspotMode ? 'border-4 border-amber-500/30' : ''}`}>
             
             {/* Hotspot Active Indicator Overlay */}
             {isHotspotMode && (
                 <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 animate-pulse z-50"></div>
             )}

             {/* Header */}
             <div className="flex items-center justify-between p-4 bg-slate-900/95 backdrop-blur-sm z-30 h-16 shrink-0 border-b border-slate-800/50">
                 <div className="flex items-center gap-3">
                     <div className={`w-3 h-3 rounded-full ${activeChatId === BROADCAST_ID ? (isHotspotMode ? 'bg-amber-500 animate-ping' : 'bg-emerald-500') : 'bg-blue-500'} `}></div>
                     <div className="flex flex-col">
                        <h2 className="text-lg font-bold text-white tracking-wide leading-none">{activePeerName}</h2>
                        <div className="flex gap-2">
                            {isHotspotMode && <span className="text-[9px] text-amber-500 font-bold tracking-widest mt-1">HOTSPOT BEACON</span>}
                            <span className="text-[9px] text-slate-500 font-mono mt-1">{frequency} GHz</span>
                        </div>
                     </div>
                 </div>
                 
                 <div className="flex items-center gap-3">
                     {/* Toggle Hotspot inside Chat too? Yes, for ease of access */}
                     <button
                        onClick={toggleHotspot}
                        className={`p-2 rounded-full transition-all ${isHotspotMode ? 'bg-amber-500/20 text-amber-500' : 'text-slate-500 hover:text-amber-500'}`}
                        title="Toggle Hotspot Beacon"
                     >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                        </svg>
                     </button>

                     <button 
                        onClick={() => setActiveChatId(null)}
                        className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center border border-slate-600 transition-colors"
                     >
                         <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                         </svg>
                     </button>
                 </div>
             </div>

             {/* Messages */}
             <div className={`flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4 ${hotspotGlow}`} ref={scrollRef}>
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
             <div className={`p-4 bg-slate-900 border-t ${isHotspotMode ? 'border-amber-500/30' : 'border-slate-800'} pl-4 relative z-20`}>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={mainInput}
                        onChange={(e) => setMainInput(e.target.value)}
                        placeholder={isHotspotMode ? "BROADCASTING TO HOTSPOT..." : `Message ${activePeerName}...`}
                        className={`flex-1 bg-slate-800 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 font-sans text-sm border border-transparent placeholder-slate-600 transition-all ${isHotspotMode ? 'focus:ring-amber-500 placeholder-amber-500/50' : 'focus:ring-emerald-500'}`}
                    />
                    <button type="submit" className={`p-3 rounded-lg shadow-lg transition-colors text-white ${isHotspotMode ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'}`}>
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
    <div className={`relative h-screen w-full bg-slate-900 text-slate-100 overflow-hidden flex flex-col font-sans transition-all duration-500 ${isHotspotMode ? 'border-x-4 border-amber-500/20' : ''}`}>
      
      {/* Hotspot Active Indicator Overlay */}
      {isHotspotMode && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 animate-pulse z-50"></div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900/90 backdrop-blur-sm z-30 h-16 shrink-0 border-b border-slate-800/50">
          <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tighter text-white">
                  GHOST <span className={isHotspotMode ? "text-amber-500 animate-pulse" : "text-emerald-500"}>MESH</span>
              </h1>
              <span className="text-[10px] bg-slate-800 border border-slate-700 px-1 rounded text-slate-400 font-mono">{frequency}</span>
          </div>

          <div className="flex items-center gap-3">
             {/* Hotspot Toggle Button */}
             <button
                onClick={toggleHotspot}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${isHotspotMode ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'}`}
             >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                {isHotspotMode && <span className="text-[10px] font-bold tracking-wider">ON</span>}
             </button>

             <button 
                onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsDeleteMode(false); setEditUsername(currentUser.username); setEditAvatarUrl(currentUser.avatarUrl); setIsEditingProfile(false); }}
                className="text-slate-400 hover:text-white transition-colors"
             >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
             </button>
          </div>
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">Active Channels</h2>
          
          {chatList.map(chat => (
              <button 
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`w-full bg-slate-800/50 hover:bg-slate-800 border ${isHotspotMode && chat.type === 'BROADCAST' ? 'border-amber-500/50 bg-amber-900/10' : 'border-slate-700/50 hover:border-emerald-500/30'} rounded-xl p-4 flex items-center gap-4 transition-all group`}
              >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                      ${chat.type === 'BROADCAST' ? (isHotspotMode ? 'bg-amber-500 text-slate-900 animate-pulse' : 'bg-emerald-900/50 text-emerald-400') : 
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
                      <div className={`text-sm font-bold transition-colors ${isHotspotMode && chat.type === 'BROADCAST' ? 'text-amber-500' : 'text-slate-200 group-hover:text-emerald-400'}`}>{chat.name}</div>
                      <div className="text-xs text-slate-500 font-mono">
                          {isHotspotMode && chat.type === 'BROADCAST' ? 'BEACON ACTIVE' : chat.preview}
                      </div>
                  </div>
                  
                  <div className={`${isHotspotMode && chat.type === 'BROADCAST' ? 'text-amber-500' : 'text-slate-600 group-hover:text-emerald-500'}`}>
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
                       {/* Profile Card & Editing */}
                       <div className="w-full max-w-sm bg-slate-800 rounded-3xl border border-slate-700 flex flex-col items-center justify-center p-6 gap-6 relative overflow-hidden shadow-2xl mb-8">
                            {/* Hidden File Input */}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleFileChange}
                            />

                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <img src={editAvatarUrl} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-900 shadow-xl z-10 object-cover" />
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                     <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                     </svg>
                                </div>
                                <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-slate-800 z-20 ${isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            </div>
                            
                            <div className="text-center z-10 w-full px-4">
                                <label className="text-xs text-slate-500 uppercase tracking-widest block mb-1">Display Name / ID</label>
                                <input 
                                    type="text" 
                                    value={editUsername} 
                                    onChange={(e) => { setEditUsername(e.target.value); setIsEditingProfile(true); }}
                                    className="bg-slate-900/50 border border-slate-600 rounded text-center text-white font-mono font-bold py-2 w-full focus:outline-none focus:border-emerald-500"
                                />
                                <p className="text-emerald-500 text-xs tracking-widest mt-2">ID: {currentUser.id.substring(0,8)}</p>
                            </div>

                            {settingsError && <p className="text-red-400 text-xs font-bold">{settingsError}</p>}

                            {isEditingProfile && (
                                <button 
                                    onClick={handleSaveProfile}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-sm shadow-lg"
                                >
                                    Save Profile Changes
                                </button>
                            )}
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
                      <RadarScan 
                          scanning={true} 
                          onScan={scanForPeers} 
                          peerCount={allContacts.length} 
                          frequency={frequency}
                          onFrequencyChange={setFrequency}
                      />
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
                         <div className="text-slate-600 text-center py-4 text-xs italic">No contacts found in proximity on {frequency} GHz</div>
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