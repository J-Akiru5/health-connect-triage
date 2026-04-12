import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { SITE_BARANGAY, SITE_HEALTH_CENTER_PHONE_DISPLAY, SITE_HEALTH_CENTER_PHONE_TEL } from "@/lib/site";

export function Footer() {
  return (
    <footer className="bg-foreground text-primary-foreground py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xl font-bold leading-tight">TeleHealth</span>
                <span className="text-sm text-primary-foreground/80">{SITE_BARANGAY}</span>
              </div>
            </Link>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Telehealth and AI-assisted triage for residents of {SITE_BARANGAY}, bringing quality care closer to home.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/symptom-checker" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Symptom Checker
                </Link>
              </li>
              <li>
                <Link to="/consultations" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Book Consultation
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* For Health Workers */}
          <div>
            <h4 className="font-semibold mb-4">For Health Workers</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  BHW Portal
                </Link>
              </li>
              <li>
                <Link to="/rhu-dashboard" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  RHU Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Emergency Contact</h4>
            <ul className="space-y-2">
              <li className="text-sm text-primary-foreground/70">
                Barangay Health Center — {SITE_BARANGAY}
              </li>
              <li className="text-lg font-semibold text-accent">
                <a href={`tel:${SITE_HEALTH_CENTER_PHONE_TEL}`} className="hover:underline">
                  {SITE_HEALTH_CENTER_PHONE_DISPLAY}
                </a>
              </li>
              <li className="text-sm text-primary-foreground/70 pt-4">
                For emergencies, call immediately or proceed to the nearest hospital.
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/50">
            © 2026 TeleHealth. Serving {SITE_BARANGAY}.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm text-primary-foreground/50 hover:text-primary-foreground/70 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-primary-foreground/50 hover:text-primary-foreground/70 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
