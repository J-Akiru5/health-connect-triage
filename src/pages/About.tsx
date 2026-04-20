import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Target, 
  Eye, 
  Users, 
  Shield, 
  Lightbulb, 
  ArrowRight,
  Stethoscope,
  MapPin,
  Clock
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { SITE_BARANGAY } from "@/lib/site";
import { AppLogoMark } from "@/components/AppLogoMark";
import { ArrowLeft } from "lucide-react";

const About = () => {
  const navigate = useNavigate();

  const values = [
    {
      icon: Heart,
      title: "Compassion",
      description: "We believe healthcare is a fundamental right. Every person deserves access to quality medical care, regardless of where they live.",
      color: "text-primary bg-primary/10",
    },
    {
      icon: Shield,
      title: "Trust & Privacy",
      description: "Your health data is sacred. We implement the highest security standards to protect your personal information and medical records.",
      color: "text-accent bg-accent/10",
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "We leverage cutting-edge AI technology to make healthcare more accessible, efficient, and effective for rural communities.",
      color: "text-home-care bg-home-care/10",
    },
    {
      icon: Users,
      title: "Community-Centered",
      description: "We work with local health workers, barangay officials, and community members to ensure our solutions meet real needs.",
      color: "text-urgent bg-urgent/10",
    },
  ];

  const stats = [
    { number: "Tabat", label: "Our barangay", icon: MapPin },
    { number: "24/7", label: "Available Support", icon: Clock },
    { number: "<5min", label: "Average Triage Time", icon: Stethoscope },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-background" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary))_0%,transparent_70%)]" />
        </div>
        
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute left-4 top-0 md:left-8 gap-2 bg-background/50 hover:bg-background/80 backdrop-blur-sm z-10" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="max-w-4xl mx-auto text-center space-y-8 mt-12 md:mt-0">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-primary/20">
              <AppLogoMark className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary-foreground">
                About TeleHealth — {SITE_BARANGAY}
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Bringing Quality Healthcare{" "}
              <span className="text-primary">Closer to Home</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              We serve {SITE_BARANGAY} with a mission to bridge the healthcare gap through innovative technology, AI-assisted triage, and strong partnerships with local health workers and the rural health unit.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To make quality healthcare accessible to every Filipino, especially those in rural and underserved communities, by leveraging technology to connect patients with healthcare providers and empowering local health workers.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-accent/20 hover:border-accent/40 transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                  <Eye className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Our Vision</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A Philippines where geographic location and economic status are no longer barriers to quality healthcare. We envision a future where every barangay has access to modern telehealth services supported by AI and local health workers.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* The Problem We're Solving */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                The Challenge We're Addressing
              </h2>
              <p className="text-lg text-muted-foreground">
                Rural communities in the Philippines face significant barriers to accessing quality healthcare.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">Geographic Barriers</h3>
                  <p className="text-sm text-muted-foreground">
                    Many rural residents must travel long distances to reach the nearest health center or hospital, often requiring expensive transportation and time away from work.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">Limited Resources</h3>
                  <p className="text-sm text-muted-foreground">
                    Rural health units and barangay health centers often have limited staff, equipment, and supplies to serve their communities effectively.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">Delayed Care</h3>
                  <p className="text-sm text-muted-foreground">
                    Without proper triage, patients may delay seeking care or seek care at inappropriate levels, leading to worse health outcomes.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">Information Gaps</h3>
                  <p className="text-sm text-muted-foreground">
                    Patients often lack information about when to seek care, what symptoms are concerning, and how to access available health services.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Our Core Values
            </h2>
            <p className="text-lg text-muted-foreground">
              These principles guide everything we do and every decision we make.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <Card
                key={value.title}
                className="group border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${value.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <value.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Our Impact
            </h2>
            <p className="text-lg text-muted-foreground">
              Making a difference in communities across the Philippines
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {stats.map((stat, index) => (
              <Card key={stat.label} className="text-center border-border hover:border-primary/30 transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-primary mb-2">{stat.number}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Partners & Support */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Working Together for Better Health
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              TeleHealth for {SITE_BARANGAY} is made possible through partnerships with:
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">Barangay Health Workers</h3>
                  <p className="text-sm text-muted-foreground">
                    Our frontline partners who conduct assessments and provide community health services.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">Rural Health Units</h3>
                  <p className="text-sm text-muted-foreground">
                    Local health facilities that provide consultations and coordinate referrals to hospitals.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">Community Leaders</h3>
                  <p className="text-sm text-muted-foreground">
                    Barangay officials and community organizations that help us reach and serve residents.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
        
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm">
              <AppLogoMark className="w-8 h-8 text-primary-foreground" />
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground leading-tight">
              Join Us in Transforming Healthcare
            </h2>

            <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto">
              Whether you are a resident, health worker, or community leader in {SITE_BARANGAY}, there is a place for you in our mission to make healthcare accessible for all.
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
              <Link to="/faq">
                <Button
                  size="xl"
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
