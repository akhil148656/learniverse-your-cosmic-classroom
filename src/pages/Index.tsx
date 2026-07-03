import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Rocket,
  Sparkles,
  Brain,
  MessageSquare,
  FileText,
  ClipboardCheck,
  BookOpen,
  Code,
  Users,
  Link2,
  BarChart3,
  PenTool,
  Award,
  Zap,
  Star,
  Palette,
  MessagesSquare,
  Bell,
  Radio,
  ArrowRight,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StarField } from "@/components/ui/StarField";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LoginModal from "@/components/landing/LoginModal";
import StatsBar from "@/components/landing/StatsBar";
import FeatureSection from "@/components/landing/FeatureSection";
import type { FeatureItem } from "@/components/landing/FeatureSection";

/* ═══════════════════════════════════════════════════════
   FEATURE DATA — one array per section
   ═══════════════════════════════════════════════════════ */

const aiFeatures: FeatureItem[] = [
  {
    icon: Brain,
    title: "AI Mentor",
    description:
      "A personal AI tutor that adapts to each student's pace, answers questions in real-time, and provides guided explanations across subjects.",
  },
  {
    icon: ClipboardCheck,
    title: "AI Quiz Generator",
    description:
      "Automatically generates topic-specific quizzes with varying difficulty levels, complete with instant grading and detailed feedback.",
  },
  {
    icon: FileText,
    title: "AI Report Cards",
    description:
      "Intelligent report card generation that analyses performance trends, highlights strengths, and suggests focus areas for improvement.",
  },
  {
    icon: MessageSquare,
    title: "AI Feedback Engine",
    description:
      "Provides personalized, constructive feedback on assignments and quiz performance to accelerate learning outcomes.",
  },
];

const classroomFeatures: FeatureItem[] = [
  {
    icon: BookOpen,
    title: "Create Classes",
    description:
      "Teachers can create themed cosmic classrooms with unique join codes, manage multiple classes, and organize curricula effortlessly.",
  },
  {
    icon: Code,
    title: "Student Codes",
    description:
      "Each student gets a unique cosmic ID (like STU-A4B7D2F8) for secure parent linking and easy classroom enrollment.",
  },
  {
    icon: ClipboardCheck,
    title: "Assignment Tracking",
    description:
      "Create, distribute, and track assignments across classes. Students auto-receive all assignments when they join a class.",
  },
  {
    icon: Users,
    title: "Co-Teacher Support",
    description:
      "Invite co-teachers to collaborate on class management, grading, and student progress monitoring.",
  },
];

const parentFeatures: FeatureItem[] = [
  {
    icon: Link2,
    title: "Child Linking",
    description:
      "Parents can securely link to their child's account using the cosmic student ID and instantly access their learning dashboard.",
  },
  {
    icon: BarChart3,
    title: "Progress Monitoring",
    description:
      "Real-time analytics showing assignment completion, quiz scores, focus metrics, and overall performance trajectories.",
  },
  {
    icon: PenTool,
    title: "Digital Signatures",
    description:
      "Parents can digitally sign AI-generated report cards, adding acknowledgement timestamps and custom notes.",
  },
  {
    icon: Heart,
    title: "Achievement Notifications",
    description:
      "Get notified when your child earns cosmic achievements, badges, and milestone rewards in their learning journey.",
  },
];

const gamificationFeatures: FeatureItem[] = [
  {
    icon: Award,
    title: "Achievements & Badges",
    description:
      "Unlock cosmic badges and achievements as you progress — from 'First Quiz Completed' to 'Nebula Navigator' mastery awards.",
  },
  {
    icon: Zap,
    title: "XP & Streaks",
    description:
      "Earn experience points for every activity. Maintain daily learning streaks to multiply your XP gains and climb the leaderboard.",
  },
  {
    icon: Star,
    title: "Focus Scores",
    description:
      "AI-powered focus tracking monitors engagement during lessons and rewards sustained concentration with bonus cosmic points.",
  },
  {
    icon: Palette,
    title: "Cosmic Theme",
    description:
      "An immersive space-themed UI with animated starfields, nebula gradients, and orbital effects that make learning feel like an adventure.",
  },
];

const collaborationFeatures: FeatureItem[] = [
  {
    icon: MessagesSquare,
    title: "Discussion Rooms",
    description:
      "Each class gets an auto-generated cosmic discussion room where students and teachers can collaborate and share ideas.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Real-time notifications for new assignments, grade updates, achievements, and parent-teacher communications.",
  },
  {
    icon: Radio,
    title: "Live Updates",
    description:
      "All dashboards update in real-time — when a teacher posts an assignment, students see it instantly. No refresh needed.",
  },
  {
    icon: Users,
    title: "Teacher-Parent Bridge",
    description:
      "Seamless communication channel between teachers and parents through shared report cards, progress data, and achievement alerts.",
  },
];

/* ═══════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */

