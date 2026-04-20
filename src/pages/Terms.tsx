import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ShieldAlert, UserCheck, Mail, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { SITE_BARANGAY } from "@/lib/site";
import { Button } from "@/components/ui/button";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-20 pb-14 flex-1 max-w-5xl">
        <div className="mb-6 mx-auto">
          <Button variant="ghost" size="sm" className="mb-4 -ml-3 gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Terms of Service
          </h1>
          <p className="text-muted-foreground mt-1">
            Please read these terms carefully before using TeleHealth for {SITE_BARANGAY}. Last
            updated: 2026.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                TeleHealth provides telehealth support, secure messaging,
                and AI-assisted triage tools for {SITE_BARANGAY} to help patients and health workers
                coordinate care. By using this service, you agree to follow
                these terms and all applicable laws and regulations.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldAlert className="w-5 h-5" />
                Not for emergencies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                This platform is not an emergency service. If you believe you
                are experiencing a medical emergency, call your local emergency
                number or go to the nearest hospital immediately.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="w-5 h-5" />
                Your responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                You agree to provide accurate information, keep your account
                credentials confidential, and use the service respectfully. Do
                not submit unlawful, harmful, or misleading content.
              </p>
              <p>
                Health information you submit may be used to generate triage
                guidance. Triage results are informational and do not replace a
                licensed clinician’s judgment.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Our handling of personal and health information is described in
                our{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy &amp; Data Use Notice
                </Link>
                .
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="w-5 h-5" />
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Questions about these terms should be raised through your
                Barangay Health Worker or the health facility linked to this
                platform.
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          <Link to="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}

