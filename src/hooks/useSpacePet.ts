import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AccessoryItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
  type: "helmet" | "goggles" | "laser" | "booster" | "headphones" | "cape" | "crown" | "satellite";
}

export interface BackdropItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  colorClass: string;
}

export const ACCESSORY_SHOP: AccessoryItem[] = [
  { id: "astro_helmet", name: "Astro Helmet", description: "Glowing oxygen bubble shield", cost: 50, emoji: "🧑‍🚀", type: "helmet" },
  { id: "star_goggles", name: "Star Goggles", description: "Infrared navigation eyepiece", cost: 30, emoji: "👓", type: "goggles" },
  { id: "space_headphones", name: "DJ Headphones", description: "Neon-glowing music headphones", cost: 65, emoji: "🎧", type: "headphones" },
  { id: "laser_pack", name: "Laser Pack", description: "High-voltage shoulder cannon", cost: 75, emoji: "⚡", type: "laser" },
  { id: "rocket_booster", name: "Rocket Booster", description: "Mini jetpack for floating heights", cost: 100, emoji: "🚀", type: "booster" },
  { id: "stardust_cape", name: "Stardust Cape", description: "Flowing cosmic cape behind you", cost: 90, emoji: "🧥", type: "cape" },
  { id: "cosmic_crown", name: "Cosmic Crown", description: "Floating glowing gold crown", cost: 120, emoji: "👑", type: "crown" },
  { id: "satellite_shield", name: "Satellite Shield", description: "Orbiting navigation probe", cost: 150, emoji: "🛰️", type: "satellite" }
];

export const BACKDROP_SHOP: BackdropItem[] = [
  { id: "default_deck", name: "Cockpit Deck", description: "Classic capsule control station", cost: 0, colorClass: "bg-slate-900/60" },
  { id: "orion_nebula", name: "Orion Nebula", description: "Gazing into purple stellar nurseries", cost: 40, colorClass: "bg-purple-950/40 border-purple-500/20" },
  { id: "black_hole", name: "Event Horizon", description: "Spooky backdrop of a cosmic singular point", cost: 80, colorClass: "bg-cyan-950/40 border-cyan-500/20" }
];

