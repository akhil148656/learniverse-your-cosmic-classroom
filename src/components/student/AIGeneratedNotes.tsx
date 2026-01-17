import { useState, useEffect } from "react";
import { BookOpen, Loader2, RefreshCw, HelpCircle, FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AIGeneratedNotesProps {
  topic: string;
  onQuizClick: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-mentor`;

function getHelpfulAIErrorMessage(raw: string) {
  const msg = (raw || "").toString();
  if (/quota exceeded|rate limit|\(429\)/i.test(msg)) {
    return "AI quota exceeded. Check your Google AI Studio / Cloud billing + quota for this Gemini API key.";
  }
  if (/Gemini API error \(404\)|model not found|not found for API version/i.test(msg)) {
    return "AI model not found. In Supabase Edge Function env vars, set GEMINI_MODEL=gemini-2.0-flash (or remove GEMINI_MODEL).";
  }
  if (/GEMINI_API_KEY/i.test(msg)) {
    return "AI not configured. Add GEMINI_API_KEY in Supabase Edge Function secrets.";
  }
  return msg && msg.length < 160 ? msg : "Failed to generate notes";
}

function extractEdgeFunctionErrorMessage(errorText: string) {
  const raw = (errorText || "").toString().trim();
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    const extracted = parsed?.error || parsed?.message || parsed?.details;
    return (extracted || raw).toString();
  } catch {
    return raw;
  }
}

export function AIGeneratedNotes({ topic, onQuizClick }: AIGeneratedNotesProps) {
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const navigate = useNavigate();

  const generateNotes = async () => {
    if (!topic) return;
    
    setIsLoading(true);
    setNotes("");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Generate comprehensive study notes on: ${topic}` }],
          type: "notes",
        }),
      });

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => "");
        const extracted = extractEdgeFunctionErrorMessage(errorText);
        if (resp.status === 429) {
          throw new Error(extracted || "AI quota exceeded (429)");
        }
        if (resp.status === 404) {
          throw new Error(extracted || "AI model not found (404)");
        }
        throw new Error(extracted || `HTTP ${resp.status}`);
      }
      if (!resp.body) throw new Error("No response body");

      // Provider is also sent as an SSE metadata event; capture it when present.
      setAiProvider(resp.headers.get("X-AI-Provider"));

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let notesContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed?.provider && typeof parsed.provider === "string") {
              setAiProvider(parsed.provider);
            }
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              notesContent += content;
              setNotes(notesContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Notes generation error:", error);
      const raw = error instanceof Error ? error.message : String(error);
      toast.error(getHelpfulAIErrorMessage(raw));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (topic) {
      generateNotes();
    }
  }, [topic]);

  if (!topic) {
    return null;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          AI-Generated Notes: {topic}
          {aiProvider ? (
            <span className="ml-2 text-xs px-2 py-1 rounded bg-muted text-muted-foreground border border-border">
              {aiProvider}
            </span>
          ) : null}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generateNotes} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
          <Button variant="secondary" size="sm" onClick={onQuizClick}>
            <HelpCircle className="w-4 h-4 mr-2" />
            Take Quiz
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/student/virtual-labs?topic=${encodeURIComponent(topic)}`)}>
            <FlaskConical className="w-4 h-4 mr-2" />
            Virtual Lab
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && !notes ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Generating notes...</span>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {notes.split('\n').map((line, i) => {
                if (line.startsWith('# ')) {
                  return <h1 key={i} className="text-2xl font-display font-bold text-primary mt-6 mb-4">{line.slice(2)}</h1>;
                }
                if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-xl font-display font-semibold text-secondary mt-5 mb-3">{line.slice(3)}</h2>;
                }
                if (line.startsWith('### ')) {
                  return <h3 key={i} className="text-lg font-display font-medium text-accent mt-4 mb-2">{line.slice(4)}</h3>;
                }
                if (line.startsWith('- ')) {
                  return <li key={i} className="ml-4 text-muted-foreground">{line.slice(2)}</li>;
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className="font-semibold text-foreground">{line.slice(2, -2)}</p>;
                }
                if (line.trim() === '') {
                  return <br key={i} />;
                }
                return <p key={i} className="text-muted-foreground mb-2">{line}</p>;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
