import { useState, useEffect, useCallback } from 'react';
import { Message, User, MessageType } from '../types';

// We use BroadcastChannel to simulate a local Wi-Fi direct network
// where all tabs open on the same origin can "see" each other.
const CHANNEL_NAME = 'ghost_mesh_v1';

interface NetworkPacket {
  type: 'HELLO' | 'MESSAGE' | 'ACK';
  payload: any;
  sender: User;
}

export const useMeshNetwork = (currentUser: User) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [peers, setPeers] = useState<Map<string, User>>(new Map());
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);

  useEffect(() => {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    setChannel(bc);

    bc.onmessage = (event: MessageEvent) => {
      const packet = event.data as NetworkPacket;
      
      if (packet.sender.id === currentUser.id) return;

      switch (packet.type) {
        case 'HELLO':
          setPeers(prev => new Map(prev).set(packet.sender.id, packet.sender));
          // Reply to HELLO so they know we exist
          bc.postMessage({
            type: 'ACK',
            payload: {},
            sender: currentUser
          } as NetworkPacket);
          break;
        case 'ACK':
          setPeers(prev => new Map(prev).set(packet.sender.id, packet.sender));
          break;
        case 'MESSAGE':
          const msg = packet.payload as Message;
          // Filter out private messages not meant for us
          if (msg.recipientId && msg.recipientId !== currentUser.id) {
             return;
          }
          setMessages(prev => [...prev, msg]);
          break;
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
  }, [currentUser]);

  const broadcastMessage = useCallback((content: string, recipientId?: string) => {
    if (!channel) return;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      recipientId: recipientId,
      content,
      timestamp: Date.now(),
      type: MessageType.TEXT,
      isEncrypted: true,
    };

    // Optimistic UI update
    setMessages(prev => [...prev, newMessage]);

    // Send to network
    channel.postMessage({
      type: 'MESSAGE',
      payload: newMessage,
      sender: currentUser
    } as NetworkPacket);

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