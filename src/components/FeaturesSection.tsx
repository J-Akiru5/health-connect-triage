import { Card, CardContent } from "@/components/ui/card";
import { Stethoscope, Shield, Clock, Users, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
} as const;

const cardVariant = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

/* 3D tilt effect */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotateX((y - centerY) / 15);
    setRotateY((centerX - x) / 15);
  }

  function handleMouseLeave() {
    setRotateX(0);
    setRotateY(0);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: "transform 0.15s ease-out",
      }}
    >
      {children}
    </div>
  );
}

export function FeaturesSection() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  const features = [
    {
      icon: Stethoscope,
      title: t("features.symptomGuidance"),
      description: t("features.symptomGuidanceDesc"),
      gradient: "from-primary/20 via-primary/10 to-transparent",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      span: "lg:col-span-2 lg:row-span-2",
      large: true,
    },
    {
      icon: Clock,
      title: t("features.availability"),
      description: t("features.availabilityDesc"),
      gradient: "from-home-care/20 via-home-care/10 to-transparent",
      iconColor: "text-home-care",
      iconBg: "bg-home-care/10",
      span: "",
      large: false,
    },
    {
      icon: Shield,
      title: t("features.secureRecords"),
      description: t("features.secureRecordsDesc"),
      gradient: "from-urgent/20 via-urgent/10 to-transparent",
      iconColor: "text-urgent",
      iconBg: "bg-urgent/10",
      span: "",
      large: false,
    },
    {
      icon: Users,
      title: t("features.bhwSupport"),
      description: t("features.bhwSupportDesc"),
      gradient: "from-violet-500/20 via-violet-500/10 to-transparent",
      iconColor: "text-violet-500",
      iconBg: "bg-violet-500/10",
      span: "",
      large: false,
    },
    {
      icon: FileText,
      title: t("features.smartReferrals"),
      description: t("features.smartReferralsDesc"),
      gradient: "from-non-urgent/20 via-non-urgent/10 to-transparent",
      iconColor: "text-non-urgent",
      iconBg: "bg-non-urgent/10",
      span: "",
      large: false,
    },
  ];

  return (
    <section className="py-20 lg:py-32 relative noise-overlay" ref={ref}>
      {/* Floating orb */}
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="floating-orb w-[600px] h-[600px] bg-primary/5 -bottom-60 -left-60 z-0"
      />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 z-[2]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-14 lg:mb-20"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={isInView ? { width: 60 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="h-1 bg-primary rounded-full mb-6 mx-auto"
          />
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground mb-5 tracking-tight">
            {t("features.sectionTitle")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("features.sectionDescription")}
          </p>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariant}
              className={feature.span}
            >
              <TiltCard className="h-full">
                <Card className="h-full border-border/40 overflow-hidden group hover:border-primary/20 transition-all duration-500 hover:shadow-xl cursor-default relative">
                  {/* Gradient background on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  <CardContent className={`relative ${feature.large ? "p-8 lg:p-10" : "p-6 lg:p-7"} flex flex-col h-full`}>
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className={`${feature.large ? "w-14 h-14" : "w-11 h-11"} rounded-xl ${feature.iconBg} flex items-center justify-center mb-5`}
                    >
                      <feature.icon className={`${feature.large ? "w-7 h-7" : "w-5 h-5"} ${feature.iconColor}`} />
                    </motion.div>
                    <h3 className={`${feature.large ? "text-2xl" : "text-lg"} font-bold text-foreground mb-3 tracking-tight font-display`}>
                      {feature.title}
                    </h3>
                    <p className={`text-muted-foreground leading-relaxed ${feature.large ? "text-base" : "text-[15px]"}`}>
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
