import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

export function useYouTubeSearch() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchVideos = useCallback(async (query: string) => {
    if (!query.trim()) {
      setVideos([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("youtube-search", {
        body: { query, maxResults: 6 },
      });

      if (fnError) {
        throw fnError;
      }

      setVideos(data.videos || []);
    } catch (err) {
      console.error("YouTube search error:", err);
      setError("Failed to fetch videos");
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { videos, isLoading, error, searchVideos };
}
