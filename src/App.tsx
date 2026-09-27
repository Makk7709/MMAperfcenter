import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth, PASSWORD_RESET_PATH } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { VideoBackground } from "@/components/VideoBackground";
import { IntroSplash } from "@/components/IntroSplash";
import { readIntroContext, shouldPlayIntro } from "@/lib/intro";
import { SESSION_PATH } from "@/lib/training/session";
import { Button } from "@/components/ui/button";

const CHUNK_RELOAD_KEY = "korev_chunk_reload";

// Each page is its own chunk: the first paint only downloads the shell and
// the page being opened (charts, PDF, scanner and admin stay out of it).
// After a deploy, a tab left open asks for chunk names that no longer exist:
// one full reload fetches the new build instead of showing the error screen.
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return lazy(() =>
    load()
      .then((module) => {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        return module;
      })
      .catch((error) => {
        if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) throw error;
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
        window.location.reload();
        return new Promise<never>(() => {});
      }),
  );
}

const Index = lazyPage(() => import("./pages/Index"));
const Auth = lazyPage(() => import("./pages/Auth"));
const Onboarding = lazyPage(() => import("./pages/Onboarding"));
const Profile = lazyPage(() => import("./pages/Profile"));
const WorkoutHistory = lazyPage(() => import("./pages/WorkoutHistory"));
const WorkoutJournal = lazyPage(() => import("./pages/WorkoutJournal"));
const TrainingSession = lazyPage(() => import("./pages/TrainingSession"));
const Statistics = lazyPage(() => import("./pages/Statistics"));
const TrainingVideos = lazyPage(() => import("./pages/TrainingVideos"));
const Pricing = lazyPage(() => import("./pages/Pricing"));
const Legal = lazyPage(() => import("./pages/Legal"));
const NotFound = lazyPage(() => import("./pages/NotFound"));
const AdminDashboard = lazyPage(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazyPage(() => import("./pages/admin/AdminUsers"));
const AdminSubscriptions = lazyPage(() => import("./pages/admin/AdminSubscriptions"));
const AdminVideos = lazyPage(() => import("./pages/admin/AdminVideos"));
const AdminSettings = lazyPage(() => import("./pages/admin/AdminSettings"));
const PaymentSuccess = lazyPage(() => import("./pages/PaymentSuccess"));
const ResetPassword = lazyPage(() => import("./pages/ResetPassword"));

const SLOW_LOADING_MS = 10_000;

// A stalled network must not leave an endless spinner with no way out.
function LoadingScreen() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background" role="status">
      <div className="animate-pulse text-primary">Chargement…</div>
      {slow && (
        <>
          <p className="text-sm text-muted-foreground">La connexion est lente.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Réessayer</Button>
        </>
      )}
    </div>
  );
}

// Only in-app paths: an absolute URL in the state must not become an open redirect.
function returnPathFrom(state: unknown): string {
  const from = (state as { from?: { pathname?: unknown; search?: unknown } } | null)?.from;
  const path = typeof from?.pathname === "string" ? from.pathname : "";
  if (!path.startsWith("/") || path.startsWith("//") || path === "/auth") return "/";
  return path + (typeof from?.search === "string" ? from.search : "");
}

const queryClient = new QueryClient();

function ProtectedRoute({ children, requiresOnboarding = true }: Readonly<{ children: React.ReactNode; requiresOnboarding?: boolean }>) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();
  
  if (authLoading || profileLoading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Check if onboarding was just completed (to prevent redirect loop)
  const onboardingJustCompleted = sessionStorage.getItem("onboarding_completed") === "true";
  
  // Clear the flag after reading it
  if (onboardingJustCompleted && location.pathname === "/") {
    sessionStorage.removeItem("onboarding_completed");
  }

  // Check if profile needs onboarding (missing critical fields)
  const needsOnboarding = requiresOnboarding && !onboardingJustCompleted && profile && (
    !profile.weight || 
    !profile.height || 
    !profile.fitness_level || 
    !profile.martial_arts_discipline ||
    !profile.goals || 
    profile.goals.length === 0
  );

  // Redirect to onboarding if needed and not already on onboarding page
  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (user) {
    return <Navigate to={returnPathFrom(location.state)} replace />;
  }
  
  return <>{children}</>;
}

function AppContent() {
  const { loading } = useAuth();
  
  // Don't render video background while loading
  if (loading) return <LoadingScreen />;

  return (
    <>
      {/* Video background always visible */}
      <VideoBackground />
      <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/auth" 
          element={
            <PublicRoute>
              <Auth />
            </PublicRoute>
          } 
        />
        <Route 
          path="/onboarding" 
          element={
            <ProtectedRoute requiresOnboarding={false}>
              <Onboarding />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/history" 
          element={
            <ProtectedRoute>
              <WorkoutHistory />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/journal" 
          element={
            <ProtectedRoute>
              <WorkoutJournal />
            </ProtectedRoute>
          } 
        />
        <Route path={SESSION_PATH} element={<ProtectedRoute><TrainingSession /></ProtectedRoute>} />
        <Route 
          path="/statistics" 
          element={
            <ProtectedRoute>
              <Statistics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/training-videos"
          element={
            <ProtectedRoute>
              <TrainingVideos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pricing"
          element={
            <ProtectedRoute>
              <Pricing />
            </ProtectedRoute>
          }
        />
        <Route path="/legal" element={<Legal />} />
        <Route path={PASSWORD_RESET_PATH} element={<ResetPassword />} />
        <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/subscriptions" element={<ProtectedRoute><AdminSubscriptions /></ProtectedRoute>} />
        <Route path="/admin/videos" element={<ProtectedRoute><AdminVideos /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </>
  );
}

const App = () => {
  const [showIntro, setShowIntro] = useState(() => shouldPlayIntro(readIntroContext()));
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </BrowserRouter>
        {showIntro && <IntroSplash onDone={() => setShowIntro(false)} />}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
