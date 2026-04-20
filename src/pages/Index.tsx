import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { TriageExplainer } from "@/components/TriageExplainer";
import { AboutSection } from "@/components/AboutSection";
import { FAQSection } from "@/components/FAQSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (session && (profile?.role === "patient" || profile?.role === "clinician" || profile?.role === "bhw")) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, profile?.role, navigate]);

  // Scroll to hash on load (for /about or /faq redirects)
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [location.hash]);

  if (session && (profile?.role === "patient" || profile?.role === "clinician" || profile?.role === "bhw")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />

      {/* Emergency Quick Report */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="py-6 relative z-10"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-destructive/15 bg-destructive/[0.03]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{t("emergency.title")}</p>
                <p className="text-sm text-muted-foreground">{t("emergency.description")}</p>
              </div>
            </div>
            <Button asChild size="lg" className="gap-2 bg-destructive hover:bg-destructive/90 shrink-0 rounded-xl shadow-md">
              <Link to="/emergency-report">
                <AlertTriangle className="w-4 h-4" />
                {t("emergency.button")}
              </Link>
            </Button>
          </div>
        </div>
      </motion.section>

      <FeaturesSection />

      {/* Divider */}
      <div className="container mx-auto px-4"><div className="section-divider" /></div>

      <AboutSection />

      <div className="container mx-auto px-4"><div className="section-divider" /></div>

      <TriageExplainer />

      <div className="container mx-auto px-4"><div className="section-divider" /></div>

      <FAQSection />

      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
