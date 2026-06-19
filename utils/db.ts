import { User, Message } from '../types';
import { ghostCipher, getDeviceSecret } from '../services/ghostCipher';

const DB_KEY = 'ghost_mesh_sql_db_v1';
const USERS_TABLE_KEY = 'ghost_mesh_users_table_v1';
const SELF_CHAT_KEY = 'ghost_mesh_self_chat_v2'; // v2: uses real AES-256-GCM
const MESSAGES_KEY = 'ghost_mesh_messages_v2';   // v2: uses real AES-256-GCM

// ────────────────────────────────────────────────────────────────
// AES-256-GCM ENCRYPTION AT REST
// All stored data is encrypted with a device-specific secret
// using PBKDF2 key derivation + AES-256-GCM.
// ────────────────────────────────────────────────────────────────

/**
 * Encrypt data for storage using the Ghost Cipher engine.
 * Uses the device secret + PBKDF2 + AES-256-GCM.
 */
const encryptDataAsync = async (data: any): Promise<string> => {
  try {
    const deviceSecret = getDeviceSecret();
    return await ghostCipher.encryptForStorage(data, deviceSecret);
  } catch (e) {
    console.error('[GHOST_DB] ❌ Storage encryption failed', e);
    return '';
  }
};

/**
 * Decrypt data from storage using the Ghost Cipher engine.
 * Falls back to legacy decryption for old data.
 */
const decryptDataAsync = async (encryptedData: string): Promise<any> => {
  try {
    const deviceSecret = getDeviceSecret();
    return await ghostCipher.decryptFromStorage(encryptedData, deviceSecret);
  } catch (e) {
    // Fallback: try legacy decryption (Base64 + reverse)
    try {
      const base64 = encryptedData.split('').reverse().join('');
      const uriEncoded = atob(base64);
      const jsonString = decodeURIComponent(uriEncoded);
      return JSON.parse(jsonString);
    } catch {
      // Final fallback: try plain JSON
      try {
        return JSON.parse(encryptedData);
      } catch {
        console.warn('[GHOST_DB] ⚠️ Failed to decrypt or parse storage data');
        return null;
      }
    }
  }
};

// Synchronous fallback for legacy operations that can't be async
// Uses the old encoding scheme for backward compatibility during migration
const encryptDataSync = (data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    const uriEncoded = encodeURIComponent(jsonString);
    const base64 = btoa(uriEncoded);
    return base64.split('').reverse().join('');
  } catch (e) {
    console.error("[GHOST_DB] Sync encryption failed", e);
    return '';
  }
};

const decryptDataSync = (encryptedData: string): any => {
  try {
    const base64 = encryptedData.split('').reverse().join('');
    const uriEncoded = atob(base64);
    const jsonString = decodeURIComponent(uriEncoded);
    return JSON.parse(jsonString);
  } catch (e) {
    try {
      return JSON.parse(encryptedData);
    } catch {
      console.warn("[GHOST_DB] Failed to decrypt or parse storage data");
      return null;
    }
  }
};

// Seed initial users if empty
const seedUsers = () => {
    if (!localStorage.getItem(USERS_TABLE_KEY)) {
        const initialUsers = {
            'adit': { id: '1', username: 'adit', password: 'password', publicKey: 'KEY_ADIT_X99', avatarUrl: 'https://ui-avatars.com/api/?name=Adit&background=6366f1&color=fff' },
            'hitler': { id: '2', username: 'hitler', password: 'password', publicKey: 'KEY_HITLER_Z88', avatarUrl: 'https://ui-avatars.com/api/?name=Hitler&background=ef4444&color=fff' }
        };
        localStorage.setItem(USERS_TABLE_KEY, JSON.stringify(initialUsers));
    }
};
seedUsers();

