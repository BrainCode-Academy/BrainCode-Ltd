import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, getStoredToken, storeToken } from '../lib/api';
import type { BrandConfig, CapabilitiesConfig, UserEntitlement, UserProfile } from '../types';

type WsListener = (event: string, payload: Record<string, unknown>) => void;

interface AuthContextValue {
  user: UserProfile | null;
  entitlement: UserEntitlement | null;
  brand: BrandConfig;
  capabilities: CapabilitiesConfig | null;
  loading: boolean;
  unreadNotifications: number;
  unreadMessages: number;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setThemePreference: (nextTheme: 'dark' | 'light') => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshPublicConfig: () => Promise<void>;
  loginSuccess: (token: string, user: UserProfile, entitlement: UserEntitlement, remember: boolean) => void;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setEntitlement: React.Dispatch<React.SetStateAction<UserEntitlement | null>>;
  sendWsEvent: (event: string, payload: Record<string, unknown>) => void;
  subscribeWs: (listener: WsListener) => () => void;
}

const defaultBrand: BrandConfig = {
  product_name: 'Braincode',
  company_name: 'BrainCode Technology Limited',
  tagline: 'Learn. Build. Innovate. Grow.',
  support_email: 'support@braincode.dev',
  hero_headline: 'What do you want to learn?',
  hero_subheadline:
    'Explore 200+ technologies, programming languages, frameworks, databases and developer tools. Learn at your own pace, practise with real code and build skills for the future.',
  contact_intro:
    'Have a question about learning, technology, partnerships or Braincode? Get in touch with our team.',
  about_headline: 'Empowering People Through Technology.',
  about_description:
    'Braincode is a technology education and coding platform operated by BrainCode Technology Limited. We help learners build practical skills in software development, programming languages, databases, web development, artificial intelligence, cloud computing, cybersecurity and emerging technologies.',
  footer_about_text: 'Braincode is a technology education platform by BrainCode Technology Limited.',
  social_links: {},
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [entitlement, setEntitlement] = useState<UserEntitlement | null>(null);
  const [brand, setBrand] = useState<BrandConfig>(defaultBrand);
  const [capabilities, setCapabilities] = useState<CapabilitiesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem('bc_theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<WsListener>>(new Set());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('bc_theme', theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  const setThemePreference = useCallback(
    async (nextTheme: 'dark' | 'light') => {
      const previousTheme = theme;
      setTheme(nextTheme);
      if (!user) return;

      setUser((prev) => (prev ? { ...prev, theme_preference: nextTheme } : prev));
      try {
        const res = await api.put<{ user: UserProfile }>('/profile', {
          themePreference: nextTheme,
        });
        setUser(res.user);
      } catch (err) {
        setTheme(previousTheme);
        setUser((prev) => (prev ? { ...prev, theme_preference: previousTheme } : prev));
        throw err;
      }
    },
    [theme, user]
  );

  const toggleTheme = useCallback(() => {
    const next: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    setThemePreference(next).catch(() => {});
  }, [theme, setThemePreference]);

  const refreshPublicConfig = useCallback(async () => {
    try {
      const data = await api.get<{ brand: BrandConfig; capabilities: CapabilitiesConfig }>('/config/public');
      if (data.brand) setBrand({ ...defaultBrand, ...data.brand });
      if (data.capabilities) setCapabilities(data.capabilities);
    } catch {
      // Keep default brand on transient error
    }
  }, []);

  useEffect(() => {
    const product = brand.product_name || 'Braincode';
    const tagline = brand.tagline || 'Learn. Build. Innovate. Grow.';
    if (!window.location.pathname.startsWith('/learn/') && !window.location.pathname.startsWith('/contact')) {
      document.title = `${product} — ${tagline}`;
    }
    const faviconEl = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
    if (faviconEl && brand.favicon_url) {
      faviconEl.href = brand.favicon_url;
    }
  }, [brand.product_name, brand.tagline, brand.favicon_url]);

  const refreshSession = useCallback(async () => {
    try {
      const data = await api.get<{
        user: UserProfile;
        entitlement: UserEntitlement;
        unreadNotifications: number;
        unreadMessages: number;
      }>('/auth/me');
      setUser(data.user);
      if (data.user.theme_preference === 'light' || data.user.theme_preference === 'dark') {
        setTheme(data.user.theme_preference);
      }
      setEntitlement(data.entitlement);
      setUnreadNotifications(data.unreadNotifications || 0);
      setUnreadMessages(data.unreadMessages || 0);
    } catch {
      setUser(null);
      setEntitlement(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPublicConfig();
    refreshSession();
  }, [refreshPublicConfig, refreshSession]);

  // Real-time WebSocket connection tied to authenticated user
  useEffect(() => {
    if (!user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let cancelled = false;
    let reconnectTimer: number | null = null;

    function connect() {
      if (cancelled) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const token = getStoredToken();
      const wsUrl = `${protocol}//${window.location.host}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data) as { event: string; payload: Record<string, unknown> };
          if (parsed.event === 'notification:new') {
            setUnreadNotifications((n) => n + 1);
          } else if (parsed.event === 'dm:received') {
            setUnreadMessages((n) => n + 1);
          }
          listenersRef.current.forEach((fn) => fn(parsed.event, parsed.payload || {}));
        } catch {
          // Ignore malformed ws frames
        }
      };

      ws.onclose = () => {
        if (!cancelled) {
          reconnectTimer = window.setTimeout(connect, 3500);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user?.id]);

  const sendWsEvent = useCallback((event: string, payload: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, payload }));
    }
  }, []);

  const subscribeWs = useCallback((listener: WsListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const loginSuccess = useCallback(
    (token: string, nextUser: UserProfile, nextEnt: UserEntitlement, remember: boolean) => {
      storeToken(token, remember);
      setUser(nextUser);
      if (nextUser.theme_preference === 'light' || nextUser.theme_preference === 'dark') {
        setTheme(nextUser.theme_preference);
      }
      setEntitlement(nextEnt);
      refreshSession();
    },
    [refreshSession]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore
    }
    storeToken(null);
    setUser(null);
    setEntitlement(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        entitlement,
        brand,
        capabilities,
        loading,
        unreadNotifications,
        unreadMessages,
        theme,
        toggleTheme,
        setThemePreference,
        refreshSession,
        refreshPublicConfig,
        loginSuccess,
        logout,
        setUser,
        setEntitlement,
        sendWsEvent,
        subscribeWs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
