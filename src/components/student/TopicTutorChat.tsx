import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, FileText, Loader2, Paperclip, Send, Trash2, User, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { extractPdfText } from "@/lib/pdfExtract";
import { ChatAttachment, useAIChat } from "@/hooks/useAIChat";

export function TopicTutorChat({ topic }: { topic?: string }) {
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const { messages, isLoading, sendMessage, clearMessages, setMessages } = useAIChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizedTopic = useMemo(() => (topic || "").trim(), [topic]);

  useEffect(() => {
    clearMessages();
    setInput("");

    setMessages([
      {
        role: "assistant",
        content: normalizedTopic
          ? `I can help you learn ${normalizedTopic}. Ask a question, or try one of the quick prompts.`
          : "Hi! I’m your AI tutor. Ask me anything you want to learn.",
      },
    ]);
    // We intentionally want to reset whenever topic changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedTopic]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading || isParsing) return;

    const msg = input.trim() || "Please help me understand the attached file.";
    setInput("");
    const toSend = attachment;
    setAttachment(null);

    if (normalizedTopic) {
      // Keep the topic always in-context, even for follow-ups like "explain again".
      await sendMessage(`About "${normalizedTopic}": ${msg}`, "chat", { attachment: toSend });
    } else {
      await sendMessage(msg, "chat", { attachment: toSend });
    }
  };

  const handlePickFile = () => {
    if (isLoading || isParsing) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      toast.error("Please attach an image or a PDF.");
      return;
    }

    // Basic size guardrails to keep requests reasonable.
    const maxBytes = isImage ? 4 * 1024 * 1024 : 6 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`File too large. Max ${(maxBytes / (1024 * 1024)).toFixed(0)}MB.`);
      return;
    }

    try {
      if (isImage) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("Failed to read image"));
          reader.onload = () => resolve(String(reader.result || ""));
          reader.readAsDataURL(file);
        });
        setAttachment({ kind: "image", name: file.name, mime: file.type || "image/*", dataUrl, size: file.size });
        return;
      }

      setIsParsing(true);
      const extractedText = await extractPdfText(file, { maxPages: 2, maxChars: 8000 });
      setAttachment({ kind: "pdf", name: file.name, mime: "application/pdf", extractedText, size: file.size });
      if (!extractedText) {
        toast.message("PDF attached, but text extraction was limited.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not process that file.");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <Card className="bg-card border-border flex flex-col h-[520px]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Tutor Chat
          <span className="ml-2 text-xs px-2 py-1 rounded bg-muted text-muted-foreground border border-border">
            {normalizedTopic ? `Topic: ${normalizedTopic}` : "General"}
          </span>
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={clearMessages} title="Reset chat">
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setInput(normalizedTopic ? `Explain ${normalizedTopic} in simple terms` : "Explain a topic in simple terms")}
            disabled={isLoading}
          >
            Simple explanation
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setInput(normalizedTopic ? `Give me 3 key points about ${normalizedTopic}` : "Give me 3 key points about a topic")}
            disabled={isLoading}
          >
            3 key points
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setInput(
                normalizedTopic
                  ? `Ask me 5 quick questions on ${normalizedTopic} and check my answers`
                  : "Ask me 5 quick questions on a topic I choose and check my answers"
              )
            }
            disabled={isLoading}
          >
            Quick practice
          </Button>
        </div>

        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePickFile}
            disabled={isLoading || isParsing}
            title="Attach image or PDF"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={normalizedTopic ? `Ask about ${normalizedTopic}...` : "Ask a question..."}
            className="flex-1 bg-muted border-border"
            disabled={isLoading || isParsing}
          />
          <Button
            type="submit"
            disabled={isLoading || isParsing || (!input.trim() && !attachment)}
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {attachment ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              {attachment.kind === "image" ? (
                <img src={attachment.dataUrl} alt={attachment.name} className="h-10 w-10 rounded object-cover border border-border" />
              ) : (
                <div className="h-10 w-10 rounded bg-background border border-border flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {attachment.kind === "pdf" ? "PDF (text extracted for tutor)" : "Image"}
                  {isParsing ? " • Processing…" : ""}
                </p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setAttachment(null)} disabled={isLoading || isParsing}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
