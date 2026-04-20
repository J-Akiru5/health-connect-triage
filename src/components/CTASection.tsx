import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { SITE_HEALTH_CENTER_PHONE_TEL } from "@/lib/site";
import { AppLogoMark } from "@/components/AppLogoMark";
import { useTranslation } from "react-i18next";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function CTASection() {
  const { t } = useTranslation();
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 45]);

  return (
    <section ref={sectionRef} className="py-24 lg:py-32 relative overflow-hidden noise-overlay">
      {/* Cinematic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.1)_0%,transparent_50%)]" />

      {/* Animated floating glass elements */}
      <motion.div
        style={{ y: y1, rotate }}
        className="absolute top-20 left-[8%] w-32 h-32 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-md hidden lg:block"
      />
      <motion.div
        style={{ y: y2, rotate: -rotate }}
        className="absolute bottom-20 right-[10%] w-48 h-48 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hidden lg:block"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-[20%] w-4 h-4 rounded-full bg-white/20 hidden lg:block"
      />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
          >
            <AppLogoMark className="w-8 h-8 text-primary-foreground" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold text-primary-foreground leading-[1.1] tracking-tight"
          >
            {t("cta.headline")}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg sm:text-xl text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed"
          >
            {t("cta.description")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row gap-5 justify-center pt-6"
          >
            <Link to="/symptom-checker">
              <Button
                size="xl"
                className="w-full sm:w-auto bg-primary-foreground text-primary hover:bg-white hover:scale-105 active:scale-95 shadow-2xl transition-all duration-300 group rounded-2xl h-16 px-10 text-lg font-bold"
              >
                {t("cta.primaryButton")}
                <ArrowRight className="w-6 h-6 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="w-full sm:w-auto border-2 border-white/20 text-primary-foreground hover:bg-white/10 hover:border-white/40 backdrop-blur-sm rounded-2xl h-16 px-10 text-lg font-bold transition-all duration-300"
            >
              <a href={`tel:${SITE_HEALTH_CENTER_PHONE_TEL}`}>
                {t("cta.secondaryButton")}
                <Phone className="w-6 h-6 ml-2" />
              </a>
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Background grain texture bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-[1]" />
    </section>
  );
}
