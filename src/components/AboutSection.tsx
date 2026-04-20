import { Card, CardContent } from "@/components/ui/card";
import { Heart, Shield, Lightbulb, Users, Target, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export function AboutSection() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  const values = [
    { icon: Heart, key: "compassion", color: "from-rose-500/20 to-rose-500/5", iconColor: "text-rose-500", borderColor: "hover:border-rose-500/30" },
    { icon: Shield, key: "trustPrivacy", color: "from-primary/20 to-primary/5", iconColor: "text-primary", borderColor: "hover:border-primary/30" },
    { icon: Lightbulb, key: "innovation", color: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-500", borderColor: "hover:border-amber-500/30" },
    { icon: Users, key: "community", color: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-500", borderColor: "hover:border-violet-500/30" },
  ];

  return (
    <section id="about" className="py-20 lg:py-32 relative noise-overlay" ref={ref}>
      {/* Floating orb */}
      <motion.div
        animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="floating-orb w-[500px] h-[500px] bg-primary/5 top-0 right-0 z-0"
      />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 z-[2]">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mb-16 lg:mb-20"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={isInView ? { width: 60 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="h-1 bg-primary rounded-full mb-6"
          />
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground tracking-tight mb-6">
            {t("about.headline")} <span className="text-gradient">{t("about.headlineAccent")}</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            {t("about.description")}
          </p>
        </motion.div>

        {/* Mission & Vision */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-2 gap-6 mb-16"
        >
          <motion.div variants={fadeUp}>
            <Card className="h-full border-border/40 overflow-hidden group hover:shadow-xl transition-all duration-500">
              <div className="h-1.5 bg-gradient-to-r from-primary to-primary/40" />
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Target className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3 font-display">{t("about.missionTitle")}</h3>
                <p className="text-muted-foreground leading-relaxed">{t("about.missionDesc")}</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={fadeUp}>
            <Card className="h-full border-border/40 overflow-hidden group hover:shadow-xl transition-all duration-500">
              <div className="h-1.5 bg-gradient-to-r from-accent to-accent/40" />
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Eye className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3 font-display">{t("about.visionTitle")}</h3>
                <p className="text-muted-foreground leading-relaxed">{t("about.visionDesc")}</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Values */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-10"
        >
          <h3 className="text-2xl font-display font-bold text-foreground mb-8">{t("about.valuesTitle")}</h3>
        </motion.div>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {values.map((v) => (
            <motion.div key={v.key} variants={fadeUp}>
              <Card className={`h-full border-border/40 ${v.borderColor} transition-all duration-500 hover:shadow-lg group cursor-default`}>
                <CardContent className="p-6">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${v.color} flex items-center justify-center mb-4`}
                  >
                    <v.icon className={`w-6 h-6 ${v.iconColor}`} />
                  </motion.div>
                  <h4 className="font-semibold text-foreground mb-2">{t(`about.${v.key}`)}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`about.${v.key}Desc`)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
