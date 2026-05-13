import { motion } from "framer-motion";

export default function StatCard({ title, value, subtitle, icon: Icon, accentColor, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 * index }}
      className="group relative overflow-hidden rounded-2xl bg-card border border-border p-6 hover:border-primary/30 transition-all duration-300"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground tracking-wide">{title}</span>
          <div className={`p-2.5 rounded-xl ${accentColor || 'bg-primary/10'}`}>
            <Icon className="w-4.5 h-4.5 text-primary" />
          </div>
        </div>
        <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
        {subtitle && (
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}