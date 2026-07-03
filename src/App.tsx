import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StudentLogin from "./pages/auth/StudentLogin";
import TeacherLogin from "./pages/auth/TeacherLogin";
import ParentLogin from "./pages/auth/ParentLogin";
import StudentOnboarding from "./pages/student/StudentOnboarding";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentSearch from "./pages/student/StudentSearch";
import StudentVirtualLabs from "./pages/student/StudentVirtualLabs";
import StudentAIMentor from "./pages/student/StudentAIMentor";
import StudentDiscussions from "./pages/student/StudentDiscussions";
import StudentAssignments from "./pages/student/StudentAssignments";
import StudentQuizzes from "./pages/student/StudentQuizzes";
import StudentAlerts from "./pages/student/StudentAlerts";
import StudentSettings from "./pages/student/StudentSettings";
import StudentStudyPlanner from "./pages/student/StudentStudyPlanner";
import StudentStudyBuddy from "./pages/student/StudentStudyBuddy";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherAssignments from "./pages/teacher/TeacherAssignments";
import TeacherAnalytics from "./pages/teacher/TeacherAnalytics";
import TeacherFeedback from "./pages/teacher/TeacherFeedback";
import TeacherGrading from "./pages/teacher/TeacherGrading";
import TeacherAlerts from "./pages/teacher/TeacherAlerts";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import TeacherHub from "./pages/teacher/TeacherHub";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherTimetable from "./pages/teacher/TeacherTimetable";
import ParentHub from "./pages/parent/ParentHub";
import ParentBilling from "./pages/parent/ParentBilling";
import StudentSchedule from "./pages/student/StudentSchedule";
import AdminLogin from "./pages/auth/AdminLogin";
import AdminOnboarding from "./pages/admin/AdminOnboarding";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminTimetable from "./pages/admin/AdminTimetable";
import SuperAdminLogin from "./pages/auth/SuperAdminLogin";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import SuperAdminSchools from "./pages/super-admin/SuperAdminSchools";
import SuperAdminAdmins from "./pages/super-admin/SuperAdminAdmins";
import { TeacherDashboard } from "./pages/teacher/TeacherPages";
import { ParentDashboard, ParentChildProgress, ParentAIFeedback, ParentAlerts, ParentProfile } from "./pages/parent/ParentPages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/teacher-login" element={<TeacherLogin />} />
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route path="/parent-login" element={<ParentLogin />} />
          <Route path="/parent/login" element={<ParentLogin />} />
          <Route path="/student/onboarding" element={<StudentOnboarding />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/search" element={<StudentSearch />} />
          <Route path="/student/assignments" element={<StudentAssignments />} />
          <Route path="/student/quizzes" element={<StudentQuizzes />} />
          <Route path="/student/alerts" element={<StudentAlerts />} />
          <Route path="/student/virtual-labs" element={<StudentVirtualLabs />} />
          <Route path="/student/discussions" element={<StudentDiscussions />} />
          <Route path="/student/ai-mentor" element={<StudentAIMentor />} />
           <Route path="/student/planner" element={<StudentStudyPlanner />} />
          <Route path="/student/study-buddy" element={<StudentStudyBuddy />} />
          <Route path="/student/settings" element={<StudentSettings />} />
          <Route path="/student/profile" element={<StudentSettings />} />
          <Route path="/student/timetable" element={<StudentSchedule />} />
          
          <Route path="/teacher/hub" element={<TeacherHub />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/classes" element={<TeacherClasses />} />
          <Route path="/teacher/students" element={<TeacherStudents />} />
          <Route path="/teacher/assignments" element={<TeacherAssignments />} />
          <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
          <Route path="/teacher/feedback" element={<TeacherFeedback />} />
          <Route path="/teacher/grading" element={<TeacherGrading />} />
          <Route path="/teacher/alerts" element={<TeacherAlerts />} />
          <Route path="/teacher/profile" element={<TeacherProfile />} />
          <Route path="/teacher/attendance" element={<TeacherAttendance />} />
          <Route path="/teacher/timetable" element={<TeacherTimetable />} />
          
          <Route path="/parent/hub" element={<ParentHub />} />
          <Route path="/parent/dashboard" element={<ParentDashboard />} />
          <Route path="/parent/child-progress" element={<ParentChildProgress />} />
          <Route path="/parent/ai-feedback" element={<ParentAIFeedback />} />
          <Route path="/parent/alerts" element={<ParentAlerts />} />
          <Route path="/parent/profile" element={<ParentProfile />} />
          <Route path="/parent/billing" element={<ParentBilling />} />

          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/onboarding" element={<AdminOnboarding />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/classes" element={<AdminClasses />} />
          <Route path="/admin/billing" element={<AdminBilling />} />
          <Route path="/admin/timetable" element={<AdminTimetable />} />

          <Route path="/super-admin-login" element={<SuperAdminLogin />} />
          <Route path="/super-admin/login" element={<SuperAdminLogin />} />
          <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/schools" element={<SuperAdminSchools />} />
          <Route path="/super-admin/admins" element={<SuperAdminAdmins />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
