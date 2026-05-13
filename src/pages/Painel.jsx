import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Layers, Activity, Target, Users } from "lucide-react";
import WelcomeHero from "../components/painel/WelcomeHero";
import StatCard from "../components/painel/StatCard";
import ActivityFeed from "../components/painel/ActivityFeed";
import QuickActions from "../components/painel/QuickActions";
import MiniChart from "../components/painel/MiniChart";

const stats = [
  { title: "Projetos", value: "0", subtitle: "Nenhum projeto ainda", icon: Layers, accentColor: "bg-primary/10" },
  { title: "Atividades", value: "4", subtitle: "Ações registradas", icon: Activity, accentColor: "bg-chart-2/10" },
  { title: "Objetivos", value: "0", subtitle: "Defina suas metas", icon: Target, accentColor: "bg-chart-3/10" },
  { title: "Equipe", value: "1", subtitle: "Membro ativo", icon: Users, accentColor: "bg-chart-4/10" },
];

export default function Painel() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
        {/* Welcome Section */}
        <WelcomeHero userName={user?.full_name?.split(" ")[0]} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <StatCard key={stat.title} {...stat} index={i} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <MiniChart />
            <QuickActions />
          </div>
          <div>
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}