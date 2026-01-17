import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  durationSec?: number | null;
  score?: number;
}

export function useYouTubeSearch() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresSetup, setRequiresSetup] = useState(false);

  const searchVideos = useCallback(async (query: string, gradeLevel?: number | null, preferredLanguage?: string | null) => {
    if (!query.trim()) {
      setVideos([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setRequiresSetup(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("youtube-search", {
        body: { query, maxResults: 6, gradeLevel, preferredLanguage },
      });

      if (fnError) {
        throw fnError;
      }

      setVideos(data?.videos || []);
      setRequiresSetup(Boolean(data?.requiresSetup));
      if (typeof data?.error === "string" && data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("YouTube search error:", err);
      const anyErr = err as any;
      const status = anyErr?.context?.status ?? anyErr?.status;
      const message = anyErr?.message || anyErr?.error_description || anyErr?.details;
      const hint = status ? `HTTP ${status}` : null;
      setError([message, hint].filter(Boolean).join(" · ") || "Failed to fetch videos");
      setVideos([]);
      setRequiresSetup(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { videos, isLoading, error, requiresSetup, searchVideos };
}
