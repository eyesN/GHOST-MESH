import { User } from '../types';

const DB_KEY = 'ghost_mesh_sql_db_v1';

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
  }
};