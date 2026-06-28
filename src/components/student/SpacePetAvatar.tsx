import { cn } from "@/lib/utils";

interface SpacePetAvatarProps {
  petType: string;
  equipped: string[];
  mood: "happy" | "tired" | "studying";
  energy: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SpacePetAvatar({
  petType,
  equipped,
  mood,
  energy,
  size = "md",
  className,
}: SpacePetAvatarProps) {
  const getPetEmoji = () => {
    switch (petType) {
      case "droid":
        return "🤖";
      case "starry":
        return "👽";
      case "spacecat":
        return "🐱";
      case "astroparrot":
        return "🦜";
      case "shinchan":
        return "👦";
      case "spacedog":
      default:
        return "🐶";
    }
  };

  const getPetGlowColor = () => {
    switch (petType) {
      case "droid":
        return "shadow-[0_0_20px_rgba(20,250,220,0.3)] border-cyan-500/30";
      case "starry":
        return "shadow-[0_0_20px_rgba(139,92,246,0.3)] border-purple-500/30";
      case "spacecat":
        return "shadow-[0_0_20px_rgba(236,72,153,0.3)] border-pink-500/30";
      case "astroparrot":
        return "shadow-[0_0_20px_rgba(34,197,94,0.3)] border-green-500/30";
      case "shinchan":
        return "shadow-[0_0_20px_rgba(244,63,94,0.3)] border-rose-500/30";
      case "spacedog":
      default:
        return "shadow-[0_0_20px_rgba(245,158,11,0.3)] border-amber-500/30";
    }
  };

  const dimensions = {
    sm: "w-20 h-20 text-3xl",
    md: "w-36 h-36 text-6xl",
    lg: "w-48 h-48 text-8xl",
  }[size];

  // Accessories check
  const hasHelmet = equipped.includes("astro_helmet");
  const hasGoggles = equipped.includes("star_goggles");
  const hasLaser = equipped.includes("laser_pack");
  const hasBooster = equipped.includes("rocket_booster");
  const hasHeadphones = equipped.includes("space_headphones");
  const hasCape = equipped.includes("stardust_cape");
  const hasCrown = equipped.includes("cosmic_crown");
  const hasSatellite = equipped.includes("satellite_shield");

  // Inline CSS keyframes to ensure orbital satellite and cape float animations run independently
  const inlineStyles = `
    @keyframes orbit-satellite {
      0% { transform: rotate(0deg) translateX(${size === "lg" ? "105px" : size === "md" ? "80px" : "45px"}) rotate(0deg); }
      100% { transform: rotate(360deg) translateX(${size === "lg" ? "105px" : size === "md" ? "80px" : "45px"}) rotate(-360deg); }
    }
    .animate-orbit-satellite {
      animation: orbit-satellite 6s linear infinite;
    }
  `;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full bg-slate-950/80 border-2 backdrop-blur-md transition-all duration-500",
        dimensions,
        getPetGlowColor(),
        className
      )}
    >
      <style>{inlineStyles}</style>

      {/* Background Star Trails */}
      <div className="absolute inset-0 rounded-full overflow-hidden opacity-30 pointer-events-none">
        <div className="absolute w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:10px_10px] animate-pulse" />
      </div>

      {/* STARDUST CAPE (RENDERED BEHIND PET) */}
      {hasCape && (
        <div className="absolute -bottom-2 w-full h-3/4 bg-gradient-to-t from-indigo-600/70 via-purple-600/40 to-transparent rounded-b-xl z-0 filter blur-[1px] animate-float" style={{ transform: "scaleX(1.15) translateY(5px)" }} />
      )}

      {/* ROCKET BOOSTER FLAME */}
      {hasBooster && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-0 flex flex-col items-center">
          <div className="w-4 h-8 bg-gradient-to-t from-transparent via-orange-500 to-yellow-400 rounded-full filter blur-[1px] animate-bounce" />
          <div className="w-2 h-4 bg-yellow-300 rounded-full filter blur-[2px] -mt-6 animate-pulse" />
        </div>
      )}

      {/* LASER SHOULDERS */}
      {hasLaser && (
        <div className="absolute w-full flex justify-between px-1 z-10 pointer-events-none">
          <div className="w-4 h-4 bg-slate-700 rounded-md border border-cyan-400/50 flex items-center justify-center animate-pulse">
            <span className="text-[6px] text-cyan-300">⚡</span>
          </div>
          <div className="w-4 h-4 bg-slate-700 rounded-md border border-cyan-400/50 flex items-center justify-center animate-pulse">
            <span className="text-[6px] text-cyan-300">⚡</span>
          </div>
        </div>
      )}

      {/* CORE PET CHARACTER WITH ANIMATED STATE */}
      <div
        className={cn(
          "relative z-20 select-none flex items-center justify-center transition-all duration-300",
          mood === "happy" && "animate-float",
          mood === "studying" && "animate-pulse-glow scale-105",
          mood === "tired" && "opacity-80 scale-95 origin-bottom"
        )}
      >
        {/* Actual Character Emoji */}
        <span>{getPetEmoji()}</span>

        {/* STAR GOGGLES OVERLAY */}
        {hasGoggles && (
          <div 
            className={cn(
              "absolute z-30 pointer-events-none flex items-center justify-center w-full scale-[0.6] -translate-y-1.5 opacity-90",
              petType === "spacedog" && "-translate-y-2.5",
              petType === "spacecat" && "-translate-y-2",
              petType === "droid" && "-translate-y-2"
            )}
          >
            <div className="w-16 h-3 bg-cyan-400/30 border border-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.8)] backdrop-blur-xs flex justify-around items-center px-1">
              <div className="w-1 h-1 bg-cyan-200 rounded-full animate-ping" />
              <div className="w-4 h-0.5 bg-cyan-300/80 rounded" />
              <div className="w-1 h-1 bg-cyan-200 rounded-full animate-ping" />
            </div>
          </div>
        )}

        {/* SPACE DJ HEADPHONES */}
        {hasHeadphones && (
          <div className="absolute z-30 pointer-events-none w-full h-full flex justify-between scale-[1.08]">
            <div className="w-3.5 h-6 bg-pink-500 rounded-full border border-pink-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]" style={{ transform: "translateX(-2px) translateY(8px)" }} />
            <div className="w-3.5 h-6 bg-pink-500 rounded-full border border-pink-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]" style={{ transform: "translateX(2px) translateY(8px)" }} />
            {/* Band */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4/5 h-3 border-t-2 border-pink-400 rounded-t-full" />
          </div>
        )}

        {/* COSMIC CROWN HOVERING */}
        {hasCrown && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 animate-bounce text-base">
            👑
          </div>
        )}

        {/* TIRED/SLEEPY EMOJI PARTICLES */}
        {mood === "tired" && (
          <div className="absolute -top-3 -right-3 text-xs font-mono text-cyan-400 font-bold animate-bounce opacity-70">
            Zzz
          </div>
        )}

        {/* STUDYING CONCENTRATION PARTICLES */}
        {mood === "studying" && (
          <div className="absolute -top-2 flex gap-1 z-30">
            <span className="text-xs animate-bounce">✨</span>
            <span className="text-xs animate-pulse">💡</span>
          </div>
        )}
      </div>

      {/* ASTRO HELMET GLASS BUBBLE */}
      {hasHelmet && (
        <div className="absolute inset-0 rounded-full border border-cyan-300/40 bg-cyan-400/5 shadow-[inset_0_0_20px_rgba(20,250,220,0.15)] z-40 backdrop-blur-[0.5px] pointer-events-none">
          <div className="absolute top-2 left-4 w-1/4 h-1/4 bg-white/20 rounded-full filter blur-[1px] rotate-45 transform skew-x-12" />
        </div>
      )}

      {/* ORBITING SATELLITE SHIELD */}
      {hasSatellite && (
        <div className="absolute z-40 w-6 h-6 flex items-center justify-center text-lg animate-orbit-satellite pointer-events-none">
          🛰️
        </div>
      )}

      {/* ENERGY STATUS RING */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-900 border border-border px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold text-muted-foreground z-40 shadow-md">
        🔋 <span className={cn(
          energy >= 70 ? "text-emerald-400" : energy >= 40 ? "text-yellow-400" : "text-red-400"
        )}>{energy}%</span>
      </div>
    </div>
  );
}
