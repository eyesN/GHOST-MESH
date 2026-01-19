import { User, Message } from '../types';

const DB_KEY = 'ghost_mesh_sql_db_v1';
const USERS_TABLE_KEY = 'ghost_mesh_users_table_v1';
const SELF_CHAT_KEY = 'ghost_mesh_self_chat_v1';
const MESSAGES_KEY = 'ghost_mesh_messages_v1';

// Encryption Helpers (Simulating Encryption At Rest)
// We use a combination of URI encoding (to handle Unicode), Base64, and string reversal
// to create an obfuscated string that isn't immediately readable in LocalStorage.
const encryptData = (data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    const uriEncoded = encodeURIComponent(jsonString);
    const base64 = btoa(uriEncoded);
    // Reverse the string to break standard Base64 decoders
    return base64.split('').reverse().join('');
  } catch (e) {
    console.error("Storage encryption failed", e);
    return '';
  }
};

const decryptData = (encryptedData: string): any => {
  try {
    // 1. Reverse back
    const base64 = encryptedData.split('').reverse().join('');
    // 2. Decode Base64
    const uriEncoded = atob(base64);
    // 3. Decode URI components
    const jsonString = decodeURIComponent(uriEncoded);
    return JSON.parse(jsonString);
  } catch (e) {
    // Fail-safe: Try parsing as plain JSON (handles migration from unencrypted data)
    try {
      return JSON.parse(encryptedData);
    } catch (e2) {
      console.warn("Failed to decrypt or parse storage data");
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

  // Self chat storage with ENCRYPTION
  saveSelfMessage: (content: string) => {
    const rawData = localStorage.getItem(SELF_CHAT_KEY);
    const existing = rawData ? (decryptData(rawData) || []) : [];
    
    const msg = {
        id: crypto.randomUUID(),
        content,
        timestamp: Date.now(),
        type: 'TEXT',
        isEncrypted: true,
        senderId: 'SELF'
    };
    
    const newData = [...existing, msg];
    const encrypted = encryptData(newData);
    if (encrypted) {
        localStorage.setItem(SELF_CHAT_KEY, encrypted);
    }
    return msg;
  },

  getSelfMessages: () => {
      const rawData = localStorage.getItem(SELF_CHAT_KEY);
      return rawData ? (decryptData(rawData) || []) : [];
  },

  // Global Message Server Simulation with ENCRYPTION
  addMessage: (message: Message) => {
      const rawData = localStorage.getItem(MESSAGES_KEY);
      const msgs = rawData ? (decryptData(rawData) || []) : [];
      
      msgs.push(message);
      
      const encrypted = encryptData(msgs);
      if (encrypted) {
          localStorage.setItem(MESSAGES_KEY, encrypted);
      }
  },

  getMessagesForUser: (userId: string): Message[] => {
      const rawData = localStorage.getItem(MESSAGES_KEY);
      const msgs = rawData ? (decryptData(rawData) || []) : [];
      
      return msgs.filter((m: Message) => 
          // Broadcast messages
          !m.recipientId || 
          // Sent by me
          m.senderId === userId || 
          // Sent to me
          m.recipientId === userId
      );
  }
};