export function useSpacePet() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [coins, setCoins] = useState<number>(50);
  const [selectedPet, setSelectedPet] = useState<string>("spacedog");
  const [petName, setPetName] = useState<string>("Cosmo");
  const [unlockedAccessories, setUnlockedAccessories] = useState<string[]>([]);
  const [equippedAccessories, setEquippedAccessories] = useState<string[]>([]);
  const [selectedBackdrop, setSelectedBackdrop] = useState<string>("default_deck");
  const [unlockedBackdrops, setUnlockedBackdrops] = useState<string[]>(["default_deck"]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Derived properties
  const [petMood, setPetMood] = useState<"happy" | "tired" | "studying">("happy");
  const [petEnergy, setPetEnergy] = useState<number>(100);

  // Load mood & energy based on focus shields / streaks
  const fetchEnergyAndMood = async (sid: string) => {
    try {
      const { data: student } = await supabase
        .from("students")
        .select("focus_score, streak_days")
        .eq("id", sid)
        .single();
      
      if (student) {
        const score = student.focus_score ?? 100;
        setPetEnergy(score);

        if (score < 50) {
          setPetMood("tired");
        } else if (score >= 90) {
          setPetMood("studying");
        } else {
          setPetMood("happy");
        }
      }
    } catch {
      setPetEnergy(100);
      setPetMood("happy");
    }
  };

  const loadSpacePetData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, xp_points")
        .eq("user_id", user.id)
        .maybeSingle();

      if (studentError || !student) {
        setIsLoading(false);
        return;
      }

      setStudentId(student.id);
      await fetchEnergyAndMood(student.id);

      // Attempt DB read
      let currentCoins = 50;
      try {
        const { data: extData, error: extError } = await supabase
          .from("students")
          .select("cosmic_coins, selected_pet, pet_name, unlocked_accessories, equipped_accessories" as any)
          .eq("id", student.id)
          .single();

        if (!extError && extData) {
          currentCoins = (extData as any).cosmic_coins ?? 50;
          setCoins(currentCoins);
          setSelectedPet((extData as any).selected_pet || "spacedog");
          setPetName((extData as any).pet_name || "Cosmo");
          setUnlockedAccessories((extData as any).unlocked_accessories || []);
          setEquippedAccessories((extData as any).equipped_accessories || []);
        } else {
          throw new Error("Fields not in DB");
        }
      } catch {
        // Fallback: localStorage
        const localKey = `learniverse_space_pet_${student.id}`;
        const localRaw = localStorage.getItem(localKey);
        if (localRaw) {
          const l = JSON.parse(localRaw);
          currentCoins = l.coins ?? 50;
          setCoins(currentCoins);
          setSelectedPet(l.selectedPet ?? "spacedog");
          setPetName(l.petName ?? "Cosmo");
          setUnlockedAccessories(l.unlockedAccessories ?? []);
          setEquippedAccessories(l.equippedAccessories ?? []);
          setSelectedBackdrop(l.selectedBackdrop ?? "default_deck");
          setUnlockedBackdrops(l.unlockedBackdrops ?? ["default_deck"]);
        } else {
          const initial = {
            coins: 50,
            selectedPet: "spacedog",
            petName: "Cosmo",
            unlockedAccessories: [],
            equippedAccessories: [],
            selectedBackdrop: "default_deck",
            unlockedBackdrops: ["default_deck"]
          };
          localStorage.setItem(localKey, JSON.stringify(initial));
        }
      }

      // Check for daily streak check-in bonus
      try {
        const { data: streakData } = await supabase
          .from("students")
          .select("streak_days")
          .eq("id", student.id)
          .single();
        
        if (streakData) {
          const currentStreak = streakData.streak_days || 1;
          const streakKey = `learniverse_space_pet_last_streak_${student.id}`;
          const lastStreak = parseInt(localStorage.getItem(streakKey) || "0");
          
          if (currentStreak > lastStreak && lastStreak > 0) {
            // Streak increased! Award +10 coins
            const nextCoins = currentCoins + 10;
            // Update state & save
            await syncPetState({ coins: nextCoins });
            toast.success(`Daily Streak check-in! +10 Cosmic Coins earned! 🪙🔥`);
          }
          localStorage.setItem(streakKey, currentStreak.toString());
        }
      } catch (err) {
        console.warn("Streak coins check failed:", err);
      }

    } catch (err) {
      console.error("Error loading space pet data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync to database or local storage helper
  const syncPetState = async (updates: {
    coins?: number;
    selectedPet?: string;
    petName?: string;
    unlockedAccessories?: string[];
    equippedAccessories?: string[];
    selectedBackdrop?: string;
    unlockedBackdrops?: string[];
  }) => {
    if (!studentId) return;

    const localCoins = updates.coins !== undefined ? updates.coins : coins;
    const localPet = updates.selectedPet !== undefined ? updates.selectedPet : selectedPet;
    const localName = updates.petName !== undefined ? updates.petName : petName;
    const localUnlockedAcc = updates.unlockedAccessories !== undefined ? updates.unlockedAccessories : unlockedAccessories;
    const localEquippedAcc = updates.equippedAccessories !== undefined ? updates.equippedAccessories : equippedAccessories;
    const localBackdrop = updates.selectedBackdrop !== undefined ? updates.selectedBackdrop : selectedBackdrop;
    const localUnlockedBk = updates.unlockedBackdrops !== undefined ? updates.unlockedBackdrops : unlockedBackdrops;

    try {
      await supabase
        .from("students")
        .update({
          cosmic_coins: localCoins,
          selected_pet: localPet,
          pet_name: localName,
          unlocked_accessories: localUnlockedAcc,
          equipped_accessories: localEquippedAcc
        } as any)
        .eq("id", studentId);
    } catch {
      // Graceful fallback
    }

    const localKey = `learniverse_space_pet_${studentId}`;
    localStorage.setItem(localKey, JSON.stringify({
      coins: localCoins,
      selectedPet: localPet,
      petName: localName,
      unlockedAccessories: localUnlockedAcc,
      equippedAccessories: localEquippedAcc,
      selectedBackdrop: localBackdrop,
      unlockedBackdrops: localUnlockedBk
    }));

    if (updates.coins !== undefined) setCoins(updates.coins);
    if (updates.selectedPet !== undefined) setSelectedPet(updates.selectedPet);
    if (updates.petName !== undefined) setPetName(updates.petName);
    if (updates.unlockedAccessories !== undefined) setUnlockedAccessories(updates.unlockedAccessories);
    if (updates.equippedAccessories !== undefined) setEquippedAccessories(updates.equippedAccessories);
    if (updates.selectedBackdrop !== undefined) setSelectedBackdrop(updates.selectedBackdrop);
    if (updates.unlockedBackdrops !== undefined) setUnlockedBackdrops(updates.unlockedBackdrops);
  };

  const renamePet = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Companion name cannot be empty");
      return;
    }
    await syncPetState({ petName: trimmed });
    toast.success(`Companion renamed to ${trimmed}! 🛸`);
  };

  const changePetType = async (petType: string) => {
    await syncPetState({ selectedPet: petType });
    toast.success("Companion species altered! 🌌");
  };

  const buyAccessory = async (item: AccessoryItem) => {
    if (coins < item.cost) {
      toast.error("Insufficient Cosmic Coins. Complete study tasks or quizzes to earn more! ☄️");
      return;
    }
    if (unlockedAccessories.includes(item.id)) {
      toast.error("You already own this accessory.");
      return;
    }

    const updatedUnlocked = [...unlockedAccessories, item.id];
    const newCoins = coins - item.cost;
    await syncPetState({ coins: newCoins, unlockedAccessories: updatedUnlocked });
    toast.success(`Bought ${item.name}! -${item.cost} Coins 🪙`);
  };

  const equipAccessory = async (itemId: string) => {
    if (!unlockedAccessories.includes(itemId)) return;
    const item = ACCESSORY_SHOP.find(a => a.id === itemId);
    if (!item) return;

    const filteredEquipped = equippedAccessories.filter(id => {
      const activeItem = ACCESSORY_SHOP.find(a => a.id === id);
      return activeItem ? activeItem.type !== item.type : true;
    });

    const updatedEquipped = [...filteredEquipped, itemId];
    await syncPetState({ equippedAccessories: updatedEquipped });
    toast.success(`${item.name} equipped!`);
  };

  const unequipAccessory = async (itemId: string) => {
    const updatedEquipped = equippedAccessories.filter(id => id !== itemId);
    await syncPetState({ equippedAccessories: updatedEquipped });
    toast.success("Accessory unequipped");
  };

  const buyBackdrop = async (item: BackdropItem) => {
    if (coins < item.cost) {
      toast.error("Insufficient Cosmic Coins.");
      return;
    }
    if (unlockedBackdrops.includes(item.id)) return;

    const newCoins = coins - item.cost;
    const updatedUnlocked = [...unlockedBackdrops, item.id];
    await syncPetState({ coins: newCoins, unlockedBackdrops: updatedUnlocked });
    toast.success(`Backdrop unlocked: ${item.name}! 🌌`);
  };

  const selectBackdrop = async (backdropId: string) => {
    if (!unlockedBackdrops.includes(backdropId)) return;
    await syncPetState({ selectedBackdrop: backdropId });
    toast.success("Backdrop view active");
  };

  // Award bonus coins when XP increases
  useEffect(() => {
    const handleXPChange = async (e: any) => {
      if (typeof e.detail === "number" && studentId) {
        const localKey = `learniverse_space_pet_xp_last_${studentId}`;
        const lastXp = parseInt(localStorage.getItem(localKey) || "0");
        const newXp = e.detail;
        
        if (newXp > lastXp) {
          const diff = newXp - lastXp;
          const coinsEarned = Math.ceil(diff * 0.5);
          if (coinsEarned > 0) {
            const nextCoins = coins + coinsEarned;
            await syncPetState({ coins: nextCoins });
            toast.info(`Earned +${coinsEarned} Cosmic Coins from study progress! 🪙`);
          }
        }
        localStorage.setItem(localKey, newXp.toString());
      }
    };

    window.addEventListener("xp-changed", handleXPChange);
    return () => {
      window.removeEventListener("xp-changed", handleXPChange);
    };
  }, [studentId, coins]);

  useEffect(() => {
    loadSpacePetData();
  }, []);

  return {
    coins,
    selectedPet,
    petName,
    unlockedAccessories,
    equippedAccessories,
    selectedBackdrop,
    unlockedBackdrops,
    petMood,
    petEnergy,
    isLoading,
    renamePet,
    changePetType,
    buyAccessory,
    equipAccessory,
    unequipAccessory,
    buyBackdrop,
    selectBackdrop,
    refresh: loadSpacePetData,
    syncPetState
  };
}
