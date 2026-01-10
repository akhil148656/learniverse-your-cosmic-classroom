import { useState } from "react";
import { FlaskConical, Play, RotateCcw, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface VirtualLabSimulatorProps {
  subject: string;
  topic?: string;
}

// Ohm's Law Simulator
function OhmsLawLab() {
  const [voltage, setVoltage] = useState(12);
  const [resistance, setResistance] = useState(4);
  const current = voltage / resistance;

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-6 text-center">
        <div className="text-6xl font-display font-bold text-primary mb-2">
          {current.toFixed(2)} A
        </div>
        <p className="text-muted-foreground">Current (I = V/R)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label className="text-foreground">Voltage: {voltage}V</Label>
          <Slider
            value={[voltage]}
            onValueChange={(v) => setVoltage(v[0])}
            min={1}
            max={24}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1V</span>
            <span>24V</span>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-foreground">Resistance: {resistance}Ω</Label>
          <Slider
            value={[resistance]}
            onValueChange={(v) => setResistance(v[0])}
            min={1}
            max={20}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1Ω</span>
            <span>20Ω</span>
          </div>
        </div>
      </div>

      <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-primary mt-1" />
          <div>
            <p className="font-medium text-foreground">Ohm's Law: V = I × R</p>
            <p className="text-sm text-muted-foreground mt-1">
              As resistance increases, current decreases (inverse relationship).
              As voltage increases, current increases (direct relationship).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pendulum Simulator
function PendulumLab() {
  const [length, setLength] = useState(1);
  const [isSwinging, setIsSwinging] = useState(false);
  const g = 9.8;
  const period = 2 * Math.PI * Math.sqrt(length / g);

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-6 relative h-64 overflow-hidden">
        <div className="absolute top-0 left-1/2 w-0.5 h-4 bg-foreground transform -translate-x-1/2" />
        <div
          className={`absolute top-4 left-1/2 origin-top ${isSwinging ? "animate-pendulum" : ""}`}
          style={{ height: `${length * 80}px` }}
        >
          <div className="w-0.5 h-full bg-foreground mx-auto" />
          <div className="w-8 h-8 rounded-full bg-primary -ml-4 -mt-2" />
        </div>
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
          <div className="text-3xl font-display font-bold text-secondary">
            T = {period.toFixed(2)}s
          </div>
          <p className="text-sm text-muted-foreground">Period</p>
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-foreground">Pendulum Length: {length.toFixed(1)}m</Label>
        <Slider
          value={[length]}
          onValueChange={(v) => setLength(v[0])}
          min={0.5}
          max={3}
          step={0.1}
          className="w-full"
        />
      </div>

      <Button onClick={() => setIsSwinging(!isSwinging)} className="w-full">
        {isSwinging ? <RotateCcw className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
        {isSwinging ? "Reset" : "Start Swing"}
      </Button>

      <div className="bg-secondary/10 rounded-lg p-4 border border-secondary/20">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-secondary mt-1" />
          <div>
            <p className="font-medium text-foreground">Period Formula: T = 2π√(L/g)</p>
            <p className="text-sm text-muted-foreground mt-1">
              The period of a pendulum depends only on its length and gravity, not on the mass.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// pH Scale Simulator
function PHScaleLab() {
  const [ph, setPH] = useState(7);

  const getColor = (value: number) => {
    if (value < 3) return "bg-red-500";
    if (value < 6) return "bg-orange-500";
    if (value < 8) return "bg-green-500";
    if (value < 11) return "bg-blue-500";
    return "bg-purple-500";
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
      <div className="bg-muted/50 rounded-lg p-6 text-center">
        <div className={`w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center ${getColor(ph)}`}>
          <span className="text-4xl font-display font-bold text-white">{ph}</span>
        </div>
        <p className="text-xl font-medium text-foreground">{getSubstance(ph)}</p>
        <p className="text-sm text-muted-foreground">
          {ph < 7 ? "Acidic" : ph > 7 ? "Basic/Alkaline" : "Neutral"}
        </p>
      </div>

      <div className="space-y-4">
        <Label className="text-foreground">pH Value: {ph}</Label>
        <div className="h-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500" />
        <Slider
          value={[ph]}
          onValueChange={(v) => setPH(v[0])}
          min={0}
          max={14}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Acidic (0)</span>
          <span>Neutral (7)</span>
          <span>Basic (14)</span>
        </div>
      </div>

      <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-accent mt-1" />
          <div>
            <p className="font-medium text-foreground">pH Scale</p>
            <p className="text-sm text-muted-foreground mt-1">
              pH measures hydrogen ion concentration. Each unit change represents a 10x difference in acidity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const labs: Record<string, { name: string; component: React.FC }[]> = {
  Physics: [
    { name: "Ohm's Law", component: OhmsLawLab },
    { name: "Simple Pendulum", component: PendulumLab },
  ],
  Chemistry: [
    { name: "pH Scale", component: PHScaleLab },
  ],
};

export function VirtualLabSimulator({ subject, topic }: VirtualLabSimulatorProps) {
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const availableLabs = labs[subject] || [];

  // Auto-select lab based on topic
  const LabComponent = selectedLab 
    ? availableLabs.find(l => l.name === selectedLab)?.component 
    : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-secondary" />
          {subject} Virtual Lab
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedLab ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableLabs.map((lab) => (
              <Button
                key={lab.name}
                variant="outline"
                className="h-24 flex flex-col gap-2 bg-muted/50 border-border hover:border-secondary"
                onClick={() => setSelectedLab(lab.name)}
              >
                <FlaskConical className="w-6 h-6 text-secondary" />
                <span className="font-display">{lab.name}</span>
              </Button>
            ))}
            {availableLabs.length === 0 && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No labs available for {subject} yet</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedLab(null)}>
              ← Back to Labs
            </Button>
            <h3 className="font-display text-xl font-semibold text-foreground">{selectedLab}</h3>
            {LabComponent && <LabComponent />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
