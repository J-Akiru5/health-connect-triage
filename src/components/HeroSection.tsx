import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Clock, Users, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-telehealth.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-screen pt-16 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-background" />
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary))_0%,transparent_70%)]" />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-primary/20">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary-foreground">
                AI-Powered Healthcare for Rural Communities
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
              Quality Healthcare,{" "}
              <span className="text-primary">Closer to Home</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Connect with healthcare providers from your barangay. Our AI-assisted triage helps prioritize your health concerns, ensuring you get the right care at the right time.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/symptom-checker">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Check Your Symptoms
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="outline" size="xl" className="w-full sm:w-auto">
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-primary">24/7</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-primary">&lt;5min</p>
                <p className="text-sm text-muted-foreground">Triage Time</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-primary">Free</p>
                <p className="text-sm text-muted-foreground">For Residents</p>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative lg:order-last animate-fade-in">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={heroImage}
                alt="Healthcare worker helping patient with telehealth in rural barangay"
                className="w-full h-auto object-cover aspect-[4/3]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
            </div>

            {/* Floating Cards */}
            <div className="absolute -bottom-6 -left-6 bg-card rounded-xl p-4 shadow-xl border border-border animate-float">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-home-care/10 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-home-care" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">AI Triage</p>
                  <p className="text-xs text-muted-foreground">Smart prioritization</p>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 bg-card rounded-xl p-4 shadow-xl border border-border animate-float" style={{ animationDelay: "0.5s" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">500+</p>
                  <p className="text-xs text-muted-foreground">Patients Served</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
