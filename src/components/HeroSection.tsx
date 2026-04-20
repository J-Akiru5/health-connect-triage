import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity, Phone, ShieldCheck, Stethoscope, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-telehealth.jpg";
import { SITE_BARANGAY, SITE_HEALTH_CENTER_PHONE_DISPLAY } from "@/lib/site";
import { useTranslation } from "react-i18next";
import { motion, useScroll, useTransform, useInView, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

function AnimatedStat({ value, label }: { value: string; label: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref}>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-3xl sm:text-4xl font-bold text-primary tracking-tight font-display"
      >
        {value}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-sm text-muted-foreground mt-0.5"
      >
        {label}
      </motion.p>
    </div>
  );
}

export function HeroSection() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 500], [0, reduceMotion ? 0 : 90]);
  const imageScale = useTransform(scrollY, [0, 500], [1, reduceMotion ? 1 : 1.08]);
  const contentOpacity = useTransform(scrollY, [0, 380], [1, 0]);

  return (
    <section className="relative overflow-hidden min-h-[100svh] flex items-center noise-overlay" aria-label="Hero section">
      <motion.div style={{ y: imageY, scale: imageScale }} className="absolute inset-0 z-0 [will-change:transform]">
        <img
          src={heroImage}
          alt={`Healthcare in ${SITE_BARANGAY}`}
          className="w-full h-full object-cover"
          loading="eager"
          decoding="async"
          style={{ animation: reduceMotion ? "none" : "ken-burns 28s ease-in-out infinite" }}
        />
      </motion.div>

      <div className="absolute inset-0 hero-cinematic-overlay z-[1]" />
      <div className="absolute inset-0 hero-vignette z-[1]" />
      <div className="absolute inset-0 dot-grid z-[1] opacity-[0.22]" />

      {!reduceMotion ? (
        <>
          <motion.div
            animate={{ x: [0, 28, -16, 0], y: [0, -22, 12, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="floating-orb w-[480px] h-[480px] bg-primary/14 -top-44 -right-36 z-[1]"
          />
          <motion.div
            animate={{ x: [0, -18, 22, 0], y: [0, 14, -18, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="floating-orb w-[360px] h-[360px] bg-destructive/10 -bottom-24 -left-24 z-[1]"
          />
        </>
      ) : null}

      <motion.div
        style={{ opacity: contentOpacity }}
        className="container relative mx-auto px-4 sm:px-6 lg:px-8 z-[2] pt-24 pb-16 [will-change:opacity]"
      >
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-end">
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mb-7"
            >
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-card">
                <div className="relative">
                  <div className="w-2 h-2 bg-home-care rounded-full" />
                  {!reduceMotion ? (
                    <div className="absolute inset-0 w-2 h-2 bg-home-care rounded-full pulse-ring" />
                  ) : null}
                </div>
                <span className="text-sm font-semibold text-foreground/90 tracking-wide">{t("hero.badge")}</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl sm:text-6xl lg:text-7xl xl:text-[5.4rem] font-display font-bold text-foreground leading-[1.02] tracking-tight mb-5 text-balance"
            >
              {t("hero.headline")}
              <span className="block text-gradient mt-1">{t("hero.headlineAccent")}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed"
            >
              {t("hero.description")}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 text-sm sm:text-base text-foreground/80 font-medium max-w-2xl"
            >
              {t("hero.offerLine")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.62, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 flex flex-wrap gap-2.5"
            >
              <div className="hero-trust-chip">
                <Stethoscope className="w-3.5 h-3.5 text-primary" />
                <span>{t("hero.chip1")}</span>
              </div>
              <div className="hero-trust-chip">
                <CalendarClock className="w-3.5 h-3.5 text-primary" />
                <span>{t("hero.chip2")}</span>
              </div>
              <div className="hero-trust-chip">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>{t("hero.chip3")}</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row gap-3.5 mt-9"
            >
              <Link to={session ? "/dashboard" : "/symptom-checker"}>
                <motion.div whileHover={reduceMotion ? undefined : { scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="hero"
                    size="xl"
                    className="w-full sm:w-auto group shadow-xl hover:shadow-2xl text-base px-8"
                  >
                    {session ? t("nav.dashboard") : t("hero.ctaPrimary")}
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </motion.div>
              </Link>

              <Link to={session ? "/consultations" : "/login"}>
                <motion.div whileHover={reduceMotion ? undefined : { scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="glass" size="xl" className="w-full sm:w-auto text-base px-8 border-border/60">
                    {session ? t("nav.consultations") : t("hero.ctaConsultation")}
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.9 }}
              className="mt-3 text-xs sm:text-sm text-muted-foreground font-medium"
            >
              {t("hero.ctaNote")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 }}
              className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-5 pt-7 border-t border-border/50"
            >
              <AnimatedStat value={t("hero.stat1Value")} label={t("hero.stat1Label")} />
              <AnimatedStat value={t("hero.stat2Value")} label={t("hero.stat2Label")} />
              <AnimatedStat value={t("hero.stat3Value")} label={t("hero.stat3Label")} />
              <AnimatedStat value={t("hero.stat4Value")} label={t("hero.stat4Label")} />
            </motion.div>
          </div>

          <motion.aside
            initial={{ opacity: 0, x: reduceMotion ? 0 : 24, y: reduceMotion ? 0 : 14 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.95, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-4 mt-1 lg:mt-0"
          >
            <div className="glass-card rounded-2xl p-5 shadow-xl border-border/60">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-border/40">
                <div>
                  <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                    {t("hero.workflowLabel")}
                  </p>
                  <p className="text-base font-bold mt-1">{t("hero.liveStatus")}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="space-y-3.5 py-4">
                <div className="flex items-center gap-3">
                  <Stethoscope className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-sm text-foreground/90">{t("hero.workflowPoint1")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarClock className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-sm text-foreground/90">{t("hero.workflowPoint2")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-sm text-foreground/90">{t("hero.workflowPoint3")}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 space-y-2">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-semibold">{SITE_BARANGAY}</p>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground font-medium">{SITE_HEALTH_CENTER_PHONE_DISPLAY}</p>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      </motion.div>

      {!reduceMotion ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.25 }}
          className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 z-[2]"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2"
          >
            <motion.div
              animate={{ opacity: [1, 0], y: [0, 12] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-1 h-2 bg-muted-foreground/50 rounded-full"
            />
          </motion.div>
        </motion.div>
      ) : null}
    </section>
  );
}
