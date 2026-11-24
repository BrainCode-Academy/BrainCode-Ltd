import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PublicLanding } from './components/PublicLanding';
import { AuthView } from './components/AuthView';
import { OnboardingView } from './components/OnboardingView';
import { AppShell } from './components/AppShell';
import { DashboardView } from './components/DashboardView';
import { CoursesView } from './components/CoursesView';
import { TechnologyPageView } from './components/TechnologyPageView';
import { CodingWorkspaceView } from './components/CodingWorkspaceView';
import { CollabWorkspaceView } from './components/CollabWorkspaceView';
import { CommunitiesView } from './components/CommunitiesView';
import { MessagesView } from './components/MessagesView';
import { ProjectsPortfolioView } from './components/ProjectsPortfolioView';
import { ResourcesView } from './components/ResourcesView';
import { PricingBillingView } from './components/PricingBillingView';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { AdminPortalView, NotificationsView, SettingsView } from './components/AccountAndAdminViews';
import type { CurriculumSubTab } from './components/CurriculumManagerViews';
import { api } from './lib/api';
import type { LessonFull, Technology } from './types';

type PublicRoute = { page: 'home' } | { page: 'contact' } | { page: 'tech'; slug: string };

function extractPublicRouteFromLocation(): PublicRoute {
  if (typeof window === 'undefined') return { page: 'home' };
  const pathname = window.location.pathname;
  if (/^\/contact\/?$/i.test(pathname)) {
    return { page: 'contact' };
  }
  const match = pathname.match(/^\/learn\/([a-z0-9-]+)\/?$/i);
  if (match) {
    return { page: 'tech', slug: match[1].toLowerCase() };
  }
  return { page: 'home' };
}

function isAiStudioDeepLink(): boolean {
  if (typeof window === 'undefined') return false;
  return /^\/admin\/curriculum\/ai-studio\/?$/i.test(window.location.pathname);
}

function isAdminDeepLink(): boolean {
  if (typeof window === 'undefined') return false;
  return /^\/admin(\/|$)/i.test(window.location.pathname);
}

