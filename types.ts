export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  IMAGE = 'IMAGE'
}

export enum PeerStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  SCANNING = 'SCANNING'
}

export interface User {
  id: string;
  username: string;
  avatarUrl?: string;
  publicKey: string; // Simulated public key
}

export interface Message {
  id: string;
  senderId: string;
  recipientId?: string; // Optional: If present, it's a private message to this ID. If null/undefined, it's BROADCAST.
  content: string;
  timestamp: number;
  type: MessageType;
  isEncrypted: boolean;
}

export interface ChatSession {
  peerId: string;
  messages: Message[];
  lastActive: number;
  unreadCount: number;
}

export interface Peer {
  user: User;
  status: PeerStatus;
  signalStrength: number; // 0-100 simulated
}