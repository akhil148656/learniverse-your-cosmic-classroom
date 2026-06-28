import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSpacePet } from "@/hooks/useSpacePet";
import { cn } from "@/lib/utils";

export function FloatingSpacePet() {
  const navigate = useNavigate();
  const { selectedPet, petName, petMood, isLoading } = useSpacePet();
  const [hovered, setHovered] = useState(false);

  if (isLoading) return null;

  const getPetEmoji = () => {
    switch (selectedPet) {
      case "droid": return "🤖";
      case "starry": return "👽";
      case "spacecat": return "🐱";
      case "astroparrot": return "🦜";
      case "shinchan": return "👦";
      case "spacedog":
      default:
        return "🐶";
    }
  };

  const getPetMoodEmoji = () => {
    switch (petMood) {
      case "tired": return "😴";
      case "studying": return "⚡";
      case "happy":
      default:
        return "😊";
    }
  };

  const getSpeechText = () => {
    switch (petMood) {
      case "tired": return "I'm sleepy... study desk?";
      case "studying": return "Learning speeds active! 🚀";
      case "happy":
      default:
        return "Let's study together! 🌌";
    }
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Speech bubble above pet */}
      <div
        className={cn(
          "mb-2 mr-2 px-3 py-1.5 bg-slate-900/95 border border-secondary/40 text-foreground text-[10px] font-medium font-mono rounded-xl shadow-lg transition-all duration-300 transform origin-bottom-right pointer-events-auto",
          hovered ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-2"
        )}
      >
        <span className="text-secondary font-bold">{petName}:</span> {getSpeechText()}
      </div>

      {/* Floating Pet Bubble */}
      <button
        onClick={() => navigate("/student/study-buddy")}
        className={cn(
          "w-14 h-14 rounded-full bg-slate-950/90 border border-secondary/50 shadow-[0_0_20px_rgba(20,250,220,0.25)] flex items-center justify-center text-3xl transition-all duration-300 transform pointer-events-auto select-none",
          hovered ? "scale-110 hover:border-secondary hover:shadow-[0_0_25px_rgba(20,250,220,0.4)]" : "animate-float"
        )}
      >
        <span>{getPetEmoji()}</span>
        
        {/* Mood indicator badge */}
        <span className="absolute -top-1 -right-1 bg-slate-900 border border-border w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
          {getPetMoodEmoji()}
        </span>
      </button>
    </div>
  );
}
