import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Swords } from "lucide-react";
import { toast } from "sonner";

export function ClashInviteListener() {
  const navigate = useNavigate();
  const [invite, setInvite] = useState<{
    lobbyId: string;
    topic: string;
    hostName: string;
    hostId: string;
  } | null>(null);

  const [studentId, setStudentId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        const { data: student } = await supabase
          .from("students")
          .select("id, class_id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (student) {
          setStudentId(student.id);
          setClassId(student.class_id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchInfo();
  }, []);

  // Listen to broadcast invites scoped to the class
  useEffect(() => {
    if (!classId || !studentId) return;

    const channel = supabase.channel(`clashes_class_${classId}`, {
      config: {
        broadcast: { self: false }
      }
    });

    channel
      .on("broadcast", { event: "clash_invite" }, (payload) => {
        const data = payload.payload;
        // Verify if we are invited
        if (Array.isArray(data.invitedStudentIds) && data.invitedStudentIds.includes(studentId)) {
          // Play a sound chirp
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          } catch {
            // Ignore audio blockage
          }
          setInvite({
            lobbyId: data.lobbyId,
            topic: data.topic,
            hostName: data.hostName,
            hostId: data.hostId,
          });
        }
      })
      .on("broadcast", { event: "teacher_lobby_opened" }, (payload) => {
        const data = payload.payload;
        // Play premium three-tone chime (E5 -> A5 -> C#6)
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
          osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5
          osc.frequency.setValueAtTime(1109.73, ctx.currentTime + 0.2); // C#6
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
          osc.start();
          osc.stop(ctx.currentTime + 0.45);
        } catch {
          // Ignore
        }
        setInvite({
          lobbyId: data.lobbyId,
          topic: data.topic,
          hostName: `${data.hostName} (Teacher)`,
          hostId: "teacher",
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, studentId]);

  if (!invite) return null;

  const handleAccept = () => {
    // Navigate with query params to auto-open lobby
    navigate(`/student/quizzes?clashLobbyId=${invite.lobbyId}&clashTopic=${encodeURIComponent(invite.topic)}&clashHost=${encodeURIComponent(invite.hostName)}&role=guest`);
    setInvite(null);
    toast.success("Joined Classroom Clash! Entering battle deck.");
  };

  const handleDecline = () => {
    setInvite(null);
    toast.info("Invitation declined.");
  };

  return (
    <div className="fixed top-20 right-6 z-[120] w-80 animate-slide-in pointer-events-auto">
      <div className="bg-slate-900 border-2 border-secondary/60 rounded-xl shadow-[0_0_30px_rgba(20,250,220,0.2)] p-4 flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent pointer-events-none" />
        
        <button onClick={handleDecline} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary shrink-0">
            <Swords className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-display text-sm font-bold text-foreground">Classroom Clash Challenge</h4>
            <p className="text-[10px] text-muted-foreground font-mono">Host: {invite.hostName}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          You are challenged to a quiz duel on the topic: <span className="text-secondary font-bold font-mono">"{invite.topic}"</span>!
        </p>

        <div className="flex gap-2 justify-end mt-2">
          <Button size="sm" variant="ghost" className="h-8 text-xs border border-border" onClick={handleDecline}>
            Decline
          </Button>
          <Button size="sm" className="h-8 text-xs bg-secondary hover:bg-secondary/90 text-background font-bold" onClick={handleAccept}>
            Accept & Fight
          </Button>
        </div>
      </div>
    </div>
  );
}
