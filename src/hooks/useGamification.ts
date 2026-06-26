import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Avatar {
  id: string;
  name: string;
  emoji: string;
  minLevel: number;
  description: string;
  color: string;
}

export const CELESTIAL_AVATARS: Avatar[] = [
  { id: "cadet", name: "Stardust Cadet", emoji: "✨", minLevel: 1, description: "A recruit born of stardust", color: "from-blue-500 via-purple-500 to-indigo-600" },
  { id: "voyager", name: "Lunar Voyager", emoji: "🧑‍🚀", minLevel: 2, description: "Experienced in low-gravity learning", color: "from-teal-400 via-cyan-500 to-emerald-600" },
  { id: "nebula", name: "Nebula Explorer", emoji: "🌀", minLevel: 3, description: "Navigator of cosmic gas clouds", color: "from-purple-500 via-pink-500 to-fuchsia-600" },
  { id: "solar", name: "Solar Flare", emoji: "☀️", minLevel: 4, description: "Radiating hot knowledge", color: "from-amber-400 via-orange-500 to-red-600" },
  { id: "sage", name: "Galaxy Sage", emoji: "🌌", minLevel: 5, description: "Keeper of celestial wisdom", color: "from-violet-600 via-fuchsia-700 to-pink-600" },
];

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  requirement: string;
}