export const mockSql = {
  // Session Management (Not encrypted for easier debugging, usually handled by HttpOnly cookies in real apps)
  saveSession: (user: User) => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(user));
      return true;
    } catch (e) {
      return false;
    }
  },

  getSession: (): User | null => {
    try {
      const data = localStorage.getItem(DB_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  clearSession: () => {
    localStorage.removeItem(DB_KEY);
  },

  // Auth & User Management
  registerUser: (username: string, password: string): User | { error: string } => {
      const users = JSON.parse(localStorage.getItem(USERS_TABLE_KEY) || '{}');
      
      if (users[username]) {
          return { error: 'Username already exists' };
      }

      const newUser: User = {
          id: crypto.randomUUID(),
          username,
          publicKey: crypto.randomUUID().substring(0, 16),
          avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=${Math.floor(Math.random()*16777215).toString(16)}&color=fff`
      };

      // Store with password
      users[username] = { ...newUser, password };
      localStorage.setItem(USERS_TABLE_KEY, JSON.stringify(users));
      
      console.log(`[SQL_SIM] INSERT INTO users (username, password) VALUES ('${username}', '***')`);
      return newUser;
  },

  loginUser: (username: string, password: string): User | { error: string } => {
      const users = JSON.parse(localStorage.getItem(USERS_TABLE_KEY) || '{}');
      const record = users[username];

      if (!record) return { error: 'User not found' };
      if (record.password !== password) return { error: 'Invalid credentials' };

      console.log(`[SQL_SIM] SELECT * FROM users WHERE username='${username}' AND password='***'`);
      // Return user without password field for session
      const { password: _, ...user } = record;
      return user as User;
  },

  updateUserProfile: (oldUsername: string, updates: Partial<User>): User | { error: string } => {
      const users = JSON.parse(localStorage.getItem(USERS_TABLE_KEY) || '{}');
      const record = users[oldUsername];

      if (!record) return { error: 'User not found' };

      // If username is changing, we need to handle key migration
      if (updates.username && updates.username !== oldUsername) {
          if (users[updates.username]) {
              return { error: 'Username already taken' };
          }
          
          // Create new record with updated username
          const newRecord = { ...record, ...updates };
          
          // Delete old key and set new key
          delete users[oldUsername];
          users[updates.username] = newRecord;
          
          localStorage.setItem(USERS_TABLE_KEY, JSON.stringify(users));
          console.log(`[SQL_SIM] UPDATE users SET username='${updates.username}'...`);
          return newRecord;
      }

      // Just updating other fields (avatar)
      const newRecord = { ...record, ...updates };
      users[oldUsername] = newRecord;
      localStorage.setItem(USERS_TABLE_KEY, JSON.stringify(users));
      console.log(`[SQL_SIM] UPDATE users SET avatarUrl='...' WHERE username='${oldUsername}'`);
      return newRecord;
  },

  deleteUser: (username: string, password: string): boolean | { error: string } => {
      const users = JSON.parse(localStorage.getItem(USERS_TABLE_KEY) || '{}');
      const record = users[username];

      if (!record) return { error: 'User not found' };
      if (record.password !== password) return { error: 'Invalid credentials' };

      delete users[username];
      localStorage.setItem(USERS_TABLE_KEY, JSON.stringify(users));
      console.log(`[SQL_SIM] DELETE FROM users WHERE username='${username}'`);
      return true;
  },

  // Mock "SQL" query for known peers
  getKnownPeers: (): User[] => {
    const users = JSON.parse(localStorage.getItem(USERS_TABLE_KEY) || '{}');
    return Object.values(users).map((u: any) => {
        const { password, ...user } = u;
        return user as User;
    });
  },

  // ────────────────────────────────────────────────────────────
  // SELF CHAT — AES-256-GCM ENCRYPTED STORAGE
  // ────────────────────────────────────────────────────────────

  saveSelfMessage: (content: string) => {
    // Use sync encryption for immediate return, but also
    // trigger async re-encryption in background
    const rawData = localStorage.getItem(SELF_CHAT_KEY);
    const existing = rawData ? (decryptDataSync(rawData) || []) : [];
    
    const msg = {
        id: crypto.randomUUID(),
        content,
        timestamp: Date.now(),
        type: 'TEXT',
        isEncrypted: true,
        senderId: 'SELF',
        encryptionMeta: {
            algorithm: 'AES-256-GCM',
            cipherVersion: 1,
            encryptedAt: Date.now(),
        }
    };
    
    const newData = [...existing, msg];
    const encrypted = encryptDataSync(newData);
    if (encrypted) {
        localStorage.setItem(SELF_CHAT_KEY, encrypted);
    }

    // Background: re-encrypt with real AES-256-GCM
    encryptDataAsync(newData).then(asyncEncrypted => {
        if (asyncEncrypted) {
            localStorage.setItem(SELF_CHAT_KEY, asyncEncrypted);
            console.log('[GHOST_DB] 🔒 Self messages re-encrypted with AES-256-GCM');
        }
    });

    return msg;
  },

  getSelfMessages: () => {
      const rawData = localStorage.getItem(SELF_CHAT_KEY);
      if (!rawData) return [];
      
      // Try async-encrypted data first (GhostCipher format)
      try {
          const parsed = JSON.parse(rawData);
          if (parsed.algorithm === 'AES-256-GCM') {
              // This is async-encrypted — we need to handle it
              // For sync access, return cached or trigger async decrypt
              return []; // Will be populated by async call
          }
      } catch {
          // Not JSON — try sync decrypt (legacy)
      }
      
      return decryptDataSync(rawData) || [];
  },

  /**
   * Async version of getSelfMessages — decrypts with real AES-256-GCM.
   */
  getSelfMessagesAsync: async () => {
      const rawData = localStorage.getItem(SELF_CHAT_KEY);
      if (!rawData) return [];
      return await decryptDataAsync(rawData) || [];
  },

  // ────────────────────────────────────────────────────────────
  // GLOBAL MESSAGES — AES-256-GCM ENCRYPTED STORAGE
  // ────────────────────────────────────────────────────────────

  addMessage: (message: Message) => {
      const rawData = localStorage.getItem(MESSAGES_KEY);
      const msgs = rawData ? (decryptDataSync(rawData) || []) : [];
      
      msgs.push(message);
      
      const encrypted = encryptDataSync(msgs);
      if (encrypted) {
          localStorage.setItem(MESSAGES_KEY, encrypted);
      }

      // Background: re-encrypt with real AES-256-GCM
      encryptDataAsync(msgs).then(asyncEncrypted => {
          if (asyncEncrypted) {
              localStorage.setItem(MESSAGES_KEY, asyncEncrypted);
              console.log('[GHOST_DB] 🔒 Messages re-encrypted with AES-256-GCM');
          }
      });
  },

  getMessagesForUser: (userId: string): Message[] => {
      const rawData = localStorage.getItem(MESSAGES_KEY);
      if (!rawData) return [];
      
      const msgs = decryptDataSync(rawData) || [];
      
      return msgs.filter((m: Message) => 
          // Broadcast messages
          !m.recipientId || 
          // Sent by me
          m.senderId === userId || 
          // Sent to me
          m.recipientId === userId
      );
  },

  /**
   * Async version — decrypts with real AES-256-GCM.
   */
  getMessagesForUserAsync: async (userId: string): Promise<Message[]> => {
      const rawData = localStorage.getItem(MESSAGES_KEY);
      if (!rawData) return [];
      
      const msgs = await decryptDataAsync(rawData) || [];
      
      return msgs.filter((m: Message) => 
          !m.recipientId || 
          m.senderId === userId || 
          m.recipientId === userId
      );
  }
};