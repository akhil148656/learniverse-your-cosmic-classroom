import { useState, useEffect } from "react";
import { FlaskConical, Play, RotateCcw, Lightbulb, CheckSquare, Square, Award, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VirtualLabSimulatorProps {
  subject: string;
  topic?: string;
}

interface LabProps {
  onUpdateState: (state: any) => void;
}

// 1. Ohm's Law Simulator
function OhmsLawLab({ onUpdateState }: LabProps) {
  const [voltage, setVoltage] = useState(12);
  const [resistance, setResistance] = useState(4);
  const current = voltage / resistance;

  useEffect(() => {
    onUpdateState({ voltage, resistance, current });
  }, [voltage, resistance, current]);

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 border border-border/40 rounded-xl p-6 text-center shadow-inner relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full pointer-events-none" />
        <div className="text-6xl font-display font-extrabold text-primary mb-2 animate-pulse-glow drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]">
          {current.toFixed(2)} A
        </div>
        <p className="text-xs text-muted-foreground uppercase font-mono tracking-widest">Current (I = V/R)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3 bg-muted/20 border border-border/40 p-4 rounded-lg">
          <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">Voltage: {voltage}V</Label>
          <Slider
            value={[voltage]}
            onValueChange={(v) => setVoltage(v[0])}
            min={1}
            max={24}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>1V</span>
            <span>24V</span>
          </div>
        </div>

        <div className="space-y-3 bg-muted/20 border border-border/40 p-4 rounded-lg">
          <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">Resistance: {resistance}Ω</Label>
          <Slider
            value={[resistance]}
            onValueChange={(v) => setResistance(v[0])}
            min={1}
            max={20}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>1Ω</span>
            <span>20Ω</span>
          </div>
        </div>
      </div>

      <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
          <div>
            <p className="font-semibold text-xs text-foreground uppercase tracking-wider">Ohm's Law: V = I × R</p>
            <p className="text-xs text-muted-foreground mt-1">
              As resistance increases, current decreases (inverse relationship).
              As voltage increases, current increases (direct relationship).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Pendulum Simulator
function PendulumLab({ onUpdateState }: LabProps) {
  const [length, setLength] = useState(1);
  const [isSwinging, setIsSwinging] = useState(false);
  const g = 9.8;
  const period = 2 * Math.PI * Math.sqrt(length / g);

  useEffect(() => {
    onUpdateState({ length, isSwinging, period });
  }, [length, isSwinging, period]);

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 border border-border/40 rounded-xl p-6 relative h-64 overflow-hidden shadow-inner flex flex-col justify-between">
        <div className="absolute top-0 left-1/2 w-1 h-6 bg-slate-500 transform -translate-x-1/2 rounded" />
        
        {/* String and Bob */}
        <div
          className={cn(
            "absolute top-6 left-1/2 origin-top transition-transform duration-300",
            isSwinging ? "animate-float" : ""
          )}
          style={{ height: `${length * 55}px` }}
        >
          <div className="w-0.5 h-full bg-slate-400 mx-auto shadow-sm" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 -ml-4 -mt-1 shadow-lg border border-primary/40" />
        </div>

        <div className="mt-auto text-center z-10 bg-background/60 backdrop-blur-md rounded-lg p-2 max-w-[150px] mx-auto border border-border/40">
          <div className="text-2xl font-display font-extrabold text-secondary">
            {period.toFixed(2)}s
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Period (T)</p>
        </div>
      </div>

      <div className="space-y-3 bg-muted/20 border border-border/40 p-4 rounded-lg">
        <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">Pendulum Length: {length.toFixed(1)}m</Label>
        <Slider
          value={[length]}
          onValueChange={(v) => setLength(v[0])}
          min={0.5}
          max={3}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>0.5m</span>
          <span>3.0m</span>
        </div>
      </div>

      <Button onClick={() => setIsSwinging(!isSwinging)} className="w-full bg-secondary hover:bg-secondary/90 text-background font-display font-bold uppercase tracking-wider text-xs h-10">
        {isSwinging ? <RotateCcw className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
        {isSwinging ? "Reset / Stop" : "Start Swing"}
      </Button>

      <div className="bg-secondary/10 rounded-lg p-4 border border-secondary/20">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
          <div>
            <p className="font-semibold text-xs text-foreground uppercase tracking-wider">Period Formula: T = 2π√(L/g)</p>
            <p className="text-xs text-muted-foreground mt-1">
              The period of a pendulum depends only on its length and gravity, not on the mass of the bob!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. pH Scale Simulator
function PHScaleLab({ onUpdateState }: LabProps) {
  const [ph, setPH] = useState(7);

  useEffect(() => {
    onUpdateState({ ph });
  }, [ph]);

  const getColor = (value: number) => {
    if (value < 3) return "from-red-500 to-orange-500 border-red-500";
    if (value < 6) return "from-orange-400 to-yellow-500 border-orange-400";
    if (value < 8) return "from-emerald-400 to-green-500 border-emerald-400";
    if (value < 11) return "from-cyan-400 to-blue-500 border-cyan-400";
    return "from-indigo-500 to-purple-600 border-indigo-500";
  };

  const getSubstance = (value: number) => {
    if (value < 2) return "Battery Acid";
    if (value < 3) return "Lemon Juice";
    if (value < 5) return "Vinegar";
    if (value < 7) return "Rain Water";
    if (value === 7) return "Pure Water";
    if (value < 9) return "Baking Soda";
    if (value < 11) return "Soap";
    if (value < 13) return "Ammonia";
    return "Drain Cleaner";
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 border border-border/40 rounded-xl p-6 text-center shadow-inner relative overflow-hidden">
        <div className={cn(
          "w-28 h-28 rounded-full mx-auto mb-3 flex items-center justify-center bg-gradient-to-br text-white text-4xl font-display font-extrabold shadow-lg border-2",
          getColor(ph)
        )}>
          {ph}
        </div>
        <p className="text-xl font-bold text-foreground">{getSubstance(ph)}</p>
        <p className={cn(
          "text-xs font-semibold uppercase tracking-wider mt-1",
          ph < 7 ? "text-red-400" : ph > 7 ? "text-indigo-400" : "text-green-400"
        )}>
          {ph < 7 ? "Acidic" : ph > 7 ? "Basic/Alkaline" : "Neutral"}
        </p>
      </div>

      <div className="space-y-3 bg-muted/20 border border-border/40 p-4 rounded-lg">
        <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">pH Value: {ph}</Label>
        <div className="h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-blue-500 to-purple-600 border border-border/20" />
        <Slider
          value={[ph]}
          onValueChange={(v) => setPH(v[0])}
          min={0}
          max={14}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>Acidic (0)</span>
          <span>Neutral (7)</span>
          <span>Alkaline (14)</span>
        </div>
      </div>

      <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
          <div>
            <p className="font-semibold text-xs text-foreground uppercase tracking-wider">pH Scale & Hydrogen Ions</p>
            <p className="text-xs text-muted-foreground mt-1">
              pH measures the concentration of hydrogen ions (H+). The scale is logarithmic: each whole pH value below 7 is 10 times more acidic than the next higher value.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. Biology: Photosynthesis Simulator
function PhotosynthesisLab({ onUpdateState }: LabProps) {
  const [light, setLight] = useState(50);
  const [co2, setCo2] = useState(400);
  const [temp, setTemp] = useState(25);

  const tempFactor = 1 - Math.pow((temp - 25) / 25, 2); 
  const rate = Math.max(0, Math.round((light / 100) * (co2 / 1000) * tempFactor * 50));

  useEffect(() => {
    onUpdateState({ light, co2, temp, rate });
  }, [light, co2, temp, rate]);

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 border border-border/40 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[240px] shadow-inner">
        {/* Animated bubbles rising */}
        {rate > 0 && (
          <div className="absolute inset-0 pointer-events-none flex justify-around overflow-hidden">
            {Array.from({ length: Math.min(15, Math.ceil(rate / 3)) }).map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-emerald-400/50 border border-emerald-300/30 animate-bubble absolute bottom-12"
                style={{
                  animationDelay: `${i * 0.4}s`,
                  animationDuration: `${3 - (rate / 25)}s`,
                  left: `${(i * 18 + 10) % 85}%`
                }}
              />
            ))}
          </div>
        )}
        
        <div className="w-24 h-36 border-4 border-slate-500 border-t-transparent rounded-b-2xl relative bg-blue-300/10 backdrop-blur-sm flex items-end justify-center pb-3">
          <div className="w-1.5 h-24 bg-emerald-600 rounded-full relative">
            {/* Leaves */}
            <div className="w-5 h-2 bg-emerald-500 rounded-full absolute top-6 -left-4 rotate-12" />
            <div className="w-5 h-2 bg-emerald-500 rounded-full absolute top-6 -right-4 -rotate-12" />
            <div className="w-5 h-2 bg-emerald-500 rounded-full absolute top-14 -left-4 rotate-12" />
            <div className="w-5 h-2 bg-emerald-500 rounded-full absolute top-14 -right-4 -rotate-12" />
          </div>
        </div>

        <div className="text-center mt-4 z-10 bg-background/60 backdrop-blur-md rounded-lg p-2 border border-border/40">
          <div className="text-3xl font-display font-extrabold text-emerald-500">
            {rate} bubbles/min
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Photosynthesis Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Light */}
        <div className="space-y-2 bg-muted/20 border border-border/40 p-3 rounded-lg">
          <Label className="text-foreground text-xs font-semibold font-mono">Light: {light}%</Label>
          <Slider value={[light]} onValueChange={(v) => setLight(v[0])} min={0} max={100} step={5} />
        </div>

        {/* CO2 */}
        <div className="space-y-2 bg-muted/20 border border-border/40 p-3 rounded-lg">
          <Label className="text-foreground text-xs font-semibold font-mono">CO₂: {co2} ppm</Label>
          <Slider value={[co2]} onValueChange={(v) => setCo2(v[0])} min={0} max={1000} step={50} />
        </div>

        {/* Temperature */}
        <div className="space-y-2 bg-muted/20 border border-border/40 p-3 rounded-lg">
          <Label className="text-foreground text-xs font-semibold font-mono">Temp: {temp}°C</Label>
          <Slider value={[temp]} onValueChange={(v) => setTemp(v[0])} min={0} max={50} step={1} />
        </div>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />
          <div>
            <p className="font-semibold text-xs text-foreground uppercase tracking-wider">Photosynthetic Limits</p>
            <p className="text-xs text-muted-foreground mt-1">
              Photosynthesis speeds up with higher light intensity and CO₂ levels until it hits enzymatic saturation or temperature bottlenecks. Extreme temperatures denature vital plant enzymes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 5. Geography: Volcano Eruption Simulator
function VolcanoEruptionLab({ onUpdateState }: LabProps) {
  const [volcanoType, setVolcanoType] = useState<"shield" | "stratovolcano">("stratovolcano");
  const [viscosity, setViscosity] = useState(5);
  const [gasContent, setGasContent] = useState(5);
  const [erupted, setErupted] = useState(false);
  const [isExploding, setIsExploding] = useState(false);

  const handleErupt = () => {
    setIsExploding(true);
    setErupted(true);
    onUpdateState({ type: volcanoType, viscosity, gas: gasContent, erupted: true });
    setTimeout(() => {
      setIsExploding(false);
    }, 4000);
  };

  const handleReset = () => {
    setErupted(false);
    setIsExploding(false);
    onUpdateState({ type: volcanoType, viscosity, gas: gasContent, erupted: false });
  };

  const getEruptionStyle = () => {
    if (volcanoType === "stratovolcano") {
      if (viscosity >= 7 && gasContent >= 7) return "Plinian Eruption (Violent blast, huge ash column, pyroclastic flow!)";
      if (gasContent >= 5) return "Vulcanian Eruption (Moderate gas blasts and block bombs)";
      return "Strombolian Eruption (Mild burst of incandescent cinder)";
    } else {
      if (viscosity <= 3 && gasContent <= 3) return "Hawaiian Eruption (Steady, effusive flows of thin basaltic lava)";
      return "Strombolian Eruption (Small gas-driven fountains of fluid lava)";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 border border-border/40 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[240px] shadow-inner">
        {/* Eruption animation */}
        {erupted && (
          <div className="absolute inset-0 pointer-events-none flex justify-center items-end pb-12 overflow-hidden">
            {volcanoType === "stratovolcano" && viscosity >= 7 && gasContent >= 7 ? (
              <div className={cn(
                "w-32 h-64 bg-gradient-to-t from-orange-600 via-orange-400 to-slate-500/80 rounded-t-full filter blur-md origin-bottom absolute bottom-12",
                isExploding ? "animate-plinian" : "scale-y-75 opacity-70"
              )} />
            ) : volcanoType === "shield" && viscosity <= 3 && gasContent <= 3 ? (
              <div className="w-48 h-6 bg-red-600 absolute bottom-12 rounded-full filter blur-sm animate-pulse" />
            ) : (
              <div className={cn(
                "w-16 h-36 bg-gradient-to-t from-red-600 to-yellow-500 rounded-t-full filter blur-sm origin-bottom absolute bottom-12",
                isExploding ? "animate-bounce" : "opacity-50"
              )} />
            )}
          </div>
        )}

        {/* Volcano Cone Graphic */}
        <div className="relative w-56 h-20 mt-12 z-10 flex items-end justify-center">
          {volcanoType === "stratovolcano" ? (
            <div 
              className="w-40 h-full bg-slate-700 shadow-lg" 
              style={{ clipPath: "polygon(50% 0%, 15% 100%, 85% 100%)" }} 
            />
          ) : (
            <div className="w-48 h-10 bg-slate-600 rounded-t-[100px] absolute bottom-0 shadow-md" />
          )}
          <div className="w-8 h-1 bg-red-500 absolute top-0 rounded-full shadow-[0_0_12px_red] z-20" style={{ bottom: volcanoType === "shield" ? "10px" : "auto" }} />
        </div>

        <div className="text-center mt-4 z-10 w-full bg-background/60 backdrop-blur-md rounded-lg p-2 border border-border/40">
          {erupted ? (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest font-mono">Eruption Style:</p>
              <p className="text-xs text-foreground px-2 font-medium">{getEruptionStyle()}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-mono">Adjust magma properties and trigger eruption</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Volcano Type */}
        <div className="space-y-2 bg-muted/20 border border-border/40 p-3 rounded-lg">
          <Label className="text-xs text-foreground font-semibold">Volcano Type</Label>
          <select
            value={volcanoType}
            onChange={(e) => {
              setVolcanoType(e.target.value as any);
              setErupted(false);
            }}
            className="w-full h-9 rounded-md border border-border bg-input px-3 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="stratovolcano">Stratovolcano</option>
            <option value="shield">Shield Volcano</option>
          </select>
        </div>

        {/* Viscosity */}
        <div className="space-y-2 bg-muted/20 border border-border/40 p-3 rounded-lg">
          <Label className="text-xs text-foreground font-semibold font-mono">Viscosity: {viscosity}/10</Label>
          <Slider value={[viscosity]} onValueChange={(v) => { setViscosity(v[0]); setErupted(false); }} min={1} max={10} step={1} />
        </div>

        {/* Gas Content */}
        <div className="space-y-2 bg-muted/20 border border-border/40 p-3 rounded-lg">
          <Label className="text-xs text-foreground font-semibold font-mono">Gas Content: {gasContent}/10</Label>
          <Slider value={[gasContent]} onValueChange={(v) => { setGasContent(v[0]); setErupted(false); }} min={1} max={10} step={1} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleErupt} disabled={erupted} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-display text-xs uppercase tracking-widest h-10 glow-primary">
          Trigger Eruption 🌋
        </Button>
        {erupted && (
          <Button onClick={handleReset} variant="outline" className="border-border text-foreground hover:bg-muted font-display text-xs uppercase tracking-wider h-10">
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

// 6. Labs Mapping
const labs: Record<string, { name: string; component: React.FC<LabProps> }[]> = {
  Physics: [
    { name: "Ohm's Law", component: OhmsLawLab },
    { name: "Simple Pendulum", component: PendulumLab },
  ],
  Chemistry: [
    { name: "pH Scale", component: PHScaleLab },
  ],
  Biology: [
    { name: "Photosynthesis", component: PhotosynthesisLab }
  ],
  Geography: [
    { name: "Volcano Eruption", component: VolcanoEruptionLab }
  ]
};

// 7. Goals Definition
const LAB_GOALS: Record<string, { id: string; description: string }[]> = {
  "Ohm's Law": [
    { id: "ohms_3a", description: "Set current to exactly 3.00 A (Voltage = 12V, Resistance = 4Ω)" },
    { id: "ohms_6a", description: "Set current to exactly 6.00 A (Voltage = 24V, Resistance = 4Ω)" },
  ],
  "Simple Pendulum": [
    { id: "pendulum_length", description: "Set length to exactly 2.0m" },
    { id: "pendulum_swing", description: "Start the pendulum swing" },
  ],
  "pH Scale": [
    { id: "ph_acid", description: "Find substance with pH < 3 (Lemon Juice)" },
    { id: "ph_soap", description: "Measure the pH of Soap (pH = 10)" },
  ],
  "Photosynthesis": [
    { id: "photo_max", description: "Achieve maximum rate (50 bubbles/min)" },
    { id: "photo_low", description: "Observe rate at low light intensity (< 20%)" },
  ],
  "Volcano Eruption": [
    { id: "volcano_plinian", description: "Trigger explosive Plinian eruption (Stratovolcano, viscosity >= 7, gas >= 7)" },
    { id: "volcano_hawaiian", description: "Trigger effusive Hawaiian flow (Shield, viscosity <= 3, gas <= 3)" },
  ],
};

export function VirtualLabSimulator({ subject, topic }: VirtualLabSimulatorProps) {
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const [completedGoals, setCompletedGoals] = useState<string[]>([]);
  const availableLabs = labs[subject] || [];

  // Load completed goals from local storage on select lab
  useEffect(() => {
    if (selectedLab) {
      const localGoalKey = `learniverse_completed_goals_${selectedLab}`;
      const saved = localStorage.getItem(localGoalKey);
      if (saved) {
        setCompletedGoals(JSON.parse(saved));
      } else {
        setCompletedGoals([]);
      }
    }
  }, [selectedLab]);

  // Award XP and write log
  const handleGoalCompletion = async (goalId: string) => {
    if (completedGoals.includes(goalId)) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Auth user missing");

      // 1. Get student profile details
      const { data: student } = await supabase
        .from("students")
        .select("id, xp_points")
        .eq("user_id", user.id)
        .single();

      if (student) {
        // Award +30 XP
        const newXp = (student.xp_points || 0) + 30;
        await supabase
          .from("students")
          .update({ xp_points: newXp })
          .eq("id", student.id);
        
        toast.success(`Lab Goal Completed! +30 XP Awarded! 🚀`);
        window.dispatchEvent(new CustomEvent("xp-changed", { detail: newXp }));

        // 2. Track progress in DB (find or insert lab id by title)
        try {
          const { data: lab } = await supabase
            .from("virtual_labs")
            .select("id")
            .eq("title", selectedLab)
            .maybeSingle();

          let targetLabId = lab?.id;

          if (!targetLabId) {
            const { data: newLab } = await supabase
              .from("virtual_labs")
              .insert({
                title: selectedLab || "Virtual Lab",
                description: `${subject} Interactive Simulation`,
                lab_type: subject.toLowerCase()
              })
              .select("id")
              .single();
            targetLabId = newLab?.id;
          }

          if (targetLabId) {
            await supabase
              .from("student_lab_progress")
              .upsert({
                student_id: student.id,
                lab_id: targetLabId,
                is_unlocked: true,
                completed_at: new Date().toISOString(),
                progress_data: { completed_goal: goalId }
              });
          }
        } catch (dbErr) {
          console.error("DB Lab write error:", dbErr);
        }
      }
    } catch (err) {
      console.error("Supabase write failure, running local fallback:", err);
      // Fallback
      toast.success(`Lab Goal Completed! +30 XP Awarded (Saved Locally)! 🚀`);
      const savedXp = localStorage.getItem("learniverse_local_xp") || "0";
      const newXp = parseInt(savedXp) + 30;
      localStorage.setItem("learniverse_local_xp", newXp.toString());
      window.dispatchEvent(new CustomEvent("xp-changed", { detail: newXp }));
    }

    // Save in state & local storage
    const updatedGoals = [...completedGoals, goalId];
    setCompletedGoals(updatedGoals);
    const localGoalKey = `learniverse_completed_goals_${selectedLab}`;
    localStorage.setItem(localGoalKey, JSON.stringify(updatedGoals));
  };

  // Evaluate state changes reported by lab child component
  const handleStateChange = (state: any) => {
    if (!selectedLab) return;
    const goals = LAB_GOALS[selectedLab] || [];

    goals.forEach((goal) => {
      if (completedGoals.includes(goal.id)) return;

      // ohm's law
      if (goal.id === "ohms_3a" && state.current && Math.abs(state.current - 3.00) < 0.01) {
        handleGoalCompletion(goal.id);
      }
      if (goal.id === "ohms_6a" && state.current && Math.abs(state.current - 6.00) < 0.01) {
        handleGoalCompletion(goal.id);
      }

      // pendulum
      if (goal.id === "pendulum_length" && state.length && Math.abs(state.length - 2.0) < 0.01) {
        handleGoalCompletion(goal.id);
      }
      if (goal.id === "pendulum_swing" && state.isSwinging === true) {
        handleGoalCompletion(goal.id);
      }

      // ph scale
      if (goal.id === "ph_acid" && state.ph !== undefined && state.ph < 3) {
        handleGoalCompletion(goal.id);
      }
      if (goal.id === "ph_soap" && state.ph !== undefined && state.ph === 10) {
        handleGoalCompletion(goal.id);
      }

      // photosynthesis
      if (goal.id === "photo_max" && state.rate && state.rate >= 45) {
        handleGoalCompletion(goal.id);
      }
      if (goal.id === "photo_low" && state.light !== undefined && state.light < 20 && state.co2 > 0) {
        handleGoalCompletion(goal.id);
      }

      // volcano
      if (goal.id === "volcano_plinian" && state.type === "stratovolcano" && state.viscosity >= 7 && state.gas >= 7 && state.erupted) {
        handleGoalCompletion(goal.id);
      }
      if (goal.id === "volcano_hawaiian" && state.type === "shield" && state.viscosity <= 3 && state.gas <= 3 && state.erupted) {
        handleGoalCompletion(goal.id);
      }
    });
  };

  const LabComponent = selectedLab 
    ? availableLabs.find(l => l.name === selectedLab)?.component 
    : null;

  return (
    <Card className="bg-card border-border shadow-[0_0_20px_rgba(139,92,246,0.1)]">
      <CardHeader className="border-b border-border/50">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-secondary animate-pulse" />
          {subject} Portal Simulation Desk
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Perform interactive exercises to verify theories and earn stars</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {!selectedLab ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableLabs.map((lab) => (
              <Button
                key={lab.name}
                variant="outline"
                className="h-24 flex flex-col gap-2 bg-muted/40 border-border hover:border-secondary hover:bg-secondary/5 transition-all duration-300"
                onClick={() => setSelectedLab(lab.name)}
              >
                <FlaskConical className="w-6 h-6 text-secondary" />
                <span className="font-display font-semibold text-sm">{lab.name}</span>
              </Button>
            ))}
            {availableLabs.length === 0 && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">More simulations are launching for {subject} soon!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedLab(null)} className="text-xs font-display uppercase tracking-wider text-muted-foreground hover:text-foreground">
                ← Return to desk
              </Button>
              <h3 className="font-display text-lg font-bold text-foreground">{selectedLab} Workspace</h3>
            </div>

            {/* Split layout: Workspace vs Goals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {LabComponent && <LabComponent onUpdateState={handleStateChange} />}
              </div>

              {/* Goals Card */}
              <div className="space-y-4">
                <Card className="border-secondary/20 bg-secondary/5 shadow-[0_0_15px_rgba(20,250,220,0.05)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-display uppercase tracking-widest text-secondary flex items-center gap-2">
                      <Award className="w-4 h-4 text-secondary animate-bounce" />
                      Galactic Study Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-0">
                    <p className="text-[10px] text-muted-foreground">Complete each task below to earn +30 XP and record scientific progress!</p>
                    <div className="space-y-2">
                      {(LAB_GOALS[selectedLab] || []).map((goal) => {
                        const isDone = completedGoals.includes(goal.id);
                        return (
                          <div 
                            key={goal.id} 
                            className={cn(
                              "flex gap-2 items-start border rounded-lg p-2.5 bg-background/50 text-xs transition-colors",
                              isDone ? "border-emerald-500/25 bg-emerald-500/5 text-muted-foreground" : "border-border/60 text-foreground"
                            )}
                          >
                            <div className="pt-0.5 flex-shrink-0">
                              {isDone ? (
                                <CheckSquare className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Square className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "leading-tight font-medium break-words",
                                isDone && "line-through text-emerald-500/70"
                              )}>
                                {goal.description}
                              </p>
                              {isDone && (
                                <span className="text-[9px] font-mono text-emerald-500 mt-0.5 block">+30 XP SECURED ⭐</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
