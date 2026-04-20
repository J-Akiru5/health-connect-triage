import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-telehealth.jpg";
import { SITE_BARANGAY } from "@/lib/site";
import { useTranslation } from "react-i18next";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

/* ── Animated counter ── */
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

/* ── Word-by-word text reveal ── */
function TextReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.5,
            delay: delay + i * 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="inline-block mr-[0.3em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

export function HeroSection() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden min-h-[100svh] flex items-center noise-overlay"
    >
      {/* Background image with Ken Burns + parallax */}
      <motion.div
        style={{ y: imageY, scale: imageScale }}
        className="absolute inset-0 z-0"
      >
        <img
          src={heroImage}
          alt={`Healthcare in ${SITE_BARANGAY}`}
          className="w-full h-full object-cover"
          style={{ animation: "ken-burns 25s ease-in-out infinite" }}
        />
      </motion.div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 hero-video-overlay z-[1]" />

      {/* Floating gradient orbs */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="floating-orb w-[500px] h-[500px] bg-primary/10 -top-40 -right-40 z-[1]"
      />
      <motion.div
        animate={{
          x: [0, -20, 30, 0],
          y: [0, 30, -20, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="floating-orb w-[400px] h-[400px] bg-accent/8 bottom-0 -left-40 z-[1]"
      />

      {/* Content */}
      <motion.div
        style={{ opacity: contentOpacity }}
        className="container relative mx-auto px-4 sm:px-6 lg:px-8 z-[2] pt-24 pb-16"
      >
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-card">
              <div className="relative">
                <div className="w-2 h-2 bg-home-care rounded-full" />
                <div className="absolute inset-0 w-2 h-2 bg-home-care rounded-full pulse-ring" />
              </div>
              <span className="text-sm font-medium text-foreground/80">
                {t("hero.badge")}
              </span>
            </div>
          </motion.div>

          {/* Headline with word-by-word reveal */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-display font-bold text-foreground leading-[1.05] tracking-tight mb-6">
            <TextReveal text={t("hero.headline")} delay={0.4} />
            <br />
            <TextReveal
              text={t("hero.headlineAccent")}
              className="text-gradient"
              delay={0.8}
            />
          </h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed mb-10"
          >
            {t("hero.description")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row gap-4 mb-14"
          >
            <Link to={session ? "/dashboard" : "/symptom-checker"}>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button variant="hero" size="xl" className="w-full sm:w-auto group shadow-xl hover:shadow-2xl text-base px-8">
                  {session ? t("nav.dashboard") : t("hero.ctaPrimary")}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
            </Link>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="outline"
                size="xl"
                className="w-full sm:w-auto text-base px-8 border-2 backdrop-blur-sm"
                onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
              >
                {t("hero.ctaSecondary")}
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
            className="grid grid-cols-3 gap-8 pt-8 border-t border-border/40"
          >
            <AnimatedStat value={t("hero.stat1Value")} label={t("hero.stat1Label")} />
            <AnimatedStat value={t("hero.stat2Value")} label={t("hero.stat2Label")} />
            <AnimatedStat value={t("hero.stat3Value")} label={t("hero.stat3Label")} />
          </motion.div>
        </div>

        {/* Floating status card */}
        <motion.div
          initial={{ opacity: 0, x: 40, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: 2.0, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex absolute right-12 bottom-32 glass-card rounded-2xl px-5 py-4 items-center gap-4 shadow-xl"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-home-care rounded-full pulse-ring" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{t("hero.liveStatus")}</p>
            <p className="text-xs text-muted-foreground">Serving {SITE_BARANGAY} — 24/7</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2]"
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
    </section>
  );
}
