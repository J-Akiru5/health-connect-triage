import { Card, CardContent } from "@/components/ui/card";
import { Stethoscope, Video, Shield, Clock, Users, FileText } from "lucide-react";

const features = [
  {
    icon: Stethoscope,
    title: "AI-Assisted Triage",
    description: "Smart symptom analysis that prioritizes cases based on urgency, helping you get the right care faster.",
    color: "text-primary bg-primary/10",
  },
  {
    icon: Video,
    title: "Remote Consultations",
    description: "Connect with doctors and nurses via chat, voice, or video—optimized for low-bandwidth connections.",
    color: "text-accent bg-accent/10",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Access health assessments anytime. Our AI triage system is always ready to help prioritize your concerns.",
    color: "text-home-care bg-home-care/10",
  },
  {
    icon: Shield,
    title: "Secure Health Records",
    description: "Your medical history, consultations, and referrals are stored securely with role-based access control.",
    color: "text-urgent bg-urgent/10",
  },
  {
    icon: Users,
    title: "BHW Support",
    description: "Tools designed for Barangay Health Workers to conduct initial assessments and manage referrals.",
    color: "text-primary bg-primary/10",
  },
  {
    icon: FileText,
    title: "Smart Referrals",
    description: "Automated referral system to RHUs and hospitals with complete patient information for continuity of care.",
    color: "text-non-urgent bg-non-urgent/10",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Healthcare Made Accessible
          </h2>
          <p className="text-lg text-muted-foreground">
            Our platform bridges the gap between rural communities and quality healthcare through modern technology and AI assistance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="group border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
