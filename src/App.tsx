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
import TeacherClasses from "./pages/teacher/TeacherClasses";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherAssignments from "./pages/teacher/TeacherAssignments";
import TeacherAnalytics from "./pages/teacher/TeacherAnalytics";
import TeacherFeedback from "./pages/teacher/TeacherFeedback";
import TeacherGrading from "./pages/teacher/TeacherGrading";
import { TeacherDashboard } from "./pages/teacher/TeacherPages";
import { ParentDashboard, ParentChildProgress, ParentAIFeedback, ParentAlerts } from "./pages/parent/ParentPages";

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
          <Route path="/teacher-login" element={<TeacherLogin />} />
          <Route path="/parent-login" element={<ParentLogin />} />
          <Route path="/student/onboarding" element={<StudentOnboarding />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/search" element={<StudentSearch />} />
          <Route path="/student/assignments" element={<StudentAssignments />} />
          <Route path="/student/quizzes" element={<StudentQuizzes />} />
          <Route path="/student/virtual-labs" element={<StudentVirtualLabs />} />
          <Route path="/student/discussions" element={<StudentDiscussions />} />
          <Route path="/student/ai-mentor" element={<StudentAIMentor />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/classes" element={<TeacherClasses />} />
          <Route path="/teacher/students" element={<TeacherStudents />} />
          <Route path="/teacher/assignments" element={<TeacherAssignments />} />
          <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
          <Route path="/teacher/feedback" element={<TeacherFeedback />} />
          <Route path="/teacher/grading" element={<TeacherGrading />} />
          <Route path="/parent/dashboard" element={<ParentDashboard />} />
          <Route path="/parent/child-progress" element={<ParentChildProgress />} />
          <Route path="/parent/ai-feedback" element={<ParentAIFeedback />} />
          <Route path="/parent/alerts" element={<ParentAlerts />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
