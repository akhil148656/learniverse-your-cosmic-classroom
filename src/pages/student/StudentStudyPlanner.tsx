import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAIChat } from "@/hooks/useAIChat";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Sparkles, CheckCircle2, Plus, Trash2, BookOpen, Clock, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface StudyTask {
  id: string;
  day: string; // "Monday", "Tuesday", etc.
  subject: string;
  topic: string;
  timeSlot: string;
  isCompleted: boolean;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEFAULT_SUBJECTS = ["Mathematics", "Science", "History / Social Studies", "English Literature", "Computer Science"];

export default function StudentStudyPlanner() {
  const { sendMessage } = useAIChat();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isCustomTaskOpen, setIsCustomTaskOpen] = useState(false);
  
  // Dynamic Subjects state
  const [subjects, setSubjects] = useState<string[]>(() => {
    const savedSubjects = localStorage.getItem("learniverse_study_subjects");
    return savedSubjects ? JSON.parse(savedSubjects) : DEFAULT_SUBJECTS;
  });
  const [newSubjectInput, setNewSubjectInput] = useState("");

  // Generator states
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(() => {
    const savedSubjects = localStorage.getItem("learniverse_study_subjects");
    return savedSubjects ? JSON.parse(savedSubjects) : DEFAULT_SUBJECTS;
  });
  const [targetHours, setTargetHours] = useState("10");
  const [isGenerating, setIsGenerating] = useState(false);

  // Advanced AI Planner options
  const [workingTimePerDay, setWorkingTimePerDay] = useState("1 hour");
  const [targetTopics, setTargetTopics] = useState("");
  const [hardnessLevel, setHardnessLevel] = useState("Intermediate");
  const [avoidTopics, setAvoidTopics] = useState("");

  // Custom task states
  const [customDay, setCustomDay] = useState("Monday");
  const [customSubject, setCustomSubject] = useState("Mathematics");
  const [customTopic, setCustomTopic] = useState("");
  const [customTime, setCustomTime] = useState("4:00 PM - 5:00 PM");

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("learniverse_study_tasks");
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse study tasks", e);
      }
    } else {
      // Add default mock tasks so the planner isn't empty initially
      const mockTasks: StudyTask[] = [
        { id: "1", day: "Monday", subject: "Science", topic: "Read Photosynthesis notes & take a quiz", timeSlot: "4:00 PM - 4:45 PM", isCompleted: false },
        { id: "2", day: "Wednesday", subject: "Mathematics", topic: "Solve 10 quadratic equation problems", timeSlot: "5:00 PM - 6:00 PM", isCompleted: false },
        { id: "3", day: "Friday", subject: "History / Social Studies", topic: "Watch video summary of Ancient Rome", timeSlot: "3:30 PM - 4:15 PM", isCompleted: false }
      ];
      setTasks(mockTasks);
      localStorage.setItem("learniverse_study_tasks", JSON.stringify(mockTasks));
    }
  }, []);

  // Save to local storage whenever tasks change
  const saveTasks = (updated: StudyTask[]) => {
    setTasks(updated);
    localStorage.setItem("learniverse_study_tasks", JSON.stringify(updated));
  };

  const handleToggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const saveSubjects = (updatedSubjects: string[]) => {
    setSubjects(updatedSubjects);
    localStorage.setItem("learniverse_study_subjects", JSON.stringify(updatedSubjects));
  };

  const handleAddSubject = () => {
    const trimmed = newSubjectInput.trim();
    if (!trimmed) {
      toast.error("Subject name cannot be empty");
      return;
    }
    if (subjects.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Subject already exists");
      return;
    }
    const updated = [...subjects, trimmed];
    saveSubjects(updated);
    setSelectedSubjects([...selectedSubjects, trimmed]);
    setNewSubjectInput("");
    toast.success(`Subject "${trimmed}" added!`);
  };

  const handleRemoveSubject = (subjectToRemove: string) => {
    const updated = subjects.filter(s => s !== subjectToRemove);
    saveSubjects(updated);
    setSelectedSubjects(selectedSubjects.filter(s => s !== subjectToRemove));
    toast.success(`Subject "${subjectToRemove}" removed`);
  };

  // Generate Cosmic Schedule using AI
  const handleGenerateAISchedule = async () => {
    if (selectedSubjects.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let gradeLevel = 8;
      if (user) {
        const { data: student } = await supabase
          .from("students")
          .select("grade_level")
          .eq("user_id", user.id)
          .maybeSingle();
        if (student?.grade_level) gradeLevel = student.grade_level;
      }

      const prompt = `You are a study scheduler for a Grade ${gradeLevel} student. Create a weekly study schedule based on:
- Subjects to cover: ${selectedSubjects.join(", ")}
- Target study hours for the week: ${targetHours} hours
- Maximum working/study time per study day: ${workingTimePerDay}
- Level of difficulty/hardness: ${hardnessLevel}
${targetTopics ? `- Specific target topics/focus areas to include: ${targetTopics}` : ""}
${avoidTopics ? `- Already learnt/mastered topics (CRITICAL: DO NOT repeat or include these in the schedule): ${avoidTopics}` : ""}

Respond ONLY with a valid JSON array in this exact format:
[
  {
    "day": "Monday",
    "subject": "Math",
    "topic": "Describe specific topic task to perform matching the constraints & difficulty",
    "timeSlot": "4:00 PM - 5:00 PM"
  }
]
Use only the days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
Limit the output to 1-2 structured study slots per day max to fit within the target hours.
Strict rule: Output ONLY the raw JSON array. Do not include markdown block tags like \`\`\`json, no explanation, no conversational filler.`;

      const aiResponse = await sendMessage(prompt, "chat");

      if (!aiResponse) {
        throw new Error("Empty response from AI planner");
      }

      // Clean the AI response (strip markdown wrappers if LLM disobeyed instructions)
      let cleanedJson = aiResponse.trim();
      if (cleanedJson.startsWith("```")) {
        cleanedJson = cleanedJson.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }

      const generatedTasks = JSON.parse(cleanedJson) as any[];

      // Format as StudyTasks
      const formattedTasks: StudyTask[] = generatedTasks.map((t, idx) => ({
        id: `ai-${Date.now()}-${idx}`,
        day: t.day || "Monday",
        subject: t.subject || "Study",
        topic: t.topic || "Review material",
        timeSlot: t.timeSlot || "4:00 PM - 5:00 PM",
        isCompleted: false
      }));

      saveTasks(formattedTasks);
      toast.success("AI Cosmic Study Schedule generated successfully!");
      setIsGeneratorOpen(false);
    } catch (e) {
      console.error("AI Schedule generation error:", e);
      toast.error("Failed to generate schedule. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Add a custom task manually
  const handleAddCustomTask = () => {
    if (!customTopic.trim()) {
      toast.error("Enter a study topic description");
      return;
    }

    const newTask: StudyTask = {
      id: `custom-${Date.now()}`,
      day: customDay,
      subject: customSubject,
      topic: customTopic.trim(),
      timeSlot: customTime,
      isCompleted: false
    };

    saveTasks([...tasks, newTask]);
    toast.success("Custom task added!");
    setCustomTopic("");
    setIsCustomTaskOpen(false);
  };

  // Delete a task
  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
    toast.success("Task deleted");
  };

  // Reset the schedule
  const handleResetSchedule = () => {
    const ok = window.confirm("Are you sure you want to clear your entire weekly schedule? This will delete all tasks.");
    if (ok) {
      saveTasks([]);
      toast.success("Schedule reset successfully!");
    }
  };

  // Award XP to student profile on task completion
  const awardXP = async (amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: student } = await supabase
        .from("students")
        .select("id, xp_points")
        .eq("user_id", user.id)
        .single();

      if (student) {
        const newXp = (student.xp_points || 0) + amount;
        await supabase
          .from("students")
          .update({ xp_points: newXp })
          .eq("id", student.id);
        
        toast.success(`+${amount} XP Awarded! New Total: ${newXp} XP 🚀`);
        window.dispatchEvent(new CustomEvent("xp-changed", { detail: newXp }));
      }
    } catch (err) {
      console.error("Failed to award XP", err);
    }
  };

  // Toggle completion status
  const handleToggleTask = async (id: string) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        const nextState = !t.isCompleted;
        if (nextState) {
          // Award +20 XP on completion
          awardXP(20);
        }
        return { ...t, isCompleted: nextState };
      }
      return t;
    });
    saveTasks(updated);
  };

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Cosmic Study Planner</h1>
            <p className="text-muted-foreground">Map your weekly schedules, review topics, and earn galactic XP</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsGeneratorOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white font-display text-xs uppercase tracking-widest border border-primary/20 glow-primary"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Schedule Generator
            </Button>
            <Button
              onClick={() => setIsCustomTaskOpen(true)}
              variant="outline"
              className="border-border text-foreground hover:bg-muted text-xs font-display uppercase tracking-wider"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
            <Button
              onClick={handleResetSchedule}
              variant="ghost"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-display uppercase tracking-wider border border-border/40"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {DAYS_OF_WEEK.map((day) => {
            const dayTasks = tasks.filter(t => t.day === day);
            
            return (
              <Card key={day} className="glass-panel hover:shadow-[0_0_20px_rgba(139,92,246,0.1)] transition-all duration-300 flex flex-col min-h-[300px]">
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-sm tracking-widest text-foreground font-semibold uppercase">
                      {day}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono px-2 py-0.5 border-secondary/35 text-secondary">
                      {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 flex flex-col gap-3">
                  {dayTasks.length > 0 ? (
                    <div className="space-y-3 flex-1">
                      {dayTasks.map((task) => (
                        <div 
                          key={task.id} 
                          className={cn(
                            "relative group flex items-start gap-3 rounded-lg border border-border/50 p-3 bg-muted/20 transition-all duration-300 hover:border-secondary/40",
                            task.isCompleted && "bg-secondary/5 border-secondary/20 opacity-75"
                          )}
                        >
                          <div className="pt-0.5">
                            <Checkbox 
                              checked={task.isCompleted} 
                              onCheckedChange={() => handleToggleTask(task.id)}
                              className="border-border data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                            />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge className="text-[9px] px-1.5 py-0.2 uppercase font-mono bg-primary/20 text-primary border border-primary/20">
                                {task.subject}
                              </Badge>
                              {task.isCompleted && (
                                <Badge className="text-[9px] px-1.5 py-0.2 uppercase font-mono bg-secondary/20 text-secondary border border-secondary/20">
                                  +20 XP
                                </Badge>
                              )}
                            </div>
                            <p className={cn(
                              "text-sm font-medium text-foreground leading-tight break-words",
                              task.isCompleted && "line-through text-muted-foreground"
                            )}>
                              {task.topic}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{task.timeSlot}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTask(task.id)}
                            className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <Calendar className="w-8 h-8 opacity-30 mb-2" />
                      <p className="text-xs">No study slots scheduled</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* AI Schedule Generator Dialog */}
        <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
          <DialogContent className="max-w-md bg-card border-border shadow-[0_0_40px_rgba(139,92,246,0.25)] text-foreground">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
                AI Schedule Generator
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Our cosmic mentor will craft a personalized weekly schedule matching your subject and hour goals.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Subject Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Subjects to Include</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {subjects.map((subject) => {
                    const isSelected = selectedSubjects.includes(subject);
                    return (
                      <div key={subject} className="flex items-center gap-1.5 bg-muted/20 border border-border/40 rounded-lg p-1">
                        <Button
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => handleToggleSubject(subject)}
                          className={cn(
                            "text-xs h-7 px-2",
                            isSelected ? "bg-primary text-white border-primary" : "border-transparent hover:border-primary/50 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {subject}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleRemoveSubject(subject)}
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive transition-colors rounded"
                          title={`Remove ${subject}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                {/* Custom Subject Addition */}
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add custom subject (e.g. Astronomy)"
                    value={newSubjectInput}
                    onChange={(e) => setNewSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubject();
                      }
                    }}
                    className="bg-input border-border text-xs h-8"
                  />
                  <Button
                    type="button"
                    onClick={handleAddSubject}
                    className="h-8 text-xs bg-secondary hover:bg-secondary/90 text-background font-semibold"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Hours inputs & Daily Study Time / Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hours" className="text-xs font-semibold">Target Weekly Hours</Label>
                  <Input
                    id="hours"
                    type="number"
                    value={targetHours}
                    onChange={(e) => setTargetHours(e.target.value)}
                    className="bg-input border-border text-xs"
                    min={2}
                    max={40}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="working-time" className="text-xs font-semibold">Max Daily Study Time</Label>
                  <select
                    id="working-time"
                    value={workingTimePerDay}
                    onChange={(e) => setWorkingTimePerDay(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-input px-3 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="30 minutes">30 minutes</option>
                    <option value="1 hour">1 hour</option>
                    <option value="1.5 hours">1.5 hours</option>
                    <option value="2 hours">2 hours</option>
                    <option value="3 hours">3 hours</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hardness" className="text-xs font-semibold">Level of Hardness</Label>
                  <select
                    id="hardness"
                    value={hardnessLevel}
                    onChange={(e) => setHardnessLevel(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-input px-3 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="Beginner (Intro & Fundamentals)">Beginner (Intro & Fundamentals)</option>
                    <option value="Intermediate (Standard Practice)">Intermediate (Standard Practice)</option>
                    <option value="Advanced (Challenging & Mastery)">Advanced (Challenging & Mastery)</option>
                  </select>
                </div>
              </div>

              {/* Focus topics */}
              <div className="space-y-2">
                <Label htmlFor="target-topics" className="text-xs font-semibold">Specific Topics Focus (Optional)</Label>
                <Input
                  id="target-topics"
                  placeholder="e.g. Quadratic equations, photosynthesis"
                  value={targetTopics}
                  onChange={(e) => setTargetTopics(e.target.value)}
                  className="bg-input border-border text-xs"
                />
              </div>

              {/* Already Learnt / Mastered topics to Avoid */}
              <div className="space-y-2">
                <Label htmlFor="avoid-topics" className="text-xs font-semibold">Already Mastered Topics to AVOID</Label>
                <textarea
                  id="avoid-topics"
                  placeholder="e.g. basic fractions, spelling"
                  value={avoidTopics}
                  onChange={(e) => setAvoidTopics(e.target.value)}
                  className="w-full min-h-[60px] rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border/50 pt-4 mt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsGeneratorOpen(false)}
                disabled={isGenerating}
                className="border-border text-foreground hover:bg-muted font-display text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateAISchedule}
                disabled={isGenerating}
                className="bg-primary hover:bg-primary/90 text-white font-display text-xs uppercase tracking-widest border border-primary/20 glow-primary"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Consulting Stars...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Schedule
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Custom Task Dialog */}
        <Dialog open={isCustomTaskOpen} onOpenChange={setIsCustomTaskOpen}>
          <DialogContent className="max-w-md bg-card border-border shadow-[0_0_30px_rgba(139,92,246,0.15)] text-foreground">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-secondary" />
                Add Study Task
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Manually schedule a study slot into your weekly dashboard planner.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Day selector */}
                <div className="space-y-2">
                  <Label htmlFor="day">Day</Label>
                  <select
                    id="day"
                    value={customDay}
                    onChange={(e) => setCustomDay(e.target.value)}
                    className="w-full h-10 rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Subject selector */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <select
                    id="subject"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full h-10 rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    {subjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time slot */}
              <div className="space-y-2">
                <Label htmlFor="time">Time Slot</Label>
                <Input
                  id="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  placeholder="e.g. 4:00 PM - 5:00 PM"
                  className="bg-input border-border"
                />
              </div>

              {/* Topic input */}
              <div className="space-y-2">
                <Label htmlFor="topic">Topic Description</Label>
                <Input
                  id="topic"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Solve 10 linear equations"
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border/50 pt-4 mt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCustomTaskOpen(false)}
                className="border-border text-foreground hover:bg-muted font-display text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddCustomTask}
                className="bg-primary hover:bg-primary/90 text-white font-display text-xs uppercase tracking-widest border border-primary/20 glow-primary"
              >
                Add Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PortalLayout>
  );
}
