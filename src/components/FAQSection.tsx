import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Building2 } from "lucide-react";
import { SITE_BARANGAY } from "@/lib/site";
import { useTranslation } from "react-i18next";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export function FAQSection() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  const faqs = [
    {
      question: "What is TeleHealth?",
      answer: `TeleHealth is the telehealth platform for ${SITE_BARANGAY}. It brings quality healthcare services closer to home using AI-assisted triage to help assess symptoms and connect with healthcare professionals.`,
    },
    {
      question: "How does the symptom checker work?",
      answer: "Our AI-powered symptom checker asks a series of questions about your symptoms and condition. Based on responses, it provides a preliminary assessment and recommends the appropriate level of care.",
    },
    {
      question: "Is this a replacement for medical consultation?",
      answer: "No. It's a triage tool to help understand urgency and guide you to the right care. Always consult a healthcare professional for proper diagnosis and treatment.",
    },
    {
      question: "How do I book a consultation?",
      answer: `Select your preferred date and time through our platform. We'll connect you with available healthcare workers at the barangay health center or RHU serving ${SITE_BARANGAY}.`,
    },
    {
      question: "Is my health information secure?",
      answer: "Yes. All personal health information is encrypted and stored securely. We comply with data protection regulations and only share with authorized healthcare professionals.",
    },
    {
      question: "What should I do in an emergency?",
      answer: "Call the emergency hotline (0917-123-4567) immediately or proceed to the nearest hospital. Do not rely on this platform for life-threatening emergencies.",
    },
    {
      question: "How much does it cost?",
      answer: "The symptom checker and basic features are free. Consultation fees may vary depending on the service and your local health center's policies.",
    },
    {
      question: "How accurate is the AI symptom checker?",
      answer: "It uses evidence-based medical guidelines for preliminary assessments. It's a screening tool — accuracy depends on information provided and should be followed by professional evaluation.",
    },
  ];

  return (
    <section id="faq" className="py-20 lg:py-32 relative dot-grid" ref={ref}>
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 z-[2]">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-14"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={isInView ? { width: 60 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="h-1 bg-primary rounded-full mb-6 mx-auto"
            />
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-foreground tracking-tight mb-4">
              {t("faq.title")}
            </h2>
            <p className="text-lg text-muted-foreground">{t("faq.subtitle")}</p>
          </motion.div>

          {/* Accordion */}
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              >
                <AccordionItem
                  value={`item-${index}`}
                  className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-xl px-6 shadow-sm hover:shadow-md hover:border-primary/15 transition-all data-[state=open]:shadow-md data-[state=open]:border-primary/20"
                >
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5 text-[15px]">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5 text-[15px]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>

          {/* Contact cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6 }}
            className="mt-12"
          >
            <Card className="border-border/40 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-accent" />
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-foreground mb-2 font-display">{t("faq.stillQuestions")}</h3>
                <p className="text-muted-foreground mb-6">{t("faq.stillQuestionsDesc")}</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border/30">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{t("faq.emergencyHotline")}</p>
                      <a href="tel:09171234567" className="text-primary hover:underline text-lg font-bold">
                        0917-123-4567
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border/30">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{t("faq.healthCenter")}</p>
                      <p className="text-sm text-muted-foreground">{t("faq.healthCenterDesc")}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
