import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/cards/EmptyState";
import { AIGeneratedNotes } from "@/components/student/AIGeneratedNotes";
import { YouTubeResults } from "@/components/student/YouTubeResults";
import { QuizModal } from "@/components/student/QuizModal";
import { TopicTutorChat } from "@/components/student/TopicTutorChat";
import { useYouTubeSearch } from "@/hooks/useYouTubeSearch";
import { supabase } from "@/integrations/supabase/client";

export default function StudentSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || searchParams.get("topic") || "");
  const [activeTopic, setActiveTopic] = useState(searchParams.get("q") || searchParams.get("topic") || "");
  const [isSearching, setIsSearching] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const { videos, isLoading: isLoadingVideos, error: videoError, requiresSetup, searchVideos } = useYouTubeSearch();
  const [studentGradeLevel, setStudentGradeLevel] = useState<number | null>(null);
  const [studentPreferredLanguage, setStudentPreferredLanguage] = useState<string | null>(null);
  const studentContextRef = useRef<{ id: string; grade_level: number | null; preferred_language: string | null } | null>(null);

  const getStudentContext = useCallback(async () => {
    if (studentContextRef.current) return studentContextRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const resp = await supabase
      .from("students")
      .select("id, grade_level, preferred_language")
      .eq("user_id", user.id)
      .maybeSingle();

    let data = resp.data as any;
    const err = resp.error as any;
    if (err && typeof err.message === "string" && /preferred_language/i.test(err.message)) {
      const retry = await supabase
        .from("students")
        .select("id, grade_level")
        .eq("user_id", user.id)
        .maybeSingle();
      data = retry.data as any;
    }

    if (!data) return null;
    const ctx = {
      id: data.id as string,
      grade_level: (data.grade_level as number | null) ?? null,
      preferred_language: (data.preferred_language as string | null) ?? null,
    };
    studentContextRef.current = ctx;
    setStudentGradeLevel(typeof ctx.grade_level === "number" ? ctx.grade_level : null);
    setStudentPreferredLanguage(typeof ctx.preferred_language === "string" ? ctx.preferred_language : null);
    return ctx;
  }, []);

  useEffect(() => {
    const initialTopic = searchParams.get("q") || searchParams.get("topic");
    if (initialTopic) {
      setQuery(initialTopic);
      setActiveTopic(initialTopic);
      getStudentContext().then((ctx) => {
        searchVideos(initialTopic, ctx?.grade_level ?? null, ctx?.preferred_language ?? studentPreferredLanguage ?? null);
        saveSearchHistory(initialTopic);
      });
    }
  }, []);

  const saveSearchHistory = async (searchQuery: string) => {
    const ctx = await getStudentContext();
    if (ctx) {
      await supabase.from("search_history").insert({
        student_id: ctx.id,
        query: searchQuery,
      });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setActiveTopic(query);
    setSearchParams({ q: query });
    const ctx = await getStudentContext();
    await searchVideos(
      query,
      ctx?.grade_level ?? studentGradeLevel ?? null,
      ctx?.preferred_language ?? studentPreferredLanguage ?? null
    );
    await saveSearchHistory(query);
    setIsSearching(false);
  };

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Search and Learn</h1>
          <p className="text-muted-foreground">Search a topic, learn with AI notes, and chat for clarity</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any topic (e.g., Ohm's Law, Photosynthesis, World War 2)..."
              className="pl-10 h-12 bg-muted border-border text-lg"
            />
          </div>
          <Button type="submit" size="lg" disabled={isSearching || !query.trim()} className="bg-primary hover:bg-primary/90">
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
          </Button>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6 lg:col-span-2">
            {!activeTopic ? (
              <EmptyState
                title="Search for topics"
                message="Use the search bar above to find topics and get AI-generated notes, videos, and quizzes"
                icon={Search}
              />
            ) : (
              <>
                <AIGeneratedNotes topic={activeTopic} onQuizClick={() => setShowQuiz(true)} />
                <YouTubeResults
                  videos={videos}
                  isLoading={isLoadingVideos}
                  topic={activeTopic}
                  error={videoError}
                  requiresSetup={requiresSetup}
                />
              </>
            )}
          </div>

          <div className="lg:col-span-1">
            <TopicTutorChat topic={activeTopic} />
          </div>
        </div>

        <QuizModal isOpen={showQuiz} onClose={() => setShowQuiz(false)} topic={activeTopic} />
      </div>
    </PortalLayout>
  );
}
