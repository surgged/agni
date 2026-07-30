import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api, UserProfile } from '@/api';

export interface User {
  user_id: string;
  name?: string;
  email?: string;
  avatar?: string;
  role?: string;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; message: string }>;
  verifyEmail: (token: string) => Promise<boolean>;
  resendVerification: (email: string) => Promise<{ message: string }>;
  magicLinkLogin: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyMagicToken: (token: string) => Promise<boolean>;
  generateAgentToken: (name?: string) => Promise<{ token: string; agentId: string }>;
  demoLogin: () => void;
  logout: () => void;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  user?: UserProfile;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const TOKEN_KEY = 'agni_token';
const REFRESH_KEY = 'agni_refresh';
const USER_KEY = 'agni_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const setAuthSession = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  useEffect(() => {
    if (token) {
      api
        .getMe()
        .then((data) => {
          const fetchedUser: User = {
            user_id: data.user_id || '',
            name: data.name || data.email?.split('@')[0] || 'Agni User',
            email: data.email || '',
            avatar: data.avatar,
            role: data.role || 'user',
            created_at: data.created_at,
          };
          setUser(fetchedUser);
          localStorage.setItem(USER_KEY, JSON.stringify(fetchedUser));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token, logout]);

  const login = useCallback(
    async (email: string, password?: string) => {
      const data = await api.post<TokenResponse>('/auth/login', { email, password: password || '' });
      if (!data.access_token) {
        throw new Error('Invalid server response: access token missing');
      }
      const loggedUser: User = data.user || {
        user_id: '',
        name: email.split('@')[0] || 'Agni User',
        email,
        role: 'user',
      };
      if (data.refresh_token) {
        localStorage.setItem(REFRESH_KEY, data.refresh_token);
      }
      setAuthSession(data.access_token, loggedUser);
    },
    [setAuthSession]
  );

  const register = useCallback(
    async (name: string, email: string, password: string, confirmPassword: string) => {
      const res = await api.post<{ message: string }>('/auth/register', {
        name,
        email,
        password,
        confirm_password: confirmPassword,
      });
      return {
        success: true,
        message: res.message || 'Verification email sent. Please check your inbox.',
      };
    },
    []
  );

  const verifyEmail = useCallback(
    async (tok: string) => {
      try {
        const res = await api.verifyEmailToken(tok);
        const verifiedUser: User = {
          user_id: res.user?.user_id || '',
          name: res.user?.name || 'Agni User',
          email: res.user?.email || '',
          role: res.user?.role || 'user',
        };
        if (res.refresh_token) {
          localStorage.setItem(REFRESH_KEY, res.refresh_token);
        }
        if (res.access_token) {
          setAuthSession(res.access_token, verifiedUser);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [setAuthSession]
  );

  const resendVerification = useCallback(async (email: string) => {
    return await api.resendVerification(email);
  }, []);

  const magicLinkLogin = useCallback(async (email: string) => {
    return await api.requestMagicLink(email);
  }, []);

  const verifyMagicToken = useCallback(
    async (tok: string) => {
      const res = await api.verifyMagicToken(tok);
      if (res.access_token) {
        const verifiedUser: User = {
          user_id: res.user?.user_id || '',
          name: res.user?.name || 'Agni User',
          email: res.user?.email || '',
          role: res.user?.role || 'user',
        };
        setAuthSession(res.access_token, verifiedUser);
        return true;
      }
      return false;
    },
    [setAuthSession]
  );

  const generateAgentToken = useCallback(async (name?: string) => {
    return await api.generateAgentToken(name);
  }, []);

  const demoLogin = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        register,
        verifyEmail,
        resendVerification,
        magicLinkLogin,
        verifyMagicToken,
        generateAgentToken,
        demoLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
