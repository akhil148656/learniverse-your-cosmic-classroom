import { ExternalLink, Play, Youtube } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { YouTubeVideo } from "@/hooks/useYouTubeSearch";

interface YouTubeResultsProps {
  videos: YouTubeVideo[];
  isLoading: boolean;
  topic: string;
  error?: string | null;
  requiresSetup?: boolean;
}

export function YouTubeResults({ videos, isLoading, topic, error, requiresSetup }: YouTubeResultsProps) {
  const fmt = (n: number) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
  const fmtDuration = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Youtube className="w-5 h-5 text-destructive" />
            Video Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!topic) {
    return null;
  }

  if (videos.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Youtube className="w-5 h-5 text-destructive" />
            Video Resources for "{topic}"
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>{error || "No videos found yet."}</p>
          {requiresSetup ? (
            <p>
              YouTube API isn’t configured. Ask the admin to set `YOUTUBE_API_KEY` in Supabase Edge Function secrets,
              or search YouTube for: <span className="text-foreground">{topic} educational</span>.
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Youtube className="w-5 h-5 text-destructive" />
          Video Resources for "{topic}"
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <a
              key={video.id}
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="relative overflow-hidden rounded-lg aspect-video bg-muted">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
              </div>
              <h3 className="mt-2 font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {video.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{video.channelTitle}</p>
              <div className="text-[11px] text-muted-foreground mt-1 flex gap-2">
                {typeof video.viewCount === "number" ? <span>{fmt(video.viewCount)} views</span> : null}
                {typeof video.likeCount === "number" ? <span>{fmt(video.likeCount)} likes</span> : null}
                {typeof video.durationSec === "number" ? <span>{fmtDuration(video.durationSec)}</span> : null}
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
