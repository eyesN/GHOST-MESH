import { User } from '../types';

const DB_KEY = 'ghost_mesh_sql_db_v1';
const USERS_TABLE_KEY = 'ghost_mesh_users_table_v1';
const SELF_CHAT_KEY = 'ghost_mesh_self_chat_v1';

// Seed initial users if empty
const seedUsers = () => {
    if (!localStorage.getItem(USERS_TABLE_KEY)) {
        const initialUsers = {
            'adit': { id: 'mock_adit_01', username: 'adit', password: 'password', publicKey: 'KEY_ADIT_X99', avatarUrl: 'https://ui-avatars.com/api/?name=Adit&background=6366f1&color=fff' },
            'hitler': { id: 'mock_hitler_02', username: 'hitler', password: 'password', publicKey: 'KEY_HITLER_Z88', avatarUrl: 'https://ui-avatars.com/api/?name=Hitler&background=ef4444&color=fff' }
        };
        localStorage.setItem(USERS_TABLE_KEY, JSON.stringify(initialUsers));
    }
};
seedUsers();

export const mockSql = {
  // Session Management
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

  // Mock "SQL" query for known peers (now pulling from registered users + mocks)
  getKnownPeers: (): User[] => {
    const users = JSON.parse(localStorage.getItem(USERS_TABLE_KEY) || '{}');
    return Object.values(users).map((u: any) => {
        const { password, ...user } = u;
        return user as User;
    });
  },

  // Self chat storage
  saveSelfMessage: (content: string) => {
    const existing = JSON.parse(localStorage.getItem(SELF_CHAT_KEY) || '[]');
    const msg = {
        id: crypto.randomUUID(),
        content,
        timestamp: Date.now(),
        type: 'TEXT',
        isEncrypted: true,
        senderId: 'SELF'
    };
    localStorage.setItem(SELF_CHAT_KEY, JSON.stringify([...existing, msg]));
    return msg;
  },

  getSelfMessages: () => {
      return JSON.parse(localStorage.getItem(SELF_CHAT_KEY) || '[]');
  }
};