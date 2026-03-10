import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollReveal } from "./useScrollReveal";

const faqs = [
  {
    question: "Puis-je essayer StockFlow gratuitement ?",
    answer:
      "Oui ! Notre plan Essai Gratuit vous permet de decouvrir la plateforme pendant 14 jours sans carte bancaire. Vous pouvez ensuite passer au plan Revendeur, Premium ou Entreprise selon vos besoins.",
  },
  {
    question: "Comment fonctionne la facturation ?",
    answer:
      "Les plans payants sont facturés mensuellement via Stripe, notre prestataire de paiement sécurisé. Vous pouvez annuler à tout moment depuis votre tableau de bord.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer:
      "Absolument. Toutes les données sont chiffrées et stockées de manière sécurisée. Chaque entreprise dispose d'un espace complètement isolé grâce à notre architecture multi-tenant.",
  },
  {
    question: "Puis-je changer de plan à tout moment ?",
    answer:
      "Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment. Le changement prend effet immédiatement et la facturation est ajustée au prorata.",
  },
  {
    question: "StockFlow est-il adapté à mon secteur ?",
    answer:
      "StockFlow est conçu pour tout type de commerce : boutiques, grossistes, restaurants, ateliers, prestataires de services et plus encore. Les modules s'adaptent à vos besoins.",
  },
  {
    question: "Comment fonctionne le support ?",
    answer:
      "Le plan Essai inclut le support communautaire. Les plans Revendeur et Premium beneficient d'un support par email. Le plan Entreprise inclut un support dedie 24/7 avec accompagnement personnalise.",
  },
  {
    question: "Puis-je exporter mes données ?",
    answer:
      "Oui, tous les plans permettent l'export CSV. Les plans Revendeur et Premium ajoutent l'export PDF, et le Premium inclut aussi l'export Excel pour vos rapports, factures et inventaires.",
  },
];

export default function FAQSection() {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>(0.1);

  return (
    <section id="faq" className="relative py-24 sm:py-32" ref={ref}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center">
          <span
            className={`mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary transition-all duration-700 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            FAQ
          </span>
          <h2
            className={`text-3xl font-bold tracking-tight text-foreground transition-all duration-700 delay-100 sm:text-4xl lg:text-5xl ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Questions <span className="text-primary">fréquentes</span>
          </h2>
          <p
            className={`mt-5 text-lg text-muted-foreground transition-all duration-700 delay-200 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Tout ce que vous devez savoir pour démarrer avec StockFlow.
          </p>
        </div>

        {/* Accordion */}
        <div
          className={`mt-12 transition-all duration-700 delay-300 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border border-border/60 bg-card/50 px-6 transition-colors data-[state=open]:border-primary/30 data-[state=open]:bg-card"
              >
                <AccordionTrigger className="py-5 text-left text-sm font-medium text-foreground hover:text-primary hover:no-underline sm:text-base [&[data-state=open]]:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
