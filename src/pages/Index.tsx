import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { TriageExplainer } from "@/components/TriageExplainer";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { UserPlus, LogIn, AlertCircle, Info, Heart } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { session, profile } = useAuth();

  useEffect(() => {
    if (session && profile?.role === "patient") {
      navigate("/dashboard", { replace: true });
    }
  }, [session, profile?.role, navigate]);

  if (session && profile?.role === "patient") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {/* Welcome / Home - 4 options for guests */}
      {!session && (
        <section className="container mx-auto px-4 pt-24 pb-12">
          <Card className="max-w-xl mx-auto border-primary/20 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Heart className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Telehealth Rural Barangay Platform</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">Select an option to continue</p>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button variant="outline" className="h-12 justify-start gap-4 text-left" asChild>
                <Link to="/signup">
                  <UserPlus className="w-5 h-5 shrink-0" />
                  <span>[1] Register</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-12 justify-start gap-4 text-left" asChild>
                <Link to="/login">
                  <LogIn className="w-5 h-5 shrink-0" />
                  <span>[2] Login</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-12 justify-start gap-4 text-left" asChild>
                <Link to="/symptom-checker">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>[3] Emergency Quick Report (No Login)</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-12 justify-start gap-4 text-left" asChild>
                <Link to="/about">
                  <Info className="w-5 h-5 shrink-0" />
                  <span>[4] Info / About</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      )}
      <HeroSection />
      <FeaturesSection />
      <TriageExplainer />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
