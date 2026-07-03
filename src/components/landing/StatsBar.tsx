import { Brain, BookOpen, BarChart3, Users } from "lucide-react";
import { useCountUp } from "@/hooks/useScrollReveal";

const stats = [
  { icon: Brain, label: "AI-Powered", suffix: "", value: 0, displayText: "AI-Powered" },
  { icon: BookOpen, label: "Subjects Covered", suffix: "+", value: 6, displayText: "" },
  { icon: BarChart3, label: "Real-time Analytics", suffix: "", value: 0, displayText: "Real-time" },
  { icon: Users, label: "Parent Connected", suffix: "", value: 0, displayText: "Connected" },
];

const StatItem = ({
  icon: Icon,
  label,
  suffix,
  value,
  displayText,
}: {
  icon: typeof Brain;
  label: string;
  suffix: string;
  value: number;
  displayText: string;
}) => {
  const { ref, count } = useCountUp(value, 1500);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 px-6 py-4">
      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-1">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="counter-number text-2xl sm:text-3xl font-bold text-white">
        {value > 0 ? `${count}${suffix}` : displayText}
      </span>
      <span className="text-white/70 text-sm font-medium">{label}</span>
    </div>
  );
};

const StatsBar = () => {
  return (
    <section id="stats" className="relative py-6">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-gradient-cosmic rounded-2xl p-4 sm:p-6 shadow-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-white/10 md:divide-x">
            {stats.map((stat) => (
              <StatItem key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
