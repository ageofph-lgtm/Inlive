import { motion } from "framer-motion";
import { Clock, ArrowUpRight, Zap, Star, CheckCircle2 } from "lucide-react";

const activities = [
  { icon: Zap, label: "Sistema inicializado", time: "Agora", color: "text-primary" },
  { icon: CheckCircle2, label: "Configuração base concluída", time: "Recente", color: "text-chart-2" },
  { icon: Star, label: "Painel criado com sucesso", time: "Recente", color: "text-chart-3" },
  { icon: ArrowUpRight, label: "Pronto para personalizar", time: "Recente", color: "text-chart-4" },
];

export default function ActivityFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-2xl bg-card border border-border p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Atividade Recente</h2>
        <Clock className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="space-y-1">
        {activities.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
            className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-secondary/50 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-secondary">
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.time}</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}