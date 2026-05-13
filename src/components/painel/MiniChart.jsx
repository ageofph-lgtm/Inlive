import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";

const data = [
  { v: 30 }, { v: 45 }, { v: 35 }, { v: 55 }, { v: 48 },
  { v: 62 }, { v: 58 }, { v: 70 }, { v: 65 }, { v: 80 },
  { v: 75 }, { v: 90 },
];

export default function MiniChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="rounded-2xl bg-card border border-border p-6"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-foreground">Desempenho</h2>
        <div className="flex items-center gap-1.5 text-chart-2">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-semibold">+24%</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Evolução dos últimos 12 períodos</p>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(255, 60%, 68%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(255, 60%, 68%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{
                background: 'hsl(228, 25%, 10%)',
                border: '1px solid hsl(228, 18%, 16%)',
                borderRadius: '0.75rem',
                color: 'hsl(220, 20%, 95%)',
                fontSize: '0.8rem',
              }}
              labelStyle={{ display: 'none' }}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke="hsl(255, 60%, 68%)"
              strokeWidth={2.5}
              fill="url(#colorV)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(255, 60%, 68%)', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}