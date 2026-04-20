import { AppLogoMark } from "@/components/AppLogoMark";
import { Link } from "react-router-dom";
import { SITE_BARANGAY, SITE_HEALTH_CENTER_PHONE_DISPLAY, SITE_HEALTH_CENTER_PHONE_TEL } from "@/lib/site";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { motion } from "framer-motion";

export function Footer({ className }: { className?: string }) {
  const { t } = useTranslation();

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className={`bg-foreground text-primary-foreground relative overflow-hidden noise-overlay ${className || ""}`}>
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      
      {/* Background orbs */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
          {/* Brand & Mission */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3 group inline-flex">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg"
              >
                <AppLogoMark className="w-5 h-5 text-primary-foreground" />
              </motion.div>
              <div className="flex flex-col min-w-0">
                <span className="text-xl font-display font-bold leading-tight tracking-tight">TeleHealth</span>
                <span className="text-xs text-primary-foreground/50 uppercase tracking-widest">{SITE_BARANGAY}</span>
              </div>
            </Link>
            <p className="text-primary-foreground/60 text-[15px] leading-relaxed max-w-xs">
              {t("footer.tagline")}
            </p>
            <div className="pt-2">
              <LanguageSwitcher variant="compact" />
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-display font-bold mb-6 text-sm uppercase tracking-[0.2em] text-primary-foreground/90">{t("footer.quickLinks")}</h4>
            <ul className="space-y-4">
              {[
                { to: "/symptom-checker", label: t("footer.symptomChecker") },
                { to: "/consultations", label: t("footer.bookConsultation") },
                { onClick: () => handleScrollTo("about"), label: t("footer.aboutUs") },
                { onClick: () => handleScrollTo("faq"), label: t("footer.faqs") },
              ].map((link, i) => (
                <li key={i}>
                  {link.to ? (
                    <Link
                      to={link.to}
                      className="text-[15px] text-primary-foreground/60 hover:text-primary-foreground transition-all duration-300 group flex items-center gap-2"
                    >
                      <motion.span whileHover={{ x: 3 }}>{link.label}</motion.span>
                    </Link>
                  ) : (
                    <button
                      onClick={link.onClick}
                      className="text-[15px] text-primary-foreground/60 hover:text-primary-foreground transition-all duration-300 group flex items-center gap-2"
                    >
                      <motion.span whileHover={{ x: 3 }}>{link.label}</motion.span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Internal Portals */}
          <div>
            <h4 className="font-display font-bold mb-6 text-sm uppercase tracking-[0.2em] text-primary-foreground/90">{t("footer.forHealthWorkers")}</h4>
            <ul className="space-y-4">
              {[
                { to: "/dashboard", label: t("footer.bhwPortal") },
                { to: "/rhu-dashboard", label: t("footer.rhuDashboard") },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-[15px] text-primary-foreground/60 hover:text-primary-foreground transition-all duration-300 group flex items-center gap-2"
                  >
                    <motion.span whileHover={{ x: 3 }}>{link.label}</motion.span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency Contact Card */}
          <div>
            <h4 className="font-display font-bold mb-6 text-sm uppercase tracking-[0.2em] text-primary-foreground/90">{t("footer.emergencyContact")}</h4>
            <div className="bg-primary-foreground/[0.03] border border-primary-foreground/10 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
              <p className="text-xs font-medium text-primary-foreground/50 uppercase tracking-wider">
                {t("footer.healthCenter")}
              </p>
              <a 
                href={`tel:${SITE_HEALTH_CENTER_PHONE_TEL}`} 
                className="block text-2xl font-display font-bold text-accent hover:scale-[1.02] transition-transform origin-left"
              >
                {SITE_HEALTH_CENTER_PHONE_DISPLAY}
              </a>
              <p className="text-sm text-primary-foreground/40 leading-relaxed italic">
                {t("footer.emergencyAdvice")}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/10 mt-20 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-primary-foreground/30 font-medium uppercase tracking-widest">
            {t("footer.copyright")}
          </p>
          <div className="flex gap-8">
            <Link to="/privacy" className="text-xs font-semibold text-primary-foreground/30 hover:text-primary-foreground/60 transition-colors uppercase tracking-widest">
              {t("footer.privacy")}
            </Link>
            <Link to="/terms" className="text-xs font-semibold text-primary-foreground/30 hover:text-primary-foreground/60 transition-colors uppercase tracking-widest">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
