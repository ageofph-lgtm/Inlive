import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function WelcomeHero({ userName }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-card to-card border border-border p-8 md:p-10"
    >
      {/* Decorative orbs */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-chart-2/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary tracking-wide uppercase">Sagan Painel</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          {greeting}, {userName || "Explorador"}
        </h1>
        <p className="mt-3 text-muted-foreground text-base md:text-lg max-w-xl leading-relaxed">
          Seu centro de comando. Acompanhe métricas, gerencie projetos e explore insights — tudo em um só lugar.
        </p>
      </div>
    </motion.div>
  );
}