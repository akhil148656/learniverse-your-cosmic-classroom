import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, Loader2, Award, ClipboardCheck } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScheduleData {
  id: string;
  subject: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_number: string | null;
}

interface AttendanceData {
  status: "present" | "absent" | "late";
  date: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StudentSchedule() {
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    percentage: 100,
    presentCount: 0,
    lateCount: 0,
    totalCount: 0,
  });

  const fetchStudentData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Student profile & class ID
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, class_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (studentError) throw studentError;

      if (!studentData) {
        setIsLoading(false);
        return;
      }

      const { id: studentId, class_id: classId } = studentData;

      // 2. Fetch Timetable/Schedules if enrolled in a class
      if (classId) {
        const { data: scheduleData, error: scheduleError } = await supabase
          .from("class_schedules")
          .select("id, subject, day_of_week, start_time, end_time, room_number")
          .eq("class_id", classId);

        if (scheduleError) throw scheduleError;
        setSchedules(scheduleData || []);
      }

      // 3. Fetch Attendance History
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("status, date")
        .eq("student_id", studentId);

      if (attendanceError) throw attendanceError;
      setAttendance((attendanceData || []) as AttendanceData[]);

      // Calculate Stats
      if (attendanceData && attendanceData.length > 0) {
        const total = attendanceData.length;
        const presents = attendanceData.filter((r) => r.status === "present").length;
        const lates = attendanceData.filter((r) => r.status === "late").length;
        // Count late as half-day presence or just full presence with warning
        const score = Math.round(((presents + lates) / total) * 100);

        setAttendanceStats({
          percentage: score,
          presentCount: presents,
          lateCount: lates,
          totalCount: total,
        });
      }
    } catch (error) {
      console.error("Error loading schedule data:", error);
      toast.error("Failed to load schedule dashboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Timetable & Attendance</h1>
            <p className="text-sm text-muted-foreground">Monitor class period timings and attendance scores</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground font-display animate-pulse">Constructing Map...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timetable Schedule Grid */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden">
                <CardHeader className="border-b border-border/30">
                  <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Lecture Timetable
                  </CardTitle>
                  <CardDescription>Review daily subject lessons and classrooms.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {schedules.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground font-display text-sm italic">
                      🌌 Timetable is empty. Contact your teacher to schedule lectures.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {DAYS_OF_WEEK.map((day) => {
                        const daySchedules = schedules
                          .filter((s) => s.day_of_week === day)
                          .sort((a, b) => a.start_time.localeCompare(b.start_time));

                        return (
                          <div key={day} className="space-y-3">
                            <h4 className="font-display font-bold text-xs text-foreground border-b border-border/40 pb-1 uppercase tracking-wider text-center sm:text-left">
                              {day}
                            </h4>
                            {daySchedules.length === 0 ? (
                              <div className="text-[10px] text-muted-foreground/60 text-center py-3 italic border border-dashed border-border/10 rounded-lg">
                                No lectures scheduled
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {daySchedules.map((slot) => (
                                  <div
                                    key={slot.id}
                                    className="bg-card/70 border border-border/40 rounded-xl p-3 space-y-1.5"
                                  >
                                    <h5 className="font-display font-bold text-xs text-foreground truncate">
                                      {slot.subject}
                                    </h5>
                                    <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/10">
                                      <span className="font-mono">
                                        {slot.start_time} - {slot.end_time}
                                      </span>
                                      {slot.room_number && (
                                        <span className="font-medium bg-muted px-1 rounded">
                                          Room {slot.room_number}
                                        </span>
                                      )}
                                    </div>
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
            </div>

            {/* Attendance Analytics Metrics */}
            <div className="space-y-6">
              {/* Radial Score card */}
              <Card className="bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-primary" />
                    Attendance Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {attendance.length === 0 ? (
                    <div className="text-center text-muted-foreground text-xs italic py-6">
                      No attendance registers recorded yet.
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col items-center justify-center py-4">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          {/* Radial Progress Ring */}
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              className="stroke-muted"
                              strokeWidth="8"
                              fill="transparent"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              className="stroke-primary transition-all duration-1000"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={`${2 * Math.PI * 40}`}
                              strokeDashoffset={`${2 * Math.PI * 40 * (1 - attendanceStats.percentage / 100)}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute text-center">
                            <span className="text-2xl font-bold font-display text-foreground block">
                              {attendanceStats.percentage}%
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                              Presence Rate
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stat bars */}
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Present check-ins</span>
                            <span className="font-semibold text-foreground">
                              {attendanceStats.presentCount} / {attendanceStats.totalCount} days
                            </span>
                          </div>
                          <Progress value={(attendanceStats.presentCount / attendanceStats.totalCount) * 100} className="h-1.5" />
                        </div>

                        {attendanceStats.lateCount > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Late arrivals</span>
                              <span className="font-semibold text-amber-400">
                                {attendanceStats.lateCount} days
                              </span>
                            </div>
                            <Progress value={(attendanceStats.lateCount / attendanceStats.totalCount) * 100} className="h-1.5 bg-amber-500/10" />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Achievements banner */}
              {attendanceStats.percentage >= 95 && attendanceStats.totalCount >= 5 && (
                <Card className="bg-gradient-cosmic text-white border-none shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 text-white/80">
                      <Award className="w-4 h-4 text-white" />
                      Active Achievement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-display font-bold text-sm text-white">Stellar Navigator</h3>
                    <p className="text-[10px] text-white/70 mt-1">
                      Awarded for maintaining a superb attendance status above 95%. Keep up the stellar dedication!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
