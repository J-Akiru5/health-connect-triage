import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_BARANGAY } from "@/lib/site";

const FAQ = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "What is TeleHealth?",
      answer: `TeleHealth is the digital health platform for ${SITE_BARANGAY}. It brings quality healthcare services closer to home through AI-assisted triage, referral coordination, and support for barangay health workers.`,
    },
    {
      question: "How does the symptom checker work?",
      answer: "Our AI-powered symptom checker asks you a series of questions about your symptoms, medical history, and current condition. Based on your responses, it provides a preliminary assessment and recommends the appropriate level of care - whether you should seek immediate emergency care, coordinate a referral, or use self-care measures.",
    },
    {
      question: "Is the symptom checker a replacement for medical consultation?",
      answer: "No, the symptom checker is not a replacement for professional medical advice. It's a triage tool designed to help you understand the urgency of your condition and guide you to the appropriate level of care. Always consult with a healthcare professional for proper diagnosis and treatment.",
    },
    {
      question: "How do referrals work?",
      answer: `If your triage result needs escalation, your care team can create a referral to the appropriate facility. You can track the referral status in the app and follow guidance from your barangay health workers and RHU serving ${SITE_BARANGAY}.`,
    },
    {
      question: "What services are available through TeleHealth?",
      answer: `We offer symptom checking, triage guidance, referral tracking, health education resources, and connections to local health centers for ${SITE_BARANGAY}. The platform also supports Barangay Health Workers (BHWs) and Rural Health Units (RHUs) with tools and resources.`,
    },
    {
      question: "Is my personal health information secure?",
      answer: "Yes, we take your privacy and data security seriously. All personal health information is encrypted and stored securely. We comply with data protection regulations and only share information with authorized healthcare professionals involved in your care. Please review our Privacy Policy for more details.",
    },
    {
      question: "What should I do in case of a medical emergency?",
      answer: "If you're experiencing a medical emergency, do not use this platform. Call the emergency hotline (0917-123-4567) immediately or proceed to the nearest hospital. The symptom checker may indicate when emergency care is needed, but always trust your instincts and seek immediate help if you feel your condition is life-threatening.",
    },
    {
      question: "Can I use this service if I'm not in a rural area?",
      answer: `This deployment is intended for residents of ${SITE_BARANGAY} and nearby areas served by the same health facilities. Others may still use the symptom checker where appropriate; coordinated care is focused on our community.`,
    },
    {
      question: "How much does it cost to use TeleHealth?",
      answer: "The symptom checker and basic platform features are free to use. Consultation fees may vary depending on the type of service and your local health center's policies. Some services may be covered by PhilHealth or other health insurance programs. Please check with your local health center for specific pricing.",
    },
    {
      question: "What technology do I need to use this platform?",
      answer: "You need a device (smartphone, tablet, or computer) with internet access and a web browser. The platform is designed to work on most modern devices and browsers, and we're continuously working to make it accessible even with limited internet connectivity.",
    },
    {
      question: "How accurate is the AI symptom checker?",
      answer: "Our AI symptom checker uses evidence-based medical guidelines and is designed to provide preliminary assessments. However, it's important to remember that it's a screening tool, not a diagnostic tool. The accuracy depends on the information you provide, and it should always be followed by professional medical evaluation when recommended.",
    },
    {
      question: "Can I access my health records through this platform?",
      answer: "Yes, if you create an account, you can access your triage history, referrals, and health records through the platform. This allows you to track your health over time and share relevant information with healthcare providers.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-16 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12 mt-8 relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute left-0 top-0 -mt-2 hidden md:flex gap-2" 
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="md:hidden flex justify-start mb-4">
              <Button variant="ghost" size="sm" className="-ml-3 gap-2" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground mt-4 md:mt-0">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about TeleHealth for {SITE_BARANGAY}.
            </p>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" collapsible className="w-full space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-lg px-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Contact Section */}
          <div className="mt-12 p-8 bg-muted rounded-lg border border-border">
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              Still have questions?
            </h2>
            <p className="text-muted-foreground mb-4">
              If you couldn't find the answer you're looking for, please don't hesitate to reach out to us.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Emergency Hotline:</span>{" "}
                <a href="tel:09171234567" className="text-primary hover:underline">
                  0917-123-4567
                </a>
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Barangay Health Center:</span> Contact your local health center during operating hours.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FAQ;
