import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIChat } from "@/hooks/useAIChat";

export function AIMentorChat() {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearMessages } = useAIChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput("");
    await sendMessage(message, "chat");
  };

  return (
    <Card className="h-[600px] flex flex-col bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Mentor
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={clearMessages} title="Clear chat">
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8 space-y-4">
                <Bot className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
                <div>
                  <p className="font-display text-lg text-foreground">Hi! I'm your AI learning mentor 🤖</p>
                  <p className="text-sm mt-2">Powered by Google Gemini AI</p>
                </div>
                <div className="text-left max-w-md mx-auto mt-6 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Try asking:</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setInput("Explain photosynthesis in simple terms");
                      }}
                      className="w-full text-left px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted text-sm transition-colors"
                    >
                      💡 Explain photosynthesis in simple terms
                    </button>
                    <button
                      onClick={() => {
                        setInput("Help me solve quadratic equations");
                      }}
                      className="w-full text-left px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted text-sm transition-colors"
                    >
                      ➕ Help me solve quadratic equations
                    </button>
                    <button
                      onClick={() => {
                        setInput("What caused World War 2?");
                      }}
                      className="w-full text-left px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted text-sm transition-colors"
                    >
                      📚 What caused World War 2?
                    </button>
                  </div>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-foreground"
                }`}>
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
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 bg-muted border-border"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="bg-primary hover:bg-primary/90">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
