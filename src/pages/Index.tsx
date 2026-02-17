import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { TriageExplainer } from "@/components/TriageExplainer";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();
  const { session, profile } = useAuth();

  useEffect(() => {
    if (session && (profile?.role === "patient" || profile?.role === "clinician" || profile?.role === "bhw")) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, profile?.role, navigate]);

  if (session && (profile?.role === "patient" || profile?.role === "clinician" || profile?.role === "bhw")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <TriageExplainer />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
