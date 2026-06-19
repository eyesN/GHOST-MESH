import React, { useState } from 'react';
import { Message, MessageType } from '../types';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  senderName?: string;
  isDarkMode: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser, senderName, isDarkMode }) => {
  const [showCipherInfo, setShowCipherInfo] = useState(false);
  const timeString = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isHotspot = message.type === MessageType.HOTSPOT;
  const hasCipherMeta = message.isEncrypted && message.encryptionMeta;

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

          {/* Encryption Shield Indicator */}
          {message.isEncrypted && !isHotspot && (
            <button
              onClick={() => setShowCipherInfo(!showCipherInfo)}
              className="absolute -right-1 -top-1 w-5 h-5 flex items-center justify-center bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 ring-2 ring-slate-900 cursor-pointer hover:scale-110 transition-transform group/lock"
              title="Ghost Cipher Protected — Click for details"
            >
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Cipher Info Tooltip */}
        {showCipherInfo && hasCipherMeta && (
          <div className={`mt-2 px-4 py-3 rounded-xl text-[10px] font-mono tracking-wide border animate-in fade-in zoom-in-95 duration-200 ${
            isDarkMode
              ? 'bg-slate-900/95 border-emerald-500/20 text-emerald-300/80'
              : 'bg-slate-50 border-emerald-500/30 text-emerald-700'
          }`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="font-bold uppercase tracking-[0.2em] text-emerald-400">Ghost Cipher Active</span>
            </div>
            <div className="space-y-0.5 opacity-70">
              <div>Algorithm: {message.encryptionMeta!.algorithm}</div>
              <div>Version: v{message.encryptionMeta!.cipherVersion}</div>
              {message.encryptionMeta!.fingerprint && (
                <div>Key: {message.encryptionMeta!.fingerprint}</div>
              )}
              <div>Sealed: {new Date(message.encryptionMeta!.encryptedAt).toLocaleString()}</div>
            </div>
          </div>
        )}

        <span className={`text-[9px] mt-1.5 mx-1 font-medium tracking-wide flex items-center gap-1.5 opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>
          {timeString}
          {isCurrentUser && (
            <span className={isHotspot ? "text-amber-500" : "text-emerald-500"}>
              {isHotspot ? '(( BROADCAST ))' : 'Delivered'}
            </span>
          )}
          {message.isEncrypted && !isHotspot && (
            <span className="text-emerald-500/60 flex items-center gap-0.5">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              E2E
            </span>
          )}
        </span>
      </div>
    </div>
  );
};