const Index = () => {
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const { ref: ctaRef, isRevealed: ctaRevealed } = useScrollReveal(0.2);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <StarField />

      {/* Navbar */}
      <LandingNavbar onLoginClick={() => setLoginOpen(true)} />

      {/* Login Modal */}
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />

      {/* ════════════════════════════════════════════
          HERO SECTION
          ════════════════════════════════════════════ */}
      <section className="relative z-10 min-h-screen flex items-center justify-center pt-20 pb-12">
        {/* Floating decorative orbs */}
        <div className="absolute top-1/4 left-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-10 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-float" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-secondary/5 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

        <div className="max-w-6xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="animate-hero-text">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered Cosmic Education Platform</span>
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          {/* Title */}
          <h1 className="animate-hero-text-delay-1 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold text-foreground leading-tight mt-8">
            Welcome to the{" "}
            <span className="text-gradient block sm:inline">Learniverse</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-hero-text-delay-2 text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mt-6">
            The AI-powered cosmic classroom where learning meets adventure.
            Gamified education with real-time analytics for students, teachers, and parents.
          </p>

          {/* CTA Buttons */}
          <div className="animate-hero-text-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Button
              onClick={() => setLoginOpen(true)}
              size="lg"
              className="bg-gradient-cosmic text-white font-display font-semibold text-lg px-8 py-6 rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-primary/25"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Launch Into Learning
            </Button>
            <Button
              onClick={() => {
                const el = document.getElementById("features");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              size="lg"
              variant="outline"
              className="font-display font-medium text-lg px-8 py-6 rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              Explore Features
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Glowing divider */}
      <div className="glow-divider max-w-4xl mx-auto" />

      {/* ════════════════════════════════════════════
          STATS BAR
          ════════════════════════════════════════════ */}
      <StatsBar />

      {/* Glowing divider */}
      <div className="glow-divider max-w-4xl mx-auto" />

      {/* ════════════════════════════════════════════
          FEATURE SECTIONS
          ════════════════════════════════════════════ */}
      <div id="features">
        {/* Section 1: AI Features */}
        <FeatureSection
          id="ai-features"
          badge="🤖 Artificial Intelligence"
          title="Supercharged by"
          titleHighlight="AI"
          subtitle="Our AI engine personalizes every aspect of the learning journey — from generating adaptive quizzes to creating insightful report cards and providing real-time mentorship."
          features={aiFeatures}
          image="/ai-features.png"
          imageAlt="AI-powered learning features"
          direction="left"
          glowClass="section-glow-primary"
        />

        <div className="glow-divider max-w-3xl mx-auto" />

        {/* Section 2: Classroom Management */}
        <FeatureSection
          id="classroom-management"
          badge="🎓 Classroom"
          title="Effortless"
          titleHighlight="Classroom Management"
          subtitle="Teachers can create cosmic classrooms, enroll students with unique codes, distribute assignments, and manage co-teachers — all from one powerful dashboard."
          features={classroomFeatures}
          image="/classroom-management.png"
          imageAlt="Cosmic classroom management"
          direction="right"
          glowClass="section-glow-secondary"
        />

        <div className="glow-divider max-w-3xl mx-auto" />

        {/* Section 3: Parent Engagement */}
        <FeatureSection
          id="parent-engagement"
          badge="👪 Parents"
          title="Stay Connected with"
          titleHighlight="Your Child's Journey"
          subtitle="Parents can link to their child's account, monitor real-time progress, digitally sign report cards, and celebrate achievements together."
          features={parentFeatures}
          image="/parent-engagement.png"
          imageAlt="Parent engagement dashboard"
          direction="left"
          glowClass="section-glow-accent"
        />

        <div className="glow-divider max-w-3xl mx-auto" />

        {/* Section 4: Gamification */}
        <FeatureSection
          id="gamification"
          badge="🏆 Gamification"
          title="Learn, Earn,"
          titleHighlight="Level Up"
          subtitle="Every action earns XP and cosmic rewards. Maintain streaks, unlock achievements, and compete on leaderboards in an immersive space-themed universe."
          features={gamificationFeatures}
          direction="left"
          glowClass="section-glow-primary"
        />

        <div className="glow-divider max-w-3xl mx-auto" />

        {/* Section 5: Collaboration */}
        <FeatureSection
          id="collaboration"
          badge="💬 Collaboration"
          title="Real-time"
          titleHighlight="Communication"
          subtitle="Discussion rooms, smart notifications, and live dashboard updates keep everyone — students, teachers, and parents — connected and in sync."
          features={collaborationFeatures}
          direction="right"
          glowClass="section-glow-secondary"
        />
      </div>

      {/* ════════════════════════════════════════════
          CTA SECTION
          ════════════════════════════════════════════ */}
      <section id="about" className="py-24 sm:py-32 relative">
        <div className="absolute inset-0 bg-gradient-cosmic opacity-5" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div
            ref={ctaRef}
            className={`scroll-reveal reveal-scale ${ctaRevealed ? "revealed" : ""}`}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight">
              Ready to explore the{" "}
              <span className="text-gradient">Learniverse</span>?
            </h2>
            <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
              Join thousands of students, teachers, and parents in the most
              immersive AI-powered learning experience ever built.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Button
                onClick={() => setLoginOpen(true)}
                size="lg"
                className="bg-gradient-cosmic text-white font-display font-semibold text-lg px-10 py-6 rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-primary/25"
              >
                <Rocket className="w-5 h-5 mr-2" />
                Login Now
              </Button>
              <Button
                onClick={() =>
                  toast.info("Premium Plans Coming Soon!", {
                    description:
                      "We're crafting something amazing. Stay tuned! 🚀",
                  })
                }
                size="lg"
                variant="outline"
                className="font-display font-medium text-lg px-10 py-6 rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-cosmic flex items-center justify-center">
                <img src="/learniverse-logo.svg" alt="Learniverse" className="w-6 h-6" />
              </div>
              <span className="font-display font-bold text-lg text-foreground">
                Learniverse
              </span>
            </div>

            {/* Tagline */}
            <p className="text-sm text-muted-foreground text-center">
              Empowering education through AI and cosmic adventure.
            </p>

            {/* Copyright */}
            <p className="text-sm text-muted-foreground text-center md:text-right">
              © 2026 Learniverse. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
