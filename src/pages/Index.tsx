import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { TriageExplainer } from "@/components/TriageExplainer";
import { Chatbot } from "@/components/Chatbot";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

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
      {/* Emergency Quick Report CTA — no login required */}
      <section className="py-8 bg-destructive/5 border-y border-destructive/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Feeling unwell? Check your symptoms — no account needed.</p>
              <p className="text-sm text-muted-foreground">A short questionnaire suggests next steps in under 2 minutes.</p>
            </div>
          </div>
          <Button asChild size="lg" className="gap-2 bg-destructive hover:bg-destructive/90 shrink-0">
            <Link to="/emergency-report">
              <AlertTriangle className="w-4 h-4" />
              Emergency Quick Report
            </Link>
          </Button>
        </div>
      </section>
      <FeaturesSection />
      <TriageExplainer />
      <Chatbot />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
