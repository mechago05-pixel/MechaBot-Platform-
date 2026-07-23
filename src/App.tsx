import { useState } from "react";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { useVoiceNotifications } from "@/hooks/useVoiceNotifications";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import LanguageSelectPage from "./pages/LanguageSelectPage";
import RatingPage from "./pages/RatingPage";
import HomePage from "./pages/HomePage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import WelcomePage from "./pages/WelcomePage";
import RegisterChoicePage from "./pages/RegisterChoicePage";
import SelectProblemPage from "./pages/SelectProblemPage";
import RequestFormPage from "./pages/RequestFormPage";
import NearbyMechanicsPage from "./pages/NearbyMechanicsPage";
import JobStatusPage from "./pages/JobStatusPage";
import ChatPage from "./pages/ChatPage";
import MechanicDashboardPage from "./pages/MechanicDashboardPage";
import MechanicOrdersPage from "./pages/MechanicOrdersPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetCodePage from "./pages/ResetCodePage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import FullMapPage from "./pages/FullMapPage";
import VoiceDiagnosisResultPage from "./pages/VoiceDiagnosisResultPage";
import ReportProblemPage from "./pages/ReportProblemPage";
import LiveTrackingPage from "./pages/LiveTrackingPage";
import NotificationsPage from "./pages/NotificationsPage";
import MessagesListPage from "./pages/MessagesListPage";
import AdminPage from "./pages/AdminPage";
import MechanicOnboardingPage from "./pages/MechanicOnboardingPage";
import MechanicMapPage from "./pages/MechanicMapPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

type AppStage = "lang" | "app";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const LoadingScreen = () => <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

const DashboardRedirect = () => {
  const { user, loading, role } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (role === "mechanic") return <Navigate to="/mechanic/dashboard" replace />;
  return <Navigate to="/client/dashboard" replace />;
};

const ClientRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "client") return <DashboardRedirect />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin") return <DashboardRedirect />;
  return <>{children}</>;
};

const MechanicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "mechanic" && role !== "admin") return <DashboardRedirect />;
  return <>{children}</>;
};

const NotificationInitializer = () => {
  useBrowserNotifications();
  useVoiceNotifications();
  return null;
};

const App = () => {
  const hasLang = typeof window !== "undefined" && !!localStorage.getItem("mechabot-lang");
  const [stage, setStage] = useState<AppStage>(hasLang ? "app" : "lang");

  if (stage === "lang") {
    return (
      <ThemeProvider>
        <I18nProvider>
          <LanguageSelectPage onComplete={() => setStage("app")} />
        </I18nProvider>
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <I18nProvider>
            <AuthProvider>
              <NotificationInitializer />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<WelcomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterChoicePage />} />
                  <Route path="/register/:role" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-code" element={<ResetCodePage />} />
                  <Route path="/verify-email" element={<EmailVerificationPage />} />
                  <Route path="/dashboard" element={<DashboardRedirect />} />
                  <Route path="/role-select" element={<DashboardRedirect />} />
                  <Route path="/client/dashboard" element={<ClientRoute><HomePage /></ClientRoute>} />
                  <Route path="/home" element={<ClientRoute><HomePage /></ClientRoute>} />
                  <Route path="/history" element={<ClientRoute><HistoryPage /></ClientRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/select-problem" element={<ClientRoute><SelectProblemPage /></ClientRoute>} />
                  <Route path="/request-form" element={<ClientRoute><RequestFormPage /></ClientRoute>} />
                  <Route path="/nearby-mechanics" element={<ClientRoute><NearbyMechanicsPage /></ClientRoute>} />
                  <Route path="/job-status" element={<ClientRoute><JobStatusPage /></ClientRoute>} />
                  <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                  <Route path="/messages" element={<ProtectedRoute><MessagesListPage /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                  <Route path="/mechanic/dashboard" element={<MechanicRoute><MechanicDashboardPage /></MechanicRoute>} />
                  <Route path="/mechanic-dashboard" element={<Navigate to="/mechanic/dashboard" replace />} />
                  <Route path="/mechanic-orders" element={<MechanicRoute><MechanicOrdersPage /></MechanicRoute>} />
                  <Route path="/mechanic-onboarding" element={<ProtectedRoute><MechanicOnboardingPage /></ProtectedRoute>} />
                  <Route path="/mechanic-map" element={<MechanicRoute><MechanicMapPage /></MechanicRoute>} />
                  <Route path="/map" element={<ClientRoute><FullMapPage /></ClientRoute>} />
                  <Route path="/track" element={<ClientRoute><LiveTrackingPage /></ClientRoute>} />
                  <Route path="/voice-diagnosis" element={<ClientRoute><VoiceDiagnosisResultPage /></ClientRoute>} />
                  <Route path="/report-problem" element={<ClientRoute><ReportProblemPage /></ClientRoute>} />
                  <Route path="/rating" element={<ClientRoute><RatingPage /></ClientRoute>} />
                  <Route path="/admin/dashboard" element={<AdminRoute><AdminPage /></AdminRoute>} />
                  <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </I18nProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
