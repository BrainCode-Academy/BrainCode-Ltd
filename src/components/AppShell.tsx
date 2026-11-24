import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  Bot,
  Code2,
  Compass,
  CreditCard,
  FolderGit2,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Shield,
  Sun,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AppShellProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onGoPublicHome: () => void;
  children: React.ReactNode;
}

export function AppShell({ activeView, onNavigate, onGoPublicHome, children }: AppShellProps) {
  const { user, entitlement, brand, unreadNotifications, unreadMessages, theme, toggleTheme, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'Explore Courses', icon: BookOpen },
    { id: 'workspace', label: 'Coding Workspace', icon: Code2 },
    { id: 'collab', label: 'Collaborative Lab', icon: UserCheck },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
    { id: 'communities', label: 'Communities', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
    { id: 'projects', label: 'Projects & Portfolio', icon: FolderGit2 },
    { id: 'resources', label: 'Resources', icon: Compass },
    { id: 'pricing', label: 'Pricing & Billing', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
    { id: 'settings', label: 'Profile & Settings', icon: Settings },
  ];

  if (user && ['admin', 'instructor', 'moderator'].includes(user.role)) {
    navItems.push({ id: 'admin', label: 'Admin & CMS', icon: Shield });
  }

  const handleSelect = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const currentLabel = activeView.startsWith('tech:')
    ? `Technology · ${activeView.slice(5)}`
    : activeView.startsWith('course:')
      ? 'Course Workspace'
      : navItems.find((i) => activeView.startsWith(i.id))?.label || 'Workspace';

  const SidebarContent = (
    <div className="flex flex-col h-full justify-between py-4 px-3">
      <div className="space-y-5">
        <div className="px-2.5 flex items-center justify-between">
          <button
            type="button"
            onClick={onGoPublicHome}
            className="text-base font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap cursor-pointer"
          >
            {brand.product_name}
          </button>
          <button
            type="button"
            onClick={onGoPublicHome}
            title="Public Home"
            aria-label="Go to public home"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        <nav className="space-y-0.5" aria-label="Workspace Navigation">
          {navItems.map((item) => {
            const active =
              activeView === item.id ||
              (item.id === 'courses' && (activeView.startsWith('course:') || activeView.startsWith('tech:')));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--accent-soft)] text-[#0A84FF] dark:text-[#38BDF8] font-semibold'
                    : 'text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#0A84FF] dark:text-[#38BDF8]' : ''}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge && item.badge > 0 ? (
                  <span
                    className={`font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded ${
                      active
                        ? 'bg-[#0A84FF] text-white'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-default)]'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-[var(--border-default)] px-2 space-y-3">
        <div className="text-xs">
          <p className="font-semibold text-[var(--text-primary)] truncate">{user?.full_name}</p>
          <p className="text-[11px] text-[var(--text-muted)] truncate tabular-nums">
            {entitlement?.planName} · {user?.xp ?? 0} XP
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="bc-btn-secondary w-full h-9 text-xs text-[var(--text-secondary)] hover:text-[var(--status-danger)]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-surface)] sticky top-0 h-screen overflow-y-auto">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/55" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 max-w-[82vw] bg-[var(--bg-surface)] h-full overflow-y-auto z-10 border-r border-[var(--border-default)]">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute top-3.5 right-3 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-14 px-3 sm:px-6 border-b border-[var(--border-default)] bg-[var(--bg-surface)]/95 backdrop-blur-sm flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] shrink-0 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-xs sm:text-sm font-medium text-[var(--text-muted)] truncate">
              <span className="hidden sm:inline">{brand.product_name}</span>
              <span className="hidden sm:inline mx-2">/</span>
              <span className="text-[var(--text-primary)] font-semibold">{currentLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="h-9 px-2.5 sm:px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] inline-flex items-center gap-1.5 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="bc-btn-primary h-9 px-2.5 sm:px-3.5 text-xs whitespace-nowrap"
            >
              My Portfolio
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1360px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
