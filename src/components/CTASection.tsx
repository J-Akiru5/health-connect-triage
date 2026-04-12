import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { SITE_BARANGAY, SITE_HEALTH_CENTER_PHONE_TEL } from "@/lib/site";

export function CTASection() {
  return (
    <section className="py-16 lg:py-16 relative overflow-hidden">
      <div className="absolute inset-0 gradient-hero opacity-95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
      
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm">
            <Heart className="w-8 h-8 text-primary-foreground" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground leading-tight">
            Your Health, Our Priority
          </h2>

          <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto">
            For residents of {SITE_BARANGAY}: start your health assessment now. Our AI-powered triage will guide you to the right care, whether it is self-care advice or connecting you with a healthcare provider.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/symptom-checker">
              <Button
                size="xl"
                className="w-full sm:w-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-xl"
              >
                Start Health Check
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="w-full sm:w-auto border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
            >
              <a href={`tel:${SITE_HEALTH_CENTER_PHONE_TEL}`}>
                Contact BHW
                <Phone className="w-5 h-5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
