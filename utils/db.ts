import { User } from '../types';

const DB_KEY = 'ghost_mesh_sql_db_v1';
const SELF_CHAT_KEY = 'ghost_mesh_self_chat_v1';

export const mockSql = {
  saveUser: (user: User) => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(user));
      console.log(`[SQL_SIM] INSERT INTO users VALUES ('${user.id}', '${user.username}')`);
      return true;
    } catch (e) {
      console.error("SQL Write Failed", e);
      return false;
    }
  },

  getUser: (): User | null => {
    try {
      const data = localStorage.getItem(DB_KEY);
      if (!data) return null;
      const user = JSON.parse(data);
      console.log(`[SQL_SIM] SELECT * FROM users WHERE id = '${user.id}'`);
      return user;
    } catch (e) {
      return null;
    }
  },

  clearUser: () => {
    localStorage.removeItem(DB_KEY);
  },

  // Mock "SQL" query for known peers
  getKnownPeers: (): User[] => {
    return [
      {
        id: 'mock_adit_01',
        username: 'adit',
        publicKey: 'KEY_ADIT_X99',
        avatarUrl: 'https://ui-avatars.com/api/?name=Adit&background=6366f1&color=fff'
      },
      {
        id: 'mock_hitler_02',
        username: 'hitler',
        publicKey: 'KEY_HITLER_Z88',
        avatarUrl: 'https://ui-avatars.com/api/?name=Hitler&background=ef4444&color=fff'
      }
    ];
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