import React from 'react';
import { Message, User } from '../types';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  senderName?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser, senderName }) => {
  const timeString = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex flex-col mb-4 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[75%] md:max-w-[60%] flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        {!isCurrentUser && (
            <span className="text-xs text-slate-400 mb-1 ml-1">{senderName || 'Unknown Signal'}</span>
        )}
        
        <div className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg
          ${isCurrentUser 
            ? 'bg-emerald-600 text-white rounded-tr-sm' 
            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
          }`}
        >
          {message.content}
          
          {message.isEncrypted && (
            <div className="absolute -right-1 -top-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm" title="End-to-End Encrypted"></div>
          )}
        </div>
        
        <span className="text-[10px] text-slate-500 mt-1 font-mono flex items-center gap-1">
          {timeString} 
          {isCurrentUser && (
             <span className="text-emerald-500">✓✓</span>
          )}
        </span>
      </div>
    </div>
  );
};