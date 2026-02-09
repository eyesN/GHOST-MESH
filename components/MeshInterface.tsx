import React, { useState, useEffect, useRef } from 'react';
import { useMeshNetwork } from '../hooks/useMeshNetwork';
import { User, Message, MessageType } from '../types';
import { MessageBubble } from './MessageBubble';
import { HexButton } from './HexButton';
import { RadarScan } from './RadarScan';
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

    // Settings & Theme
    const [isDarkMode, setIsDarkMode] = useState(true);

    const { messages, peers, broadcastMessage, scanForPeers } = useMeshNetwork(currentUser);

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
            const type = isHotspotMode ? MessageType.HOTSPOT : MessageType.TEXT;
            const recipient = activeChatId === BROADCAST_ID ? undefined : activeChatId;

            broadcastMessage(mainInput, recipient, type);

        }
        setMainInput('');
    };

    const toggleHotspot = () => {
        const newState = !isHotspotMode;
        setIsHotspotMode(newState);
        if (newState) {
            setActiveChatId(BROADCAST_ID);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditAvatarUrl(reader.result as string);
                setIsEditingProfile(true);
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
            mockSql.saveSession(result as User);
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

    // --- Dynamic Theme Classes ---
    // Root Background
    const rootClasses = isDarkMode
        ? 'bg-slate-900 text-slate-100'
        : 'bg-slate-50 text-slate-900';

    // Headers (Translucent)
    const headerClasses = isDarkMode
        ? 'bg-slate-900/80 border-slate-800/50 backdrop-blur-xl'
        : 'bg-white/80 border-slate-200/50 backdrop-blur-xl';

    // Text Colors
    const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
    const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    const textAccent = isDarkMode ? 'text-emerald-400' : 'text-emerald-600';

    // Interactive Elements
    const inputBg = isDarkMode ? 'bg-slate-800/50 border-transparent placeholder-slate-500 hover:bg-slate-800 transition-colors' : 'bg-white border-slate-200 placeholder-slate-400 shadow-sm hover:border-slate-300 transition-colors';
    const buttonSecondary = isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 shadow-sm';

    // List Items
    const listItemBase = isDarkMode
        ? 'bg-slate-800/30 hover:bg-slate-800 border-slate-800/50'
        : 'bg-white hover:bg-slate-50 border-slate-100 shadow-sm hover:shadow-md';

    // Overlays
    const overlayBg = isDarkMode ? 'bg-slate-900/95' : 'bg-white/95';
    const cardBg = isDarkMode ? 'bg-slate-800 border-slate-700 shadow-2xl' : 'bg-white border-slate-200 shadow-2xl';

    const hotspotGlow = isHotspotMode
        ? (isDarkMode ? 'shadow-[inset_0_0_100px_rgba(245,158,11,0.05)]' : 'shadow-[inset_0_0_100px_rgba(245,158,11,0.05)]')
        : '';

    // ----------------------------------------------------------------------------------
    // VIEW: ACTIVE CHAT
    // ----------------------------------------------------------------------------------
    if (activeChatId) {
        return (
            <div className={`relative h-screen w-full overflow-hidden flex flex-col font-sans transition-all duration-700 ${rootClasses}`}>

                {/* Hotspot Active Indicator (Subtle) */}
                {isHotspotMode && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500 animate-pulse z-50"></div>
                )}

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 z-30 shrink-0 border-b transition-colors duration-500 ${headerClasses}`}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setActiveChatId(null)}
                            className={`p-2 -ml-2 rounded-full transition-all duration-300 md:hidden block ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-opacity-10 
                        ${activeChatId === BROADCAST_ID
                                ? (isHotspotMode ? 'bg-amber-100 text-amber-600 ring-amber-500' : 'bg-emerald-100 text-emerald-600 ring-emerald-500')
                                : activeChatId === SELF_ID ? 'bg-indigo-100 text-indigo-600 ring-indigo-500' : 'bg-slate-200 text-slate-600 ring-slate-500'
                            }`}
                        >
                            {activeChatId === BROADCAST_ID ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            ) : activeChatId === SELF_ID ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            ) : (
                                activePeerName.substring(0, 2).toUpperCase()
                            )}

                            {/* Online Dot */}
                            {activeChatId !== SELF_ID && activeChatId !== BROADCAST_ID && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                            )}
                        </div>

                        <div className="flex flex-col">
                            <h2 className={`text-base font-bold tracking-tight leading-none ${textPrimary}`}>{activePeerName}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                {isHotspotMode && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
                                <span className={`text-[10px] uppercase tracking-widest font-medium ${textSecondary}`}>
                                    {activeChatId === BROADCAST_ID ? (isHotspotMode ? 'Beacon Active' : 'Public Frequency') : activeChatId === SELF_ID ? 'Encrypted Storage' : 'Secure Connection'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Toggle Hotspot */}
                        <button
                            onClick={toggleHotspot}
                            className={`p-2 rounded-full transition-all duration-300 ${isHotspotMode ? 'bg-amber-500/10 text-amber-500' : `${isDarkMode ? 'text-slate-500 hover:bg-slate-800 hover:text-amber-500' : 'text-slate-400 hover:bg-slate-100 hover:text-amber-500'}`}`}
                            title="Toggle Hotspot Beacon"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                            </svg>
                        </button>

                        <button
                            onClick={() => setActiveChatId(null)}
                            className={`hidden md:flex w-9 h-9 rounded-full items-center justify-center transition-all ${buttonSecondary}`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className={`flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 ${hotspotGlow}`} ref={scrollRef}>
                    {displayedMessages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full opacity-40 animate-in fade-in zoom-in duration-700">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                <svg className={`w-8 h-8 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <p className={`text-xs font-bold tracking-widest uppercase ${textSecondary}`}>No Signals Detected</p>
                        </div>
                    )}

                    {displayedMessages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isCurrentUser={msg.senderId === currentUser.id || msg.senderId === 'SELF'}
                            senderName={allContacts.find(c => c.id === msg.senderId)?.username}
                            isDarkMode={isDarkMode}
                        />
                    ))}
                </div>

                {/* Input */}
                <div className={`p-4 md:p-6 border-t z-20 transition-colors duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} ${isHotspotMode ? (isDarkMode ? 'border-amber-500/20' : 'border-amber-200') : ''}`}>
                    <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={mainInput}
                            onChange={(e) => setMainInput(e.target.value)}
                            placeholder={isHotspotMode ? "Broadcasting..." : "Type a secure message..."}
                            className={`flex-1 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 font-medium text-sm transition-all shadow-sm ${inputBg} ${isHotspotMode ? 'focus:ring-amber-500/50' : 'focus:ring-emerald-500/50'}`}
                        />
                        <button type="submit" className={`p-3.5 rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 text-white ${isHotspotMode ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
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
        <div className={`relative h-screen w-full overflow-hidden flex flex-col font-sans transition-all duration-700 ${rootClasses}`}>

            {/* Hotspot Active Indicator (Subtle) */}
            {isHotspotMode && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500 animate-pulse z-50"></div>
            )}

            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-5 z-30 shrink-0 border-b transition-colors duration-500 ${headerClasses}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <span className="text-xl font-bold text-white">G</span>
                    </div>
                    <div>
                        <h1 className={`text-lg font-bold tracking-tight leading-none ${textPrimary}`}>
                            GHOST<span className={isHotspotMode ? "text-amber-500 animate-pulse" : textAccent}>MESH</span>
                        </h1>
                        <p className={`text-[10px] uppercase tracking-[0.2em] font-medium ${textSecondary} mt-1`}>Secure Signals</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Hotspot Toggle Button */}
                    <button
                        onClick={toggleHotspot}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 border ${isHotspotMode ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : `${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}`}
                    >
                        <div className={`w-2 h-2 rounded-full ${isHotspotMode ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`}></div>
                        <span className="text-[10px] font-bold tracking-widest">{isHotspotMode ? 'BEACON ON' : 'BEACON OFF'}</span>
                    </button>

                    <button
                        onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsDeleteMode(false); setEditUsername(currentUser.username); setEditAvatarUrl(currentUser.avatarUrl); setIsEditingProfile(false); }}
                        className={`p-2 rounded-full transition-all duration-300 ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main List Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                <div className="flex items-center justify-between mb-2 px-1">
                    <h2 className={`text-xs font-bold uppercase tracking-widest ${textSecondary}`}>Active Channels</h2>
                    <span className={`text-[10px] font-bold ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'} px-2 py-0.5 rounded-full`}>{chatList.length}</span>
                </div>

                {chatList.map(chat => (
                    <button
                        key={chat.id}
                        onClick={() => setActiveChatId(chat.id)}
                        className={`w-full border ${isHotspotMode && chat.type === 'BROADCAST' ? 'border-amber-500/30 bg-amber-500/5' : listItemBase} rounded-2xl p-4 flex items-center gap-5 transition-all duration-300 group transform hover:-translate-y-0.5`}
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110
                            ${chat.type === 'BROADCAST' ? (isHotspotMode ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600') :
                                chat.type === 'SELF' ? 'bg-indigo-100 text-indigo-600' :
                                    'bg-slate-100 text-slate-600'}`}
                        >
                            {chat.type === 'BROADCAST' && (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            )}
                            {chat.type === 'SELF' && (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            )}
                            {chat.type === 'PRIVATE' && (
                                <span className="font-bold font-mono text-lg">{chat.name.substring(0, 2).toUpperCase()}</span>
                            )}
                        </div>

                        <div className="flex-1 text-left">
                            <div className={`text-base font-bold transition-colors mb-0.5 ${isHotspotMode && chat.type === 'BROADCAST' ? 'text-amber-500' : `${textPrimary} group-hover:${textAccent}`}`}>{chat.name}</div>
                            <div className={`text-xs font-medium tracking-wide ${textSecondary} group-hover:opacity-100 opacity-70`}>
                                {isHotspotMode && chat.type === 'BROADCAST' ? 'BEACON ACTIVE' : chat.preview}
                            </div>
                        </div>

                        <div className={`transition-transform duration-300 group-hover:translate-x-1 ${isHotspotMode && chat.type === 'BROADCAST' ? 'text-amber-500' : `${isDarkMode ? 'text-slate-600' : 'text-slate-300'} group-hover:${textAccent}`}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                    </button>
                ))}

                <div className={`mt-6 p-6 rounded-2xl border border-dashed text-center transition-all duration-300 ${isDarkMode ? 'border-slate-800 bg-slate-900/50 hover:border-slate-700' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                    <p className={`text-xs font-bold uppercase tracking-widest ${textSecondary} mb-3`}>Tap Locator below to find nodes</p>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mx-auto animate-ping opacity-75"></div>
                </div>
            </div>

            {/* Hex Button (Locator) */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
                <HexButton
                    onClick={() => setIsLocatorOpen(!isLocatorOpen)}
                    active={isLocatorOpen}
                />
            </div>

            {/* SETTINGS OVERLAY */}
            {isSettingsOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${isDarkMode ? 'bg-slate-950/60' : 'bg-slate-200/60'} backdrop-blur-sm animate-in fade-in duration-300`} onClick={() => setIsSettingsOpen(false)}></div>

                    <div className={`relative w-full max-w-md ${cardBg} rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden`}>
                        {/* Close Button */}
                        <button onClick={() => setIsSettingsOpen(false)} className={`absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100/10 transition-colors ${textSecondary} hover:${textPrimary}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <h2 className={`text-center text-lg font-bold ${textPrimary} mb-8 tracking-widest font-mono border-b pb-4 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>NODE CONFIGURATION</h2>

                        {!isDeleteMode ? (
                            <>
                                {/* Theme Toggle */}
                                <div className={`rounded-xl p-4 mb-6 flex items-center justify-between border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800 text-indigo-400' : 'bg-white text-indigo-500 shadow-sm'}`}>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                            </svg>
                                        </div>
                                        <span className={`text-sm font-bold ${textPrimary}`}>Interface Theme</span>
                                    </div>
                                    <button
                                        onClick={() => setIsDarkMode(!isDarkMode)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'}`}
                                    >
                                        {isDarkMode ? 'Dark' : 'Light'}
                                    </button>
                                </div>

                                {/* Profile Section */}
                                <div className="flex flex-col items-center mb-8">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <img src={editAvatarUrl} alt="Profile" className={`w-24 h-24 rounded-full border-4 shadow-xl z-10 object-cover transition-transform duration-300 group-hover:scale-105 ${isDarkMode ? 'border-slate-700' : 'border-white'}`} />
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 backdrop-blur-sm">
                                            <svg className="w-8 h-8 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="mt-4 w-full">
                                        <input
                                            type="text"
                                            value={editUsername}
                                            onChange={(e) => { setEditUsername(e.target.value); setIsEditingProfile(true); }}
                                            className={`text-center font-bold text-xl py-2 w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-lg transition-all ${textPrimary}`}
                                        />
                                        <p className={`text-center text-[10px] uppercase tracking-widest ${textSecondary}`}>
                                            ID: <span className="font-mono">{currentUser.id.substring(0, 8)}</span>
                                        </p>
                                    </div>

                                    {settingsError && <p className="text-red-400 text-xs font-bold mt-2">{settingsError}</p>}

                                    {isEditingProfile && (
                                        <button
                                            onClick={handleSaveProfile}
                                            className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-xs shadow-lg uppercase tracking-wider"
                                        >
                                            Save Changes
                                        </button>
                                    )}
                                </div>

                                {/* Logout/Delete */}
                                <div className="space-y-3 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
                                    <button
                                        onClick={onLogout}
                                        className={`w-full py-3.5 font-bold tracking-wider rounded-xl transition-colors uppercase text-xs flex items-center justify-center gap-2 ${isDarkMode ? 'bg-slate-900 hovered:bg-slate-950 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                                    >
                                        <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                        Disconnect Node
                                    </button>

                                    <button
                                        onClick={() => setIsDeleteMode(true)}
                                        className="w-full py-2 text-[10px] tracking-widest uppercase transition-colors text-red-400 hover:text-red-500 opacity-60 hover:opacity-100"
                                    >
                                        Terminate Identity
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* Delete Mode */
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </div>
                                    <h3 className="text-red-500 font-bold uppercase tracking-wider mb-2">Terminate Node?</h3>
                                    <p className={`${textSecondary} text-xs`}>This action is irreversible. All encrypted local data will be wiped.</p>
                                </div>

                                <form onSubmit={handleDeleteAccount} className="space-y-3">
                                    <input
                                        type="text"
                                        value={delUsername}
                                        onChange={(e) => setDelUsername(e.target.value)}
                                        placeholder="Confirm Username"
                                        className={`w-full rounded-xl p-3 text-center text-sm focus:border-red-500 focus:outline-none border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                                    />
                                    <input
                                        type="password"
                                        value={delPassword}
                                        onChange={(e) => setDelPassword(e.target.value)}
                                        placeholder="Confirm Password"
                                        className={`w-full rounded-xl p-3 text-center text-sm focus:border-red-500 focus:outline-none border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                                    />

                                    {delError && <p className="text-red-400 text-xs text-center font-bold">{delError}</p>}

                                    <div className="flex gap-2 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsDeleteMode(false)}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-900/20"
                                        >
                                            Terminate
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* LOCATOR OVERLAY */}
            {isLocatorOpen && (
                <div className={`absolute inset-0 z-40 ${overlayBg} backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom duration-500`}>
                    {/* Top Search */}
                    <div className="p-6 pt-10 pb-4">
                        <div className="max-w-md mx-auto relative group">
                            <input
                                type="text"
                                placeholder="Search Frequency..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full border-0 ring-1 rounded-2xl px-6 py-4 text-center focus:ring-2 focus:ring-emerald-500/50 focus:outline-none font-medium text-sm transition-all shadow-sm group-hover:shadow-md ${isDarkMode ? 'bg-slate-800/50 ring-slate-700 text-slate-200 placeholder-slate-500' : 'bg-white ring-slate-200 text-slate-800 placeholder-slate-400'}`}
                            />
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex items-center justify-center my-6">
                            <div className={`h-px w-16 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                            <span className={`mx-4 text-[10px] font-bold uppercase tracking-widest ${textSecondary}`}>Scanning Area</span>
                            <div className={`h-px w-16 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                        </div>
                    </div>

                    {/* Radar Box */}
                    <div className="px-6 mb-8">
                        <div className={`w-full max-w-sm mx-auto aspect-square border-2 rounded-full relative overflow-hidden flex items-center justify-center ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                            <RadarScan
                                scanning={true}
                                onScan={scanForPeers}
                                peerCount={allContacts.length}
                                isDarkMode={isDarkMode}
                            />
                        </div>
                    </div>

                    {/* Contacts List */}
                    <div className="flex-1 overflow-y-auto px-6 pb-24 max-w-md mx-auto w-full">
                        <h3 className={`${textSecondary} text-xs font-bold uppercase tracking-widest mb-4 ml-2`}>Detected Nodes ({allContacts.length})</h3>

                        <div className="space-y-3">
                            {allContacts.map(contact => (
                                <button
                                    key={contact.id}
                                    onClick={() => { setActiveChatId(contact.id); setIsLocatorOpen(false); }}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isDarkMode ? 'bg-slate-800 text-emerald-400' : 'bg-slate-200 text-emerald-600'}`}>
                                        {contact.username.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className={`text-base font-bold text-left flex-1 ${textPrimary}`}>{contact.username}</div>
                                    <div className="text-emerald-500">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                </button>
                            ))}
                            {allContacts.length === 0 && (
                                <div className={`text-center py-8 ${textSecondary}`}>
                                    <p className="text-xs italic">Searching for local mesh nodes...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Close Button Only */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
                        <button
                            onClick={() => setIsLocatorOpen(false)}
                            className="bg-slate-900 text-white rounded-full p-4 shadow-lg hover:scale-110 transition-transform"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};
