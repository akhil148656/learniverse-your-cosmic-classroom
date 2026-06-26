import { useState, useEffect, useRef } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { EmptyState } from "@/components/cards/EmptyState";
import { StatsCard } from "@/components/cards/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LayoutDashboard, Baby, Brain, Bell, Trophy, BookOpen, Target, Link2, Loader2, CheckCircle, AlertCircle, Trash2, RefreshCw, Sparkles, Clock, Compass, FileText, Camera, Phone, Mail, Pencil, School, User } from "lucide-react";
import NotesAgent from "@/components/NotesAgent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RadialProgress } from "@/components/ui/radial-progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ChildData {
  id: string;
  user_id?: string;
  student_code?: string | null;
  name: string;
  linked_parent_name?: string | null;
  gender?: string | null;
  phone?: string | null;
  xp_points: number;
  focus_score: number;
  grade_level: number | null;
  class_id?: string | null;
  class_name?: string | null;
  class_code?: string | null;
  teacher_id?: string | null;
  teacher_name?: string | null;
  topics_completed: number;
  quizzes_attempted: number;
  quizzes_passed: number;
  average_score: number;
  study_time_minutes: number;
  assignments_submitted: number;
  assignments_graded: number;
  avg_assignment_percent: number;
  latest_ai_feedback: string | null;
  latest_report_card?: FeedbackData | null;
  assignments_timeline?: Array<{
    id: string;
    status: "pending" | "submitted" | "reviewed";
    score: number | null;
    max_score: number | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    due_date: string | null;
    teacher_feedback: string | null;
    title: string;
  }>;
  achievements?: Array<{
    id: string;
    title: string;
    description: string | null;
    awarded_at: string;
  }>;
}

interface GradeSummary {
  id: string;
  title: string;
  score: number | null;
  max_score: number | null;
  reviewed_at: string | null;
  teacher_feedback: string | null;
}

interface FeedbackData {
  id: string;
  feedback_text: string;
  category: string | null;
  created_at: string;
  parent_acknowledged: boolean;
  parent_reaction?: string | null;
  teacher_acknowledged?: boolean | null;
  student_name: string;
}

function parseReportCard(text: string) {
  const sections: { title: string; content: string[]; type: 'summary' | 'strengths' | 'growth' | 'recommendations' | 'unknown' }[] = [];
  const lines = text.split('\n');
  let currentSection: typeof sections[number] | null = null;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#')) {
      const title = line.replace(/^#+\s*/, '');
      let type: 'summary' | 'strengths' | 'growth' | 'recommendations' | 'unknown' = 'unknown';
      if (title.toLowerCase().includes('summary') || title.toLowerCase().includes('galactic')) {
        type = 'summary';
      } else if (title.toLowerCase().includes('strength') || title.toLowerCase().includes('cognitive')) {
        type = 'strengths';
      } else if (title.toLowerCase().includes('growth') || title.toLowerCase().includes('sphere') || title.toLowerCase().includes('development')) {
        type = 'growth';
      } else if (title.toLowerCase().includes('recommendation') || title.toLowerCase().includes('astral') || title.toLowerCase().includes('advice')) {
        type = 'recommendations';
      }
      currentSection = { title, content: [], type };
      sections.push(currentSection);
    } else if (line) {
      if (!currentSection) {
        currentSection = { title: "Academic Insights", content: [], type: 'unknown' };
        sections.push(currentSection);
      }
      currentSection.content.push(line);
    }
  }
  return sections;
}

