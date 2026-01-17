import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, maxResults = 5, order = "relevance", gradeLevel, preferredLanguage } = await req.json();
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    
    if (!query) {
      throw new Error("Search query is required");
    }

    // If no YouTube API key, return curated educational channels as suggestion
    if (!YOUTUBE_API_KEY) {
      console.log("YOUTUBE_API_KEY not set, returning fallback suggestions");
      const fallbackVideos = [
        {
          id: "fallback-1",
          title: `Learn about ${query}`,
          description: `To enable YouTube search, add YOUTUBE_API_KEY to Supabase environment variables. Meanwhile, search "${query} educational" on YouTube.com`,
          thumbnail: "https://via.placeholder.com/320x180/667eea/ffffff?text=YouTube+API+Key+Required",
          channelTitle: "Setup Required",
          publishedAt: new Date().toISOString(),
          fallback: true,
        },
      ];
      
      return new Response(JSON.stringify({ videos: fallbackVideos, requiresSetup: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clampMax = Math.max(1, Math.min(Number(maxResults) || 5, 15));
    const safeOrder = order === "viewCount" || order === "rating" || order === "date" || order === "relevance"
      ? order
      : "relevance";

    const parsedGrade = Number.isFinite(Number(gradeLevel)) ? Math.trunc(Number(gradeLevel)) : null;
    const grade = parsedGrade && parsedGrade >= 1 && parsedGrade <= 12 ? parsedGrade : null;

    const normalizeLang = (value: unknown) => {
      if (typeof value !== "string") return null;
      const raw = value.trim();
      if (!raw) return null;
      const lc = raw.toLowerCase();
      // Keep a conservative allow-list for YouTube relevanceLanguage.
      const allowed = new Set(["en", "hi", "ta", "te", "kn", "ml", "bn", "mr", "gu", "pa", "ur"]);
      return allowed.has(lc) ? lc : null;
    };

    const lang = normalizeLang(preferredLanguage);

    const querySuffix = grade ? ` class ${grade} grade ${grade}` : "";
    const languageHint = lang === "hi" ? " hindi" : "";
    const fullQuery = `${query} educational tutorial${querySuffix}${languageHint}`.trim();

    // Avoid Shorts by default; for higher grades, also include long-form videos.
    const durationsToSearch: Array<"medium" | "long"> = grade && grade >= 11 ? ["medium", "long"] : ["medium"];

    const buildSearchUrl = (videoDuration: "medium" | "long") => {
      const searchQuery = encodeURIComponent(fullQuery);
      const langParam = lang ? `&relevanceLanguage=${encodeURIComponent(lang)}` : "";
      return `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchQuery}&type=video&maxResults=${clampMax}&key=${YOUTUBE_API_KEY}&videoCategoryId=27&safeSearch=strict&order=${safeOrder}&videoDuration=${videoDuration}${langParam}`;
    };

    console.log("Searching YouTube for:", { query, grade, preferredLanguage: lang, durationsToSearch });

    const videoIdSet = new Set<string>();
    for (const videoDuration of durationsToSearch) {
      const searchUrl = buildSearchUrl(videoDuration);
      const response = await fetch(searchUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("YouTube API error:", response.status, errorText);
        return new Response(JSON.stringify({
          videos: [],
          error: "YouTube API error. Check your API key or quota.",
          requiresSetup: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const searchItems = Array.isArray(data.items) ? data.items : [];
      for (const item of searchItems) {
        const id = item?.id?.videoId;
        if (typeof id === "string" && id.length > 0) videoIdSet.add(id);
      }
    }

    const videoIds = Array.from(videoIdSet);

    const parseIsoDurationToSeconds = (iso: string | null | undefined) => {
      if (!iso || typeof iso !== "string") return null;
      const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
      if (!m) return null;
      const h = m[1] ? Number(m[1]) : 0;
      const min = m[2] ? Number(m[2]) : 0;
      const s = m[3] ? Number(m[3]) : 0;
      return h * 3600 + min * 60 + s;
    };

    const toInt = (value: any) => {
      const n = Number(value);
      return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
    };

    // Fetch statistics + duration for better ranking
    let detailsById = new Map<string, any>();
    if (videoIds.length > 0) {
      const idsParam = encodeURIComponent(videoIds.join(","));
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${idsParam}&key=${YOUTUBE_API_KEY}`;
      const detailsResp = await fetch(detailsUrl);
      if (detailsResp.ok) {
        const detailsJson = await detailsResp.json();
        const detailsItems = Array.isArray(detailsJson.items) ? detailsJson.items : [];
        detailsById = new Map(detailsItems.map((it: any) => [it.id, it]));
      } else {
        const errorText = await detailsResp.text();
        console.warn("YouTube videos.list error:", detailsResp.status, errorText);
      }
    }

    // Score each video: prefer high views/likes/comments, and avoid too-short/too-long videos.
    const scoreVideo = (
      stats: { viewCount: number; likeCount: number; commentCount: number },
      durationSec: number | null,
      title: string,
      description: string
    ) => {
      const viewScore = Math.log10(stats.viewCount + 1);
      const likeScore = Math.log10(stats.likeCount + 1);
      const commentScore = Math.log10(stats.commentCount + 1);

      const hay = `${title} ${description}`.toLowerCase();
      const gradeBoost = grade && (hay.includes(`class ${grade}`) || hay.includes(`grade ${grade}`)) ? 1.12 : 1;

      // Duration heuristic tuned by class level.
      const target = grade && grade <= 7
        ? { min: 240, max: 720, softMax: 1500 }
        : grade && grade <= 10
          ? { min: 360, max: 1080, softMax: 1800 }
          : { min: 480, max: 1800, softMax: 3600 };

      let durationMultiplier = 1;
      if (typeof durationSec === "number") {
        if (durationSec < 120) durationMultiplier = 0.5;
        else if (durationSec < target.min) durationMultiplier = 0.85;
        else if (durationSec <= target.max) durationMultiplier = 1.2;
        else if (durationSec <= target.softMax) durationMultiplier = 1.05;
        else durationMultiplier = 0.75;
      }

      const base = viewScore * 0.6 + likeScore * 0.3 + commentScore * 0.1;
      return base * durationMultiplier * gradeBoost;
    };

    const videos = videoIds
      .map((id: string) => {
        const d = detailsById.get(id);
        const snippet = d?.snippet;
        const statistics = d?.statistics;
        const contentDetails = d?.contentDetails;

        const viewCount = toInt(statistics?.viewCount);
        const likeCount = toInt(statistics?.likeCount);
        const commentCount = toInt(statistics?.commentCount);
        const durationSec = parseIsoDurationToSeconds(contentDetails?.duration);
        const title = snippet?.title || "";
        const description = snippet?.description || "";
        const score = scoreVideo({ viewCount, likeCount, commentCount }, durationSec, title, description);

        // Fallback thumbnail selection
        const thumb =
          snippet?.thumbnails?.medium?.url ||
          snippet?.thumbnails?.high?.url ||
          snippet?.thumbnails?.default?.url ||
          "";

        return {
          id,
          title,
          description,
          thumbnail: thumb,
          channelTitle: snippet?.channelTitle || "",
          publishedAt: snippet?.publishedAt || "",
          viewCount,
          likeCount,
          commentCount,
          durationSec,
          score,
        };
      })
      .filter((v: any) => v.title);

    videos.sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));

    console.log(`Found ${videos.length} videos for query: ${query}`);

    return new Response(JSON.stringify({ videos, gradeLevel: grade, preferredLanguage: lang }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("YouTube search error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error", 
      videos: [],
      requiresSetup: false
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
