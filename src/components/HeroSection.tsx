import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-telehealth.jpg";
import { SITE_BARANGAY } from "@/lib/site";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 min-h-[calc(80svh-4rem)] lg:min-h-[calc(100svh-4rem)]">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-background" />
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary))_0%,transparent_70%)]" />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Content */}
          <div className="space-y-7 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-primary/20">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary-foreground">
                Telehealth for {SITE_BARANGAY}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
              Quality Healthcare,{" "}
              <span className="text-primary">Closer to Home</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Connect with healthcare providers serving {SITE_BARANGAY}. Guided symptom checks and teleconsult options help you take the right next step for your health.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/symptom-checker">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Check Your Symptoms
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
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
                alt={`Healthcare worker helping patient with telehealth in ${SITE_BARANGAY}`}
                className="w-full h-auto object-cover aspect-[4/3]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
