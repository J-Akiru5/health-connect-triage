import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, FileText, Mail, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { SITE_BARANGAY } from "@/lib/site";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20 flex-1 max-w-5xl">
        <div className="mb-8 mx-auto">
          <Button variant="ghost" size="sm" className="mb-4 -ml-3 gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Privacy & Data Use Notice
          </h1>
          <p className="text-muted-foreground mt-1">
            How we collect, use, and protect your information for residents of {SITE_BARANGAY}. Last updated: 2026.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                What data we collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                To provide telehealth support and AI-assisted triage, we collect: your name, contact details (email, phone), barangay, date of birth, sex, address, and the health information you or your Barangay Health Worker (BHW) enter—including symptoms, medical history (e.g. conditions, medications, allergies), triage results, and consultation messages and notes.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                How we use your data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Care:</strong> Your data is used to deliver triage support, referrals, and continuity of care. Only authorized health workers and clinicians involved in your care can access your records.
              </p>
              <p>
                <strong className="text-foreground">Research (if you consented):</strong> If you agreed to research use, de-identified or anonymized data may be used for studies to improve rural telehealth and triage. Research is conducted in line with ethics approvals and consent.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Telehealth disclaimer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                This platform supports telehealth and triage for guidance only. It does not replace in-person medical evaluation, diagnosis, or treatment. Advice given here is for support and should be followed by consultation with a licensed healthcare provider when needed. In an emergency, call emergency services or go to the nearest hospital immediately.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="w-5 h-5" />
                Data security and encryption
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Your data is <strong className="text-foreground">encrypted in transit</strong> (HTTPS) and <strong className="text-foreground">encrypted at rest</strong> using Supabase infrastructure. Access is restricted by role (patient, BHW, clinician, admin) and logged for audit. We do not sell your personal or health information.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5" />
                Your rights (RA 10173 – Data Privacy Act)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Under the Philippine Data Privacy Act of 2012 (RA 10173), you have the right to know what personal data we hold, to correct it, to withdraw consent (where applicable), and to lodge a complaint with the National Privacy Commission. To exercise these rights or ask questions about this notice, contact us using the details below.
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
                For privacy requests, consent questions, or feedback: reach out through your Barangay Health Worker or the health facility linked to this platform. For technical or data protection inquiries, use the contact information provided by your barangay or RHU.
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          <Link to="/" className="text-primary hover:underline">Back to home</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
