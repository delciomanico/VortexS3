export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'viewer';
  createdAt: string;
}

const AUTH_STORAGE_KEYS = {
  CURRENT_USER: 'vortexs3_current_user_v1',
  USERS_LIST: 'vortexs3_users_v1',
};

const DEFAULT_USERS: { [email: string]: { user: AdminUser; passwordHash: string } } = {
  'admin@vortexs3.io': {
    user: {
      id: 'usr-root-1',
      name: 'Root Admin',
      email: 'admin@vortexs3.io',
      role: 'superadmin',
      createdAt: '2026-10-20T10:00:00Z',
    },
    passwordHash: 'vortex123',
  },
};

class AuthService {
  private currentUser: AdminUser | null = null;
  private users: { [email: string]: { user: AdminUser; passwordHash: string } } = {};
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const storedUsers = localStorage.getItem(AUTH_STORAGE_KEYS.USERS_LIST);
      this.users = storedUsers ? JSON.parse(storedUsers) : DEFAULT_USERS;

      const storedCurrent = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);
      if (storedCurrent) {
        this.currentUser = JSON.parse(storedCurrent);
      } else {
        // Default logged-in user for seamless first load, can be logged out anytime
        this.currentUser = this.users['admin@vortexs3.io']?.user || null;
      }
    } catch {
      this.users = DEFAULT_USERS;
      this.currentUser = DEFAULT_USERS['admin@vortexs3.io'].user;
    }
  }

  private persist() {
    try {
      localStorage.setItem(AUTH_STORAGE_KEYS.USERS_LIST, JSON.stringify(this.users));
      if (this.currentUser) {
        localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
      }
    } catch (e) {
      console.warn('AuthService persist error', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public getCurrentUser(): AdminUser | null {
    return this.currentUser;
  }

  public login(email: string, password: string): AdminUser {
    const cleanEmail = email.trim().toLowerCase();
    const entry = this.users[cleanEmail];
    if (!entry) {
      throw new Error('Nenhuma conta encontrada com este email.');
    }
    if (entry.passwordHash !== password) {
      throw new Error('Senha incorreta.');
    }

    this.currentUser = entry.user;
    this.persist();
    return this.currentUser;
  }

  public signup(name: string, email: string, password: string): AdminUser {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Informe um email válido.');
    }
    if (password.length < 6) {
      throw new Error('A senha deve possuir pelo menos 6 caracteres.');
    }
    if (this.users[cleanEmail]) {
      throw new Error('Já existe uma conta cadastrada com este email.');
    }

    const newUser: AdminUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    this.users[cleanEmail] = {
      user: newUser,
      passwordHash: password,
    };

    this.currentUser = newUser;
    this.persist();
    return newUser;
  }

  public logout(): void {
    this.currentUser = null;
    this.persist();
  }
}

export const authService = new AuthService();
