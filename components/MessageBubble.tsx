import React from 'react';
import { Message, MessageType } from '../types';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  senderName?: string;
  isDarkMode: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser, senderName, isDarkMode }) => {
  const timeString = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const isHotspot = message.type === MessageType.HOTSPOT;

  // Dynamic styling based on message type
  let bubbleClasses = '';
  
  if (isHotspot) {
      // Hotspot Message Styles (Amber/Orange)
      // Keeps Amber accent for both modes but adjusts background for contrast
      bubbleClasses = isCurrentUser 
          ? 'bg-amber-600 text-white rounded-tr-sm shadow-[0_0_15px_rgba(245,158,11,0.4)]'
          : isDarkMode
            ? 'bg-slate-800 border-2 border-amber-500/50 text-amber-100 rounded-tl-sm shadow-[0_0_10px_rgba(245,158,11,0.2)]'
            : 'bg-amber-50 border-2 border-amber-500/50 text-amber-900 rounded-tl-sm shadow-sm';
  } else {
      // Standard Text Styles
      if (isCurrentUser) {
          bubbleClasses = 'bg-emerald-600 text-white rounded-tr-sm shadow-sm';
      } else {
          bubbleClasses = isDarkMode 
            ? 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm shadow-sm';
      }
  }

  return (
    <div className={`flex flex-col mb-4 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[75%] md:max-w-[60%] flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        {!isCurrentUser && (
            <div className="flex items-center gap-2 mb-1 ml-1">
                <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>{senderName || 'Unknown Signal'}</span>
                {isHotspot && (
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-600 px-1 rounded border border-amber-500/30">HOTSPOT</span>
                )}
            </div>
        )}
        
        <div className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg transition-all ${bubbleClasses}`}>
          {/* Hotspot Icon Indicator inside bubble */}
          {isHotspot && (
             <div className={`absolute -left-3 -top-3 rounded-full p-1 border border-amber-500/50 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
             </div>
          )}

          {message.content}
          
          {message.isEncrypted && !isHotspot && (
            <div className="absolute -right-1 -top-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm" title="End-to-End Encrypted"></div>
          )}
        </div>
        
        <span className={`text-[10px] mt-1 font-mono flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {timeString} 
          {isCurrentUser && (
             <span className={isHotspot ? "text-amber-500" : "text-emerald-500"}>
                 {isHotspot ? '(( BROADCASTING ))' : '✓✓'}
             </span>
          )}
        </span>
      </div>
    </div>
  );
};