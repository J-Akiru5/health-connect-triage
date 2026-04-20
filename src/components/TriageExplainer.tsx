import { AlertTriangle, AlertCircle, Clock, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const triageLevels = [
  {
    levelKey: "emergency",
    icon: AlertTriangle,
    color: "from-emergency/40 to-emergency/5",
    iconColor: "text-emergency",
    dotColor: "bg-emergency",
    borderColor: "group-hover:border-emergency/30",
  },
  {
    levelKey: "urgent",
    icon: AlertCircle,
    color: "from-urgent/40 to-urgent/5",
    iconColor: "text-urgent",
    dotColor: "bg-urgent",
    borderColor: "group-hover:border-urgent/30",
  },
  {
    levelKey: "nonUrgent",
    icon: Clock,
    color: "from-non-urgent/40 to-non-urgent/5",
    iconColor: "text-non-urgent",
    dotColor: "bg-non-urgent",
    borderColor: "group-hover:border-non-urgent/30",
  },
  {
    levelKey: "homeCare",
    icon: Home,
    color: "from-home-care/40 to-home-care/5",
    iconColor: "text-home-care",
    dotColor: "bg-home-care",
    borderColor: "group-hover:border-home-care/30",
  },
] as const;

export function TriageExplainer() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section className="py-20 lg:py-32 relative noise-overlay" ref={ref}>
      {/* Background decoration */}
      <div className="absolute inset-0 dot-grid opacity-30 z-0" />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0"
      />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-16 lg:mb-24"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={isInView ? { width: 60 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="h-1 bg-primary rounded-full mb-6 mx-auto"
          />
          <h2 className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-6 tracking-tight">
            {t("triage.sectionTitle")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("triage.sectionDescription")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {triageLevels.map((triage, index) => (
            <motion.div
              key={triage.levelKey}
              initial={{ opacity: 0, y: 40, rotateX: -15 }}
              animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
              transition={{
                duration: 0.7,
                delay: 0.1 + index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ perspective: "1000px" }}
            >
              <div className={`group relative h-full rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-7 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${triage.borderColor}`}>
                {/* Background glow trail */}
                <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-2xl bg-gradient-to-b ${triage.color}`} />

                <div className="flex flex-col h-full relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: 8 }}
                      className={`w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-all`}
                    >
                      <triage.icon className={`w-6 h-6 ${triage.iconColor}`} />
                    </motion.div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${triage.dotColor} pulse-ring shadow-lg`} />
                      <h3 className="font-display font-bold text-lg text-foreground tracking-tight">
                        {t(`triage.${triage.levelKey}`)}
                      </h3>
                    </div>
                  </div>

                  <p className="text-[15px] text-foreground font-semibold mb-4 leading-relaxed line-clamp-2">
                    {t(`triage.${triage.levelKey}Desc`)}
                  </p>

                  <div className="mt-auto space-y-2 pt-6 border-t border-border/40">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                      {t("triage.examples")}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      {t(`triage.${triage.levelKey}Examples`)}
                    </p>
                  </div>
                </div>

                {/* Hover decorative element */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-tr from-white/10 to-white/30 blur-sm pointer-events-none"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
