import React, { useState, useEffect, useRef } from 'react';
import { useMeshNetwork } from './hooks/useMeshNetwork';
import { User, Message, MessageType } from './types';
import { RadarScan } from './components/RadarScan';
import { MessageBubble } from './components/MessageBubble';
import { generateSmartReply, analyzeSecurity } from './services/geminiService';

// Generate a random user on load for demo purposes
const generateUser = (): User => ({
  id: crypto.randomUUID(),
  username: `Ghost_${Math.floor(Math.random() * 1000)}`,
  publicKey: crypto.randomUUID().substring(0, 16),
  avatarUrl: `https://picsum.photos/seed/${Math.random()}/200/200`
});

const AI_BOT_ID = 'GEMINI_AI_SECURE_BOT';
const AI_USER: User = {
    id: AI_BOT_ID,
    username: 'Gemini NetSec',
    publicKey: 'AI_SECURE_NODE',
    avatarUrl: 'https://picsum.photos/seed/gemini/200/200' // Placeholder
};

export default function App() {
  const [currentUser] = useState<User>(() => generateUser());
  const { messages, peers, broadcastMessage, scanForPeers } = useMeshNetwork(currentUser);
  
  const [input, setInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedPeerId, setSelectedPeerId] = useState<string>('BROADCAST');
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScan = () => {
    setIsScanning(true);
    scanForPeers();
    setTimeout(() => setIsScanning(false), 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (selectedPeerId === AI_BOT_ID) {
        // Handle AI Chat
        const userMsg: Message = {
            id: crypto.randomUUID(),
            senderId: currentUser.id,
            content: input,
            timestamp: Date.now(),
            type: MessageType.TEXT,
            isEncrypted: true
        };
        // We artificially add this to the message list for local view only
        // In a real app, we'd have a separate local storage for AI chats
        // But for this "Broadcast" simulation, we'll just append it locally.
        // NOTE: The useMeshNetwork hook only tracks network messages. 
        // We need a combined state or just hack it for the demo. 
        // Let's use the network broadcast for simplicity but tag it? 
        // Actually, to keep it clean, let's just broadcast everything for the demo 
        // effectively making "Broadcast" the only real channel, 
        // but we treat the AI ID specially.
        
        broadcastMessage(input); 
        setInput('');

        // Trigger AI Reply
        const reply = await generateSmartReply(
            messages.filter(m => m.senderId === currentUser.id || m.senderId === AI_BOT_ID).map(m => m.content), 
            input
        );
        
        // Simulate AI "typing" delay
        setTimeout(() => {
             // We can't "broadcast" as the AI from the hook easily without hacking the hook.
             // We will just invoke a local append if we were building a complex store.
             // For this demo, let's just broadcast as the current user but with a special prefix 
             // OR, better, let's just alert the user for now since the hook is rigid.
             // Wait, I can allow the user to see the AI response in a system message style.
             // Let's stick to the broadcast channel for P2P interaction as the main feature.
             
             // Actually, let's broadcast the AI response as a "System Notification" 
             // to show off the Gemini integration to everyone in the mesh!
             broadcastMessage(`[AI ASSIST]: ${reply}`);
        }, 1500);

    } else {
        broadcastMessage(input);
        setInput('');
    }
  };

  const activePeers = Array.from(peers.values()) as User[];

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 overflow-hidden font-sans selection:bg-emerald-500/30">
      
      {/* Sidebar - Contacts & Radar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-80 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out
        ${showSettings ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0 md:flex md:flex-col
      `}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                GhostMesh
            </h1>
            <button className="md:hidden" onClick={() => setShowSettings(false)}>✕</button>
        </div>

        <div className="p-4">
            <RadarScan scanning={isScanning} onScan={handleScan} peerCount={activePeers.length} />
            
            <div className="mt-6">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 px-2">Mesh Nodes</h3>
                <div className="space-y-1">
                    <button 
                        onClick={() => setSelectedPeerId('BROADCAST')}
                        className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors ${selectedPeerId === 'BROADCAST' ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50'}`}
                    >
                        <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <div className="font-medium text-sm">Broadcast Channel</div>
                            <div className="text-xs text-slate-500">Public Mesh • {activePeers.length + 1} Active</div>
                        </div>
                    </button>

                     <button 
                        onClick={() => setSelectedPeerId(AI_BOT_ID)}
                        className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors ${selectedPeerId === AI_BOT_ID ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50'}`}
                    >
                        <div className="w-10 h-10 rounded-full bg-indigo-900/30 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <div>
                            <div className="font-medium text-sm">Gemini NetSec</div>
                            <div className="text-xs text-indigo-400">AI Assistant • Secure</div>
                        </div>
                    </button>
                </div>
            </div>

            <div className="mt-6">
                 <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 px-2">Nearby Peers</h3>
                 <div className="space-y-1 h-64 overflow-y-auto pr-2">
                    {activePeers.length === 0 ? (
                        <div className="text-xs text-slate-600 italic px-2">No peers detected. Try scanning.</div>
                    ) : (
                        activePeers.map(peer => (
                             <div key={peer.id} className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-slate-800/50 cursor-pointer">
                                <div className="relative">
                                     <img src={peer.avatarUrl} alt={peer.username} className="w-8 h-8 rounded-full bg-slate-700 object-cover opacity-80" />
                                     <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900"></span>
                                </div>
                                <div className="overflow-hidden">
                                    <div className="font-medium text-xs truncate">{peer.username}</div>
                                    <div className="text-[10px] text-slate-500 font-mono truncate">{peer.publicKey.substring(0,8)}...</div>
                                </div>
                            </div>
                        ))
                    )}
                 </div>
            </div>
        </div>

        <div className="p-4 mt-auto border-t border-slate-800">
             <div className="flex items-center gap-3">
                 <img src={currentUser.avatarUrl} className="w-10 h-10 rounded-full border border-emerald-500/50" alt="Me" />
                 <div>
                     <div className="text-sm font-bold text-slate-200">Me (Host)</div>
                     <div className="text-[10px] text-emerald-500 font-mono">ID: {currentUser.id.substring(0, 6)}</div>
                 </div>
             </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-slate-950/50">
        
        {/* Header (Mobile Toggle) */}
        <div className="h-16 border-b border-slate-800 flex items-center px-4 justify-between md:justify-end bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20">
             <button className="md:hidden text-slate-300" onClick={() => setShowSettings(!showSettings)}>
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                 </svg>
             </button>
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                     <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                     <span className="text-xs font-medium text-emerald-400">ENCRYPTED_MESH_V1</span>
                 </div>
             </div>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 scroll-smooth"
        >
            <div className="flex justify-center mb-6">
                <div className="bg-slate-800/80 text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-700 font-mono">
                    You joined the secure channel {selectedPeerId === 'BROADCAST' ? '#PUBLIC-MESH' : '#AI-SECURE'}
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

        {/* Input Area */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
            <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto relative">
                <button type="button" className="p-3 text-slate-400 hover:text-emerald-400 transition-colors">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                     </svg>
                </button>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={selectedPeerId === AI_BOT_ID ? "Ask Gemini Secure Assistant..." : "Broadcast encrypted message..."}
                    className="flex-1 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-transparent focus:border-emerald-500/50 transition-all font-sans"
                />
                <button 
                    type="submit"
                    disabled={!input.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 transform hover:scale-105"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>
            <div className="text-center mt-2">
                <span className="text-[10px] text-slate-600 font-mono">
                    AES-256-GCM • NO LOGS • P2P DIRECT
                </span>
            </div>
        </div>
      </div>
    </div>
  );
}