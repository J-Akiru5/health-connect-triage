import { useRef } from "react";
import { useInView, useAnimation, type Variants } from "framer-motion";
import { useEffect } from "react";

type RevealType = "fade-up" | "fade-left" | "fade-right" | "scale";

const revealVariants: Record<RevealType, Variants> = {
  "fade-up": {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-left": {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  "fade-right": {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
};

type UseScrollRevealOptions = {
  type?: RevealType;
  threshold?: number;
  once?: boolean;
  delay?: number;
  duration?: number;
};

export function useScrollReveal(options: UseScrollRevealOptions = {}) {
  const {
    type = "fade-up",
    threshold = 0.15,
    once = true,
    delay = 0,
    duration = 0.6,
  } = options;

  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    } else if (!once) {
      controls.start("hidden");
    }
  }, [isInView, controls, once]);

  return {
    ref,
    controls,
    variants: revealVariants[type],
    initial: "hidden",
    animate: controls,
    transition: {
      duration,
      delay,
      ease: [0.25, 0.1, 0.25, 1],
    },
  };
}

/** Stagger container variants for parent elements */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

/** Child item variants for stagger animations */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};
