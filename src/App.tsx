import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { VideoBackground } from "@/components/VideoBackground";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import WorkoutHistory from "./pages/WorkoutHistory";
import WorkoutJournal from "./pages/WorkoutJournal";
import Statistics from "./pages/Statistics";
import TrainingVideos from "./pages/TrainingVideos";
import Pricing from "./pages/Pricing";
import Legal from "./pages/Legal";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminVideos from "./pages/admin/AdminVideos";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requiresOnboarding = true }: { children: React.ReactNode; requiresOnboarding?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();
  
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Chargement...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
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

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Chargement...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function AppContent() {
  const { user, loading } = useAuth();
  
  // Don't render video background while loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Chargement...</div>
      </div>
    );
  }
  
  return (
    <>
      {user && <VideoBackground freezeAt={9} />}
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
        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/subscriptions" element={<ProtectedRoute><AdminSubscriptions /></ProtectedRoute>} />
        <Route path="/admin/videos" element={<ProtectedRoute><AdminVideos /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
