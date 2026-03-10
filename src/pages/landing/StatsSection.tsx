import { useEffect, useState } from "react";
import { useScrollReveal } from "./useScrollReveal";
import { Shield, Zap, Globe, Clock } from "lucide-react";

function AnimatedNumber({ target, suffix = "", revealed }: { target: number; suffix?: string; revealed: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!revealed) return;
    let frame: number;
    const duration = 2200;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, revealed]);

  return (
    <span>
      {count.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}

const highlights = [
  {
    icon: Shield,
    title: "Données sécurisées",
    description: "Chiffrement de bout en bout et isolation par tenant",
  },
  {
    icon: Zap,
    title: "Temps réel",
    description: "Synchronisation instantanée de tout votre inventaire",
  },
  {
    icon: Globe,
    title: "100% en ligne",
    description: "Accessible depuis n'importe quel appareil, partout",
  },
  {
    icon: Clock,
    title: "Gain de temps",
    description: "Automatisez vos tâches répétitives et gagnez en efficacité",
  },
];

export default function StatsSection() {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>(0.15);

  return (
    <section className="relative border-t border-border/50 bg-muted/20 py-20 sm:py-24" ref={ref}>
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.02] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Highlight cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item, i) => (
            <div
              key={item.title}
              className={`group flex flex-col items-center rounded-xl border border-border/50 bg-card/50 px-6 py-8 text-center backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/30 hover:bg-card ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: revealed ? `${i * 100}ms` : "0ms" }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/15">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
