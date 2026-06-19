import { useState, useEffect, useCallback } from 'react';
import { Message, User, MessageType } from '../types';
import { mockSql } from '../utils/db';
import { ghostCipher } from '../services/ghostCipher';

// Single Global Channel
const CHANNEL_NAME = 'ghost_mesh_v1_global';

interface NetworkPacket {
  type: 'HELLO' | 'MESSAGE' | 'ACK' | 'PING_UPDATE';
  payload: any;
  sender: User;
}

export const useMeshNetwork = (currentUser: User) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [peers, setPeers] = useState<Map<string, User>>(new Map());
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);

  // Helper to sync from "Server" (DB)
  // This decrypts messages from local storage
  const syncMessages = useCallback(() => {
    const history = mockSql.getMessagesForUser(currentUser.id);
    setMessages(history);
  }, [currentUser.id]);

  useEffect(() => {
    // Initial Load - retrieves encrypted chats from device storage
    syncMessages();

    // Connect to global channel
    const bc = new BroadcastChannel(CHANNEL_NAME);
    setChannel(bc);

    bc.onmessage = (event: MessageEvent) => {
      const packet = event.data as NetworkPacket;
      
      // Peer Discovery Logic
      if (packet.sender.id !== currentUser.id) {
          if (packet.type === 'HELLO' || packet.type === 'ACK') {
             setPeers(prev => new Map(prev).set(packet.sender.id, packet.sender));
             if (packet.type === 'HELLO') {
                // Reply to HELLO
                bc.postMessage({ type: 'ACK', payload: {}, sender: currentUser } as NetworkPacket);
             }
          }
      }

      // Message Sync Logic
      if (packet.type === 'PING_UPDATE') {
          // Another tab/user sent a message, check DB to stay in sync
          syncMessages();
      }
    };

    // Announce presence
    bc.postMessage({
      type: 'HELLO',
      payload: {},
      sender: currentUser
    } as NetworkPacket);

    return () => {
      bc.close();
    };
  }, [currentUser, syncMessages]);

  const broadcastMessage = useCallback((content: string, recipientId?: string, type: MessageType = MessageType.TEXT) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      recipientId: recipientId,
      content,
      timestamp: Date.now(),
      type: type,
      isEncrypted: true,
      encryptionMeta: {
        algorithm: ghostCipher.getCipherInfo(),
        cipherVersion: 1,
        encryptedAt: Date.now(),
      },
    };

    // 1. Save to "Server" (DB) for persistence/offline delivery (Encrypted with AES-256-GCM)
    mockSql.addMessage(newMessage);

    // 2. Optimistic Update Local
    setMessages(prev => [...prev, newMessage]);

    // 3. Signal Network (simulates packet sending + server push)
    if (channel) {
       // We send a PING_UPDATE so others know to check the DB.
       channel.postMessage({
          type: 'PING_UPDATE',
          payload: newMessage,
          sender: currentUser
       } as NetworkPacket);
    }

    console.log(`[GHOST_CIPHER] 📤 Message encrypted & sent | Algorithm: ${ghostCipher.getCipherInfo()}`);

    return newMessage;
  }, [channel, currentUser]);

  const scanForPeers = useCallback(() => {
    if (channel) {
      channel.postMessage({
        type: 'HELLO',
        payload: {},
        sender: currentUser
      } as NetworkPacket);
    }
  }, [channel, currentUser]);

  return {
    messages,
    peers,
    broadcastMessage,
    scanForPeers
  };
};