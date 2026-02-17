import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-foreground text-primary-foreground py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">BarangayHealth</span>
            </Link>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Bringing quality healthcare closer to rural Filipino communities through technology and AI-assisted triage.
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
              <li>
                <Link to="/training" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Training Resources
                </Link>
              </li>
              <li>
                <Link to="/referrals" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Referral Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Emergency Contact</h4>
            <ul className="space-y-2">
              <li className="text-sm text-primary-foreground/70">
                Barangay Health Center
              </li>
              <li className="text-lg font-semibold text-accent">
                0917-123-4567
              </li>
              <li className="text-sm text-primary-foreground/70 pt-4">
                For emergencies, call immediately or proceed to the nearest hospital.
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/50">
            © 2026 BarangayHealth. A telehealth initiative for rural communities.
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
