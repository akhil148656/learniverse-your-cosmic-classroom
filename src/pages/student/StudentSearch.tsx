import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/cards/EmptyState";
import { AIGeneratedNotes } from "@/components/student/AIGeneratedNotes";
import { YouTubeResults } from "@/components/student/YouTubeResults";
import { QuizModal } from "@/components/student/QuizModal";
import { useYouTubeSearch } from "@/hooks/useYouTubeSearch";
import { supabase } from "@/integrations/supabase/client";

export default function StudentSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || searchParams.get("topic") || "");
  const [activeTopic, setActiveTopic] = useState(searchParams.get("q") || searchParams.get("topic") || "");
  const [isSearching, setIsSearching] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const { videos, isLoading: isLoadingVideos, searchVideos } = useYouTubeSearch();

  useEffect(() => {
    const initialTopic = searchParams.get("q") || searchParams.get("topic");
    if (initialTopic) {
      setQuery(initialTopic);
      setActiveTopic(initialTopic);
      searchVideos(initialTopic);
      saveSearchHistory(initialTopic);
    }
  }, []);

  const saveSearchHistory = async (searchQuery: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (student) {
      await supabase.from("search_history").insert({
        student_id: student.id,
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
    await searchVideos(query);
    await saveSearchHistory(query);
    setIsSearching(false);
  };

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Learn & Search</h1>
          <p className="text-muted-foreground">Search any topic to get AI-generated notes and video resources</p>
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

        {!activeTopic && (
          <EmptyState
            title="Search for topics"
            message="Use the search bar above to find topics and get AI-generated notes, videos, and quizzes"
            icon={Search}
          />
        )}

        {activeTopic && (
          <div className="space-y-6">
            <AIGeneratedNotes topic={activeTopic} onQuizClick={() => setShowQuiz(true)} />
            <YouTubeResults videos={videos} isLoading={isLoadingVideos} topic={activeTopic} />
          </div>
        )}

        <QuizModal isOpen={showQuiz} onClose={() => setShowQuiz(false)} topic={activeTopic} />
      </div>
    </PortalLayout>
  );
}
