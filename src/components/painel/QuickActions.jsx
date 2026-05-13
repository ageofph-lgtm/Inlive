import { motion } from "framer-motion";
import { Plus, Settings, BarChart3, Users, FolderOpen, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { icon: Plus, label: "Novo Projeto", desc: "Iniciar um projeto" },
  { icon: BarChart3, label: "Relatórios", desc: "Ver análises" },
  { icon: Users, label: "Equipe", desc: "Gerenciar membros" },
  { icon: FolderOpen, label: "Arquivos", desc: "Explorar documentos" },
  { icon: MessageSquare, label: "Mensagens", desc: "Comunicação" },
  { icon: Settings, label: "Configurações", desc: "Ajustar sistema" },
];

export default function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="rounded-2xl bg-card border border-border p-6"
    >
      <h2 className="text-lg font-semibold text-foreground mb-5">Ações Rápidas</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((action, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
          >
            <Button
              variant="ghost"
              className="w-full h-auto flex-col items-center gap-2 py-5 rounded-xl bg-secondary/40 hover:bg-secondary border border-transparent hover:border-border transition-all duration-200"
            >
              <action.icon className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}