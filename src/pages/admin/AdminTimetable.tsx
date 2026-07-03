import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, Plus, Loader2, Trash2 } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassData {
  id: string;
  name: string;
}

interface TeacherProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface ScheduleData {
  id: string;
  class_id: string;
  subject: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_number: string | null;
  classes?: {
    name: string;
  };
  profiles?: {
    full_name: string | null;
  };
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AdminTimetable() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    classId: "",
    subject: "",
    dayOfWeek: "Monday",
    startTime: "09:00",
    endTime: "09:45",
    roomNumber: "",
    teacherId: "",
  });

  const fetchTimetableConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: adminProf } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!adminProf?.school_id) return;
      const schoolId = adminProf.school_id;

      // 1. Fetch Classes in school
      const { data: classesData } = await supabase
        .from("classes")
        .select("id, name")
        .eq("school_id", schoolId)
        .order("name", { ascending: true });

      const classList = (classesData || []) as ClassData[];
      setClasses(classList);
      if (classList.length > 0) {
        setFormData((prev) => ({ ...prev, classId: classList[0].id }));
      }

      // 2. Fetch Teachers in school
      const { data: teachersData } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("school_id", schoolId)
        .eq("role", "teacher");

      const teachersList = (teachersData || []) as TeacherProfile[];
      setTeachers(teachersList);
      if (teachersList.length > 0) {
        setFormData((prev) => ({ ...prev, teacherId: teachersList[0].user_id }));
      }

      // 3. Fetch Master Schedules
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("class_schedules")
        .select(`
          id,
          class_id,
          subject,
          day_of_week,
          start_time,
          end_time,
          room_number,
          classes (
            name
          )
        `)
        .eq("school_id", schoolId);

      if (scheduleError) throw scheduleError;

      // Let's resolve teacher names using a map
      const teacherIds = Array.from(new Set(teachersList.map((t) => t.user_id)));
      const teachersMap = new Map(teachersList.map((t) => [t.user_id, t.full_name]));

      const enrichedSchedules = (scheduleData || []).map((slot: any) => ({
        ...slot,
        profiles: {
          full_name: teachersMap.get(slot.teacher_id) || "Educator",
        },
      }));

      setSchedules(enrichedSchedules);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load school timetable configs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimetableConfig();
  }, [fetchTimetableConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId || !formData.subject || !formData.startTime || !formData.endTime || !formData.teacherId) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated");

      // Get school_id
      const { data: adminProf } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!adminProf?.school_id) throw new Error("School not set");

      const { error } = await supabase.from("class_schedules").insert([
        {
          class_id: formData.classId,
          subject: formData.subject,
          day_of_week: formData.dayOfWeek,
          start_time: formData.startTime,
          end_time: formData.endTime,
          room_number: formData.roomNumber || null,
          teacher_id: formData.teacherId,
          school_id: adminProf.school_id,
        },
      ]);

      if (error) throw error;

      toast.success("Timetable period allocated successfully!");
      setIsDialogOpen(false);
      setFormData((prev) => ({ ...prev, subject: "", roomNumber: "" }));
      fetchTimetableConfig();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to schedule slot");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      const { error } = await supabase.from("class_schedules").delete().eq("id", id);
      if (error) throw error;
      toast.success("Schedule period removed successfully");
      fetchTimetableConfig();
    } catch (err) {
      toast.error("Failed to remove schedule slot");
    }
  };

  return (
    <PortalLayout role="admin">
      <div className="space-y-6 admin-portal-theme">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">Timetable Master</h1>
              <p className="text-sm text-muted-foreground">Construct and schedule conflict-free weekly timetables</p>
            </div>
          </div>

          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-cosmic text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Master Slot
          </Button>
        </div>

        {/* Weekly Timetable Grid */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              School Timetable Registry
            </CardTitle>
            <CardDescription>Master period scheduling across weekdays.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground font-display animate-pulse">Scanning master timetable...</span>
              </div>
            ) : schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-display font-semibold text-foreground">No Classes Scheduled</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Schedule period slots across classrooms and assign teaching staff.
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  variant="outline"
                  className="mt-4 border-primary/30 text-primary hover:bg-primary/10"
                >
                  Create First Slot
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {DAYS_OF_WEEK.map((day) => {
                  const daySchedules = schedules
                    .filter((s) => s.day_of_week === day)
                    .sort((a, b) => a.start_time.localeCompare(b.start_time));

                  return (
                    <div key={day} className="space-y-4">
                      <h3 className="font-display font-bold text-sm text-foreground border-b border-border/40 pb-2 uppercase tracking-wider text-center md:text-left">
                        {day}
                      </h3>
                      {daySchedules.length === 0 ? (
                        <div className="text-xs text-muted-foreground/60 text-center py-4 italic border border-dashed border-border/20 rounded-lg">
                          No lectures
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {daySchedules.map((slot) => (
                            <div
                              key={slot.id}
                              className="group relative bg-card/80 border border-border/50 rounded-xl p-3.5 space-y-2 hover:border-primary/45 transition-colors shadow-sm"
                            >
                              <div className="pr-6">
                                <h4 className="font-display font-bold text-xs text-foreground truncate">
                                  {slot.subject}
                                </h4>
                                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mt-0.5">
                                  {slot.classes?.name || "Class"}
                                </p>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/20">
                                <span className="font-mono">
                                  {slot.start_time} - {slot.end_time}
                                </span>
                                {slot.room_number && (
                                  <span className="font-medium bg-muted px-1.5 py-0.5 rounded">
                                    Room {slot.room_number}
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5"
                                title="Remove slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog Form */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-display font-bold">Add Timetable Slot</DialogTitle>
              <DialogDescription>Create a weekly period schedule for a class and assign an educator.</DialogDescription>
            </DialogHeader>

            {classes.length === 0 || teachers.length === 0 ? (
              <div className="py-6 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Timetable Builder requires classrooms and teachers to be registered first. Ensure classrooms are created under Class Registry.
                </p>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-border">
                  Cancel
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                {/* Classroom */}
                <div className="space-y-2">
                  <Label htmlFor="class">Select Classroom</Label>
                  <Select
                    value={formData.classId}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, classId: value }))}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Choose Class" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    required
                    placeholder="e.g. Astro-biology, Calculus"
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>

                {/* Teacher select */}
                <div className="space-y-2">
                  <Label htmlFor="teacher">Assign Educator</Label>
                  <Select
                    value={formData.teacherId}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, teacherId: val }))}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select Teacher" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {teachers.map((t) => (
                        <SelectItem key={t.user_id} value={t.user_id}>
                          {t.full_name || t.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Day of Week */}
                  <div className="space-y-2">
                    <Label htmlFor="day">Day</Label>
                    <Select
                      value={formData.dayOfWeek}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, dayOfWeek: value }))}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {DAYS_OF_WEEK.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Room Number */}
                  <div className="space-y-2">
                    <Label htmlFor="room">Room Number</Label>
                    <Input
                      id="room"
                      placeholder="e.g. Rm 204"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData((prev) => ({ ...prev, roomNumber: e.target.value }))}
                      className="bg-input border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Start Time */}
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Time</Label>
                    <Input
                      id="start"
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="bg-input border-border dark:[color-scheme:dark]"
                    />
                  </div>

                  {/* End Time */}
                  <div className="space-y-2">
                    <Label htmlFor="end">End Time</Label>
                    <Input
                      id="end"
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="bg-input border-border dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-border hover:bg-muted"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-cosmic text-white font-medium hover:opacity-90"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule Slot"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