export function useGamification() {
  const [xp, setXp] = useState<number>(0);
  const [streak, setStreak] = useState<number>(1);
  const [selectedAvatar, setSelectedAvatar] = useState<string>("cadet");
  const [unlockedAvatars, setUnlockedAvatars] = useState<string[]>(["cadet"]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [studentId, setStudentId] = useState<string | null>(null);

  // Derive levels
  const xpPerLevel = 250;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const xpInCurrentLevel = xp % xpPerLevel;
  const progressPercent = Math.min(100, (xpInCurrentLevel / xpPerLevel) * 100);

  const getRankName = (lvl: number) => {
    if (lvl === 1) return "Stardust Cadet";
    if (lvl === 2) return "Lunar Voyager";
    if (lvl === 3) return "Nebula Explorer";
    if (lvl === 4) return "Solar Flare";
    return "Galaxy Sage";
  };

  const rankName = getRankName(level);

  // Load data
  const loadGamificationData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, xp_points, class_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (studentError || !student) {
        setIsLoading(false);
        return;
      }

      setStudentId(student.id);
      const dbXp = student.xp_points || 0;
      setXp(dbXp);

      // 1. Fetch Streak & Avatars (Try DB first, fallback to LocalStorage)
      let dbStreak = 1;
      let dbSelectedAvatar = "cadet";
      let dbUnlockedAvatars = ["cadet"];

      try {
        // Query the columns (ignoring TS warning as they might be missing in TS but exist in PG)
        const { data: extData, error: extError } = await supabase
          .from("students")
          .select("streak_days, last_active_date, selected_avatar, unlocked_avatars" as any)
          .eq("id", student.id)
          .single();

        if (!extError && extData) {
          dbStreak = (extData as any).streak_days || 1;
          dbSelectedAvatar = (extData as any).selected_avatar || "cadet";
          dbUnlockedAvatars = (extData as any).unlocked_avatars || ["cadet"];

          // Check if we need to update the streak
          const lastActiveStr = (extData as any).last_active_date;
          if (lastActiveStr) {
            const today = new Date().toISOString().split("T")[0];
            const lastActive = new Date(lastActiveStr).toISOString().split("T")[0];

            if (today !== lastActive) {
              const diffTime = Math.abs(new Date(today).getTime() - new Date(lastActive).getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              let newStreak = dbStreak;
              if (diffDays === 1) {
                newStreak += 1;
              } else if (diffDays > 1) {
                newStreak = 1; // streak reset
              }

              // Save updated streak to DB
              await supabase
                .from("students")
                .update({
                  streak_days: newStreak,
                  last_active_date: today,
                } as any)
                .eq("id", student.id);
              
              dbStreak = newStreak;
            }
          }
        } else {
          throw new Error("Columns missing or query failed");
        }
      } catch (err) {
        // FALLBACK: Use LocalStorage for streaks and avatars if database columns do not exist
        const localKey = `learniverse_gamification_${student.id}`;
        const localDataRaw = localStorage.getItem(localKey);
        const today = new Date().toISOString().split("T")[0];

        if (localDataRaw) {
          const localData = JSON.parse(localDataRaw);
          dbStreak = localData.streak || 1;
          dbSelectedAvatar = localData.selectedAvatar || "cadet";
          dbUnlockedAvatars = localData.unlockedAvatars || ["cadet"];

          const lastActive = localData.lastActiveDate;
          if (lastActive && lastActive !== today) {
            const diffTime = Math.abs(new Date(today).getTime() - new Date(lastActive).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
              dbStreak += 1;
            } else if (diffDays > 1) {
              dbStreak = 1;
            }
          }
        }

        // Save local copy
        localStorage.setItem(
          localKey,
          JSON.stringify({
            streak: dbStreak,
            selectedAvatar: dbSelectedAvatar,
            unlockedAvatars: dbUnlockedAvatars,
            lastActiveDate: today,
          })
        );
      }

      setStreak(dbStreak);
      setSelectedAvatar(dbSelectedAvatar);

      // Auto-unlock avatars based on Level (Level 1: cadet, Level 2: voyager, Level 3: nebula, Level 4: solar, Level 5: sage)
      const dynamicUnlocked = [...dbUnlockedAvatars];
      const derivedLevel = Math.floor(dbXp / xpPerLevel) + 1;
      
      CELESTIAL_AVATARS.forEach((av) => {
        if (derivedLevel >= av.minLevel && !dynamicUnlocked.includes(av.id)) {
          dynamicUnlocked.push(av.id);
        }
      });

      setUnlockedAvatars(dynamicUnlocked);

      // 2. Fetch stats for Badges (quizzes attempted, labs completed)
      let quizzesAttempted = 0;
      let labsVisited = 0;

      // Quizzes
      const { data: analytics } = await supabase
        .from("student_analytics")
        .select("quizzes_attempted")
        .eq("student_id", student.id);
      
      if (analytics) {
        quizzesAttempted = analytics.reduce((sum, item) => sum + (item.quizzes_attempted || 0), 0);
      }

      // Labs
      const { count: labCount } = await supabase
        .from("student_lab_progress")
        .select("*", { count: "exact", head: true })
        .eq("student_id", student.id);
      
      labsVisited = labCount || 0;

      // 3. Evaluate Badges
      const listBadges: Badge[] = [
        {
          id: "genesis",
          name: "Stardust Genesis",
          description: "Initiated your cosmic learning path",
          icon: "⭐",
          isUnlocked: true,
          requirement: "Welcome to Learniverse!",
        },
        {
          id: "quiz_nebula",
          name: "Quiz Nebula",
          description: "Successfully attempted 3+ AI Quizzes",
          icon: "🚀",
          isUnlocked: quizzesAttempted >= 3,
          requirement: `Attempt 3 quizzes (Current: ${quizzesAttempted}/3)`,
        },
        {
          id: "lab_pioneer",
          name: "Lab Pioneer",
          description: "Unlocked and visited 2+ Virtual Labs",
          icon: "🧪",
          isUnlocked: labsVisited >= 2,
          requirement: `Visit 2 virtual labs (Current: ${labsVisited}/2)`,
        },
        {
          id: "cosmic_flame",
          name: "Cosmic Flame",
          description: "Kept the fire burning with a 3-day study streak",
          icon: "🔥",
          isUnlocked: dbStreak >= 3,
          requirement: `Reach a 3-day streak (Current: ${dbStreak}/3)`,
        },
        {
          id: "supernova",
          name: "Supernova Master",
          description: "Acquired over 1000 total knowledge points (XP)",
          icon: "☄️",
          isUnlocked: dbXp >= 1000,
          requirement: `Reach 1000 XP (Current: ${dbXp}/1000)`,
        },
      ];

      setBadges(listBadges);

    } catch (err) {
      console.error("Error loading gamification data", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Equip avatar
  const equipAvatar = async (avatarId: string) => {
    if (!studentId) return;

    try {
      // 1. Try DB first
      const { error } = await supabase
        .from("students")
        .update({ selected_avatar: avatarId } as any)
        .eq("id", studentId);

      if (error) throw error;
      setSelectedAvatar(avatarId);
      toast.success("Cosmic avatar equipped!");
    } catch (err) {
      // Fallback to local storage
      const localKey = `learniverse_gamification_${studentId}`;
      const localDataRaw = localStorage.getItem(localKey);
      if (localDataRaw) {
        const localData = JSON.parse(localDataRaw);
        localData.selectedAvatar = avatarId;
        localStorage.setItem(localKey, JSON.stringify(localData));
      }
      setSelectedAvatar(avatarId);
      toast.success("Cosmic avatar equipped (saved locally)!");
    }

    // Sync avatar to topbar immediately by dispatching an event
    window.dispatchEvent(new CustomEvent("avatar-changed", { detail: avatarId }));
  };

  useEffect(() => {
    loadGamificationData();
  }, [xp]);

  useEffect(() => {
    const handleXPChange = (e: any) => {
      if (typeof e.detail === "number") {
        setXp(e.detail);
      }
    };
    const handleAvatarChange = (e: any) => {
      if (typeof e.detail === "string") {
        setSelectedAvatar(e.detail);
      }
    };
    window.addEventListener("xp-changed", handleXPChange);
    window.addEventListener("avatar-changed", handleAvatarChange);
    return () => {
      window.removeEventListener("xp-changed", handleXPChange);
      window.removeEventListener("avatar-changed", handleAvatarChange);
    };
  }, []);

  return {
    xp,
    level,
    xpInCurrentLevel,
    xpForNextLevel: xpPerLevel,
    progressPercent,
    rankName,
    streak,
    selectedAvatar,
    unlockedAvatars,
    badges,
    isLoading,
    equipAvatar,
    refresh: loadGamificationData,
  };
}
