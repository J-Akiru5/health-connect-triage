import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SymptomChecker from "./pages/SymptomChecker";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import Consultations from "./pages/Consultations";
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
import NotFound from "./pages/NotFound";
import { AdminRoute } from "@/components/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBarangays from "./pages/admin/AdminBarangays";
import AdminAITriage from "./pages/admin/AdminAITriage";
import AdminTeleconsultReferrals from "./pages/admin/AdminTeleconsultReferrals";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminResearchExports from "./pages/admin/AdminResearchExports";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/symptom-checker" element={<SymptomChecker />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/consultations"
              element={
                <ProtectedRoute>
                  <Consultations />
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
            <Route path="/admin/barangays" element={<AdminRoute><AdminBarangays /></AdminRoute>} />
            <Route path="/admin/ai-triage" element={<AdminRoute><AdminAITriage /></AdminRoute>} />
            <Route path="/admin/teleconsult-referrals" element={<AdminRoute><AdminTeleconsultReferrals /></AdminRoute>} />
            <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
            <Route path="/admin/audit" element={<AdminRoute><AdminAudit /></AdminRoute>} />
            <Route path="/admin/research-exports" element={<AdminRoute><AdminResearchExports /></AdminRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
