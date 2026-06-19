export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  IMAGE = 'IMAGE',
  HOTSPOT = 'HOTSPOT'
}

export enum PeerStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  SCANNING = 'SCANNING'
}

/**
 * Encryption metadata attached to each encrypted message.
 * Allows the UI to display cipher details and verify integrity.
 */
export interface EncryptionMeta {
  algorithm: string;           // e.g. 'AES-256-GCM'
  fingerprint?: string;        // Sender's key fingerprint
  cipherVersion: number;       // Cipher engine version
  encryptedAt: number;         // Timestamp of encryption
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
  encryptionMeta?: EncryptionMeta; // Cipher details for encrypted messages
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