function MainRouter() {
  const { user, loading } = useAuth();
  const [surface, setSurface] = useState<'public' | 'auth' | 'onboarding' | 'app'>(() =>
    isAdminDeepLink() ? 'app' : 'public'
  );
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [activeView, setActiveView] = useState<string>(() => (isAdminDeepLink() ? 'admin' : 'dashboard'));
  const [adminInitialTab, setAdminInitialTab] = useState<'overview' | 'curriculum'>(() =>
    isAiStudioDeepLink() ? 'curriculum' : 'overview'
  );
  const [adminCurriculumSubTab, setAdminCurriculumSubTab] = useState<CurriculumSubTab>(() =>
    isAiStudioDeepLink() ? 'ai-studio' : 'coverage'
  );
  const [pendingRoute, setPendingRoute] = useState<string | null>(() => (isAdminDeepLink() ? 'admin' : null));
  const [pendingExerciseLesson, setPendingExerciseLesson] = useState<LessonFull | null>(null);
  const [pendingCourseTarget, setPendingCourseTarget] = useState<{ slug: string; lessonId?: string } | null>(null);
  const [inspectPortfolioUser, setInspectPortfolioUser] = useState<string | null>(null);
  const [catalogTechnologies, setCatalogTechnologies] = useState<Technology[]>([]);
  const [publicRoute, setPublicRoute] = useState<PublicRoute>(() => extractPublicRouteFromLocation());

  useEffect(() => {
    const handlePopState = () => {
      const next = extractPublicRouteFromLocation();
      setPublicRoute(next);
      if ((next.page === 'tech' || next.page === 'contact') && surface !== 'public') {
        setSurface('public');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [surface]);

  const syncPublicRoute = (next: PublicRoute) => {
    setPublicRoute(next);
    const targetPath =
      next.page === 'tech'
        ? `/learn/${encodeURIComponent(next.slug)}`
        : next.page === 'contact'
        ? '/contact'
        : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(next, '', targetPath);
    }
  };

  useEffect(() => {
    api
      .get<{ technologies: Technology[] }>('/catalog')
      .then((res) => setCatalogTechnologies(res.technologies))
      .catch(() => {});
  }, [surface]);

  useEffect(() => {
    if (!loading && !user && surface === 'app') {
      setAuthMode('login');
      setSurface('auth');
    }
  }, [loading, user, surface]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-secondary)] flex items-center justify-center px-4 text-sm font-medium">
        Loading BrainCode workspace...
      </div>
    );
  }

  // If authenticated and user has not completed onboarding when entering app
  if (surface === 'onboarding' && user) {
    return (
      <OnboardingView
        onComplete={() => {
          syncPublicRoute({ page: 'home' });
          setActiveView(pendingRoute || 'dashboard');
          setPendingRoute(null);
          setSurface('app');
        }}
      />
    );
  }

  if (surface === 'auth') {
    return (
      <AuthView
        initialMode={authMode}
        onBackHome={() => {
          setPendingRoute(null);
          setSurface('public');
        }}
        onSuccessRedirect={(loggedUser) => {
          if (!loggedUser.onboarding_completed) {
            setSurface('onboarding');
          } else {
            if (!isAdminDeepLink()) syncPublicRoute({ page: 'home' });
            setActiveView(pendingRoute || 'dashboard');
            setPendingRoute(null);
            setSurface('app');
          }
        }}
      />
    );
  }

  if (surface === 'app' && user) {
    if (!user.onboarding_completed) {
      return (
        <OnboardingView
          onComplete={() => {
            setActiveView(pendingRoute || 'dashboard');
            setPendingRoute(null);
          }}
        />
      );
    }

    const courseSlug = activeView.startsWith('course:') ? activeView.slice(7) : undefined;
    const techSlug = activeView.startsWith('tech:') ? activeView.slice(5) : undefined;

    return (
      <AppShell
        activeView={activeView}
        onNavigate={(next) => {
          if (next !== 'projects') setInspectPortfolioUser(null);
          if (!next.startsWith('course:')) setPendingCourseTarget(null);
          setActiveView(next);
        }}
        onGoPublicHome={() => {
          syncPublicRoute({ page: 'home' });
          setSurface('public');
        }}
      >
        {activeView === 'dashboard' && <DashboardView onNavigate={(v) => setActiveView(v)} />}

        {(activeView === 'courses' || activeView.startsWith('course:')) && (
          <CoursesView
            initialCourseSlug={courseSlug}
            initialLessonId={pendingCourseTarget?.slug === courseSlug ? pendingCourseTarget?.lessonId : undefined}
            onOpenPricing={() => setActiveView('pricing')}
            onSelectTechnology={(slug) => setActiveView(`tech:${slug}`)}
            onLaunchExercise={(lesson) => {
              setPendingExerciseLesson(lesson);
              setActiveView('workspace');
            }}
          />
        )}

        {techSlug && (
          <div className="-m-4 sm:-m-6 lg:-m-8">
            <TechnologyPageView
              techSlug={techSlug}
              allTechnologies={catalogTechnologies}
              isAuthenticated
              onSelectTechnology={(slug) => setActiveView(`tech:${slug}`)}
              onOpenCourse={(slug, lessonId) => {
                setPendingCourseTarget(slug ? { slug, lessonId } : null);
                setActiveView(slug ? `course:${slug}` : 'courses');
              }}
              onOpenAiTutor={() => setActiveView('ai')}
              onExploreAvailableCourses={() => setActiveView('courses')}
              onOpenAuth={(mode) => {
                setAuthMode(mode);
                setSurface('auth');
              }}
              onBackHome={() => setActiveView('courses')}
              showBar
              inAppShell
            />
          </div>
        )}

        {activeView === 'workspace' && (
          <CodingWorkspaceView
            pendingExerciseLesson={pendingExerciseLesson}
            onClearPendingExercise={() => setPendingExerciseLesson(null)}
            onOpenPricing={() => setActiveView('pricing')}
          />
        )}

        {activeView === 'collab' && <CollabWorkspaceView onOpenPricing={() => setActiveView('pricing')} />}

        {activeView === 'ai' && <AiAssistantPanel />}

        {activeView === 'communities' && <CommunitiesView onOpenPricing={() => setActiveView('pricing')} />}

        {activeView === 'messages' && (
          <MessagesView
            onViewPortfolio={(uname) => {
              setInspectPortfolioUser(uname);
              setActiveView('projects');
            }}
          />
        )}

        {activeView === 'projects' && <ProjectsPortfolioView inspectUsername={inspectPortfolioUser} />}

        {activeView === 'resources' && <ResourcesView />}

        {activeView === 'pricing' && <PricingBillingView />}

        {activeView === 'notifications' && <NotificationsView />}

        {activeView === 'settings' && <SettingsView />}

        {activeView === 'admin' && (
          <AdminPortalView
            initialTab={adminInitialTab}
            initialCurriculumSubTab={adminCurriculumSubTab}
            onCurriculumSubTabChange={(sub) => {
              setAdminCurriculumSubTab(sub);
              if (sub === 'ai-studio' && window.location.pathname !== '/admin/curriculum/ai-studio') {
                window.history.replaceState({}, '', '/admin/curriculum/ai-studio');
              } else if (sub !== 'ai-studio' && window.location.pathname === '/admin/curriculum/ai-studio') {
                window.history.replaceState({}, '', '/');
              }
            }}
          />
        )}
      </AppShell>
    );
  }

  return (
    <PublicLanding
      initialPage={publicRoute.page === 'contact' ? 'contact' : 'home'}
      initialTechSlug={publicRoute.page === 'tech' ? publicRoute.slug : null}
      onPageChange={(page) => syncPublicRoute({ page })}
      onTechSlugChange={(slug) => syncPublicRoute(slug ? { page: 'tech', slug } : { page: 'home' })}
      onOpenAuth={(mode) => {
        setAuthMode(mode);
        setSurface('auth');
      }}
      onEnterApp={(route) => {
        if (!user) {
          setPendingRoute(route || 'dashboard');
          setAuthMode('login');
          setSurface('auth');
          return;
        }
        if (!isAdminDeepLink()) syncPublicRoute({ page: 'home' });
        setActiveView(route || 'dashboard');
        setSurface('app');
      }}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
