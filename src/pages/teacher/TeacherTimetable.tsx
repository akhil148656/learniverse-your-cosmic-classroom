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
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TeacherTimetable() {
  const [classes, setClasses] = useState<ClassData[]>([]);
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
  });

  // Fetch Classes
  useEffect(() => {
    const fetchClasses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        toast.error("Failed to load classes");
        return;
      }
      setClasses(data || []);
      if (data && data.length > 0) {
        setFormData((prev) => ({ ...prev, classId: data[0].id }));
      }
    };
    fetchClasses();
  }, []);

  // Fetch Schedules
  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
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
        `);

      if (error) throw error;
      setSchedules((data || []) as any[]);
    } catch (error) {
      console.error("Error loading schedules:", error);
      toast.error("Failed to load timetable schedule");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId || !formData.subject || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated");

      const { error } = await supabase.from("class_schedules").insert([
        {
          class_id: formData.classId,
          subject: formData.subject,
          day_of_week: formData.dayOfWeek,
          start_time: formData.startTime,
          end_time: formData.endTime,
          room_number: formData.roomNumber || null,
          teacher_id: user.id,
        },
      ]);

      if (error) throw error;

      toast.success("Period schedule added to timetable!");
      setIsDialogOpen(false);
      setFormData((prev) => ({ ...prev, subject: "", roomNumber: "" }));
      fetchSchedules();
    } catch (error: any) {
      console.error("Error creating schedule:", error);
      toast.error(error.message || "Failed to add timetable slot");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase.from("class_schedules").delete().eq("id", id);
      if (error) throw error;
      toast.success("Timetable slot deleted successfully");
      fetchSchedules();
    } catch (error) {
      toast.error("Failed to delete timetable slot");
    }
  };

  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">Class Timetable</h1>
              <p className="text-sm text-muted-foreground">Plan and review teaching hours and period slots</p>
            </div>
          </div>

          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-cosmic text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Schedule Slot
          </Button>
        </div>

        {/* Timetable Grid Card */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-secondary" />
              Weekly Lecture Map
            </CardTitle>
            <CardDescription>
              Review your scheduled periods across weekdays.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-secondary" />
                <span className="text-sm text-muted-foreground font-display animate-pulse">Loading schedule...</span>
              </div>
            ) : schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-display font-semibold text-foreground">No Timetable Set</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Add period slots to schedule classes and subjects.
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  variant="outline"
                  className="mt-4 border-secondary/30 text-secondary hover:bg-secondary/10"
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
                              className="group relative bg-card/80 border border-border/50 rounded-xl p-3.5 space-y-2 hover:border-secondary/40 transition-colors shadow-sm"
                            >
                              {/* Subject & Class */}
                              <div className="pr-6">
                                <h4 className="font-display font-bold text-xs text-foreground truncate">
                                  {slot.subject}
                                </h4>
                                <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider mt-0.5">
                                  {slot.classes?.name || "Class"}
                                </p>
                              </div>

                              {/* Time & Room */}
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/20">
                                <span className="flex items-center gap-1 font-mono">
                                  {slot.start_time} - {slot.end_time}
                                </span>
                                {slot.room_number && (
                                  <span className="font-medium bg-muted px-1.5 py-0.5 rounded">
                                    Room {slot.room_number}
                                  </span>
                                )}
                              </div>

                              {/* Delete Action button */}
                              <button
                                onClick={() => handleDeleteSchedule(slot.id)}
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
              <DialogDescription>Add a weekly period class block to the schedule register.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Class Select */}
              <div className="space-y-2">
                <Label htmlFor="class">Select Class</Label>
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

              {/* Subject Input */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Name</Label>
                <Input
                  id="subject"
                  required
                  placeholder="e.g. Astrophysics, Algebra"
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  className="bg-input border-border"
                />
              </div>

              {/* Grid selectors */}
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
                  <Label htmlFor="room">Room Number (Optional)</Label>
                  <Input
                    id="room"
                    placeholder="e.g. Lab 4, 302"
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
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
