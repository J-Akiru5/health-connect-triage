import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Clock, Home } from "lucide-react";

const triageLevels = [
  {
    level: "Emergency",
    icon: AlertTriangle,
    description: "Immediate medical attention required. Life-threatening conditions.",
    examples: "Chest pain, difficulty breathing, severe bleeding, loss of consciousness",
    color: "bg-emergency text-emergency-foreground",
    borderColor: "border-emergency",
    iconBg: "bg-emergency/20 text-emergency",
  },
  {
    level: "Urgent",
    icon: AlertCircle,
    description: "Needs attention within hours. Significant symptoms requiring prompt care.",
    examples: "High fever, moderate pain, persistent vomiting, suspected fractures",
    color: "bg-urgent text-urgent-foreground",
    borderColor: "border-urgent",
    iconBg: "bg-urgent/20 text-urgent",
  },
  {
    level: "Non-Urgent",
    icon: Clock,
    description: "Can wait for scheduled consultation. Mild symptoms without immediate risk.",
    examples: "Minor cold, skin rashes, mild headaches, follow-up consultations",
    color: "bg-non-urgent text-non-urgent-foreground",
    borderColor: "border-non-urgent",
    iconBg: "bg-non-urgent/20 text-non-urgent",
  },
  {
    level: "Home Care",
    icon: Home,
    description: "Self-care with guidance. Conditions manageable at home with proper advice.",
    examples: "Common cold, minor cuts, rest and hydration cases",
    color: "bg-home-care text-home-care-foreground",
    borderColor: "border-home-care",
    iconBg: "bg-home-care/20 text-home-care",
  },
];

export function TriageExplainer() {
  return (
    <section className="py-14 lg:py-16 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            How urgency levels work
          </h2>
          <p className="text-lg text-muted-foreground">
            Your answers are grouped into care levels so you can see what kind of follow-up may fit. This is guidance only—not a medical diagnosis.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {triageLevels.map((triage, index) => (
            <Card
              key={triage.level}
              className={`border-2 ${triage.borderColor} overflow-hidden animate-fade-in`}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <CardHeader className={`${triage.color} py-4`}>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <triage.icon className="w-5 h-5" />
                  {triage.level}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <p className="text-sm text-foreground font-medium">
                  {triage.description}
                </p>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Examples
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {triage.examples}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
