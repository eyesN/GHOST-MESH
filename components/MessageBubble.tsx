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
    // Hotspot Message Styles
    bubbleClasses = isCurrentUser
      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl rounded-tr-sm shadow-md shadow-amber-900/10'
      : isDarkMode
        ? 'bg-slate-800 border-l-2 border-amber-500 text-slate-200 rounded-2xl rounded-tl-sm shadow-md'
        : 'bg-white border-l-2 border-amber-500 text-slate-800 rounded-2xl rounded-tl-sm shadow-lg shadow-slate-200/50';
  } else {
    // Standard Text Styles
    if (isCurrentUser) {
      bubbleClasses = 'bg-emerald-600 text-white rounded-2xl rounded-tr-sm shadow-md shadow-emerald-900/10';
    } else {
      bubbleClasses = isDarkMode
        ? 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm border border-slate-700/50'
        : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100';
    }
  }

  return (
    <div className={`flex flex-col mb-6 ${isCurrentUser ? 'items-end' : 'items-start group'}`}>
      <div className={`max-w-[80%] md:max-w-[65%] flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        {!isCurrentUser && (
          <div className="flex items-center gap-2 mb-1.5 ml-1 opacity-70 group-hover:opacity-100 transition-opacity">
            <span className={`text-[10px] font-bold tracking-wider uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{senderName || 'Unknown Signal'}</span>
            {isHotspot && (
              <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 tracking-wider">BEACON</span>
            )}
          </div>
        )}

        <div className={`relative px-5 py-3.5 text-[0.95rem] leading-relaxed transition-all ${bubbleClasses}`}>

          {message.content}

          {message.isEncrypted && !isHotspot && (
            <div className="absolute -right-1 -top-1 w-2 h-2 bg-emerald-400 rounded-full shadow-sm ring-2 ring-slate-900" title="End-to-End Encrypted"></div>
          )}
        </div>

        <span className={`text-[9px] mt-1.5 mx-1 font-medium tracking-wide flex items-center gap-1.5 opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>
          {timeString}
          {isCurrentUser && (
            <span className={isHotspot ? "text-amber-500" : "text-emerald-500"}>
              {isHotspot ? '(( BROADCAST ))' : 'Delivered'}
            </span>
          )}
        </span>
      </div>
    </div>
  );
};