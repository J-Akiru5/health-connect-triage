import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import SymptomChecker from "./pages/SymptomChecker";
import Consultations from "./pages/Consultations";
import ConsultationChat from "./pages/ConsultationChat";
import { ChatbotBubble } from "./components/ChatbotBubble";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Referrals from "./pages/Referrals";
import Notifications from "./pages/Notifications";
import MedicalHistory from "./pages/MedicalHistory";
import TriageMonitor from "./pages/TriageMonitor";
import PatientHistory from "./pages/PatientHistory";
import BHWAssistIntake from "./pages/BHWAssistIntake";
import BHWActivities from "./pages/BHWActivities";
import BHWRegisterPatient from "./pages/BHWRegisterPatient";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import EmergencyReport from "./pages/EmergencyReport";
import MyTriageResults from "./pages/MyTriageResults";
import { AdminRoute } from "@/components/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAITriage from "./pages/admin/AdminAITriage";
import AdminTeleconsultReferrals from "./pages/admin/AdminTeleconsultReferrals";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/symptom-checker" element={<SymptomChecker />} />
            <Route path="/emergency-report" element={<EmergencyReport />} />
            <Route path="/faq" element={<Navigate to="/#faq" replace />} />
            <Route path="/about" element={<Navigate to="/#about" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route
              path="/consultations"
              element={
                <ProtectedRoute>
                  <Consultations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultations/:consultationId/chat"
              element={
                <ProtectedRoute>
                  <ConsultationChat />
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
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rhu-dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/referrals"
              element={
                <ProtectedRoute>
                  <Referrals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-triage-results"
              element={
                <ProtectedRoute>
                  <MyTriageResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medical-history"
              element={
                <ProtectedRoute>
                  <MedicalHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/triage-monitor"
              element={
                <ProtectedRoute>
                  <TriageMonitor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bhw/register-patient"
              element={
                <ProtectedRoute>
                  <BHWRegisterPatient />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bhw/assist-intake"
              element={
                <ProtectedRoute>
                  <BHWAssistIntake />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bhw/activities"
              element={
                <ProtectedRoute>
                  <BHWActivities />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient-history"
              element={
                <ProtectedRoute>
                  <PatientHistory />
                </ProtectedRoute>
              }
            />
            {/* Admin routes — System Administrator workflow */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/ai-triage" element={<AdminRoute><AdminAITriage /></AdminRoute>} />
            <Route path="/admin/teleconsult-referrals" element={<AdminRoute><AdminTeleconsultReferrals /></AdminRoute>} />
            <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
            <Route path="/admin/audit" element={<AdminRoute><AdminAudit /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatbotBubble />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