// Extract up to `max` bullet-point lines from raw AI feedback for a compact dashboard snippet.
function summarizeFeedback(text: string | null, max = 2): string {
  if (!text) return "";
  const bullets = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.startsWith("-") || l.startsWith("•") || l.startsWith("*"))
    .map(l => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  if (bullets.length > 0) return bullets.slice(0, max).join(" · ");
  // Fallback: first non-heading sentence up to 120 chars
  const plain = text.replace(/#+[^\n]*/g, "").replace(/\n+/g, " ").trim();
  return plain.length > 120 ? plain.slice(0, 120).trimEnd() + "…" : plain;
}

function CosmicReportCard({
  reportCard,
  childId,
  onAcknowledge
}: {
  reportCard: FeedbackData;
  childId: string;
  onAcknowledge: (id: string, childId: string) => void;
}) {
  const sections = parseReportCard(reportCard.feedback_text);

  const getSectionStyles = (type: string) => {
    switch (type) {
      case 'summary':
        return {
          icon: <Compass className="w-5 h-5 text-indigo-400" />,
          titleColor: "text-indigo-400",
          cardBg: "bg-indigo-950/20 border-indigo-500/20"
        };
      case 'strengths':
        return {
          icon: <Trophy className="w-5 h-5 text-emerald-400" />,
          titleColor: "text-emerald-400",
          cardBg: "bg-emerald-950/20 border-emerald-500/20"
        };
      case 'growth':
        return {
          icon: <Brain className="w-5 h-5 text-amber-400" />,
          titleColor: "text-amber-400",
          cardBg: "bg-amber-950/20 border-amber-500/20"
        };
      case 'recommendations':
        return {
          icon: <Sparkles className="w-5 h-5 text-purple-400" />,
          titleColor: "text-purple-400",
          cardBg: "bg-purple-950/20 border-purple-500/20"
        };
      default:
        return {
          icon: <FileText className="w-5 h-5 text-cyan-400" />,
          titleColor: "text-cyan-400",
          cardBg: "bg-cyan-950/20 border-cyan-500/20"
        };
    }
  };

  return (
    <div className="relative border border-amber-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] bg-gradient-to-b from-indigo-950/90 to-purple-950/90 w-full max-w-3xl mx-auto my-6">
      {/* Visual top scrollbar */}
      <div className="h-3 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.6)]" />

      {/* Sheen/reflection layer */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

      <div className="py-6 px-4 sm:px-8 border-x border-amber-500/20 bg-indigo-950/40 relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Galactic Learning Ledger
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 uppercase tracking-widest drop-shadow-[0_2px_8px_rgba(245,158,11,0.3)]">
            Cosmic Report Card
          </h3>
          <p className="text-xs text-muted-foreground">
            Academic Cycle Review • Evaluated on {new Date(reportCard.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Scroll body contents */}
        <div className="space-y-4">
          {sections.map((section, idx) => {
            const styles = getSectionStyles(section.type);
            return (
              <div key={idx} className={`p-4 rounded-xl border ${styles.cardBg} transition-all hover:scale-[1.01]`}>
                <div className="flex items-center gap-2 mb-2">
                  {styles.icon}
                  <h4 className={`font-display text-sm sm:text-base font-bold uppercase tracking-wider ${styles.titleColor}`}>
                    {section.title}
                  </h4>
                </div>
                <div className="space-y-1.5 pl-7">
                  {section.content.map((pText, pIdx) => {
                    const isBullet = pText.trim().startsWith('-') || pText.trim().startsWith('*');
                    const cleanText = isBullet ? pText.replace(/^[-*]\s*/, '') : pText;
                    return (
                      <p key={pIdx} className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-sans">
                        {isBullet && <span className="inline-block mr-2 text-amber-400">•</span>}
                        {cleanText}
                      </p>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Signature Status */}
        <div className="pt-4 border-t border-amber-500/20">
          {reportCard.parent_acknowledged ? (
            <div className="p-3 sm:p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-emerald-300">Endorsement Confirmed</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                    {reportCard.parent_reaction || "Acknowledged and digitally signed by parent."}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/70 border border-emerald-500/20 px-2 py-0.5 rounded shrink-0">
                Verified
              </span>
            </div>
          ) : (
            <div className="p-3 sm:p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-amber-400">Awaiting Parental Endorsement</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Please review this report card and sign below to acknowledge your child's progress.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => onAcknowledge(reportCard.id, childId)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-display text-xs uppercase tracking-wider h-8 shrink-0"
              >
                Sign & Acknowledge
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Visual bottom scrollbar */}
      <div className="h-3 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
    </div>
  );
}

function AssignmentTimeline({
  timeline
}: {
  timeline: Array<{
    id: string;
    status: "pending" | "submitted" | "reviewed";
    score: number | null;
    max_score: number | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    due_date: string | null;
    teacher_feedback: string | null;
    title: string;
  }>;
}) {
  if (!timeline || timeline.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          No assignments scheduled or submitted yet. 🚀
        </CardContent>
      </Card>
    );
  }

  const getStatusInfo = (status: "pending" | "submitted" | "reviewed") => {
    switch (status) {
      case "reviewed":
        return {
          label: "Graded",
          badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
          bgColor: "bg-emerald-950/20"
        };
      case "submitted":
        return {
          label: "Submitted (Pending Review)",
          badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          icon: <Clock className="w-4 h-4 text-amber-400 animate-pulse" />,
          bgColor: "bg-amber-950/10"
        };
      default:
        return {
          label: "Assigned (Pending)",
          badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/20",
          icon: <FileText className="w-4 h-4 text-slate-400" />,
          bgColor: "bg-slate-900/10"
        };
    }
  };

  return (
    <div className="relative border-l-2 border-primary/20 ml-3 pl-6 space-y-6 py-2">
      {timeline.map((item) => {
        const info = getStatusInfo(item.status);
        const dateStr = item.status === "reviewed"
          ? `Graded on ${new Date(item.reviewed_at!).toLocaleDateString()}`
          : item.status === "submitted"
            ? `Submitted on ${new Date(item.submitted_at!).toLocaleDateString()}`
            : item.due_date
              ? `Due by ${new Date(item.due_date).toLocaleDateString()}`
              : "Assigned";

        return (
          <div key={item.id} className="relative group">
            {/* Timeline node dot */}
            <span className="absolute -left-[35px] top-1 flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 border border-primary/30 shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-transform group-hover:scale-110">
              {info.icon}
            </span>

            <div className={`p-4 rounded-xl border border-border/80 ${info.bgColor} transition-all hover:border-primary/30`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="font-semibold text-foreground text-sm sm:text-base">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{dateStr}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${info.badgeColor}`}>
                    {info.label}
                  </span>
                  {item.status === "reviewed" && item.score !== null && (
                    <span className="text-xs font-bold text-accent px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                      Score: {item.score}/{item.max_score || 100}
                    </span>
                  )}
                </div>
              </div>

              {item.status === "reviewed" && item.teacher_feedback && (
                <div className="mt-3 p-3 rounded-lg bg-background/50 border border-border/50 text-xs italic text-muted-foreground relative">
                  <span className="absolute -top-2 left-3 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider bg-card border border-border/60 rounded text-primary">
                    Coach Response
                  </span>
                  <p className="mt-1 font-sans">{item.teacher_feedback}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface NotificationData {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  is_read: boolean;
  created_at: string;
}

const childLabel = (gender?: string | null) => {
  switch (gender) {
    case "male":
      return "Son";
    case "female":
      return "Daughter";
    default:
      return "Child";
  }
};

interface TeacherContact {
  name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  subject_specialization: string | null;
  school_name: string | null;
}

export function ParentDashboard() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkCode, setLinkCode] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [parentName, setParentName] = useState("");
  const [isSavingParentName, setIsSavingParentName] = useState(false);
  const [selectedReportCard, setSelectedReportCard] = useState<{ card: FeedbackData; childId: string } | null>(null);
  const [teacherContacts, setTeacherContacts] = useState<TeacherContact[]>([]);

  const acknowledgeReportCard = async (reportCardId: string, childId: string) => {
    const signature = window.prompt("To sign and acknowledge this report card, please enter your full name as a digital signature:", "");
    if (signature === null) return;
    if (!signature.trim()) {
      toast.error("Signature name cannot be empty");
      return;
    }

    if (reportCardId.startsWith("local-")) {
      const localAckKey = `learniverse_local_report_cards_ack_${childId}`;
      const localReactionKey = `learniverse_local_report_cards_reaction_${childId}`;
      localStorage.setItem(localAckKey, "true");
      localStorage.setItem(localReactionKey, `Signed by Parent: ${signature.trim()}`);
      toast.success("Cosmic Report Card signed and acknowledged locally (offline mode)! 🌌");
      
      setChildren(prev => prev.map(child => {
        if (child.id === childId && child.latest_report_card) {
          return {
            ...child,
            latest_report_card: {
              ...child.latest_report_card,
              parent_acknowledged: true,
              parent_reaction: `Signed by Parent: ${signature.trim()}`
            }
          };
        }
        return child;
      }));

      setSelectedReportCard(prev => prev ? {
        ...prev,
        card: {
          ...prev.card,
          parent_acknowledged: true,
          parent_reaction: `Signed by Parent: ${signature.trim()}`
        }
      } : null);
      return;
    }

    try {
      const { error } = await supabase
        .from("ai_feedback")
        .update({
          parent_acknowledged: true,
          parent_reaction: `Signed by Parent: ${signature.trim()}`
        } as any)
        .eq("id", reportCardId);

      if (error) throw error;

      toast.success("Cosmic Report Card signed and acknowledged! 🌌");
      
      setChildren(prev => prev.map(child => {
        if (child.id === childId && child.latest_report_card) {
          return {
            ...child,
            latest_report_card: {
              ...child.latest_report_card,
              parent_acknowledged: true,
              parent_reaction: `Signed by Parent: ${signature.trim()}`
            }
          };
        }
        return child;
      }));

      setSelectedReportCard(prev => prev ? {
        ...prev,
        card: {
          ...prev.card,
          parent_acknowledged: true,
          parent_reaction: `Signed by Parent: ${signature.trim()}`
        }
      } : null);
    } catch (err: any) {
      console.error("Failed to sign report card:", err);
      toast.error(err.message || "Failed to sign report card");
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  // Fetch teacher contact info for all linked children's classes
  useEffect(() => {
    if (children.length === 0) return;
    const fetchTeacherContacts = async () => {
      const teacherIds = Array.from(
        new Set(children.map((c) => c.teacher_id).filter(Boolean))
      ) as string[];
      if (teacherIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, email, avatar_url, subject_specialization, school_name")
          .in("user_id", teacherIds);
        if (error) {
          console.error("fetchTeacherContacts error:", error);
          return;
        }
        const contacts: TeacherContact[] = (data || []).map((p: any) => ({
          name: p.full_name || "Teacher",
          phone: p.phone || null,
          email: p.email || null,
          avatar_url: p.avatar_url || null,
          subject_specialization: p.subject_specialization || null,
          school_name: p.school_name || null,
        }));
        setTeacherContacts(contacts);
      } catch (e: any) {
        console.error("fetchTeacherContacts threw:", e);
      }
    };
    fetchTeacherContacts();
  }, [children]);

  const loadParentName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("parent_display_name, full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return;
    setParentName(data?.parent_display_name || data?.full_name || "");
  };

  const saveParentName = async () => {
    const name = parentName.trim();
    if (!name) {
      toast.error("Please enter your name");
      return;
    }
    setIsSavingParentName(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in again.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        // Use a dedicated parent display name so we don't overwrite student names.
        .update({ parent_display_name: name } as any)
        .eq("user_id", user.id);

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Name saved");
    } finally {
      setIsSavingParentName(false);
    }
  };

  const fetchChildren = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setChildren([]);
        return;
      }

      // Load the parent's display name (for the header + default link value)
      await loadParentName();

      const { data: parentStudents, error: parentStudentsError } = await supabase
        .from("parent_students")
        .select("student_id, parent_name")
        .eq("parent_id", user.id);

      if (parentStudentsError) {
        console.error("fetchChildren parentStudents query error:", parentStudentsError);
        toast.error("Database error (parent_students): " + parentStudentsError.message);
      }

      const localLinksKey = `learniverse_local_parent_links_${user.id}`;
      const localLinks = JSON.parse(localStorage.getItem(localLinksKey) || "[]");

      const dbLinks = parentStudents || [];
      const studentIdsSet = new Set([
        ...dbLinks.map((ps: any) => ps.student_id),
        ...localLinks.map((l: any) => l.student_id)
      ]);
      const studentIds = Array.from(studentIdsSet);

      if (studentIds.length === 0) {
        setChildren([]);
        return;
      }

      const parentNameByStudentId = new Map<string, string | null>();
      dbLinks.forEach((ps: any) => {
        if (ps?.student_id) parentNameByStudentId.set(ps.student_id, ps.parent_name ?? null);
      });
      localLinks.forEach((l: any) => {
        if (l?.student_id && !parentNameByStudentId.has(l.student_id)) {
          parentNameByStudentId.set(l.student_id, l.parent_name ?? null);
        }
      });

      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .in("id", studentIds);

      if (studentsError) {
        console.error("fetchChildren students query error:", studentsError);
        toast.error("Database error (students): " + studentsError.message);
      }

      const dbStudentIds = new Set((students || []).map((s: any) => s.id));
      const missingStudentIds = studentIds.filter(id => !dbStudentIds.has(id));

      let studentRows = students || [];
      if (missingStudentIds.length > 0) {
        const backfilled = localLinks
          .filter((l: any) => missingStudentIds.includes(l.student_id))
          .map((l: any) => ({
            id: l.student_id,
            user_id: null,
            student_code: null,
            xp_points: 0,
            focus_score: 100,
            grade_level: l.grade_level,
            class_id: l.class_id
          }));
        studentRows = [...studentRows, ...backfilled];
      }

      const studentUserIds = Array.from(new Set(studentRows.map((s: any) => s.user_id).filter(Boolean))) as string[];
      const classIds = Array.from(new Set(studentRows.map((s: any) => s.class_id).filter(Boolean))) as string[];

      const { data: achievementsRows, error: achievementsError } = await supabase
        .from("student_achievements")
        .select("id, student_id, title, description, awarded_at")
        .in("student_id", studentIds)
        .order("awarded_at", { ascending: false })
        .limit(100);
      // If migrations haven't been applied yet, PostgREST may not know about the table.
      // Don't show a scary error to parents; keep UI usable.
      const achievementsTableMissing =
        !!achievementsError?.message &&
        achievementsError.message.toLowerCase().includes("student_achievements") &&
        achievementsError.message.toLowerCase().includes("schema cache");
      if (achievementsError && !achievementsTableMissing) toast.error(achievementsError.message);

      const achievementsByStudentId = new Map<string, ChildData["achievements"]>();
      (achievementsTableMissing ? [] : (achievementsRows || [])).forEach((row: any) => {
        const sid = row.student_id as string | undefined;
        if (!sid) return;
        const existing = achievementsByStudentId.get(sid) || [];
        existing.push({
          id: row.id,
          title: row.title,
          description: row.description ?? null,
          awarded_at: row.awarded_at,
        });
        achievementsByStudentId.set(sid, existing);
      });

      const [{ data: profiles, error: profilesError }, { data: classes, error: classesError }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, phone").in("user_id", studentUserIds),
        classIds.length ? supabase.from("classes").select("id, name, class_code, teacher_id").in("id", classIds) : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (profilesError) toast.error(profilesError.message);
      if (classesError) toast.error(classesError.message);

      const nameByUserId = new Map<string, string>();
      const phoneByUserId = new Map<string, string | null>();
      (profiles || []).forEach((p: any) => {
        if (!p?.user_id) return;
        nameByUserId.set(p.user_id, p.full_name || "Unknown");
        phoneByUserId.set(p.user_id, p.phone ?? null);
      });

      const classById = new Map<string, any>();
      (classes || []).forEach((c: any) => {
        if (c?.id) classById.set(c.id, c);
      });

      const teacherIds = Array.from(new Set((classes || []).map((c: any) => c.teacher_id).filter(Boolean))) as string[];
      const { data: teacherProfiles, error: teacherProfilesError } = teacherIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds)
        : { data: [], error: null };
      if (teacherProfilesError) toast.error(teacherProfilesError.message);

      const teacherNameByUserId = new Map<string, string>();
      (teacherProfiles || []).forEach((p: any) => {
        if (p?.user_id) teacherNameByUserId.set(p.user_id, p.full_name || "Unknown");
      });

      const enrichedChildren = await Promise.all(
        studentRows.map(async (s: any) => {
            const cachedChild = localLinks.find((l: any) => l.student_id === s.id);
            const resolvedName = (nameByUserId.get(s.user_id) || "").trim();
            // If the student record is accidentally linked to the parent auth user,
            // avoid showing the parent's name as the child name.
            const safeStudentName = s.user_id === user.id
              ? "Child"
              : (resolvedName || cachedChild?.name || "Child");

            const { data: analytics } = await supabase
              .from("student_analytics")
              .select("topics_completed, quizzes_attempted, quizzes_passed, average_score, study_time_minutes")
              .eq("student_id", s.id);

            const { count: quizAttemptsCount } = await supabase
              .from("quiz_attempts")
              .select("id", { count: "exact", head: true })
              .eq("student_id", s.id);

            const { count: submittedCount } = await supabase
              .from("student_assignments")
              .select("id", { count: "exact", head: true })
              .eq("student_id", s.id)
              .neq("status", "pending");

            const { count: gradedCount } = await supabase
              .from("student_assignments")
              .select("id", { count: "exact", head: true })
              .eq("student_id", s.id)
              .eq("status", "reviewed");

            const { data: gradedRows } = await supabase
              .from("student_assignments")
              .select("score, assignments(max_score)")
              .eq("student_id", s.id)
              .eq("status", "reviewed")
              .order("reviewed_at", { ascending: false })
              .limit(25);

            const assignmentPercents = (gradedRows || [])
              .map((r: any) => {
                const max = Number(r.assignments?.max_score ?? 0);
                const score = Number(r.score ?? 0);
                if (!max || !Number.isFinite(max) || max <= 0) return null;
                return Math.round((score / max) * 100);
              })
              .filter((v: any) => typeof v === "number") as number[];
            const avgAssignmentPercent = assignmentPercents.length
              ? Math.round(assignmentPercents.reduce((a, b) => a + b, 0) / assignmentPercents.length)
              : 0;

            const { data: latestFeedback } = await supabase
              .from("ai_feedback")
              .select("feedback_text")
              .eq("student_id", s.id)
              .eq("teacher_acknowledged", true)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const { data: latestReportCard } = await supabase
              .from("ai_feedback")
              .select("id, feedback_text, category, created_at, parent_acknowledged, parent_reaction")
              .eq("student_id", s.id)
              .eq("category", "report_card")
              .eq("teacher_acknowledged", true)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            let reportCard = latestReportCard;
            if (!reportCard) {
              const localKey = `learniverse_local_report_cards_${s.id}`;
              const localText = localStorage.getItem(localKey);
              if (localText) {
                const localAckKey = `learniverse_local_report_cards_ack_${s.id}`;
                const localReactionKey = `learniverse_local_report_cards_reaction_${s.id}`;
                const isAck = localStorage.getItem(localAckKey) === "true";
                const reaction = localStorage.getItem(localReactionKey);
                reportCard = {
                  id: `local-${s.id}`,
                  feedback_text: localText,
                  category: "report_card",
                  created_at: new Date().toISOString(),
                  parent_acknowledged: isAck,
                  parent_reaction: reaction || null,
                  student_name: safeStudentName
                } as any;
              }
            }

            const { data: assignmentsTimeline } = await supabase
              .from("student_assignments")
              .select("id, status, score, teacher_feedback, submitted_at, reviewed_at, assignments(title, max_score, due_date)")
              .eq("student_id", s.id)
              .order("id", { ascending: false })
              .limit(8);

            const formattedTimeline = (assignmentsTimeline || []).map((row: any) => ({
              id: row.id,
              status: row.status,
              score: row.score,
              teacher_feedback: row.teacher_feedback,
              submitted_at: row.submitted_at,
              reviewed_at: row.reviewed_at,
              title: row.assignments?.title || "Assignment",
              max_score: row.assignments?.max_score ?? null,
              due_date: row.assignments?.due_date ?? null
            }));

            const totals = (analytics || []).reduce(
              (acc, a) => ({
                topics_completed: acc.topics_completed + (a.topics_completed || 0),
                quizzes_attempted: acc.quizzes_attempted + (a.quizzes_attempted || 0),
                quizzes_passed: acc.quizzes_passed + (a.quizzes_passed || 0),
                average_score: acc.average_score + (Number(a.average_score) || 0),
                study_time_minutes: acc.study_time_minutes + (a.study_time_minutes || 0),
              }),
              { topics_completed: 0, quizzes_attempted: 0, quizzes_passed: 0, average_score: 0, study_time_minutes: 0 }
            );

            return {
              id: s.id,
              user_id: s.user_id,
              student_code: s.student_code ?? null,
              name: safeStudentName,
              linked_parent_name: parentNameByStudentId.get(s.id) ?? null,
              gender: s.gender ?? null,
              phone: s.user_id ? (phoneByUserId.get(s.user_id) ?? null) : null,
              xp_points: s.xp_points || 0,
              focus_score: s.focus_score || 100,
              grade_level: s.grade_level,
              class_id: s.class_id ?? null,
              class_name: s.class_id ? (classById.get(s.class_id)?.name ?? null) : null,
              class_code: s.class_id ? (classById.get(s.class_id)?.class_code ?? null) : null,
              teacher_id: s.class_id ? (classById.get(s.class_id)?.teacher_id ?? null) : null,
              teacher_name: s.class_id ? (teacherNameByUserId.get(classById.get(s.class_id)?.teacher_id) ?? null) : null,
              topics_completed: totals.topics_completed,
              quizzes_attempted: quizAttemptsCount || totals.quizzes_attempted,
              quizzes_passed: totals.quizzes_passed,
              average_score: analytics?.length ? Math.round(totals.average_score / analytics.length) : 0,
              study_time_minutes: totals.study_time_minutes,
              assignments_submitted: submittedCount || 0,
              assignments_graded: gradedCount || 0,
              avg_assignment_percent: avgAssignmentPercent,
              latest_ai_feedback: latestFeedback?.feedback_text || null,
              latest_report_card: reportCard || null,
              assignments_timeline: formattedTimeline,
              achievements: achievementsByStudentId.get(s.id) || [],
            };
        })
      );

      setChildren(enrichedChildren);
    } catch (err: any) {
      console.error("fetchChildren failed:", err);
      toast.error("Failed to load children: " + (err.message || String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  // Note: In a real app, you'd have a proper linking mechanism. This is simplified.
  const linkChild = async () => {
    if (!linkCode.trim()) {
      toast.error("Please enter a student code");
      return;
    }

    const name = parentName.trim();
    if (!name) {
      toast.error("Please enter your name (Parent name)");
      return;
    }

    setIsLinking(true);
    try {
      const code = linkCode.trim().toUpperCase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in again.");
        return;
      }

      // Save parent name to profile (so it persists across sessions)
      // Use a dedicated parent display name so we don't overwrite student names.
      await supabase.from("profiles").update({ parent_display_name: name } as any).eq("user_id", user.id);

      const { data: linkedStudentId, error } = await supabase.rpc("parent_link_student_by_code", {
        _student_code: code,
      });
      if (error) {
        toast.error(error.message);
        return;
      }

      // Query student details for local caching
      try {
        const { data: studentInfo } = await supabase.rpc("find_student_by_code", {
          _student_code: code
        });
        if (studentInfo) {
          const sData = Array.isArray(studentInfo) ? studentInfo[0] : studentInfo;
          if (sData) {
            const localLinksKey = `learniverse_local_parent_links_${user.id}`;
            const existingLinks = JSON.parse(localStorage.getItem(localLinksKey) || "[]");
            const newLink = {
              student_id: sData.student_id,
              name: sData.full_name || "Child",
              grade_level: sData.grade_level || null,
              class_id: sData.class_id || null,
              parent_name: name
            };
            const filtered = existingLinks.filter((l: any) => l.student_id !== sData.student_id);
            filtered.push(newLink);
            localStorage.setItem(localLinksKey, JSON.stringify(filtered));
          }
        }
      } catch (e) {
        console.error("Local link cache failed:", e);
      }

      // Persist the parent-provided name on the specific link row.
      if (linkedStudentId) {
        const { error: linkUpdateError } = await supabase
          .from("parent_students")
          .update({ parent_name: name })
          .eq("parent_id", user.id)
          .eq("student_id", linkedStudentId);
        if (linkUpdateError) {
          // This most commonly fails if the UPDATE policy hasn't been applied yet.
          toast.error(linkUpdateError.message);
        }
      }

      toast.success("Child linked successfully");
      setLinkCode("");
      await fetchChildren();

      // If the insert succeeded but the parent cannot read the link table due to missing RLS policy,
      // the dashboard will still look empty. Detect that and give a concrete hint.
      const { count } = await supabase
        .from("parent_students")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", user.id);

      if ((count ?? 0) === 0) {
        toast.error(
          "Link saved, but the parent account cannot read linked children yet (missing RLS policy on parent_students). Run the latest Supabase SQL migrations for parent visibility."
        );
      }
    } finally {
      setIsLinking(false);
    }
  };

  const totalXP = children.reduce((sum, c) => sum + c.xp_points, 0);
  const avgFocus = children.length > 0 
    ? Math.round(children.reduce((sum, c) => sum + c.focus_score, 0) / children.length) 
    : 0;

  const achievementsStudentLabel = (() => {
    const child = children[0];
    if (!child) return "your child";
    const childName = (child.name || "").trim();
    return childName || "your child";
  })();

  const toHours = (mins: number) => {
    const m = Number(mins || 0);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
  };

  const overallProgress = (c: ChildData) => {
    // A simple parent-friendly score (0..100) combining focus, quiz performance, and assignment grades.
    const focus = Math.max(0, Math.min(100, c.focus_score || 0));
    const quiz = Math.max(0, Math.min(100, c.average_score || 0));
    const assn = Math.max(0, Math.min(100, c.avg_assignment_percent || 0));
    return Math.round((focus + quiz + assn) / 3);
  };

  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Parent Dashboard</h1>
          <p className="text-muted-foreground">Track your child's learning progress</p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="py-5">
            <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">Parent name (shown on your linked children)</p>
                <Input
                  placeholder="Enter your name"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="bg-muted border-border"
                />
              </div>
              <Button
                onClick={saveParentName}
                disabled={isSavingParentName || !parentName.trim()}
                variant="outline"
              >
                {isSavingParentName ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save name"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : children.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-8">
              <EmptyState
                title="No linked children"
                message="Link your child's account to track their progress"
                icon={Link2}
              />
              <div className="flex gap-3 mt-6 max-w-md mx-auto">
                <Input
                  placeholder="Enter student code"
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value)}
                  className="bg-muted border-border"
                />
                <Button onClick={linkChild} disabled={isLinking} className="bg-primary hover:bg-primary/90">
                  {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard title="Children" value={children.length} icon={Baby} variant="primary" />
                <StatsCard title="Total XP" value={totalXP} icon={Trophy} variant="accent" />
                <StatsCard title="Avg Focus" value={`${avgFocus}%`} icon={Brain} variant="secondary" />
                <StatsCard title="Topics" value={children.reduce((s, c) => s + c.topics_completed, 0)} icon={BookOpen} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children.map((child) => (
                  <Card key={child.id} className="bg-card border-border hover:border-primary transition-colors">
                    <CardHeader>
                      <CardTitle className="font-display text-lg text-foreground">{child.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {childLabel(child.gender)} • Grade {child.grade_level || "N/A"}
                        {child.phone ? (
                          <>
                            <span className="text-muted-foreground"> • </span>
                            <span>Phone {child.phone}</span>
                          </>
                        ) : null}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          <span className="text-foreground/80">Parent:</span> {child.linked_parent_name || parentName || "—"}
                        </span>
                        {child.class_name ? (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span>
                              <span className="text-foreground/80">Class:</span> {child.class_name}
                              {child.class_code ? <span className="text-muted-foreground"> ({child.class_code})</span> : null}
                            </span>
                          </>
                        ) : null}
                        {child.teacher_name ? (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span>
                              <span className="text-foreground/80">Teacher:</span> {child.teacher_name}
                            </span>
                          </>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <RadialProgress
                          value={overallProgress(child)}
                          label="Overall status"
                          footerText={`Study time: ${toHours(child.study_time_minutes)}`}
                        />
                        <RadialProgress
                          value={child.average_score}
                          label="Quiz performance"
                          centerText={`${child.average_score}%`}
                          footerText={`${child.quizzes_attempted} quizzes attempted`}
                        />
                        <RadialProgress
                          value={child.avg_assignment_percent}
                          label="Assignments"
                          centerText={`${child.avg_assignment_percent}%`}
                          footerText={`${child.assignments_submitted} submitted • ${child.assignments_graded} graded`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">XP Points</p>
                          <p className="text-lg font-bold text-accent">{child.xp_points}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Focus</p>
                          <p className="text-lg font-bold text-foreground">{child.focus_score}%</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground mb-0.5">AI Feedback</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {summarizeFeedback(child.latest_ai_feedback) || "No AI feedback yet."}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" className="shrink-0 text-xs h-7 px-2" onClick={() => (window.location.href = "/parent/ai-feedback")}>
                          View
                        </Button>
                      </div>

                      {child.latest_report_card && (
                        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 flex items-center justify-between gap-3 mt-4">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                            <div>
                              <p className="text-xs font-semibold text-foreground">New AI Report Card Available!</p>
                              <p className="text-[10px] text-muted-foreground">
                                {child.latest_report_card.parent_acknowledged ? "Signed & Acknowledged" : "Requires parent signature"}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedReportCard({ card: child.latest_report_card!, childId: child.id })}
                            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/15 text-xs font-bold font-display"
                          >
                            Open Scroll
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Contact My Teacher card */}
                {teacherContacts.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-display text-base text-foreground flex items-center gap-2">
                        <Mail className="w-4 h-4 text-secondary" />
                        Contact My Teacher
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {teacherContacts.map((t, i) => {
                        const initials = t.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                        return (
                          <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border">
                            {t.avatar_url ? (
                              <img src={t.avatar_url} alt={t.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-secondary/30 shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center ring-2 ring-secondary/30 shrink-0">
                                <span className="font-display font-bold text-lg text-white">{initials || "T"}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground text-sm">{t.name}</p>
                              {t.subject_specialization && (
                                <p className="text-xs text-muted-foreground">{t.subject_specialization}</p>
                              )}
                              {t.school_name && (
                                <p className="text-xs text-muted-foreground">{t.school_name}</p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0">
                              {t.phone && (
                                <a
                                  href={`tel:${t.phone}`}
                                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  {t.phone}
                                </a>
                              )}
                              {t.email && (
                                <a
                                  href={`mailto:${t.email}`}
                                  className="flex items-center gap-1.5 text-xs text-secondary hover:text-secondary/80 transition-colors"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  {t.email}
                                </a>
                              )}
                              {!t.phone && !t.email && (
                                <p className="text-xs text-muted-foreground italic">No contact info yet</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {children.length === 1 ? (
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="font-display text-lg text-foreground flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-accent" />
                        Achievements
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                          Teacher-awarded highlights for {achievementsStudentLabel}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(children[0].achievements || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No achievements yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {(children[0].achievements || []).slice(0, 5).map((a) => (
                            <div key={a.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                              <div className="flex items-start justify-between gap-3">
                                <p className="font-semibold text-foreground">{a.title}</p>
                                <p className="text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(a.awarded_at).toLocaleDateString()}
                                </p>
                              </div>
                              {a.description ? (
                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                                  {a.description}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-1">
              <NotesAgent
                title="Parent Notes"
                subtitle="For you to help remember"
                noteType="personal"
              />
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedReportCard} onOpenChange={(open) => !open && setSelectedReportCard(null)}>
        <DialogContent className="max-w-4xl bg-transparent border-none shadow-none p-0 text-foreground">
          {selectedReportCard && (
            <CosmicReportCard
              reportCard={selectedReportCard.card}
              childId={selectedReportCard.childId}
              onAcknowledge={acknowledgeReportCard}
            />
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}

export function ParentChildProgress() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentGradesByChild, setRecentGradesByChild] = useState<Record<string, GradeSummary[]>>({});
  const [selectedReportCard, setSelectedReportCard] = useState<{ card: FeedbackData; childId: string } | null>(null);

  const acknowledgeReportCard = async (reportCardId: string, childId: string) => {
    const signature = window.prompt("To sign and acknowledge this report card, please enter your full name as a digital signature:", "");
    if (signature === null) return;
    if (!signature.trim()) {
      toast.error("Signature name cannot be empty");
      return;
    }

    if (reportCardId.startsWith("local-")) {
      const localAckKey = `learniverse_local_report_cards_ack_${childId}`;
      const localReactionKey = `learniverse_local_report_cards_reaction_${childId}`;
      localStorage.setItem(localAckKey, "true");
      localStorage.setItem(localReactionKey, `Signed by Parent: ${signature.trim()}`);
      toast.success("Cosmic Report Card signed and acknowledged locally (offline mode)! 🌌");
      
      setChildren(prev => prev.map(child => {
        if (child.id === childId && child.latest_report_card) {
          return {
            ...child,
            latest_report_card: {
              ...child.latest_report_card,
              parent_acknowledged: true,
              parent_reaction: `Signed by Parent: ${signature.trim()}`
            }
          };
        }
        return child;
      }));

      setSelectedReportCard(prev => prev ? {
        ...prev,
        card: {
          ...prev.card,
          parent_acknowledged: true,
          parent_reaction: `Signed by Parent: ${signature.trim()}`
        }
      } : null);
      return;
    }

    try {
      const { error } = await supabase
        .from("ai_feedback")
        .update({
          parent_acknowledged: true,
          parent_reaction: `Signed by Parent: ${signature.trim()}`
        } as any)
        .eq("id", reportCardId);

      if (error) throw error;

      toast.success("Cosmic Report Card signed and acknowledged! 🌌");
      
      setChildren(prev => prev.map(child => {
        if (child.id === childId && child.latest_report_card) {
          return {
            ...child,
            latest_report_card: {
              ...child.latest_report_card,
              parent_acknowledged: true,
              parent_reaction: `Signed by Parent: ${signature.trim()}`
            }
          };
        }
        return child;
      }));

      setSelectedReportCard(prev => prev ? {
        ...prev,
        card: {
          ...prev.card,
          parent_acknowledged: true,
          parent_reaction: `Signed by Parent: ${signature.trim()}`
        }
      } : null);
    } catch (err: any) {
      console.error("Failed to sign report card:", err);
      toast.error(err.message || "Failed to sign report card");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: parentStudents, error: parentStudentsError } = await supabase
          .from("parent_students")
          .select("student_id")
          .eq("parent_id", user.id);

        if (parentStudentsError) {
          console.error("fetchData parentStudents query error:", parentStudentsError);
          toast.error("Database error (parent_students): " + parentStudentsError.message);
        }

        const localLinksKey = `learniverse_local_parent_links_${user.id}`;
        const localLinks = JSON.parse(localStorage.getItem(localLinksKey) || "[]");

        const dbLinks = parentStudents || [];
        const studentIdsSet = new Set([
          ...dbLinks.map((ps: any) => ps.student_id),
          ...localLinks.map((l: any) => l.student_id)
        ]);
        const studentIds = Array.from(studentIdsSet);

        if (studentIds.length === 0) {
          setChildren([]);
          return;
        }

        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("*")
          .in("id", studentIds);

        if (studentsError) {
          console.error("fetchData students query error:", studentsError);
          toast.error("Database error (students): " + studentsError.message);
        }

        const dbStudentIds = new Set((students || []).map((s: any) => s.id));
        const missingStudentIds = studentIds.filter(id => !dbStudentIds.has(id));

        let studentRows = students || [];
        if (missingStudentIds.length > 0) {
          const backfilled = localLinks
            .filter((l: any) => missingStudentIds.includes(l.student_id))
            .map((l: any) => ({
              id: l.student_id,
              user_id: null,
              student_code: null,
              xp_points: 0,
              focus_score: 100,
              grade_level: l.grade_level,
              class_id: l.class_id
            }));
          studentRows = [...studentRows, ...backfilled];
        }

        const studentUserIds = Array.from(new Set(studentRows.map((s: any) => s.user_id).filter(Boolean))) as string[];
        const classIds = Array.from(new Set(studentRows.map((s: any) => s.class_id).filter(Boolean))) as string[];

        const [{ data: profiles, error: profilesError }, { data: classes, error: classesError }] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, phone").in("user_id", studentUserIds),
          classIds.length ? supabase.from("classes").select("id, name, class_code, teacher_id").in("id", classIds) : Promise.resolve({ data: [], error: null } as any),
        ]);
        if (profilesError) toast.error(profilesError.message);
        if (classesError) toast.error(classesError.message);

        const nameByUserId = new Map<string, string>();
        const phoneByUserId = new Map<string, string | null>();
        (profiles || []).forEach((p: any) => {
          if (!p?.user_id) return;
          nameByUserId.set(p.user_id, p.full_name || "Unknown");
          phoneByUserId.set(p.user_id, p.phone ?? null);
        });

        const classById = new Map<string, any>();
        (classes || []).forEach((c: any) => {
          if (c?.id) classById.set(c.id, c);
        });

        const teacherIds = Array.from(new Set((classes || []).map((c: any) => c.teacher_id).filter(Boolean))) as string[];
        const { data: teacherProfiles } = teacherIds.length
          ? await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds)
          : { data: [] };

        const teacherNameByUserId = new Map<string, string>();
        (teacherProfiles || []).forEach((p: any) => {
          if (p?.user_id) teacherNameByUserId.set(p.user_id, p.full_name || "Unknown");
        });

        const enrichedChildren = await Promise.all(
          studentRows.map(async (s: any) => {
            const cachedChild = localLinks.find((l: any) => l.student_id === s.id);
            const resolvedName = (nameByUserId.get(s.user_id) || "").trim();
            const safeStudentName = s.user_id === user.id
              ? "Child"
              : (resolvedName || cachedChild?.name || "Child");

            const { data: analytics } = await supabase
              .from("student_analytics")
              .select("topics_completed, quizzes_attempted, quizzes_passed, average_score, study_time_minutes")
              .eq("student_id", s.id);

            const { count: quizAttemptsCount } = await supabase
              .from("quiz_attempts")
              .select("id", { count: "exact", head: true })
              .eq("student_id", s.id);

            const { count: submittedCount } = await supabase
              .from("student_assignments")
              .select("id", { count: "exact", head: true })
              .eq("student_id", s.id)
              .neq("status", "pending");

            const { count: gradedCount } = await supabase
              .from("student_assignments")
              .select("id", { count: "exact", head: true })
              .eq("student_id", s.id)
              .eq("status", "reviewed");

            const { data: gradedRows } = await supabase
              .from("student_assignments")
              .select("score, assignments(max_score)")
              .eq("student_id", s.id)
              .eq("status", "reviewed")
              .order("reviewed_at", { ascending: false })
              .limit(25);

            const assignmentPercents = (gradedRows || [])
              .map((r: any) => {
                const max = Number(r.assignments?.max_score ?? 0);
                const score = Number(r.score ?? 0);
                if (!max || !Number.isFinite(max) || max <= 0) return null;
                return Math.round((score / max) * 100);
              })
              .filter((v: any) => typeof v === "number") as number[];
            const avgAssignmentPercent = assignmentPercents.length
              ? Math.round(assignmentPercents.reduce((a, b) => a + b, 0) / assignmentPercents.length)
              : 0;

            const { data: latestFeedback } = await supabase
              .from("ai_feedback")
              .select("feedback_text")
              .eq("student_id", s.id)
              .eq("teacher_acknowledged", true)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const { data: latestReportCard } = await supabase
              .from("ai_feedback")
              .select("id, feedback_text, category, created_at, parent_acknowledged, parent_reaction")
              .eq("student_id", s.id)
              .eq("category", "report_card")
              .eq("teacher_acknowledged", true)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            let reportCard = latestReportCard;
            if (!reportCard) {
              const localKey = `learniverse_local_report_cards_${s.id}`;
              const localText = localStorage.getItem(localKey);
              if (localText) {
                const localAckKey = `learniverse_local_report_cards_ack_${s.id}`;
                const localReactionKey = `learniverse_local_report_cards_reaction_${s.id}`;
                const isAck = localStorage.getItem(localAckKey) === "true";
                const reaction = localStorage.getItem(localReactionKey);
                reportCard = {
                  id: `local-${s.id}`,
                  feedback_text: localText,
                  category: "report_card",
                  created_at: new Date().toISOString(),
                  parent_acknowledged: isAck,
                  parent_reaction: reaction || null,
                  student_name: safeStudentName
                } as any;
              }
            }

            const { data: assignmentsTimeline } = await supabase
              .from("student_assignments")
              .select("id, status, score, teacher_feedback, submitted_at, reviewed_at, assignments(title, max_score, due_date)")
              .eq("student_id", s.id)
              .order("id", { ascending: false })
              .limit(8);

            const formattedTimeline = (assignmentsTimeline || []).map((row: any) => ({
              id: row.id,
              status: row.status,
              score: row.score,
              teacher_feedback: row.teacher_feedback,
              submitted_at: row.submitted_at,
              reviewed_at: row.reviewed_at,
              title: row.assignments?.title || "Assignment",
              max_score: row.assignments?.max_score ?? null,
              due_date: row.assignments?.due_date ?? null
            }));

            const totals = (analytics || []).reduce(
              (acc, a) => ({
                topics_completed: acc.topics_completed + (a.topics_completed || 0),
                quizzes_attempted: acc.quizzes_attempted + (a.quizzes_attempted || 0),
                quizzes_passed: acc.quizzes_passed + (a.quizzes_passed || 0),
                average_score: acc.average_score + (Number(a.average_score) || 0),
                study_time_minutes: acc.study_time_minutes + (a.study_time_minutes || 0),
              }),
              { topics_completed: 0, quizzes_attempted: 0, quizzes_passed: 0, average_score: 0, study_time_minutes: 0 }
            );

            const childClass = s.class_id ? classById.get(s.class_id) : null;
            const teacherId = childClass?.teacher_id ?? null;

            return {
              id: s.id,
              user_id: s.user_id,
              student_code: s.student_code ?? null,
              name: safeStudentName,
              gender: s.gender ?? null,
              phone: s.user_id ? (phoneByUserId.get(s.user_id) ?? null) : null,
              xp_points: s.xp_points || 0,
              focus_score: s.focus_score || 100,
              grade_level: s.grade_level,
              class_id: s.class_id ?? null,
              class_name: childClass?.name ?? null,
              class_code: childClass?.class_code ?? null,
              teacher_id: teacherId,
              teacher_name: teacherId ? (teacherNameByUserId.get(teacherId) ?? null) : null,
              topics_completed: totals.topics_completed,
              quizzes_attempted: quizAttemptsCount || totals.quizzes_attempted,
              quizzes_passed: totals.quizzes_passed,
              average_score: analytics?.length ? Math.round(totals.average_score / analytics.length) : 0,
              study_time_minutes: totals.study_time_minutes,
              assignments_submitted: submittedCount || 0,
              assignments_graded: gradedCount || 0,
              avg_assignment_percent: avgAssignmentPercent,
              latest_ai_feedback: latestFeedback?.feedback_text || null,
              latest_report_card: reportCard || null,
              assignments_timeline: formattedTimeline
            } as ChildData;
          })
        );

        setChildren(enrichedChildren);

          const { data: gradedData, error: gradedError } = await supabase
            .from("student_assignments")
            .select("id, student_id, score, teacher_feedback, reviewed_at, assignments(title, max_score)")
            .in("student_id", studentIds)
            .eq("status", "reviewed")
            .order("reviewed_at", { ascending: false })
            .limit(50);

          if (gradedError) {
            console.error("Failed to load child grades", gradedError);
          }

          const grouped = (gradedData || []).reduce<Record<string, GradeSummary[]>>((acc, row: any) => {
            const sid = row.student_id as string;
            if (!sid) return acc;
            const list = acc[sid] || [];
            if (list.length >= 3) return acc;
            list.push({
              id: row.id,
              title: row.assignments?.title || "Assignment",
              score: row.score,
              max_score: row.assignments?.max_score ?? null,
              reviewed_at: row.reviewed_at,
              teacher_feedback: row.teacher_feedback,
            });
            acc[sid] = list;
            return acc;
          }, {});

          setRecentGradesByChild(grouped);
      } catch (err: any) {
        console.error("fetchData failed:", err);
        toast.error("Failed to load child progress: " + (err.message || String(err)));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const toHours = (mins: number) => {
    const m = Number(mins || 0);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
  };

  const overallProgress = (c: ChildData) => {
    const focus = Math.max(0, Math.min(100, c.focus_score || 0));
    const quiz = Math.max(0, Math.min(100, c.average_score || 0));
    const assn = Math.max(0, Math.min(100, c.avg_assignment_percent || 0));
    return Math.round((focus + quiz + assn) / 3);
  };

  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Child Progress</h1>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : children.length === 0 ? (
          <EmptyState title="No linked children" message="Link your child's account to see their progress" icon={Baby} />
        ) : (
          <div className="space-y-6">
            {children.map((child) => (
              <Card key={child.id} className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-display text-xl text-foreground">{child.name}</CardTitle>
                  <div className="mt-2 text-sm text-muted-foreground space-y-1">
                    <div>
                      <span className="text-foreground/80">{childLabel(child.gender)} • Grade:</span> {child.grade_level ?? "N/A"}
                      {child.class_name ? (
                        <>
                          <span className="mx-2">•</span>
                          <span className="text-foreground/80">Class:</span> {child.class_name}
                          {child.class_code ? <span className="text-muted-foreground"> ({child.class_code})</span> : null}
                        </>
                      ) : null}
                    </div>
                    {child.phone ? (
                      <div>
                        <span className="text-foreground/80">Phone:</span> {child.phone}
                      </div>
                    ) : null}
                    {child.teacher_name ? (
                      <div>
                        <span className="text-foreground/80">Teacher:</span> {child.teacher_name}
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <RadialProgress
                      value={overallProgress(child)}
                      label="Overall status"
                      footerText={`Study time: ${toHours(child.study_time_minutes)}`}
                    />
                    <RadialProgress
                      value={child.average_score}
                      label="Quiz performance"
                      centerText={`${child.average_score}%`}
                      footerText={`${child.quizzes_attempted} quizzes attempted`}
                    />
                    <RadialProgress
                      value={child.avg_assignment_percent}
                      label="Assignments"
                      centerText={`${child.avg_assignment_percent}%`}
                      footerText={`${child.assignments_submitted} submitted • ${child.assignments_graded} graded`}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <Trophy className="w-8 h-8 mx-auto mb-2 text-accent" />
                      <p className="text-2xl font-bold text-foreground">{child.xp_points}</p>
                      <p className="text-sm text-muted-foreground">XP Points</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <Brain className="w-8 h-8 mx-auto mb-2 text-secondary" />
                      <p className="text-2xl font-bold text-foreground">{child.focus_score}%</p>
                      <p className="text-sm text-muted-foreground">Focus Score</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold text-foreground">{child.topics_completed}</p>
                      <p className="text-sm text-muted-foreground">Topics</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <Target className="w-8 h-8 mx-auto mb-2 text-accent" />
                      <p className="text-2xl font-bold text-foreground">{child.quizzes_passed}</p>
                      <p className="text-sm text-muted-foreground">Quizzes Passed</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <p className="text-sm text-muted-foreground">Study time</p>
                      <p className="text-xl font-semibold text-foreground">{toHours(child.study_time_minutes)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <p className="text-sm text-muted-foreground">Quizzes attempted</p>
                      <p className="text-xl font-semibold text-foreground">{child.quizzes_attempted}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <p className="text-sm text-muted-foreground">Assignments</p>
                      <p className="text-xl font-semibold text-foreground">
                        {child.assignments_submitted} submitted • {child.assignments_graded} graded
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground mb-0.5">AI Feedback</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {summarizeFeedback(child.latest_ai_feedback) || "No AI feedback yet."}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0 text-xs h-7 px-2" onClick={() => (window.location.href = "/parent/ai-feedback")}>
                      View
                    </Button>
                  </div>

                  {child.latest_report_card && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 flex items-center justify-between gap-3 mt-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">New AI Report Card Available!</p>
                          <p className="text-[10px] text-muted-foreground">
                            {child.latest_report_card.parent_acknowledged ? "Signed & Acknowledged" : "Requires parent signature"}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedReportCard({ card: child.latest_report_card!, childId: child.id })}
                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/15 text-xs font-bold font-display"
                      >
                        Open Scroll
                      </Button>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Performance Overview</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average Quiz Score</span>
                        <span className="text-foreground">{child.average_score}%</span>
                      </div>
                      <Progress value={child.average_score} className="h-3" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Assignment Journey Timeline
                    </h4>
                    <AssignmentTimeline timeline={child.assignments_timeline || []} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedReportCard} onOpenChange={(open) => !open && setSelectedReportCard(null)}>
        <DialogContent className="max-w-4xl bg-transparent border-none shadow-none p-0 text-foreground">
          {selectedReportCard && (
            <CosmicReportCard
              reportCard={selectedReportCard.card}
              childId={selectedReportCard.childId}
              onAcknowledge={acknowledgeReportCard}
            />
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}

export function ParentAIFeedback() {
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchFeedback = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFeedback([]);
        return;
      }

      const { data: parentStudents, error: parentStudentsError } = await supabase
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", user.id);

      if (parentStudentsError) {
        console.error("ParentAIFeedback: parent_students query failed", parentStudentsError);
        toast.error(parentStudentsError.message || "Failed to load linked children");
        setFeedback([]);
        return;
      }

      if (!parentStudents || parentStudents.length === 0) {
        setFeedback([]);
        return;
      }

      const studentIds = parentStudents.map((ps) => ps.student_id);

      // Best-effort: parents may not have RLS permissions to read `students`/`profiles`.
      // Feedback should still render even if names can't be resolved.
      let students: any[] = [];
      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, user_id")
          .in("id", studentIds);

        if (studentsError) {
          console.error("ParentAIFeedback: students query failed", studentsError);
        } else {
          students = (studentsData || []) as any[];
        }
      } catch (e) {
        console.error("ParentAIFeedback: students query threw", e);
      }

      const userIds = Array.from(new Set((students || []).map((s: any) => s.user_id).filter(Boolean))) as string[];
      let profiles: any[] = [];
      if (userIds.length) {
        try {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", userIds);
          if (profilesError) {
            console.error("ParentAIFeedback: profiles query failed", profilesError);
          } else {
            profiles = (profilesData || []) as any[];
          }
        } catch (e) {
          console.error("ParentAIFeedback: profiles query threw", e);
        }
      }

      const nameByUserId = new Map<string, string>();
      (profiles || []).forEach((p: any) => {
        if (p?.user_id) nameByUserId.set(p.user_id, p.full_name || "Unknown");
      });

      const { data: feedbackData, error: feedbackError } = await supabase
        .from("ai_feedback")
        .select("*")
        .in("student_id", studentIds)
        .eq("teacher_acknowledged", true)
        .order("created_at", { ascending: false });

      if (feedbackError) {
        console.error("ParentAIFeedback: ai_feedback query failed", feedbackError);
        toast.error(feedbackError.message || "Failed to load AI feedback");
        setFeedback([]);
        return;
      }

      const enriched = (feedbackData || []).map((f: any) => ({
        ...f,
        student_name:
          nameByUserId.get((students?.find((s: any) => s.id === f.student_id) as any)?.user_id) || "Child",
      }));
      setFeedback(enriched);
    } catch (e) {
      console.error("ParentAIFeedback: unexpected error", e);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || "Failed to load AI feedback");
      setFeedback([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchFeedback();
  }, []);

  const refreshNow = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchFeedback();
      toast.success("Refreshed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const acknowledgeFeedback = async (feedbackId: string) => {
    const reaction = window
      .prompt("Optional: Add a note/reaction for this feedback (visible to you).", "")
      ?.trim();

    const { error } = await supabase
      .from("ai_feedback")
      .update({ parent_acknowledged: true, parent_reaction: reaction || null })
      .eq("id", feedbackId);

    if (!error) {
      setFeedback((prev) =>
        prev.map((f) =>
          f.id === feedbackId
            ? { ...f, parent_acknowledged: true, parent_reaction: reaction || (f as any).parent_reaction || null }
            : f
        )
      );
      toast.success("Feedback acknowledged");
    } else {
      toast.error(error.message || "Failed to acknowledge feedback");
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    if (!window.confirm("Delete this feedback?")) return;

    const { error } = await supabase
      .from("ai_feedback")
      .delete()
      .eq("id", feedbackId);

    if (!error) {
      setFeedback((prev) => prev.filter((f) => f.id !== feedbackId));
      toast.success("Feedback deleted");
    } else {
      toast.error(error.message || "Failed to delete feedback");
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "achievement": return "bg-accent/20 text-accent";
      case "improvement": return "bg-destructive/20 text-destructive";
      case "focus": return "bg-secondary/20 text-secondary";
      default: return "bg-primary/20 text-primary";
    }
  };

  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">AI Feedback</h1>
            <p className="text-muted-foreground">AI-generated insights about your child's learning</p>
          </div>
          <Button variant="outline" onClick={refreshNow} disabled={isRefreshing || isLoading} className="gap-2">
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : feedback.length === 0 ? (
          <EmptyState title="No feedback yet" message="AI-generated insights will appear here" icon={Brain} />
        ) : (
          <div className="space-y-4">
            {feedback.map((f) => (
              <Card key={f.id} className={`bg-card border-border ${!f.parent_acknowledged ? "border-l-4 border-l-primary" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="font-display text-lg text-foreground">{f.student_name}</CardTitle>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(f.category)}`}>
                        {f.category || "progress"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!f.parent_acknowledged ? (
                        <Button size="sm" variant="outline" onClick={() => acknowledgeFeedback(f.id)} className="gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Acknowledge
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Acknowledged</span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        onClick={() => deleteFeedback(f.id)}
                        title="Delete feedback"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</p>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm text-muted-foreground whitespace-pre-wrap">
                    {f.feedback_text}
                  </div>
                  {(f as any).parent_reaction ? (
                    <div className="mt-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Your note:</span> {String((f as any).parent_reaction)}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

export function ParentAlerts() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const filtered = (data || []).filter((n) => (n.link || "").startsWith("/parent/"));
      setNotifications(filtered);
      setIsLoading(false);
    };
    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      toast.error(error.message || "Failed to delete notification");
      return;
    }

    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    toast.success("Notification deleted");
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case "warning": return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "success": return <CheckCircle className="w-5 h-5 text-accent" />;
      default: return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Alerts</h1>
        <p className="text-muted-foreground">Important notifications about your child's learning</p>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <EmptyState title="No alerts" message="Important notifications will appear here" icon={Bell} />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={`bg-card border-border cursor-pointer transition-colors hover:border-primary ${
                  !n.is_read ? "bg-primary/5" : ""
                }`}
                onClick={() => markAsRead(n.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {getTypeIcon(n.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {n.message && (
                        <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      title="Delete notification"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteNotification(n.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

// ─── Parent Profile ────────────────────────────────────────────────────────────

interface ParentProfileData {
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  relationship_to_child: string;
  city: string;
}

function ParentAvatarDisplay({ url, name, size = 112 }: { url: string | null; name: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-4 ring-accent/40 shadow-[0_0_30px_rgba(34,211,238,0.3)]"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-accent via-secondary to-primary flex items-center justify-center ring-4 ring-accent/40 shadow-[0_0_30px_rgba(34,211,238,0.3)]"
    >
      <span className="font-display font-bold text-3xl text-white">{initials || "P"}</span>
    </div>
  );
}

export function ParentProfile() {
  const [profile, setProfile] = useState<ParentProfileData>({
    full_name: "",
    email: "",
    phone: "",
    avatar_url: "",
    relationship_to_child: "",
    city: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone, avatar_url, relationship_to_child, city, parent_display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) { toast.error("Failed to load profile: " + error.message); return; }
      if (data) {
        setProfile({
          full_name: (data as any).parent_display_name || (data as any).full_name || "",
          email: (data as any).email || user.email || "",
          phone: (data as any).phone || "",
          avatar_url: (data as any).avatar_url || "",
          relationship_to_child: (data as any).relationship_to_child || "",
          city: (data as any).city || "",
        });
      }
    } finally { setIsLoading(false); }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }

    setIsUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        if (uploadError.message?.toLowerCase().includes("bucket not found")) {
          toast.error("Upload failed: 'avatars' bucket not found. Please execute CREATE_AVATARS_BUCKET_AND_FIELDS.sql in your Supabase SQL Editor!");
        } else {
          toast.error("Upload failed: " + uploadError.message);
        }
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const cacheBusted = publicUrl + "?t=" + Date.now();

      await supabase.from("profiles").update({ avatar_url: cacheBusted } as any).eq("user_id", user.id);
      setProfile((p) => ({ ...p, avatar_url: cacheBusted }));
      toast.success("Profile photo updated! ✨");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in again."); return; }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name.trim(),
          parent_display_name: profile.full_name.trim(),
          phone: profile.phone.trim(),
          relationship_to_child: profile.relationship_to_child || null,
          city: profile.city.trim(),
        } as any)
        .eq("user_id", user.id);

      if (error) { toast.error("Save failed: " + error.message); return; }
      setSaved(true);
      toast.success("Profile saved! 🌟");
      setTimeout(() => setSaved(false), 3000);
    } finally { setIsSaving(false); }
  };

  const RELATIONSHIP_OPTIONS = ["Father", "Mother", "Guardian", "Other"];

  if (isLoading) {
    return (
      <PortalLayout role="parent">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mr-3" />
          Loading profile...
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout role="parent">
      <div className="space-y-8 max-w-3xl mx-auto">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your contact info and personal details</p>
        </div>

        {/* Avatar Card */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-accent/20 via-secondary/20 to-primary/20 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.1)_0%,transparent_70%)]" />
          </div>
          <CardContent className="pt-0 pb-6 px-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-14">
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <ParentAvatarDisplay url={profile.avatar_url || null} name={profile.full_name || "Parent"} size={112} />
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="text-center sm:text-left pb-2">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {profile.full_name || "Your Name"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {profile.relationship_to_child || "Parent"}{profile.city ? ` • ${profile.city}` : ""}
                </p>
                <button
                  onClick={handleAvatarClick}
                  className="mt-1 text-xs text-accent hover:text-accent/80 underline underline-offset-2 flex items-center gap-1 mx-auto sm:mx-0"
                  disabled={isUploadingAvatar}
                >
                  <Pencil className="w-3 h-3" />
                  {isUploadingAvatar ? "Uploading..." : "Change photo"}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fields Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg text-foreground">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="w-4 h-4 text-accent" />
                Full Name
              </Label>
              <Input
                value={profile.full_name}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Enter your full name"
                className="bg-muted border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded ml-1">Read-only</span>
              </Label>
              <Input value={profile.email} disabled className="bg-muted border-border opacity-60 cursor-not-allowed" />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Phone className="w-4 h-4 text-accent" />
                Phone Number
              </Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Enter your phone number"
                className="bg-muted border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Baby className="w-4 h-4 text-secondary" />
                Relationship to Child
              </Label>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIP_OPTIONS.map((rel) => (
                  <button
                    key={rel}
                    onClick={() => setProfile((p) => ({ ...p, relationship_to_child: p.relationship_to_child === rel ? "" : rel }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                      profile.relationship_to_child === rel
                        ? "bg-accent/20 border-accent text-accent"
                        : "bg-muted border-border text-muted-foreground hover:border-accent/50"
                    }`}
                  >
                    {rel}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <School className="w-4 h-4 text-primary" />
                City / Location
              </Label>
              <Input
                value={profile.city}
                onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                placeholder="Enter your city"
                className="bg-muted border-border"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  Saved!
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-accent hover:bg-accent/90 text-background font-display font-semibold px-6"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
