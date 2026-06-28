import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield,
  Play,
  Square,
  Volume2,
  VolumeX,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Web Audio API Synthesizer Helper
const playSynthSound = (type: "warning" | "success" | "start") => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "start") {
      // High bright chirp
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "warning") {
      // Alarm siren
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "success") {
      // Upward melodic arpeggio
      osc.type = "triangle";
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, idx) => {
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      });
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start();
      osc.stop(now + 0.5);
    }
  } catch (e) {
    console.warn("Audio synthesis block:", e);
  }
};

interface FocusShieldProps {
  studentId: string;
  studentName: string;
  currentXP: number;
  currentFocusScore: number;
  onUpdate: () => void;
}

export function FocusShield({
  studentId,
  studentName,
  currentXP,
  currentFocusScore,
  onUpdate,
}: FocusShieldProps) {
  // Config
  const orbitOptions = [
    { label: "Short Orbit", value: 15 },
    { label: "Standard Orbit", value: 25 },
    { label: "Extended Orbit", value: 45 },
  ];

  // Load state from local storage on init helper
  const loadSavedState = () => {
    if (!studentId) return null;
    try {
      const saved = localStorage.getItem(`learniverse_focus_shield_${studentId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load FocusShield state from localStorage:", e);
    }
    return null;
  };

  // States
  const [duration, setDuration] = useState(25); // Minutes
  const [isActive, setIsActive] = useState(false);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [focusScore, setFocusScore] = useState(currentFocusScore);
  const [distractions, setDistractions] = useState(0);
  const [tabShifts, setTabShifts] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Overlay alarms
  const [inactivityAlarm, setInactivityAlarm] = useState(false);
  const [countdownLeft, setCountdownLeft] = useState(15);

  // Refs for tracking
  const stateRef = useRef({
    isActive: false,
    focusScore: currentFocusScore,
    distractions: 0,
    blurTimeout: null as any,
  });

  const lastActivityRef = useRef(Date.now());
  const alertSentRef = useRef(false);
  const tabShiftsRef = useRef(0);

  // Sync state variables to stateRef
  useEffect(() => {
    stateRef.current.isActive = isActive;
    stateRef.current.focusScore = focusScore;
    stateRef.current.distractions = distractions;
  }, [isActive, focusScore, distractions]);

  // Sync tabShifts to ref
  useEffect(() => {
    tabShiftsRef.current = tabShifts;
  }, [tabShifts]);

  // Load state on mount/studentId update
  useEffect(() => {
    if (!studentId) return;
    const saved = loadSavedState();
    if (saved) {
      setIsActive(saved.isActive);
      setDuration(saved.duration);
      setFocusScore(saved.focusScore !== undefined ? saved.focusScore : currentFocusScore);
      setDistractions(saved.distractions || 0);
      setTabShifts(saved.tabShifts || 0);
      setSoundEnabled(saved.soundEnabled !== undefined ? saved.soundEnabled : true);
      setInactivityAlarm(saved.inactivityAlarm || false);
      setCountdownLeft(saved.countdownLeft !== undefined ? saved.countdownLeft : 15);
      
      if (saved.isActive && saved.endTime) {
        const remaining = Math.max(0, Math.ceil((saved.endTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        setEndTime(saved.endTime);
        if (remaining <= 0) {
          setIsActive(false);
          setEndTime(null);
          setTimeout(() => {
            handleAccomplishOrbit();
          }, 0);
        }
      } else {
        setTimeLeft(saved.duration * 60);
      }
      
      if (saved.lastActivityTime) {
        lastActivityRef.current = saved.lastActivityTime;
      }
    } else {
      setFocusScore(currentFocusScore);
      setTimeLeft(duration * 60);
    }
  }, [studentId]);

  // Sync state variables back to local storage
  useEffect(() => {
    if (!studentId) return;
    const stateObj = {
      isActive,
      endTime,
      duration,
      focusScore,
      distractions,
      tabShifts,
      soundEnabled,
      inactivityAlarm,
      countdownLeft,
      lastActivityTime: lastActivityRef.current,
    };
    localStorage.setItem(`learniverse_focus_shield_${studentId}`, JSON.stringify(stateObj));
  }, [isActive, endTime, duration, focusScore, distractions, tabShifts, soundEnabled, inactivityAlarm, countdownLeft, studentId]);

  // Sync props focus score only when inactive to avoid race condition/overwrites
  useEffect(() => {
    if (!isActive) {
      setFocusScore(currentFocusScore);
    }
  }, [currentFocusScore, isActive]);

  // Reset duration options when inactive
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(duration * 60);
    }
  }, [duration, isActive]);

  // Main countdown timer (1s ticks)
  useEffect(() => {
    let interval: any = null;
    if (isActive && !inactivityAlarm) {
      if (timeLeft <= 0) {
        handleAccomplishOrbit();
      } else {
        interval = setInterval(() => {
          if (endTime) {
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            setTimeLeft(remaining);
          } else {
            setTimeLeft((prev) => prev - 1);
          }
        }, 1000);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, inactivityAlarm, endTime]);

  // Browser Tab Visibility & Focus Loss Detector
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!stateRef.current.isActive) return;

      if (document.hidden) {
        // User switched tabs or minimized window. Give 3 seconds grace period.
        if (soundEnabled) playSynthSound("warning");
        toast.warning("🛸 Shield compromised! Return to the cockpit immediately!", {
          duration: 3000,
        });

        stateRef.current.blurTimeout = setTimeout(() => {
          handleTabShiftDistraction("Tab Switched");
        }, 3000);
      } else {
        // Returned within grace period
        if (stateRef.current.blurTimeout) {
          clearTimeout(stateRef.current.blurTimeout);
          stateRef.current.blurTimeout = null;
        }
      }
    };

    const handleWindowBlur = () => {
      if (!stateRef.current.isActive) return;
      // Window lost focus. Give grace period.
      stateRef.current.blurTimeout = setTimeout(() => {
        handleTabShiftDistraction("Window Unfocused");
      }, 3000);
    };

    const handleWindowFocus = () => {
      if (stateRef.current.blurTimeout) {
        clearTimeout(stateRef.current.blurTimeout);
        stateRef.current.blurTimeout = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [soundEnabled]);

  // Activity Tracker (Idle Detection)
  useEffect(() => {
    if (!isActive || inactivityAlarm) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Listen for interaction events
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("scroll", updateActivity);
    window.addEventListener("touchstart", updateActivity);

    // Check idle state every 5 seconds
    const interval = setInterval(() => {
      const idleTime = (Date.now() - lastActivityRef.current) / 1000;
      if (idleTime >= 60) {
        // Idle for 1 minute
        triggerInactivityAlarm();
      }
    }, 5000);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
      clearInterval(interval);
    };
  }, [isActive, inactivityAlarm]);

  // Idle alarm countdown
  useEffect(() => {
    let interval: any = null;
    if (inactivityAlarm) {
      if (countdownLeft <= 0) {
        triggerDistractionPenalty("Idle Autopilot Failure");
        setInactivityAlarm(false);
        lastActivityRef.current = Date.now();
      } else {
        interval = setInterval(() => {
          setCountdownLeft((prev) => prev - 1);
        }, 1000);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [inactivityAlarm, countdownLeft]);

  // Handles standard distraction penalty (like inactivity warning countdown failures)
  const triggerDistractionPenalty = async (reason: string) => {
    const nextScore = Math.max(0, stateRef.current.focusScore - 5);
    const nextDistractions = stateRef.current.distractions + 1;

    setFocusScore(nextScore);
    setDistractions(nextDistractions);

    if (soundEnabled) playSynthSound("warning");
    toast.error(`💥 Impact detected: ${reason}! Shield integrity: ${nextScore}%`, {
      description: "-5% Focus integrity deducted.",
    });

    try {
      // 1. Sync student profile table
      await supabase
        .from("students")
        .update({ focus_score: nextScore } as any)
        .eq("id", studentId);

      // 2. Sync student analytics rollup row
      const { data: analyticsRow } = await supabase
        .from("student_analytics")
        .select("id, distraction_count, focus_score")
        .eq("student_id", studentId)
        .limit(1)
        .maybeSingle();

      if (analyticsRow) {
        await supabase
          .from("student_analytics")
          .update({
            distraction_count: (analyticsRow.distraction_count || 0) + 1,
            focus_score: nextScore,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", analyticsRow.id);
      } else {
        await supabase.from("student_analytics").insert({
          student_id: studentId,
          distraction_count: 1,
          focus_score: nextScore,
        } as any);
      }

      // 3. Send Notification to Parents if score falls below 70%
      if (nextScore < 70 && !alertSentRef.current) {
        const { data: parentLinks } = await supabase
          .from("parent_students")
          .select("parent_id")
          .eq("student_id", studentId);

        if (parentLinks && parentLinks.length > 0) {
          const parentNotifications = parentLinks.map((p) => ({
            user_id: p.parent_id,
            title: `⚠️ Shield integrity Warning: ${studentName}`,
            message: `${studentName}'s Focus Shield collapsed to ${nextScore}%! Tab switching or inactivity was detected during their study orbit.`,
            type: "warning",
            link: "/parent/alerts",
          }));
          await supabase.from("notifications").insert(parentNotifications);
          alertSentRef.current = true;
          toast.info("Parent command center notified of compromised shields.");
        }
      }

      onUpdate();
    } catch (e: any) {
      console.error("Distraction sync error:", e);
    }
  };

  // Handles tab-switch specific distraction logic (with 3-strike limit)
  const handleTabShiftDistraction = async (reason: string) => {
    const nextTabShifts = tabShiftsRef.current + 1;
    setTabShifts(nextTabShifts);

    if (nextTabShifts <= 3) {
      const nextScore = Math.max(0, stateRef.current.focusScore - 5);
      setFocusScore(nextScore);
      setDistractions((d) => d + 1);

      if (soundEnabled) playSynthSound("warning");
      toast.warning(`🛸 Tab shift detected (${nextTabShifts}/3)! Focus Integrity: ${nextScore}%`, {
        description: "-5% Focus integrity deducted.",
      });

      try {
        await supabase
          .from("students")
          .update({ focus_score: nextScore } as any)
          .eq("id", studentId);

        const { data: analyticsRow } = await supabase
          .from("student_analytics")
          .select("id, distraction_count, focus_score")
          .eq("student_id", studentId)
          .limit(1)
          .maybeSingle();

        if (analyticsRow) {
          await supabase
            .from("student_analytics")
            .update({
              distraction_count: (analyticsRow.distraction_count || 0) + 1,
              focus_score: nextScore,
              updated_at: new Date().toISOString(),
            } as any)
            .eq("id", analyticsRow.id);
        }
        onUpdate();
      } catch (err) {
        console.error("Tab shift penalty sync error:", err);
      }
    } else {
      // 4th tab shift: Critical collapse
      await triggerCriticalCollapse(reason);
    }
  };

  // Collapses the Focus Shield and applies major XP penalties
  const triggerCriticalCollapse = async (reason: string) => {
    setIsActive(false);
    setEndTime(null);
    setInactivityAlarm(false);
    setTabShifts(0);

    const nextScore = Math.max(0, stateRef.current.focusScore - 15);
    const xpPenalty = 20;
    const nextXP = Math.max(0, currentXP - xpPenalty);

    setFocusScore(nextScore);

    if (soundEnabled) playSynthSound("warning");
    toast.error(`💥 Focus Shield Collapsed! Tab shift limit exceeded (4/3).`, {
      description: `Penalties: -15% Focus Integrity, -${xpPenalty} XP. Teachers & parents notified.`,
      duration: 8000,
    });

    try {
      // 1. Sync student profile
      await supabase
        .from("students")
        .update({ 
          focus_score: nextScore,
          xp_points: nextXP
        } as any)
        .eq("id", studentId);

      // 2. Sync student analytics
      const { data: analyticsRow } = await supabase
        .from("student_analytics")
        .select("id, distraction_count, focus_score")
        .eq("student_id", studentId)
        .limit(1)
        .maybeSingle();

      if (analyticsRow) {
        await supabase
          .from("student_analytics")
          .update({
            distraction_count: (analyticsRow.distraction_count || 0) + 1,
            focus_score: nextScore,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", analyticsRow.id);
      }

      // 3. Send Notification to Parents
      const { data: parentLinks } = await supabase
        .from("parent_students")
        .select("parent_id")
        .eq("student_id", studentId);

      if (parentLinks && parentLinks.length > 0) {
        const parentNotifications = parentLinks.map((p) => ({
          user_id: p.parent_id,
          title: `🚨 Focus Shield Collapse: ${studentName}`,
          message: `${studentName}'s Focus Shield collapsed! Tab shift limit exceeded (4+ times) during their study orbit. XP has been penalized.`,
          type: "warning",
          link: "/parent/alerts",
        }));
        await supabase.from("notifications").insert(parentNotifications);
      }

      // 4. Send Notification to Teacher
      const { data: studentData } = await supabase
        .from("students")
        .select("class_id")
        .eq("id", studentId)
        .maybeSingle();

      if (studentData?.class_id) {
        const { data: classData } = await supabase
          .from("classes")
          .select("teacher_id")
          .eq("id", studentData.class_id)
          .maybeSingle();

        if (classData?.teacher_id) {
          await supabase.from("notifications").insert({
            user_id: classData.teacher_id,
            title: `🚨 Focus Shield Collapse: ${studentName}`,
            message: `${studentName}'s Focus Shield collapsed! Tab shift limit exceeded (4+ times) during their study orbit. XP has been penalized.`,
            type: "warning",
            link: "/teacher/alerts",
          });
        }
      }

      onUpdate();
    } catch (e: any) {
      console.error("Critical collapse sync error:", e);
    }
  };

  // Trigger idle screen overlay
  const triggerInactivityAlarm = () => {
    setInactivityAlarm(true);
    setCountdownLeft(15);
    if (soundEnabled) playSynthSound("warning");
  };

  // Close idle screen overlay
  const handleAcknowledgeInactivity = () => {
    setInactivityAlarm(false);
    lastActivityRef.current = Date.now();
    toast.success("Focus Shield stabilized. Welcome back, astronaut! 🚀");
  };

  // Launch Pomodoro timer
  const handleActivate = () => {
    const now = Date.now();
    const durationSeconds = duration * 60;
    const targetEndTime = now + durationSeconds * 1000;

    setIsActive(true);
    setEndTime(targetEndTime);
    setTimeLeft(durationSeconds);
    setFocusScore(currentFocusScore);
    setDistractions(0);
    setTabShifts(0);
    setInactivityAlarm(false);
    alertSentRef.current = false;
    lastActivityRef.current = now;

    if (soundEnabled) playSynthSound("start");
    toast.success(`Space Focus Shield online! Duration: ${duration} minutes. 🛡️`);
  };

  // Abort Pomodoro timer
  const handleDeactivate = () => {
    setIsActive(false);
    setEndTime(null);
    setTimeLeft(duration * 60);
    setInactivityAlarm(false);
    setTabShifts(0);
    toast.error("Focus Shield offline. Orbit aborted.");
  };

  // Orbit completed successfully
  const handleAccomplishOrbit = async () => {
    setIsActive(false);
    setEndTime(null);
    setTabShifts(0);
    if (soundEnabled) playSynthSound("success");

    const xpReward = duration * 2; // e.g. 50 XP for 25 mins
    const nextXP = currentXP + xpReward;

    toast.success(`🎉 Mission Accomplished! Successfully completed a ${duration} minutes orbit! +${xpReward} XP earned.`);

    try {
      const { data: currentStudent } = await supabase
        .from("students")
        .select("cosmic_coins")
        .eq("id", studentId)
        .maybeSingle();
      
      const prevCoins = currentStudent?.cosmic_coins ?? 50;
      const bonusCoins = 15;
      const nextCoins = prevCoins + bonusCoins;

      // 1. Update XP and Coins
      await supabase
        .from("students")
        .update({ 
          xp_points: nextXP,
          cosmic_coins: nextCoins
        } as any)
        .eq("id", studentId);

      toast.success(`🪙 Focus orbit completed! +${bonusCoins} Cosmic Coins bonus awarded!`);
      window.dispatchEvent(new CustomEvent("xp-changed", { detail: nextXP }));

      // 2. Update study time minutes in analytics
      const { data: analyticsRow } = await supabase
        .from("student_analytics")
        .select("id, study_time_minutes")
        .eq("student_id", studentId)
        .limit(1)
        .maybeSingle();

      if (analyticsRow) {
        await supabase
          .from("student_analytics")
          .update({
            study_time_minutes: (analyticsRow.study_time_minutes || 0) + duration,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", analyticsRow.id);
      } else {
        await supabase.from("student_analytics").insert({
          student_id: studentId,
          study_time_minutes: duration,
          focus_score: focusScore,
        } as any);
      }

      onUpdate();
    } catch (e: any) {
      console.error("Success save error:", e);
    }
  };

  // Format timeLeft to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          {isActive ? (
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white font-mono border border-indigo-400/30 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-pulse hover:shadow-[0_0_20px_rgba(99,102,241,0.8)] transition-all duration-300">
              <Shield className="w-4 h-4 text-cyan-300 animate-pulse" />
              <span className="font-semibold text-xs tracking-wider uppercase font-display hidden sm:inline">Focus Mode</span>
              <span className="h-4 w-[1px] bg-white/20 hidden sm:inline" />
              <span className="font-bold text-sm">{formatTime(timeLeft)}</span>
            </button>
          ) : (
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/80 border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-300">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-xs tracking-wider uppercase font-display hidden sm:inline">Activate Focus</span>
            </button>
          )}
        </PopoverTrigger>

        <PopoverContent align="end" className="w-64 bg-card border-border shadow-[0_0_25px_rgba(139,92,246,0.15)] p-4 space-y-4">
          <div className="space-y-1">
            <h4 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Space Focus Shield
            </h4>
            <p className="text-xs text-muted-foreground">
              {isActive ? "Study orbit is active. Maintain cockpit focus!" : "Choose your study orbit duration to begin."}
            </p>
          </div>

          {isActive ? (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5 bg-muted/40 border border-border/80 rounded-lg p-2.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Integrity:</span>
                  <span className={`font-bold ${focusScore >= 70 ? "text-emerald-400" : "text-yellow-400"}`}>
                    {focusScore}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tab Shifts:</span>
                  <span className="font-bold text-foreground">{tabShifts} / 3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Other Alerts:</span>
                  <span className="font-bold text-foreground">{distractions - tabShifts} logged</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Sound effects:</span>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title={soundEnabled ? "Disable audio" : "Enable audio"}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              <Button
                variant="destructive"
                onClick={handleDeactivate}
                className="w-full gap-2 font-display text-xs font-semibold py-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                Deactivate Shield
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {/* Duration Selector */}
              <div className="grid grid-cols-3 gap-1.5">
                {orbitOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    className={`py-1 px-1 rounded-md text-[10px] font-semibold border transition-all duration-150 ${
                      duration === opt.value
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-muted border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {opt.label.split(" ")[0]}
                    <span className="block text-[8px] font-mono text-muted-foreground">
                      {opt.value}m
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Sound effects:</span>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title={soundEnabled ? "Disable audio" : "Enable audio"}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              <Button
                onClick={handleActivate}
                className="w-full bg-primary hover:bg-primary/90 text-white gap-2 font-display text-xs font-semibold py-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Activate Shield
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* INACTIVITY WARNING OVERLAY DIALOG */}
      {inactivityAlarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-card border-border/80 border max-w-md w-full rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center space-y-6 relative overflow-hidden">
            {/* Flashing danger header */}
            <div className="absolute top-0 inset-x-0 h-1 bg-red-500 animate-pulse" />
            
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-foreground">Astronaut Inactivity Alert!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We've lost keyboard/mouse navigation controls! Auto-destruct sequence starting...
              </p>
            </div>

            {/* Giant flashing timer */}
            <div className="font-mono text-5xl font-extrabold text-red-500 animate-pulse">
              {countdownLeft}s
            </div>

            <p className="text-xs text-muted-foreground font-mono">
              Press the wake-up button below to override collapse and recharge shield parameters.
            </p>

            <Button
              onClick={handleAcknowledgeInactivity}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-display font-semibold py-6 text-base shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            >
              🚀 Wake Up / Stabilize Shield
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
